// Assistant pipeline — domain orchestration, no framework imports

import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import type { Essay } from "../essay/essay";
import type { AssistantRequest, AssistantMode, HistoryEntry } from "./port";
import type { AssistantEvent } from "./assistant";
import type { RubricDimension } from "../review/review";
import { RUBRIC_DIMENSIONS } from "../review/review";
import { ok, err, isErr } from "../types/result";
import { extractEssayText, wordCount } from "../essay/operations";
import { validateAssistantEvent, checkTextForGhostwriting } from "./constraints";

/**
 * Validates that an essay is ready for assistant interaction and builds a request.
 */
export function prepareAssistantRequest(
  essay: Essay,
  userMessage: string,
  conversationHistory: HistoryEntry[],
  mode: AssistantMode,
): Result<AssistantRequest, ValidationError> {
  const text = extractEssayText(essay.content);
  const words = wordCount(essay.content);

  if (words === 0) {
    return err({
      kind: "ValidationError",
      message: "Cannot review an empty essay",
    });
  }

  if (mode === "chat" && userMessage.trim().length === 0) {
    return err({
      kind: "ValidationError",
      message: "Chat message cannot be empty",
    });
  }

  return ok({
    essayText: text,
    essayTitle: essay.title,
    wordCount: words,
    userMessage: userMessage.trim(),
    conversationHistory,
    mode,
  });
}

/**
 * Wraps an adapter's event stream with validation.
 * In full_review mode, validates rubric completeness.
 * In all modes, validates authorship constraints.
 */
export async function* validateAssistantStream(
  events: AsyncIterable<AssistantEvent>,
  mode: AssistantMode,
): AsyncIterable<AssistantEvent> {
  const scoredDimensions = new Set<RubricDimension>();
  let accumulatedText = "";

  for await (const event of events) {
    const validated = validateAssistantEvent(event);
    if (isErr(validated)) {
      yield { type: "error", message: validated.error.message };
      continue;
    }

    // Accumulate text for ghostwriting check
    if (event.type === "text_delta") {
      accumulatedText += event.text;
    }

    if (event.type === "rubric_score") {
      scoredDimensions.add(event.data.dimension);
    }

    // In full_review mode, check rubric completeness at review_done
    if (mode === "full_review" && event.type === "review_done") {
      const missing = RUBRIC_DIMENSIONS.filter(
        (d) => !scoredDimensions.has(d),
      );
      if (missing.length > 0) {
        yield {
          type: "error",
          message: `Incomplete review: missing rubric scores for ${missing.join(", ")}`,
        };
        // Still emit review_done so the UI can close the review section
      }
    }

    // Check accumulated text for ghostwriting at stream end
    if (event.type === "done" && accumulatedText.length > 0) {
      const ghostwritingCheck = checkTextForGhostwriting(accumulatedText);
      if (isErr(ghostwritingCheck)) {
        yield { type: "error", message: ghostwritingCheck.error.message };
      }
      accumulatedText = "";
    }

    yield event;
  }
}
