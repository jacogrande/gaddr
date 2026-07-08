/**
 * inference-attempt-repo.ts — the `inference_attempt` sink (plan §4.4, §8 step 4).
 *
 * One row per model call, the harness observability spine. This adapter persists
 * the `InferenceAttempt` record that `structured-call.ts` already emits through
 * its `onAttempt` seam (Phase 3 shaped that record field-for-field so Phase 4
 * could insert it without reshaping). Server-generated pk always — there is no
 * client dedup semantics for telemetry.
 *
 * THIN: field mapping only. `toInferenceAttemptRow` is a PURE exported function
 * (no client needed), unit-tested on its own; the factory takes the drizzle
 * client as a parameter so a stub exercises the insert without a live Postgres.
 *
 * DISCIPLINE: no throw escapes `record` — every DB failure becomes a
 * `PersistenceError` Result.
 *
 * THE async-SINK-BEHIND-A-sync-CALLBACK SEAM (`toOnAttempt`):
 * `structured-call`'s `onAttempt` is a SYNCHRONOUS, fire-and-forget callback
 * (`(attempt) => void`) called on the generation hot path, while the insert is
 * async. `toOnAttempt` bridges the two: it fires the insert promise, swallows
 * every outcome (a persistence failure is logged, NEVER rethrown), and returns
 * `void` immediately. This is deliberate and load-bearing — losing an attempt
 * record must NEVER fail a generation. The record is observability, not the
 * product's result; a writer's spark must not fizzle because a telemetry insert
 * timed out. Phase 5 wires this straight into `structuredCall({ onAttempt })`.
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { PersistenceError } from "../../domain/types/errors";
import type { UserId } from "../../domain/types/branded";
import type { InferenceAttempt } from "../llm/structured-call";

/** The drizzle client this repo needs. Injected (see `SparkDb` in
 * `spark-event-repo.ts` for the same rationale — keep the module import-safe and
 * the insert path stubbable). */
export type AttemptDb = PostgresJsDatabase<typeof schema>;

/** The insert shape drizzle infers for `inference_attempt`. */
type InferenceAttemptRow = typeof schema.inferenceAttempt.$inferInsert;

/**
 * Map a Phase-3 `InferenceAttempt` telemetry record to an insert row. PURE and
 * client-free; `id` is the server-minted pk (passed in for deterministic tests).
 *
 * Nullability follows the record's optionality (plan §4.4):
 *  - `candidatesReturned`/`candidatesValid` are absent on non-parse attempts
 *    (transport/refusal/max-tokens) and for non-spark stages → `null`.
 *  - `rejectReasons` is comma-joined for the quality lane; an empty or absent
 *    list means "nothing to reject" → `null` (an empty string in the column
 *    would be a false signal).
 *  - `inputTokens`/`outputTokens` are NOT NULL: the Phase-3 record zero-fills
 *    when the API returns no usage (transport failures), and "0 tokens" and
 *    "no usage" are deliberately the same stored value — see the schema note.
 */
export function toInferenceAttemptRow(
  userId: UserId,
  attempt: InferenceAttempt,
  id: string,
): InferenceAttemptRow {
  const rejectReasons =
    attempt.rejectReasons !== undefined && attempt.rejectReasons.length > 0
      ? attempt.rejectReasons.join(",")
      : null;
  return {
    id,
    userId,
    stage: attempt.stage,
    sprintId: attempt.sprintId ?? null,
    inputHash: attempt.inputHash,
    promptVersion: attempt.promptVersion,
    modelId: attempt.modelId,
    outcome: attempt.outcome,
    retryCount: attempt.retryCount,
    candidatesReturned: attempt.candidatesReturned ?? null,
    candidatesValid: attempt.candidatesValid ?? null,
    rejectReasons,
    latencyMs: attempt.latencyMs,
    inputTokens: attempt.inputTokens,
    outputTokens: attempt.outputTokens,
  };
}

/** The infra-local attempt sink. Not a domain port — `inference_attempt` is
 * pure telemetry with no domain concept, so its interface lives here. */
export interface InferenceAttemptSink {
  record(
    userId: UserId,
    attempt: InferenceAttempt,
  ): Promise<Result<void, PersistenceError>>;
}

/**
 * Build the attempt sink over an injected drizzle client. Insert-only,
 * server-generated pk, every failure mapped to a `PersistenceError` Result — no
 * exception escapes.
 */
export function createInferenceAttemptSink(db: AttemptDb): InferenceAttemptSink {
  return {
    async record(userId, attempt) {
      const row = toInferenceAttemptRow(userId, attempt, crypto.randomUUID());
      try {
        await db.insert(schema.inferenceAttempt).values(row);
        return ok(undefined);
      } catch (cause: unknown) {
        return err({
          kind: "PersistenceError",
          message: "Failed to record inference attempt",
          cause,
        });
      }
    },
  };
}

/**
 * Adapt an async `InferenceAttemptSink` to `structured-call`'s SYNCHRONOUS
 * fire-and-forget `onAttempt` callback. See the module header: losing an attempt
 * record must never fail a generation, so this fires the insert, swallows every
 * outcome (logged, never rethrown), and returns void immediately.
 */
/**
 * Drop-log latch: attempt records are loss-tolerant, so a sustained DB outage
 * must not flood stderr with one error per model call. Log the first drop at
 * error level, then stay quiet and count; the counter resets on the next
 * successful insert so a NEW outage logs again. Module-level state is fine
 * here — the latch is per-process observability, not correctness.
 */
let droppedSinceLastSuccess = 0;

function logDroppedAttempt(detail: string, cause?: unknown): void {
  droppedSinceLastSuccess += 1;
  if (droppedSinceLastSuccess === 1) {
    console.error(
      `[gaddr:inference-attempt] dropped attempt record (${detail}); ` +
        "suppressing further drop logs until an insert succeeds",
      cause ?? "",
    );
  }
}

export function toOnAttempt(
  sink: InferenceAttemptSink,
  userId: UserId,
): (attempt: InferenceAttempt) => void {
  return (attempt) => {
    try {
      // Fire-and-forget. `void` marks the deliberately un-awaited promise; the
      // `.then`/`.catch` guarantee no unhandled rejection can escape and crash
      // the request that triggered the generation.
      void sink
        .record(userId, attempt)
        .then((result) => {
          if (!result.ok) {
            logDroppedAttempt(result.error.message);
          } else {
            droppedSinceLastSuccess = 0;
          }
        })
        .catch((cause: unknown) => {
          // Defensive: `record` maps to a Result and should not reject, but a
          // bug must not surface as an unhandled rejection on the hot path.
          logDroppedAttempt("attempt sink rejected", cause);
        });
    } catch (cause: unknown) {
      // A sink that throws SYNCHRONOUSLY (shouldn't happen — `record` is async)
      // still must not surface on the generation path. The never-throw guarantee
      // is unconditional regardless of the sink implementation passed in.
      logDroppedAttempt("attempt sink threw synchronously", cause);
    }
  };
}
