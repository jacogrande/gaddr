import { describe, expect, test } from "bun:test";
import { CoachingResultSchema } from "../../src/domain/coaching/schemas";
import { validateCoachingResult } from "../../src/domain/coaching/pipeline";
import { extractJson } from "../../src/infra/llm/extract-json";
import type { DetectedClaim } from "../../src/domain/claims/claim";

const KNOWN_CLAIMS: readonly DetectedClaim[] = [
  { quotedText: "Global temperatures have risen 1.1C since pre-industrial times", claimType: "factual", confidence: 0.95 },
  { quotedText: "This warming leads to more frequent extreme weather events", claimType: "causal", confidence: 0.82 },
  { quotedText: "Carbon pricing is the most effective policy response", claimType: "evaluative", confidence: 0.71 },
];

const REALISTIC_RESPONSE = {
  notes: [
    {
      claimQuotedText: "Global temperatures have risen 1.1C since pre-industrial times",
      note: "This is specific and well-supported. Nice work.",
      category: "strong-point",
    },
    {
      claimQuotedText: "This warming leads to more frequent extreme weather events",
      note: "Interesting point. What would someone who disagrees say?",
      category: "counterargument",
    },
    {
      claimQuotedText: "Carbon pricing is the most effective policy response",
      note: "This is a bold claim \u2014 got a source to back it up?",
      category: "needs-evidence",
    },
    {
      claimQuotedText: "Carbon pricing is the most effective policy response",
      note: "I see the starting point and the conclusion, but what connects them?",
      category: "logic-gap",
    },
  ],
};

describe("contract: coaching response parsing", () => {
  test("realistic multi-category response parses through schema", () => {
    const result = CoachingResultSchema.safeParse(REALISTIC_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toHaveLength(4);
    }
  });

  test("all four categories are accepted", () => {
    const categories = REALISTIC_RESPONSE.notes.map((n) => n.category);
    expect(categories).toContain("strong-point");
    expect(categories).toContain("counterargument");
    expect(categories).toContain("needs-evidence");
    expect(categories).toContain("logic-gap");
  });

  test("extra fields are stripped", () => {
    const withExtras = {
      notes: [
        {
          claimQuotedText: "Global temperatures have risen 1.1C since pre-industrial times",
          note: "Nice work!",
          category: "strong-point",
          extraField: "should be stripped",
        },
      ],
    };
    const result = CoachingResultSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
  });

  test("invalid category rejected", () => {
    const invalid = {
      notes: [
        {
          claimQuotedText: "Some claim",
          note: "A note",
          category: "praise",
        },
      ],
    };
    const result = CoachingResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("full pipeline: extractJson + parse + schema + validate", () => {
    const llmText = `Here are the coaching notes:\n\`\`\`json\n${JSON.stringify(REALISTIC_RESPONSE)}\n\`\`\``;
    const jsonStr = extractJson(llmText);
    const parsed = JSON.parse(jsonStr) as unknown;
    const schema = CoachingResultSchema.safeParse(parsed);
    expect(schema.success).toBe(true);
    if (schema.success) {
      const validated = validateCoachingResult(schema.data, KNOWN_CLAIMS);
      expect(validated.notes).toHaveLength(4);
      expect(validated.notes[0]?.category).toBe("strong-point");
    }
  });

  test("validate filters notes referencing unknown claims", () => {
    const withUnknown = {
      notes: [
        {
          claimQuotedText: "Global temperatures have risen 1.1C since pre-industrial times",
          note: "Nice!",
          category: "strong-point",
        },
        {
          claimQuotedText: "This claim is not in the known list",
          note: "Should be filtered",
          category: "needs-evidence",
        },
      ],
    };
    const schema = CoachingResultSchema.safeParse(withUnknown);
    expect(schema.success).toBe(true);
    if (schema.success) {
      const validated = validateCoachingResult(schema.data, KNOWN_CLAIMS);
      expect(validated.notes).toHaveLength(1);
    }
  });
});
