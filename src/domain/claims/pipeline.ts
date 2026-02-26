// Claim detection pipeline — domain orchestration, no framework imports

import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import type { ClaimDetectionRequest } from "./port";
import type { ClaimDetectionResult, DetectedClaim } from "./claim";
import { ok, err } from "../types/result";

export const MIN_WORDS_FOR_DETECTION = 20;
export const MAX_CLAIMS = 10;

/**
 * Count words in a plain text string.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Validates that essay text is suitable for claim detection.
 * Computes word count from the text — never trusts client-supplied values.
 */
export function prepareClaimDetectionRequest(
  essayText: string,
): Result<ClaimDetectionRequest, ValidationError> {
  const wc = countWords(essayText);

  if (wc < MIN_WORDS_FOR_DETECTION) {
    return err({
      kind: "ValidationError",
      message: `Need at least ${String(MIN_WORDS_FOR_DETECTION)} words for claim detection`,
    });
  }

  return ok({ essayText, wordCount: wc });
}

/**
 * Stable dedup key: lowercase, trimmed, whitespace-normalized.
 */
export function claimKey(claim: DetectedClaim): string {
  return claim.quotedText.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Filters invalid claims, deduplicates by normalized key, and caps at MAX_CLAIMS.
 */
export function validateClaimDetectionResult(
  result: ClaimDetectionResult,
): ClaimDetectionResult {
  const valid = result.claims.filter(
    (c) =>
      c.quotedText.trim().length > 0 &&
      c.confidence >= 0 &&
      c.confidence <= 1,
  );

  // Dedup by normalized key — LLMs sometimes return near-duplicate claims
  const seen = new Set<string>();
  const deduped = valid.filter((c) => {
    const key = claimKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { claims: deduped.slice(0, MAX_CLAIMS) };
}
