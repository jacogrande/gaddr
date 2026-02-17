import { describe, expect, test } from "bun:test";
import { extractOgDescription } from "../../../src/domain/essay/og-metadata";
import type { TipTapDoc } from "../../../src/domain/essay/essay";

describe("extractOgDescription", () => {
  test("empty doc returns empty string", () => {
    const doc: TipTapDoc = { type: "doc" };
    expect(extractOgDescription(doc)).toBe("");
  });

  test("extracts text from first paragraph", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(extractOgDescription(doc)).toBe("Hello world");
  });

  test("truncates at word boundary at 200 chars", () => {
    // Build a text that is well over 200 chars
    const longText = "The quick brown fox jumps over the lazy dog. ".repeat(10);
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: longText.trim() }],
        },
      ],
    };
    const result = extractOgDescription(doc);
    expect(result.endsWith("...")).toBe(true);
    // Must be <= 200 chars + "..." (3 chars)
    expect(result.length).toBeLessThanOrEqual(203);
    // Should not cut mid-word (no trailing partial word before ...)
    const withoutEllipsis = result.slice(0, -3);
    expect(withoutEllipsis.endsWith(" ")).toBe(false);
    expect(withoutEllipsis.at(-1)).not.toBe(" ");
  });

  test("concatenates multiple paragraphs", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph." }],
        },
      ],
    };
    expect(extractOgDescription(doc)).toBe(
      "First paragraph. Second paragraph.",
    );
  });

  test("handles mixed block types", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "A heading" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body text here." }],
        },
      ],
    };
    const result = extractOgDescription(doc);
    expect(result).toContain("A heading");
    expect(result).toContain("Body text here.");
  });
});
