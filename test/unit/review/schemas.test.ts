import { describe, expect, test } from "bun:test";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  RubricScoreSchema,
  ReviewRequestSchema,
} from "../../../src/domain/review/schemas";

// ── InlineCommentSchema ──

describe("InlineCommentSchema", () => {
  test("valid inline comment parses successfully", () => {
    const result = InlineCommentSchema.safeParse({
      quotedText: "The data clearly shows",
      problem: "Vague claim",
      why: "Readers cannot verify",
      question: "Which data?",
      suggestedAction: "Specify the source",
    });
    expect(result.success).toBe(true);
  });

  test("missing required field fails", () => {
    const result = InlineCommentSchema.safeParse({
      quotedText: "The data clearly shows",
      problem: "Vague claim",
      // missing why, question, suggestedAction
    });
    expect(result.success).toBe(false);
  });
});

// ── ReviewIssueSchema ──

describe("ReviewIssueSchema", () => {
  test("valid issue with valid tag/severity parses", () => {
    const result = ReviewIssueSchema.safeParse({
      tag: "evidence",
      severity: "high",
      description: "No citations",
      suggestedAction: "Add sources",
    });
    expect(result.success).toBe(true);
  });

  test("invalid tag fails", () => {
    const result = ReviewIssueSchema.safeParse({
      tag: "grammar",
      severity: "high",
      description: "Bad grammar",
      suggestedAction: "Fix grammar",
    });
    expect(result.success).toBe(false);
  });
});

// ── RubricScoreSchema ──

describe("RubricScoreSchema", () => {
  test("valid rubric score with valid dimension and score range", () => {
    const result = RubricScoreSchema.safeParse({
      dimension: "clarity",
      score: 4,
      rationale: "Well-structured paragraphs",
    });
    expect(result.success).toBe(true);
  });

  test("out-of-range score fails", () => {
    const result = RubricScoreSchema.safeParse({
      dimension: "clarity",
      score: 6,
      rationale: "Too high",
    });
    expect(result.success).toBe(false);
  });
});

// ── ReviewRequestSchema ──

describe("ReviewRequestSchema", () => {
  test("validates correct input", () => {
    const result = ReviewRequestSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  test("rejects non-UUID essayId", () => {
    const result = ReviewRequestSchema.safeParse({
      essayId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
