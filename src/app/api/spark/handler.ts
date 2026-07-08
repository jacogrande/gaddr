/**
 * POST /api/spark — candidate generation for pre-warm AND summon-fallback
 * (plan §4.5). Thin per architecture.md §8.2: validate input → derive
 * served-lenses → call the generation port through adapters → map the Result to
 * HTTP. Every business rule (assembly, rotation, staleness) lives in the domain
 * and the adapters; this core only validates, composes, and maps.
 *
 * The handler is a pure-ish function of `(request, deps)` so the full contract —
 * auth, each validation reject, served-lens derivation, per-reason rate caps,
 * error mapping — is testable with plain `Request` objects and stub deps,
 * no Next server required.
 */

import { declaredContentLengthExceeds, jsonError } from "./http";
import { MAX_GENERATE_BODY_BYTES, parseGenerateBody } from "./validate";
import {
  PREPARE_RATE_WINDOW_MS,
  SUMMON_RATE_WINDOW_MS,
  type RateLimiter,
} from "./rate-limit";
import type { SparkGenerateDeps } from "./deps";
import type { ServedLensQuery } from "./served-lens";
import { SPARK_PROMPT_VERSION } from "../../../infra/llm/prompts/spark";
import type {
  SparkEvent,
  SparkEventDetail,
  SparkLens,
} from "../../../domain/spark/types";
import type { SparkEventSink } from "../../../domain/spark/ports";
import type { InferenceError, PersistenceError } from "../../../domain/types/errors";
import type { SprintId, UserId } from "../../../domain/types/branded";
import type { Result } from "../../../domain/types/result";
import { err } from "../../../domain/types/result";

/** Fixed Retry-After (s) when the UPSTREAM model rate-limits us (see status map). */
const UPSTREAM_RETRY_AFTER_SECONDS = 5;

/**
 * Map an `InferenceError.reason` to the `spark_event.detail` failure reason.
 * `timeout` folds into `transport` (SparkEventDetail has no timeout variant —
 * both are "the model call didn't complete"); `malformed-output` records as
 * `validation-exhausted` (the repair loop gave up); `rate-limit` as
 * `rate-limited`. Total map: a missing key is a compile error.
 */
const DETAIL_BY_REASON: Record<InferenceError["reason"], SparkEventDetail> = {
  transport: "transport",
  timeout: "transport",
  "malformed-output": "validation-exhausted",
  "rate-limit": "rate-limited",
};

/**
 * Map an `InferenceError.reason` to the HTTP status the writer's client sees.
 *  - transport / timeout / malformed-output → 502: we reached (or tried to
 *    reach) an upstream and it failed us; the client treats it as a fizzle.
 *  - rate-limit (the UPSTREAM model rate-limited us, distinct from OUR per-user
 *    caps) → 503 + Retry-After. DECISION: 503 not 429, so the semantics never
 *    conflate — a 429 from this route means only "you hit your own per-user
 *    cap", while upstream saturation is a transient service condition (503).
 * Never 500 with a stack: every reason maps to a controlled code.
 */
const STATUS_BY_REASON: Record<InferenceError["reason"], number> = {
  transport: 502,
  timeout: 502,
  "malformed-output": 502,
  "rate-limit": 503,
};

/**
 * Write a server-authored spark_event WITHOUT ever failing the response. Same
 * discipline as `toOnAttempt` (plan §4.4): losing telemetry must never break the
 * writer. We AWAIT-and-swallow rather than fire-and-forget: awaiting guarantees
 * the row actually lands on serverless (where un-awaited work after the response
 * is killed), and swallowing guarantees a sink failure never surfaces. The added
 * latency is a single insert — negligible against a ~1–2.5s summon, and
 * invisible on a background prepare.
 */
async function recordSafely(
  sink: SparkEventSink,
  userId: UserId,
  event: SparkEvent,
): Promise<void> {
  try {
    await sink.record(userId, event);
  } catch {
    // Telemetry loss is acceptable; failing the writer's request is not.
  }
}

/**
 * Await the served-lens seam defensively: the contract is Result-returning and
 * no-throw (the infra implementation guarantees it), but a foreign stub that
 * throws must still land in the Result channel, never as a framework 500.
 */
async function readServedLenses(
  query: ServedLensQuery,
  userId: UserId,
  sprintId: SprintId,
): Promise<Result<readonly SparkLens[], PersistenceError>> {
  try {
    return await query(userId, sprintId);
  } catch (cause: unknown) {
    return err({
      kind: "PersistenceError",
      message: "Served-lens query threw",
      cause,
    });
  }
}

