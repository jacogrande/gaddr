/**
 * spark-event-repo.ts — the `SparkEventSink` adapter (plan §4.4/§4.5, §8 step 4).
 *
 * Insert-only and idempotent: every row is inserted with `onConflictDoNothing`
 * on the primary key, so at-least-once delivery from the client (retries, React
 * StrictMode double-fire, `sendBeacon` replays) can never double-count a metric.
 * The primary key IS the dedup key:
 *   - CLIENT events (`served`/`rerolled`/`faded`/`dismissed`) carry a
 *     client-generated UUID as `eventId` — that becomes the pk, so a retry of
 *     the same logical event collapses.
 *   - SERVER events (`prepared`/`failed`, written by the route) omit `eventId`;
 *     the adapter mints a fresh `crypto.randomUUID()` — these never collide, so
 *     the conflict clause is simply a harmless no-op for them.
 *
 * THIN (architecture.md §7.1): field mapping only — no business logic. The
 * domain event is already the pure semantic payload (`SparkEvent`); tenancy
 * (`userId`) and dedup identity (`eventId`) travel on the CALL per the port's
 * contract, and this adapter stitches them into a row.
 *
 * DISCIPLINE: no throw escapes. Every DB failure is caught and returned as a
 * `PersistenceError` Result. A hostile/malformed `eventId` is rejected BEFORE
 * the insert (a structural UUID check), never as a DB round-trip — a client must
 * not be able to force a SQL-level error by supplying a bad id.
 *
 * The row-mapping (`toSparkEventRow`) is a PURE exported function that needs no
 * database client, so it is unit-tested exhaustively on its own (see
 * `test/contract/infra/db/spark-event-repo.test.ts`). The factory takes the
 * drizzle client as a parameter (injectable) so a stubbed client exercises the
 * insert path without a live Postgres.
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { PersistenceError } from "../../domain/types/errors";
import type { SparkEventSink } from "../../domain/spark/ports";
import type { SparkEvent } from "../../domain/spark/types";
import type { UserId } from "../../domain/types/branded";

/** The drizzle client this repo needs. Injected so tests can stub it and so the
 * module never imports the connection singleton (`./client`) — which throws at
 * import time when `DATABASE_URL` is unset, making the pure mapping untestable. */
export type SparkDb = PostgresJsDatabase<typeof schema>;

/** The insert shape drizzle infers for `spark_event`. `id` is required (no DB
 * default — the adapter always supplies it); `created_at` is optional (DB
 * default `now()`); the nullable columns accept `null`. */
type SparkEventRow = typeof schema.sparkEvent.$inferInsert;

/**
 * Canonical UUID shape (8-4-4-4-12 hex), case-insensitive — a STRUCTURAL check,
 * not a version/variant assertion, matching the domain's `SprintId` validator so
 * `crypto.randomUUID()` output and deterministic test fixtures both pass. This is
 * infra's own copy on purpose: an `eventId` is a delivery-envelope identifier,
 * not a branded domain value, so it does not route through a domain constructor.
 * DRIFT NOTE: keep byte-identical to `domain/types/branded.ts` `UUID_SHAPE` —
 * if the domain ever tightens sprint-id validation, revisit this together.
 */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Map a pure domain `SparkEvent` (+ tenancy + dedup identity) to an insert row.
 * PURE and client-free — the whole mapping is exercised in unit tests.
 *
 * `fallbackId` is the server-minted id used when the caller supplied no
 * `eventId`; passing it in (rather than calling `crypto.randomUUID()` here)
 * keeps this function deterministic and its `eventId`-precedence behaviour
 * testable. Precedence: a supplied `eventId` wins over `fallbackId`, but only
 * after passing the UUID-shape check — a malformed one is rejected as a
 * `PersistenceError` so it never reaches the database.
 */
export function toSparkEventRow(
  userId: UserId,
  event: SparkEvent,
  fallbackId: string,
  eventId?: string,
): Result<SparkEventRow, PersistenceError> {
  if (eventId !== undefined && !UUID_SHAPE.test(eventId)) {
    return err({
      kind: "PersistenceError",
      message: "Rejected spark event: eventId must be a UUID",
    });
  }
  const id = eventId ?? fallbackId;
  return ok({
    id,
    userId,
    sprintId: event.sprintId,
    type: event.type,
    detail: event.detail ?? null,
    lens: event.lens ?? null,
    question: event.question ?? null,
    draftWordCount: event.draftWordCount,
    sprintElapsedMs: event.sprintElapsedMs,
    cacheAgeMs: event.cacheAgeMs ?? null,
    wordsSincePrepare: event.wordsSincePrepare ?? null,
    promptVersion: event.promptVersion,
  });
}

/**
 * Build the `SparkEventSink` over an injected drizzle client. Insert-only,
 * on-conflict-do-nothing on the pk, every failure mapped to a `PersistenceError`
 * Result — no exception escapes.
 */
export function createSparkEventSink(db: SparkDb): SparkEventSink {
  return {
    async record(userId, event, eventId) {
      const row = toSparkEventRow(userId, event, crypto.randomUUID(), eventId);
      if (!row.ok) {
        return row;
      }
      try {
        await db
          .insert(schema.sparkEvent)
          .values(row.value)
          // Target pinned to the pk: dedup semantics are "same event id, same
          // event" and must NOT silently broaden if a unique index is ever
          // added to this table (retries would then swallow distinct rows).
          .onConflictDoNothing({ target: schema.sparkEvent.id });
        return ok(undefined);
      } catch (cause: unknown) {
        return err({
          kind: "PersistenceError",
          message: "Failed to record spark event",
          cause,
        });
      }
    },
  };
}
