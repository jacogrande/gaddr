/**
 * Composition root for the two spark routes (plan §4.3 mock-vs-real selection).
 *
 * The handler cores are pure-ish: they take their dependencies as data. This
 * module is the ONE place that decides, per `isE2ETesting()`, whether those
 * dependencies are the real Anthropic/Postgres stack or the mock/in-memory
 * stack. Splitting composition from the handler is what lets the cores be
 * contract-tested exhaustively with stubs (auth-missing, error mapping, rate
 * caps, …) and lets E2E mode run with no env at all.
 *
 * IMPORT-SAFETY (critical, plan §4.5 / Phase 7): NOTHING statically imported
 * here may touch `DATABASE_URL` / `BETTER_AUTH_*` at import time. The db client
 * (`infra/db/client`) throws at import without `DATABASE_URL`, and the real
 * `requireSession` transitively imports it — so BOTH are pulled in only via a
 * DYNAMIC import inside the real branch (`getRealBackends`), which runs only when
 * NOT in E2E mode (where the env is present). E2E mode uses the local session
 * resolver + in-memory store + mock port, none of which read env at import.
 */

import { isE2ETesting } from "../../../infra/env";
import { createMockSparkGenerationPort } from "../../../infra/llm/mock-spark-adapter";
import { createSparkGenerationPort } from "../../../infra/llm/spark-adapter";
import { createAnthropicStructuredClient } from "../../../infra/llm/anthropic-client";
import { createSparkEventSink } from "../../../infra/db/spark-event-repo";
import {
  createInferenceAttemptSink,
  toOnAttempt,
} from "../../../infra/db/inference-attempt-repo";
import type { SparkEventSink, SparkGenerationPort } from "../../../domain/spark/ports";
import type { Session } from "../../../domain/auth/session";
import type { AuthError } from "../../../domain/types/errors";
import type { Result } from "../../../domain/types/result";
import type { UserId } from "../../../domain/types/branded";
import type { ServedLensQuery } from "./served-lens";
import { createDbServedLensQuery } from "./served-lens";
import type { RateLimiter } from "./rate-limit";
import {
  createRateLimiter,
  EVENTS_RATE_LIMIT,
  EVENTS_RATE_WINDOW_MS,
  PREPARE_RATE_LIMIT,
  PREPARE_RATE_WINDOW_MS,
  SUMMON_RATE_LIMIT,
  SUMMON_RATE_WINDOW_MS,
} from "./rate-limit";
import { sharedE2ESparkStore } from "./in-memory-store";
import { resolveE2ESession } from "./session";

/** Session resolver seam — the real `requireSession` or the E2E bypass, same shape. */
export type RequireSession = () => Promise<Result<Session, AuthError>>;

/**
 * A generation port is built PER USER: the `inference_attempt` telemetry sink is
 * keyed by the authenticated user id (via `toOnAttempt`), and the user id is only
 * known after auth, per request. Hence a factory rather than a ready port — the
 * one deviation from the plan's illustrative `{ generationPort, … }` dep list,
 * forced by onAttempt's per-user binding.
 */
export type GenerationPortFor = (userId: UserId) => SparkGenerationPort;

export interface SparkGenerateDeps {
  readonly requireSession: RequireSession;
  readonly generationPortFor: GenerationPortFor;
  readonly eventSink: SparkEventSink;
  readonly servedLensQuery: ServedLensQuery;
  /** Caps background pre-warm traffic (~10/min). Separate INSTANCE from the
   * summon limiter, so the buckets can never interfere (plan §4.5 + review). */
  readonly prepareLimiter: RateLimiter;
  /** Abuse bound on conscious summons (~15/min — unreachable by a real writer,
   * see rate-limit.ts). */
  readonly summonLimiter: RateLimiter;
  readonly now: () => number;
}

export interface SparkEventsDeps {
  readonly requireSession: RequireSession;
  readonly eventSink: SparkEventSink;
  /** Per-user cap on telemetry POSTs (~120/min — unreachable by the real
   * fire-and-forget client, a backstop against route abuse). */
  readonly eventsLimiter: RateLimiter;
  readonly now: () => number;
}

/**
 * The rate windows are a per-instance backstop, so ONE limiter per rate class
 * for the whole process (shared across requests, and across the real/E2E modes
 * — pure in-memory, env-free). SEPARATE instances = separate buckets: prepare
 * noise can never consume summon capacity or vice versa. Handlers receive them
 * as deps so tests inject fresh, tuned ones.
 */
const sharedPrepareLimiter = createRateLimiter(
  PREPARE_RATE_LIMIT,
  PREPARE_RATE_WINDOW_MS,
);
const sharedSummonLimiter = createRateLimiter(
  SUMMON_RATE_LIMIT,
  SUMMON_RATE_WINDOW_MS,
);
const sharedEventsLimiter = createRateLimiter(
  EVENTS_RATE_LIMIT,
  EVENTS_RATE_WINDOW_MS,
);

/** The real, db+model-backed backends. Memoized: the db pool and SDK client are
 * built once per process, on first real request, never at module load. */
interface RealBackends {
  readonly requireSession: RequireSession;
  readonly eventSink: SparkEventSink;
  readonly servedLensQuery: ServedLensQuery;
  readonly generationPortFor: GenerationPortFor;
}

let realBackends: Promise<RealBackends> | null = null;

async function getRealBackends(): Promise<RealBackends> {
  realBackends ??= (async () => {
    // Dynamic imports: these modules read env at import time and must NOT load in
    // E2E-no-DB mode. They are reached only here, in the real branch.
    const { db } = await import("../../../infra/db/client");
    const { requireSession } = await import(
      "../../../infra/auth/require-session"
    );

    const eventSink = createSparkEventSink(db);
    const attemptSink = createInferenceAttemptSink(db);
    const servedLensQuery = createDbServedLensQuery(db);
    const client = createAnthropicStructuredClient();

    const generationPortFor: GenerationPortFor = (userId) =>
      createSparkGenerationPort(client, {
        onAttempt: toOnAttempt(attemptSink, userId),
      });

    return { requireSession, eventSink, servedLensQuery, generationPortFor };
  })();
  return realBackends;
}

export async function resolveSparkGenerateDeps(): Promise<SparkGenerateDeps> {
  if (isE2ETesting()) {
    const port = createMockSparkGenerationPort();
    return {
      requireSession: () => Promise.resolve(resolveE2ESession()),
      generationPortFor: () => port,
      eventSink: sharedE2ESparkStore.sink,
      servedLensQuery: sharedE2ESparkStore.servedLensQuery,
      prepareLimiter: sharedPrepareLimiter,
      summonLimiter: sharedSummonLimiter,
      now: Date.now,
    };
  }

  const backends = await getRealBackends();
  return {
    requireSession: backends.requireSession,
    generationPortFor: backends.generationPortFor,
    eventSink: backends.eventSink,
    servedLensQuery: backends.servedLensQuery,
    prepareLimiter: sharedPrepareLimiter,
    summonLimiter: sharedSummonLimiter,
    now: Date.now,
  };
}

export async function resolveSparkEventsDeps(): Promise<SparkEventsDeps> {
  if (isE2ETesting()) {
    return {
      requireSession: () => Promise.resolve(resolveE2ESession()),
      eventSink: sharedE2ESparkStore.sink,
      eventsLimiter: sharedEventsLimiter,
      now: Date.now,
    };
  }

  const backends = await getRealBackends();
  return {
    requireSession: backends.requireSession,
    eventSink: backends.eventSink,
    eventsLimiter: sharedEventsLimiter,
    now: Date.now,
  };
}
