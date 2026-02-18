// Shared review tool call parser — used by both review and assistant adapters

import type { ReviewEvent } from "../../../domain/review/review";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
} from "../../../domain/review/schemas";

/**
 * Parse a review tool call into a ReviewEvent.
 * Returns null for unrecognized tool names or invalid input.
 */
export function parseReviewToolCall(
  name: string,
  input: unknown,
): ReviewEvent | null {
  switch (name) {
    case "add_inline_comment": {
      const parsed = InlineCommentSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "inline_comment", data: parsed.data };
    }
    case "add_issue": {
      const parsed = ReviewIssueSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "issue", data: parsed.data };
    }
    case "ask_question": {
      const parsed = SocraticQuestionSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "question", data: parsed.data };
    }
    case "score_rubric": {
      const parsed = RubricScoreSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "rubric_score", data: parsed.data };
    }
    default:
      return null;
  }
}
