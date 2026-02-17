// Review pipeline — domain orchestration, no framework imports

import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import type { Essay } from "../essay/essay";
import type { ReviewRequest } from "./port";
import type { ReviewEvent } from "./review";
import type { RubricDimension } from "./review";
import { RUBRIC_DIMENSIONS } from "./review";
import { ok, err, isErr } from "../types/result";
import { extractEssayText, wordCount } from "../essay/operations";
import { validateArtifact } from "./constraints";

/**
 * Validates that an essay is reviewable and builds a ReviewRequest.
 * Domain concern: what makes an essay eligible for coaching review.
 */
export function prepareReviewRequest(
  essay: Essay,
): Result<ReviewRequest, ValidationError> {
  const text = extractEssayText(essay.content);
  const words = wordCount(essay.content);

  if (words === 0) {
    return err({
      kind: "ValidationError",
      message: "Cannot review an empty essay",
    });
  }

  return ok({
    essayText: text,
    essayTitle: essay.title,
    wordCount: words,
  });
}

/**
 * Wraps an adapter's event stream with completeness validation.
 * Checks that all required rubric dimensions were scored before emitting done.
 */
export async function* validateReviewStream(
  events: AsyncIterable<ReviewEvent>,
): AsyncIterable<ReviewEvent> {
  const scoredDimensions = new Set<RubricDimension>();

  for await (const event of events) {
    // Defense-in-depth: re-validate authorship constraint at pipeline level
    const validated = validateArtifact(event);
    if (isErr(validated)) {
      yield { type: "error", message: validated.error.message };
      continue;
    }

    if (event.type === "rubric_score") {
      scoredDimensions.add(event.data.dimension);
    }

    if (event.type === "done") {
      const missing = RUBRIC_DIMENSIONS.filter(
        (d) => !scoredDimensions.has(d),
      );
      if (missing.length > 0) {
        yield {
          type: "error",
          message: `Incomplete review: missing rubric scores for ${missing.join(", ")}`,
        };
        return;
      }
    }

    yield event;
  }
}
