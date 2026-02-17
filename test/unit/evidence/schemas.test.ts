import { describe, expect, test } from "bun:test";
import {
  StanceSchema,
  CreateEvidenceCardInputSchema,
  UpdateEvidenceCardInputSchema,
  AttachEvidenceInputSchema,
} from "../../../src/domain/evidence/schemas";

describe("StanceSchema", () => {
  test("accepts supports", () => {
    expect(StanceSchema.safeParse("supports").success).toBe(true);
  });

  test("accepts complicates", () => {
    expect(StanceSchema.safeParse("complicates").success).toBe(true);
  });

  test("accepts contradicts", () => {
    expect(StanceSchema.safeParse("contradicts").success).toBe(true);
  });

  test("rejects invalid stance", () => {
    expect(StanceSchema.safeParse("neutral").success).toBe(false);
  });
});

describe("CreateEvidenceCardInputSchema", () => {
  const validInput = {
    sourceUrl: "https://example.com",
    sourceTitle: "Title",
    quoteSnippet: "A quote",
    stance: "supports" as const,
  };

  test("accepts valid input with quote", () => {
    expect(CreateEvidenceCardInputSchema.safeParse(validInput).success).toBe(true);
  });

  test("accepts valid input with summary", () => {
    const input = { ...validInput, quoteSnippet: null, userSummary: "Summary" };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(true);
  });

  test("accepts valid input with both", () => {
    const input = { ...validInput, userSummary: "Summary" };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(true);
  });

  test("rejects when neither quote nor summary", () => {
    const input = { ...validInput, quoteSnippet: null };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects invalid URL", () => {
    const input = { ...validInput, sourceUrl: "ftp://bad" };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects empty title", () => {
    const input = { ...validInput, sourceTitle: "" };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects invalid stance", () => {
    const input = { ...validInput, stance: "neutral" };
    expect(CreateEvidenceCardInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("UpdateEvidenceCardInputSchema", () => {
  test("accepts single field update", () => {
    expect(
      UpdateEvidenceCardInputSchema.safeParse({ sourceTitle: "New Title" }).success,
    ).toBe(true);
  });

  test("accepts stance update", () => {
    expect(
      UpdateEvidenceCardInputSchema.safeParse({ stance: "contradicts" }).success,
    ).toBe(true);
  });

  test("rejects empty object", () => {
    expect(UpdateEvidenceCardInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("AttachEvidenceInputSchema", () => {
  const validInput = {
    evidenceCardId: "550e8400-e29b-41d4-a716-446655440000",
    claimText: "This is a claim",
    anchorBlockIndex: 0,
  };

  test("accepts valid input", () => {
    expect(AttachEvidenceInputSchema.safeParse(validInput).success).toBe(true);
  });

  test("rejects invalid UUID", () => {
    const input = { ...validInput, evidenceCardId: "not-a-uuid" };
    expect(AttachEvidenceInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects empty claim text", () => {
    const input = { ...validInput, claimText: "" };
    expect(AttachEvidenceInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects negative block index", () => {
    const input = { ...validInput, anchorBlockIndex: -1 };
    expect(AttachEvidenceInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects non-integer block index", () => {
    const input = { ...validInput, anchorBlockIndex: 1.5 };
    expect(AttachEvidenceInputSchema.safeParse(input).success).toBe(false);
  });
});
