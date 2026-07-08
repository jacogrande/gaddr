/**
 * served-lens-query.ts — the server-side served-lens read (plan §3.3/§4.5/§6),
 * hoisted from the app layer beside the other spark_event adapters (review
 * minor: a drizzle query is infra's job, the app layer only composes).
 *
 * The `/api/spark` route derives `servedLenses` from `spark_event` — the lenses
 * of prior `served`/`rerolled` rows for (user, sprint) — and NEVER trusts the
 * client. This is also the exact indexed select the future constellation run
 * will reuse for no-double-serving (plan §6), so it is exercised from day one.
 *
 * Same conventions as the sinks in this directory:
 *  - the drizzle client is INJECTED (`SparkDb`), never the connection singleton,
 *    so the module is import-safe with no `DATABASE_URL`;
 *  - DISCIPLINE: no throw escapes — every DB failure maps to a
 *    `PersistenceError` Result. The caller (the route handler) decides what a
 *    read failure means for its flow (fail-closed vs fail-open by reason).
 */

import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./schema";
import type { SparkDb } from "./spark-event-repo";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { PersistenceError } from "../../domain/types/errors";
import { SPARK_LENSES } from "../../domain/spark/types";
import type { SparkLens } from "../../domain/spark/types";
import type { SprintId, UserId } from "../../domain/types/branded";

/**
 * The seam the route handler calls to derive served lenses. Result-returning —
 * consistent with every port at this boundary — so the handler maps failures
 * instead of catching throws. Both this db-backed implementation and the app
 * layer's in-memory E2E store satisfy it.
 */
export type ServedLensQuery = (
  userId: UserId,
  sprintId: SprintId,
) => Promise<Result<readonly SparkLens[], PersistenceError>>;

/** A lens is "served" for rotation purposes once it has been served OR rerolled
 * to the writer this sprint. `prepared` rows carry no lens; `faded`/`dismissed`
 * describe a lens already counted by its `served` row, so they are not queried. */
const SERVED_LENS_TYPES = ["served", "rerolled"] as const;

/** Infra-local taxonomy narrowing for raw stored lens strings. The app layer has
 * its own copy for request validation; infra must not import app, and the check
 * is two lines against the domain's `SPARK_LENSES`. */
function isSparkLens(value: string): value is SparkLens {
  return (SPARK_LENSES as readonly string[]).includes(value);
}

/**
 * Build the db-backed served-lens query over an injected drizzle client. Selects
 * the `lens` of served/rerolled rows for (user, sprint) — the composite-indexed
 * filter (plan §4.4) — then narrows each raw string to the closed taxonomy and
 * dedupes. A row whose stored lens is somehow outside the taxonomy is skipped
 * rather than trusted.
 */
export function createServedLensQuery(db: SparkDb): ServedLensQuery {
  return async (userId, sprintId) => {
    try {
      const rows = await db
        .select({ lens: schema.sparkEvent.lens })
        .from(schema.sparkEvent)
        .where(
          and(
            eq(schema.sparkEvent.userId, userId),
            eq(schema.sparkEvent.sprintId, sprintId),
            inArray(schema.sparkEvent.type, [...SERVED_LENS_TYPES]),
          ),
        );

      const lenses = new Set<SparkLens>();
      for (const row of rows) {
        if (row.lens !== null && isSparkLens(row.lens)) {
          lenses.add(row.lens);
        }
      }
      return ok([...lenses]);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to read served lenses",
        cause,
      });
    }
  };
}
