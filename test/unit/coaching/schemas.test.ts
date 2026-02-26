import { describe, expect, test } from "bun:test";
import { CoachingNoteSchema, CoachingResultSchema, CoachingRequestApiSchema } from "../../../src/domain/coaching/schemas";

// ── CoachingNoteSchema ──

describe("CoachingNoteSchema", () => {
  test("accepts all 4 categories", () => {
    const categories = ["needs-evidence", "counterargument", "logic-gap", "strong-point"] as const;
    for (const category of categories) {
      const result = CoachingNoteSchema.safeParse({
        claimQuotedText: "Some claim",
        note: "A coaching note",
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects empty claimQuotedText", () => {
    const result = CoachingNoteSchema.safeParse({
      claimQuotedText: "",
      note: "A note",
      category: "needs-evidence",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty note", () => {
    const result = CoachingNoteSchema.safeParse({
      claimQuotedText: "Some claim",
      note: "",
      category: "needs-evidence",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid category", () => {
    const result = CoachingNoteSchema.safeParse({
      claimQuotedText: "Some claim",
      note: "A note",
      category: "invalid-category",
    });
    expect(result.success).toBe(false);
  });
});

// ── CoachingResultSchema ──

describe("CoachingResultSchema", () => {
  test("accepts result with multiple notes", () => {
    const result = CoachingResultSchema.safeParse({
      notes: [
        { claimQuotedText: "Claim 1", note: "Note 1", category: "needs-evidence" },
        { claimQuotedText: "Claim 2", note: "Note 2", category: "strong-point" },
        { claimQuotedText: "Claim 3", note: "Note 3", category: "counterargument" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toHaveLength(3);
    }
  });

  test("accepts empty notes array", () => {
    const result = CoachingResultSchema.safeParse({ notes: [] });
    expect(result.success).toBe(true);
  });

  test("rejects missing notes field", () => {
    const result = CoachingResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── CoachingRequestApiSchema ──

describe("CoachingRequestApiSchema", () => {
  test("accepts valid request", () => {
    const result = CoachingRequestApiSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "Some essay text",
      claims: [
        { quotedText: "A claim", claimType: "factual", confidence: 0.9 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid essayId", () => {
    const result = CoachingRequestApiSchema.safeParse({
      essayId: "not-a-uuid",
      essayText: "Some text",
      claims: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty essayText", () => {
    const result = CoachingRequestApiSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "",
      claims: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects essayText exceeding 10KB", () => {
    const result = CoachingRequestApiSchema.safeParse({
      essayId: "550e8400-e29b-41d4-a716-446655440000",
      essayText: "x".repeat(10_001),
      claims: [],
    });
    expect(result.success).toBe(false);
  });
});