export async function handleSparkGenerate(
  request: Request,
  deps: SparkGenerateDeps,
): Promise<Response> {
  const session = await deps.requireSession();
  if (!session.ok) {
    return jsonError(401, "authentication required");
  }
  const userId = session.value.userId;

  // Cheap pre-parse gate on the DECLARED size, before json() buffers anything.
  // The header may be absent or lying — the parse-level draft cap below is the
  // authoritative check (see declaredContentLengthExceeds).
  if (declaredContentLengthExceeds(request, MAX_GENERATE_BODY_BYTES)) {
    return jsonError(413, "request body too large");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const parsed = parseGenerateBody(rawBody);
  if (!parsed.ok) {
    return jsonError(parsed.error.status, parsed.error.message);
  }
  const body = parsed.value;

  // Per-reason rate caps, SEPARATE buckets (review major: summon was server-side
  // unthrottled — unbounded spend for a hostile client). The prepare cap protects
  // cost from background pre-warm; the summon cap protects cost from raw-endpoint
  // abuse. Neither is reachable by the real client (prepare: word-delta throttle;
  // summon: ~1–2/min legitimate vs a 15/min cap), and separate buckets keep the
  // plan's §4.5 guarantee — noisy background work can never 429 a summon.
  //
  // ACCEPTED RISK (documented, no behavior): local cap 429s are deliberately NOT
  // written to spark_event — a `failed`/`rate-limited` row there means the
  // UPSTREAM model rate-limited a real generation attempt, and conflating the
  // two would corrupt that signal. If cap-hit-rate ever needs observing, it gets
  // its own signal, not a reuse of this one.
  const limiter: RateLimiter =
    body.reason === "prepare" ? deps.prepareLimiter : deps.summonLimiter;
  const windowMs =
    body.reason === "prepare" ? PREPARE_RATE_WINDOW_MS : SUMMON_RATE_WINDOW_MS;
  const verdict = limiter.check(userId, deps.now());
  if (!verdict.allowed) {
    const retryAfter =
      verdict.retryAfterSeconds ?? Math.ceil(windowMs / 1000);
    return jsonError(429, "rate limited", {
      "Retry-After": String(retryAfter),
    });
  }

  // servedLenses is derived SERVER-SIDE from spark_event — never from the client.
  // Failure posture is ASYMMETRIC by reason (review minor):
  //  - prepare → fail CLOSED (502): background work, nothing is lost, and
  //    serving without rotation state could silently double-serve a lens.
  //  - summon → fail OPEN with EMPTY servedLenses: the writer's conscious
  //    request must survive a DB blip. The worst case is a double-served lens —
  //    a variety degradation, not a safety one (the draft never depends on
  //    rotation), and strictly better than a fizzle for the writer.
  let servedLenses: readonly SparkLens[] = [];
  const lensRead = await readServedLenses(
    deps.servedLensQuery,
    userId,
    body.sprintId,
  );
  if (lensRead.ok) {
    servedLenses = lensRead.value;
  } else if (body.reason === "prepare") {
    await recordSafely(deps.eventSink, userId, {
      sprintId: body.sprintId,
      type: "failed",
      detail: "transport",
      draftWordCount: body.draftWordCount,
      sprintElapsedMs: body.sprintElapsedMs,
      promptVersion: SPARK_PROMPT_VERSION,
    });
    return jsonError(502, "spark generation unavailable");
  }

  const result = await deps.generationPortFor(userId).generate({
    draft: body.draft,
    sprintId: body.sprintId,
    servedLenses,
  });

  if (!result.ok) {
    await recordSafely(deps.eventSink, userId, {
      sprintId: body.sprintId,
      type: "failed",
      detail: DETAIL_BY_REASON[result.error.reason],
      draftWordCount: body.draftWordCount,
      sprintElapsedMs: body.sprintElapsedMs,
      promptVersion: SPARK_PROMPT_VERSION,
    });
    const headers =
      result.error.reason === "rate-limit"
        ? { "Retry-After": String(UPSTREAM_RETRY_AFTER_SECONDS) }
        : undefined;
    return jsonError(
      STATUS_BY_REASON[result.error.reason],
      "spark generation unavailable",
      headers,
    );
  }

  const set = result.value;

  // Success — including an OK-but-EMPTY set (a legitimate nothing-to-serve
  // outcome, still a completed prepare). draftWordCount/sprintElapsedMs come from
  // the client body (the server has no sprint clock); promptVersion from the set.
  await recordSafely(deps.eventSink, userId, {
    sprintId: body.sprintId,
    type: "prepared",
    draftWordCount: body.draftWordCount,
    sprintElapsedMs: body.sprintElapsedMs,
    promptVersion: set.promptVersion,
  });

  return Response.json({
    candidates: set.candidates,
    draftWordCount: set.draftWordCount,
    promptVersion: set.promptVersion,
  });
}
