// Coaching pipeline — domain orchestration, no framework imports

import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import type { DetectedClaim } from "../claims/claim";
import type { CoachingRequest } from "./port";
import type { CoachingNote, CoachingResult } from "./coaching";
import { ok, err } from "../types/result";

export const MAX_COACHING_NOTES = 5;

/**
 * Validates that claims are present before requesting coaching.
 */
export function prepareCoachingRequest(
  essayText: string,
  claims: readonly DetectedClaim[],
): Result<CoachingRequest, ValidationError> {
  if (claims.length === 0) {
    return err({
      kind: "ValidationError",
      message: "Need at least one claim for coaching",
    });
  }

  // Cap at MAX_COACHING_NOTES claims, keeping the highest-confidence ones
  // to keep the prompt focused and token spend predictable
  const capped = claims.length <= MAX_COACHING_NOTES
    ? claims
    : [...claims].sort((a, b) => b.confidence - a.confidence).slice(0, MAX_COACHING_NOTES);

  return ok({ essayText, claims: capped });
}

/**
 * Stable dedup key: lowercase claimQuotedText + category.
 */
export function coachingNoteKey(note: CoachingNote): string {
  return `${note.claimQuotedText.trim().toLowerCase().replace(/\s+/g, " ")}::${note.category}`;
}

/**
 * Filters invalid notes, deduplicates, and caps at MAX_COACHING_NOTES.
 * 1. Filters notes with empty claimQuotedText or note text
 * 2. Filters notes whose claimQuotedText doesn't match any known claim
 * 3. Deduplicates by normalized claimQuotedText + category
 * 4. Caps at MAX_COACHING_NOTES
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateCoachingResult(
  result: CoachingResult,
  knownClaims: readonly DetectedClaim[],
): CoachingResult {
  // Build lookup from normalized text → original claim quotedText
  const claimByNormalized = new Map<string, string>();
  for (const c of knownClaims) {
    claimByNormalized.set(normalizeText(c.quotedText), c.quotedText);
  }

  // Filter, match to original casing, dedup
  const valid: CoachingNote[] = [];
  for (const n of result.notes) {
    if (n.claimQuotedText.trim().length === 0 || n.note.trim().length === 0) continue;
    const originalText = claimByNormalized.get(normalizeText(n.claimQuotedText));
    if (originalText === undefined) continue;
    // Restore original casing so UI Map lookup works with exact string equality
    valid.push({ ...n, claimQuotedText: originalText });
  }

  // Dedup by normalized key
  const seen = new Set<string>();
  const deduped = valid.filter((n) => {
    const key = coachingNoteKey(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { notes: deduped.slice(0, MAX_COACHING_NOTES) };
}
