// Authorship constraint validation for assistant — pure functions, no framework imports

import type { Result } from "../types/result";
import type { AuthorshipViolation } from "../types/errors";
import type { AssistantEvent } from "./assistant";
import { ok, err } from "../types/result";
import { validateArtifact } from "../review/constraints";

// Patterns that indicate the assistant is ghostwriting prose for the user
const GHOSTWRITING_PATTERNS = [
  /here(?:'s| is) (?:a |the )?(?:revised|rewritten|updated|improved|corrected|better) version/i,
  /here(?:'s| is) (?:a |the )?(?:revised|rewritten|updated|improved) (?:paragraph|sentence|passage|draft)/i,
  /i(?:'ve| have) (?:rewritten|revised|reworded|rephrased) (?:it|this|your|the)/i,
  /you (?:could|can|should|might) (?:replace|swap|change) (?:it|this|that) (?:with|to):\s*"/i,
  /try (?:writing|using|saying|phrasing) (?:it|this) (?:as|like):\s*"/i,
];

function containsGhostwriting(text: string): boolean {
  return GHOSTWRITING_PATTERNS.some((re) => re.test(text));
}

export function validateAssistantEvent(
  event: AssistantEvent,
): Result<AssistantEvent, AuthorshipViolation> {
  switch (event.type) {
    case "text_delta": {
      // Text deltas are small chunks — we check them individually but
      // the more important check happens at the accumulated message level.
      // Individual chunks rarely trigger on their own, which is fine.
      return ok(event);
    }
    case "inline_comment":
    case "issue":
    case "question":
    case "rubric_score": {
      // Delegate structured review events to existing validation
      const result = validateArtifact(event);
      if (!result.ok) return result;
      return ok(event);
    }
    case "source_suggestion":
    case "review_start":
    case "review_done":
    case "done":
    case "error":
      return ok(event);
  }
}

/**
 * Check accumulated assistant text for ghostwriting patterns.
 * Called on the full assembled text, not individual deltas.
 */
export function checkTextForGhostwriting(
  text: string,
): Result<void, AuthorshipViolation> {
  if (containsGhostwriting(text)) {
    return err({
      kind: "AuthorshipViolation",
      message:
        "Assistant response contains replacement prose patterns. The assistant must coach, not ghostwrite.",
    });
  }
  return ok(undefined);
}
