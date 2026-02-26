import { describe, expect, test } from "bun:test";
import { ClaimDetectionResultSchema } from "../../src/domain/claims/schemas";
import { validateClaimDetectionResult } from "../../src/domain/claims/pipeline";
import { extractJson } from "../../src/infra/llm/extract-json";

// ── extractJson ──

describe("extractJson", () => {
  test("extracts JSON from markdown code fence with json label", () => {
    const input = '```json\n{"claims": []}\n```';
    expect(extractJson(input)).toBe('{"claims": []}');
  });

  test("extracts JSON from markdown code fence without label", () => {
    const input = '```\n{"claims": []}\n```';
    expect(extractJson(input)).toBe('{"claims": []}');
  });

  test("returns raw text when no code fence", () => {
    const input = '{"claims": []}';
    expect(extractJson(input)).toBe('{"claims": []}');
  });

  test("trims whitespace from raw text", () => {
    const input = '  \n{"claims": []}\n  ';
    expect(extractJson(input)).toBe('{"claims": []}');
  });

  test("handles code fence with extra whitespace", () => {
    const input = '```json\n  {"claims": []}  \n```';
    expect(extractJson(input)).toBe('{"claims": []}');
  });

  test("extracts first code fence when multiple present", () => {
    const input = 'Here is the result:\n```json\n{"claims": []}\n```\nDone.';
    expect(extractJson(input)).toBe('{"claims": []}');
  });
});

// ── Realistic LLM output parsing ──

describe("contract: claim detection response parsing", () => {
  const REALISTIC_RESPONSE = {
    claims: [
      {
        quotedText: "Global temperatures have risen 1.1°C since pre-industrial times",
        claimType: "factual",
        confidence: 0.95,
      },
      {
        quotedText: "This warming leads to more frequent extreme weather events",
        claimType: "causal",
        confidence: 0.82,
      },
      {
        quotedText: "Carbon pricing is the most effective policy response",
        claimType: "evaluative",
        confidence: 0.71,
      },
      {
        quotedText: "Climate justice means equitable distribution of both costs and benefits",
        claimType: "definitional",
        confidence: 0.88,
      },
    ],
  };

  test("realistic multi-type response parses through schema", () => {
    const result = ClaimDetectionResultSchema.safeParse(REALISTIC_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claims).toHaveLength(4);
    }
  });

  test("all four claim types are accepted", () => {
    const types = REALISTIC_RESPONSE.claims.map((c) => c.claimType);
    expect(types).toEqual(["factual", "causal", "evaluative", "definitional"]);

    for (const claim of REALISTIC_RESPONSE.claims) {
      const result = ClaimDetectionResultSchema.safeParse({ claims: [claim] });
      expect(result.success).toBe(true);
    }
  });

  test("empty claims array is accepted", () => {
    const result = ClaimDetectionResultSchema.safeParse({ claims: [] });
    expect(result.success).toBe(true);
  });

  test("extra unknown fields are stripped (Zod default)", () => {
    const withExtras = {
      claims: [
        {
          quotedText: "Some claim",
          claimType: "factual",
          confidence: 0.9,
          extraField: "should be stripped",
          anotherExtra: 42,
        },
      ],
    };
    const result = ClaimDetectionResultSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
  });

  test("invalid claimType value fails gracefully", () => {
    const invalid = {
      claims: [
        {
          quotedText: "Some claim",
          claimType: "opinion",
          confidence: 0.9,
        },
      ],
    };
    const result = ClaimDetectionResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("validateClaimDetectionResult filters and caps realistic output", () => {
    const result = ClaimDetectionResultSchema.safeParse(REALISTIC_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success) {
      const validated = validateClaimDetectionResult(result.data);
      expect(validated.claims).toHaveLength(4);
      expect(validated.claims[0]?.claimType).toBe("factual");
    }
  });

  test("full pipeline: extractJson → parse → validate", () => {
    const llmText = `Here are the claims I identified:\n\`\`\`json\n${JSON.stringify(REALISTIC_RESPONSE)}\n\`\`\``;
    const jsonStr = extractJson(llmText);
    const parsed = JSON.parse(jsonStr) as unknown;
    const schema = ClaimDetectionResultSchema.safeParse(parsed);
    expect(schema.success).toBe(true);
    if (schema.success) {
      const validated = validateClaimDetectionResult(schema.data);
      expect(validated.claims).toHaveLength(4);
    }
  });
});
