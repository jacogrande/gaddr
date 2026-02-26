import { describe, expect, test } from "bun:test";
import {
  DetectedClaimSchema,
  ClaimDetectionResultSchema,
  ClaimDetectRequestSchema,
} from "../../../src/domain/claims/schemas";

// ── DetectedClaimSchema ──

describe("DetectedClaimSchema", () => {
  test("accepts valid factual claim", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "The global temperature has risen by 1.1°C",
      claimType: "factual",
      confidence: 0.95,
    });
    expect(result.success).toBe(true);
  });

  test("accepts valid causal claim", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "This leads to increased flooding",
      claimType: "causal",
      confidence: 0.7,
    });
    expect(result.success).toBe(true);
  });

  test("accepts valid evaluative claim", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "This policy is the best approach",
      claimType: "evaluative",
      confidence: 0.6,
    });
    expect(result.success).toBe(true);
  });

  test("accepts valid definitional claim", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "Democracy means rule by the people",
      claimType: "definitional",
      confidence: 0.85,
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty quotedText", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "",
      claimType: "factual",
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid claimType", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "Some claim",
      claimType: "opinion",
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });

  test("rejects confidence above 1", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "Some claim",
      claimType: "factual",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects confidence below 0", () => {
    const result = DetectedClaimSchema.safeParse({
      quotedText: "Some claim",
      claimType: "factual",
      confidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  test("accepts confidence at boundaries (0 and 1)", () => {
    expect(DetectedClaimSchema.safeParse({
      quotedText: "Zero confidence",
      claimType: "factual",
      confidence: 0,
    }).success).toBe(true);

    expect(DetectedClaimSchema.safeParse({
      quotedText: "Full confidence",
      claimType: "factual",
      confidence: 1,
    }).success).toBe(true);
  });
});

// ── ClaimDetectionResultSchema ──

describe("ClaimDetectionResultSchema", () => {
  test("accepts valid result with multiple claims", () => {
    const result = ClaimDetectionResultSchema.safeParse({
      claims: [
        { quotedText: "Claim one", claimType: "factual", confidence: 0.9 },
        { quotedText: "Claim two", claimType: "causal", confidence: 0.8 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty claims array", () => {
    const result = ClaimDetectionResultSchema.safeParse({ claims: [] });
    expect(result.success).toBe(true);
  });

  test("rejects missing claims field", () => {
    const result = ClaimDetectionResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── ClaimDetectRequestSchema ──

describe("ClaimDetectRequestSchema", () => {
  test("accepts valid request", () => {
    const result = ClaimDetectRequestSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "Some essay text here",
    });
    expect(result.success).toBe(true);
  });

  test("rejects non-UUID essayId", () => {
    const result = ClaimDetectRequestSchema.safeParse({
      essayId: "not-a-uuid",
      essayText: "Some text",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty essayText", () => {
    const result = ClaimDetectRequestSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects essayText exceeding 10KB", () => {
    const result = ClaimDetectRequestSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "x".repeat(10_001),
    });
    expect(result.success).toBe(false);
  });

  test("does not require wordCount (computed server-side)", () => {
    const result = ClaimDetectRequestSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "Some text",
    });
    expect(result.success).toBe(true);
  });
});
