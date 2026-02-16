import { describe, expect, test } from "bun:test";
import {
  TipTapDocSchema,
  UpdateEssayInputSchema,
} from "../../../src/domain/essay/schemas";

// ── TipTapDocSchema ──

describe("TipTapDocSchema", () => {
  test("accepts valid doc with no content", () => {
    const result = TipTapDocSchema.safeParse({ type: "doc" });
    expect(result.success).toBe(true);
  });

  test("accepts valid doc with content array", () => {
    const result = TipTapDocSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects non-doc type", () => {
    const result = TipTapDocSchema.safeParse({ type: "paragraph" });
    expect(result.success).toBe(false);
  });

  test("rejects non-object", () => {
    const result = TipTapDocSchema.safeParse("not an object");
    expect(result.success).toBe(false);
  });

  test("rejects content items missing type field", () => {
    const result = TipTapDocSchema.safeParse({
      type: "doc",
      content: [{ text: "orphan text" }],
    });
    expect(result.success).toBe(false);
  });

  test("accepts valid nested structure with marks", () => {
    const result = TipTapDocSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "bold item",
                      marks: [{ type: "bold" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ── UpdateEssayInputSchema ──

describe("UpdateEssayInputSchema", () => {
  test("accepts title-only update", () => {
    const result = UpdateEssayInputSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  test("accepts content-only update", () => {
    const result = UpdateEssayInputSchema.safeParse({
      content: { type: "doc", content: [] },
    });
    expect(result.success).toBe(true);
  });

  test("accepts both title and content", () => {
    const result = UpdateEssayInputSchema.safeParse({
      title: "Title",
      content: { type: "doc" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty update (no title or content)", () => {
    const result = UpdateEssayInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
