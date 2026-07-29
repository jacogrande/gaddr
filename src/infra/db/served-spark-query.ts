/**
 * served-spark-query.ts — the server-side read of the QUESTIONS the sprint's
 * sparks served (plan §5.1, §4.4). The sibling of `served-lens-query.ts`: that
 * one returns the served *lenses* for spark rotation; this one returns the
 * served *questions* for the constellation run.
 *
 * Two consumers, one read (plan D5/§4.4):
 *  - S1 discovery warm-start — "these dimensions were already surfaced during the
 *    sprint, do not just restate them" (`buildDiscoveryUserContent`);
 *  - assembly's served-spark dedup — a board that re-asks a spark's own question
 *    is a visible "the AI repeats itself" moment, so a sparked dimension may only
 *    reappear DEVELOPED (`assembleConstellation`).
 *
 * `spark_event.question` is MODEL OUTPUT (the served spark question), never
 * writer prose — so reading it back here does not touch the content posture (the
 * draft is still never at rest). Same conventions as the other db reads: the
 * drizzle client is INJECTED (import-safe with no `DATABASE_URL`); no throw
 * escapes — every failure maps to a `PersistenceError` Result.
 */

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import * as schema from "./schema";
import type { SparkDb } from "./spark-event-repo";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { PersistenceError } from "../../domain/types/errors";
import type { SprintId, UserId } from "../../domain/types/branded";

/**
 * The seam the constellation runner calls to gather the sprint's served spark
 * questions. Result-returning like every read at this boundary. Both this
 * db-backed implementation and an E2E stub satisfy it.
 */
export type ServedSparkQuestionsQuery = (
  userId: UserId,
  sprintId: SprintId,
) => Promise<Result<readonly string[], PersistenceError>>;

/** A question was "served" once it was served OR rerolled to the writer this
 * sprint — the same event types the served-lens read counts. `prepared` rows are
 * pre-warm (never shown); `faded`/`dismissed` describe a question already counted
 * by its `served`/`rerolled` row. */
const SERVED_QUESTION_TYPES = ["served", "rerolled"] as const;

/**
 * Build the db-backed served-spark-questions query. Selects the non-null
 * `question` of served/rerolled rows for (user, sprint) — the same composite
 * index the served-lens read hits — and dedupes exact repeats (a re-rolled
 * identical question is one dimension, not two).
 */
export function createServedSparkQuestionsQuery(
  db: SparkDb,
): ServedSparkQuestionsQuery {
  return async (userId, sprintId) => {
    try {
      const rows = await db
        .select({ question: schema.sparkEvent.question })
        .from(schema.sparkEvent)
        .where(
          and(
            eq(schema.sparkEvent.userId, userId),
            eq(schema.sparkEvent.sprintId, sprintId),
            inArray(schema.sparkEvent.type, [...SERVED_QUESTION_TYPES]),
            isNotNull(schema.sparkEvent.question),
          ),
        );

      const questions = new Set<string>();
      for (const row of rows) {
        if (row.question !== null && row.question.trim().length > 0) {
          questions.add(row.question);
        }
      }
      return ok([...questions]);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to read served spark questions",
        cause,
      });
    }
  };
}
