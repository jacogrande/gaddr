// Authorship constraint validation — pure functions, no framework imports

import type { Result } from "../types/result";
import type { AuthorshipViolation } from "../types/errors";
import type { ReviewEvent } from "./review";
import { ok, err } from "../types/result";

// Patterns that indicate replacement prose
const REPLACEMENT_PREFIXES = [
  "replace with:",
  "change to:",
  "rewrite as:",
  "try:",
];

// Matches backtick-wrapped text that looks like a complete sentence (4+ words)
const BACKTICK_SENTENCE_RE = /`[^`]+(?:\s+[^`]+){3,}`/;

function containsReplacementProse(text: string): boolean {
  const lower = text.toLowerCase().trimStart();
  for (const prefix of REPLACEMENT_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return true;
    }
  }
  return BACKTICK_SENTENCE_RE.test(text);
}

function checkFields(
  fields: readonly string[],
  label: string,
): Result<void, AuthorshipViolation> {
  for (const field of fields) {
    if (containsReplacementProse(field)) {
      return err({
        kind: "AuthorshipViolation",
        message: `${label} contains replacement prose`,
      });
    }
  }
  return ok(undefined);
}

export function validateArtifact(
  event: ReviewEvent,
): Result<ReviewEvent, AuthorshipViolation> {
  switch (event.type) {
    case "inline_comment": {
      const check = checkFields(
        [
          event.data.problem,
          event.data.why,
          event.data.suggestedAction,
        ],
        "Inline comment",
      );
      if (!check.ok) return err(check.error);
      return ok(event);
    }
    case "issue": {
      const check = checkFields(
        [event.data.description, event.data.suggestedAction],
        "Issue",
      );
      if (!check.ok) return err(check.error);
      return ok(event);
    }
    case "question": {
      if (!event.data.question.trimEnd().endsWith("?")) {
        return err({
          kind: "AuthorshipViolation",
          message: "Socratic question must end with a question mark",
        });
      }
      return ok(event);
    }
    case "rubric_score": {
      const check = checkFields(
        [event.data.rationale],
        "Rubric score",
      );
      if (!check.ok) return err(check.error);
      return ok(event);
    }
    case "done":
    case "error":
      return ok(event);
  }
}
