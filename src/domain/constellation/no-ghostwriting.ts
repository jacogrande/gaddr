/**
 * The no-ghostwriting invariant, enforced in pure validation logic rather than
 * left to prompt wording (architecture.md §6.6).
 *
 * A finding may point at the draft, ask a question, or compare the writer's
 * position to a source. It may NOT carry replacement prose for the writer's
 * sentences. We can't perfectly detect "this is ghostwriting", but we can
 * enforce the structural guards that make it impossible to smuggle a drafted
 * paragraph through as a finding:
 *
 *  - a finding's note is bounded in length (it points, it doesn't author)
 *  - `sourced` findings must actually carry a source (provenance completeness)
 *  - assumptions and counter-positions must be posed as questions, not verdicts
 *
 * Findings that fail validation are dropped before they reach the substrate.
 */

import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type { ValidationError } from "../types/errors";
import type { Finding } from "./types";

/**
 * Notes are pointers and questions, not prose. A genuine finding note is a
 * sentence or two; anything longer is almost certainly drafted continuation.
 */
export const NOTE_MAX_CHARS = 280;

function invalid(message: string): Result<Finding, ValidationError> {
  return err({ kind: "ValidationError", message, field: "finding" });
}

export function validateFinding(
  finding: Finding,
): Result<Finding, ValidationError> {
  if (finding.pointer.trim().length === 0) {
    return invalid("Finding must point at something in the draft");
  }
  const note = finding.note.trim();
  if (note.length === 0) {
    return invalid("Finding must carry a note");
  }
  if (note.length > NOTE_MAX_CHARS) {
    return invalid(
      `Finding note exceeds ${String(NOTE_MAX_CHARS)} chars — findings point, they don't author`,
    );
  }
  if (finding.tier === "sourced" && !finding.source) {
    return invalid("A sourced finding must carry its source span");
  }
  if (
    (finding.kind === "citation" || finding.kind === "further-reading") &&
    finding.tier !== "sourced"
  ) {
    return invalid(
      "Citations and further-reading must be sourced — no speculative attribution",
    );
  }
  if (
    (finding.kind === "assumption" || finding.kind === "counter-position") &&
    !note.endsWith("?")
  ) {
    return invalid(
      "Assumptions and counter-positions must be posed as questions, not verdicts",
    );
  }
  return ok(finding);
}
