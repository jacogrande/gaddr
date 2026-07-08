/**
 * In-memory spark-event store for E2E mode (plan §4.5 / Phase 7).
 *
 * When `isE2ETesting()` is true the routes run with NO `DATABASE_URL`, so they
 * cannot import the db client (it throws at import). This module is the drop-in
 * replacement for the Postgres pair: it satisfies BOTH the `SparkEventSink` port
 * AND the `ServedLensQuery` seam over the SAME backing array, so a `served` event
 * logged via `/api/spark/events` is immediately visible to `/api/spark`'s
 * served-lens derivation — the loop the eval walks. It imports only domain types
 * and pure app helpers, so it is import-safe with no env at all.
 *
 * The exported `sharedE2ESparkStore` singleton is imported by BOTH route
 * compositions so they share one store within the server process. Tests use the
 * `createInMemorySparkStore` factory to get an isolated store.
 */

import { ok } from "../../../domain/types/result";
import type { Result } from "../../../domain/types/result";
import type { PersistenceError } from "../../../domain/types/errors";
import type { SparkEventSink } from "../../../domain/spark/ports";
import type { SparkLens } from "../../../domain/spark/types";
import type { ServedLensQuery } from "./served-lens";
import { isSparkLens } from "./validate";

/** The minimal row the E2E flows read back: enough to answer served-lens and to
 * dedup on the event id. Content-free beyond what the real table stores. */
interface StoredRow {
  readonly id: string;
  readonly userId: string;
  readonly sprintId: string;
  readonly type: string;
  readonly lens: string | null;
}

export interface InMemorySparkStore {
  readonly sink: SparkEventSink;
  readonly servedLensQuery: ServedLensQuery;
}

/**
 * Build an isolated in-memory store. The sink is insert-only and idempotent on
 * the event id — the same on-conflict-do-nothing semantics as the real sink, so
 * at-least-once delivery collapses identically. It always resolves `ok`: an
 * in-memory insert has no failure mode, and E2E telemetry loss is a non-event.
 */
export function createInMemorySparkStore(): InMemorySparkStore {
  const rows: StoredRow[] = [];
  const ids = new Set<string>();

  const sink: SparkEventSink = {
    record(userId, event, eventId): Promise<Result<void, PersistenceError>> {
      const id = eventId ?? crypto.randomUUID();
      if (!ids.has(id)) {
        ids.add(id);
        rows.push({
          id,
          userId,
          sprintId: event.sprintId,
          type: event.type,
          lens: event.lens ?? null,
        });
      }
      return Promise.resolve(ok(undefined));
    },
  };

  // Result-returning per the seam's contract; an in-memory read cannot fail,
  // so this always resolves ok.
  const servedLensQuery: ServedLensQuery = (userId, sprintId) => {
    const lenses = new Set<SparkLens>();
    for (const row of rows) {
      if (
        row.userId === userId &&
        row.sprintId === sprintId &&
        (row.type === "served" || row.type === "rerolled") &&
        row.lens !== null &&
        isSparkLens(row.lens)
      ) {
        lenses.add(row.lens);
      }
    }
    return Promise.resolve(ok([...lenses]));
  };

  return { sink, servedLensQuery };
}

/**
 * Process-wide E2E store shared by both spark routes so events logged on one
 * route feed served-lens derivation on the other. Constructed at import — no
 * env, no I/O — so it is safe to load in E2E-no-DB mode.
 */
export const sharedE2ESparkStore: InMemorySparkStore = createInMemorySparkStore();
