import { describe, expect, test } from "bun:test";
import {
  prepareClaimDetectionRequest,
  validateClaimDetectionResult,
  claimKey,
  countWords,
  MIN_WORDS_FOR_DETECTION,
  MAX_CLAIMS,
} from "../../../src/domain/claims/pipeline";
import type { DetectedClaim, ClaimDetectionResult } from "../../../src/domain/claims/claim";

// ── countWords ──

describe("countWords", () => {
  test("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  test("returns 0 for whitespace-only string", () => {
    expect(countWords("   ")).toBe(0);
  });

  test("counts words correctly", () => {
    expect(countWords("one two three")).toBe(3);
  });

  test("handles extra whitespace", () => {
    expect(countWords("  one   two  three  ")).toBe(3);
  });
});

// ── prepareClaimDetectionRequest ──

describe("prepareClaimDetectionRequest", () => {
  test("rejects text below minimum word count", () => {
    const result = prepareClaimDetectionRequest("short text");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.message).toContain(String(MIN_WORDS_FOR_DETECTION));
    }
  });

  test("accepts text at minimum word count", () => {
    const text = Array.from({ length: MIN_WORDS_FOR_DETECTION }, () => "word").join(" ");
    const result = prepareClaimDetectionRequest(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.essayText).toBe(text);
      expect(result.value.wordCount).toBe(MIN_WORDS_FOR_DETECTION);
    }
  });

  test("computes word count from text", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty";
    const result = prepareClaimDetectionRequest(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.wordCount).toBe(20);
    }
  });
});

// ── validateClaimDetectionResult ──

describe("validateClaimDetectionResult", () => {
  test("filters claims with empty quoted text", () => {
    const input: ClaimDetectionResult = {
      claims: [
        { quotedText: "valid claim", claimType: "factual", confidence: 0.9 },
        { quotedText: "", claimType: "causal", confidence: 0.8 },
        { quotedText: "   ", claimType: "evaluative", confidence: 0.7 },
      ],
    };
    const result = validateClaimDetectionResult(input);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]?.quotedText).toBe("valid claim");
  });

  test("filters claims with out-of-range confidence", () => {
    const input: ClaimDetectionResult = {
      claims: [
        { quotedText: "good claim", claimType: "factual", confidence: 0.5 },
        { quotedText: "too high", claimType: "causal", confidence: 1.5 },
        { quotedText: "negative", claimType: "evaluative", confidence: -0.1 },
      ],
    };
    const result = validateClaimDetectionResult(input);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]?.quotedText).toBe("good claim");
  });

  test("deduplicates claims by normalized key", () => {
    const input: ClaimDetectionResult = {
      claims: [
        { quotedText: "The earth is round", claimType: "factual", confidence: 0.9 },
        { quotedText: "the earth is round", claimType: "factual", confidence: 0.85 },
        { quotedText: "  The  Earth  Is  Round  ", claimType: "factual", confidence: 0.8 },
      ],
    };
    const result = validateClaimDetectionResult(input);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]?.quotedText).toBe("The earth is round");
  });

  test("caps at MAX_CLAIMS", () => {
    const claims: DetectedClaim[] = Array.from(
      { length: MAX_CLAIMS + 5 },
      (_, i) => ({
        quotedText: `claim ${String(i)}`,
        claimType: "factual" as const,
        confidence: 0.9,
      }),
    );
    const result = validateClaimDetectionResult({ claims });
    expect(result.claims).toHaveLength(MAX_CLAIMS);
  });

  test("passes through valid claims unchanged", () => {
    const input: ClaimDetectionResult = {
      claims: [
        { quotedText: "The earth orbits the sun", claimType: "factual", confidence: 0.95 },
        { quotedText: "This causes warming", claimType: "causal", confidence: 0.8 },
      ],
    };
    const result = validateClaimDetectionResult(input);
    expect(result.claims).toHaveLength(2);
  });
});

// ── claimKey ──

describe("claimKey", () => {
  test("normalizes whitespace", () => {
    const claim: DetectedClaim = {
      quotedText: "  multiple   spaces   here  ",
      claimType: "factual",
      confidence: 0.9,
    };
    expect(claimKey(claim)).toBe("multiple spaces here");
  });

  test("lowercases text", () => {
    const claim: DetectedClaim = {
      quotedText: "The Earth Is Round",
      claimType: "factual",
      confidence: 0.9,
    };
    expect(claimKey(claim)).toBe("the earth is round");
  });

  test("trims leading and trailing whitespace", () => {
    const claim: DetectedClaim = {
      quotedText: "  trimmed  ",
      claimType: "factual",
      confidence: 0.9,
    };
    expect(claimKey(claim)).toBe("trimmed");
  });
});
