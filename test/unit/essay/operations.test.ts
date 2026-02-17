import { describe, expect, test } from "bun:test";
import {
  createDraft,
  updateDraft,
  publishEssay,
  unpublishEssay,
  wordCount,
} from "../../../src/domain/essay/operations";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { Essay, TipTapDoc } from "../../../src/domain/essay/essay";
import type { EssayId } from "../../../src/domain/types/branded";
import type { UserId } from "../../../src/domain/types/branded";

const TEST_ESSAY_ID = "550e8400-e29b-41d4-a716-446655440000" as EssayId;
const TEST_USER_ID = "test-user-123" as UserId;
const NOW = new Date("2026-01-15T12:00:00Z");
const LATER = new Date("2026-01-15T12:05:00Z");

function makeDraft(overrides?: Partial<Essay>): Essay {
  return {
    id: TEST_ESSAY_ID,
    userId: TEST_USER_ID,
    title: "",
    content: { type: "doc" },
    status: "draft",
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: null,
    ...overrides,
  };
}

// ── createDraft ──

describe("createDraft", () => {
  test("produces draft with empty title and doc content", () => {
    const essay = createDraft({ id: TEST_ESSAY_ID, userId: TEST_USER_ID, now: NOW });
    expect(essay.id).toBe(TEST_ESSAY_ID);
    expect(essay.userId).toBe(TEST_USER_ID);
    expect(essay.title).toBe("");
    expect(essay.content).toEqual({ type: "doc" });
    expect(essay.status).toBe("draft");
    expect(essay.createdAt).toBe(NOW);
    expect(essay.updatedAt).toBe(NOW);
    expect(essay.publishedAt).toBeNull();
  });
});

// ── updateDraft ──

describe("updateDraft", () => {
  test("updates title, content, and updatedAt on a draft", () => {
    const draft = makeDraft();
    const newContent: TipTapDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    };
    const result = updateDraft(draft, { title: "My Essay", content: newContent, now: LATER });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.title).toBe("My Essay");
      expect(result.value.content).toEqual(newContent);
      expect(result.value.updatedAt).toBe(LATER);
    }
  });

  test("rejects update on published essay", () => {
    const published = makeDraft({ status: "published" });
    const result = updateDraft(published, { title: "New Title", now: LATER });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("status");
    }
  });

  test("rejects title > 200 chars", () => {
    const draft = makeDraft();
    const longTitle = "a".repeat(201);
    const result = updateDraft(draft, { title: longTitle, now: LATER });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("title");
    }
  });

  test("passes through unchanged fields", () => {
    const draft = makeDraft({ title: "Original" });
    const result = updateDraft(draft, { now: LATER });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.title).toBe("Original");
      expect(result.value.content).toEqual({ type: "doc" });
      expect(result.value.updatedAt).toBe(LATER);
    }
  });
});

// ── publishEssay ──

describe("publishEssay", () => {
  const PUBLISH_TIME = new Date("2026-01-15T13:00:00Z");

  test("succeeds with valid content", () => {
    const draft = makeDraft({
      title: "My Essay",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Some real content here" }] }],
      },
    });
    const result = publishEssay(draft, PUBLISH_TIME);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe("published");
      expect(result.value.publishedAt).toBe(PUBLISH_TIME);
      expect(result.value.updatedAt).toBe(PUBLISH_TIME);
    }
  });

  test("fails on empty doc", () => {
    const draft = makeDraft({ content: { type: "doc" } });
    const result = publishEssay(draft, PUBLISH_TIME);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("empty_content");
    }
  });

  test("fails on doc with empty paragraph", () => {
    const draft = makeDraft({
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    const result = publishEssay(draft, PUBLISH_TIME);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("empty_content");
    }
  });

  test("fails on already-published essay", () => {
    const published = makeDraft({
      status: "published",
      publishedAt: NOW,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Content" }] }],
      },
    });
    const result = publishEssay(published, PUBLISH_TIME);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("already_published");
    }
  });

  test("preserves id, userId, title, content, createdAt", () => {
    const content: TipTapDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
    };
    const draft = makeDraft({ title: "Keep This", content });
    const result = publishEssay(draft, PUBLISH_TIME);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe(TEST_ESSAY_ID);
      expect(result.value.userId).toBe(TEST_USER_ID);
      expect(result.value.title).toBe("Keep This");
      expect(result.value.content).toEqual(content);
      expect(result.value.createdAt).toBe(NOW);
    }
  });
});

// ── unpublishEssay ──

describe("unpublishEssay", () => {
  const UNPUBLISH_TIME = new Date("2026-01-15T14:00:00Z");

  test("succeeds from published", () => {
    const published = makeDraft({
      status: "published",
      publishedAt: NOW,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Content" }] }],
      },
    });
    const result = unpublishEssay(published, UNPUBLISH_TIME);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe("draft");
      expect(result.value.publishedAt).toBeNull();
      expect(result.value.updatedAt).toBe(UNPUBLISH_TIME);
    }
  });

  test("fails from draft", () => {
    const draft = makeDraft();
    const result = unpublishEssay(draft, UNPUBLISH_TIME);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("already_draft");
    }
  });

  test("preserves id, userId, title, content, createdAt", () => {
    const content: TipTapDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
    };
    const published = makeDraft({
      status: "published",
      publishedAt: NOW,
      title: "Keep This",
      content,
    });
    const result = unpublishEssay(published, UNPUBLISH_TIME);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe(TEST_ESSAY_ID);
      expect(result.value.userId).toBe(TEST_USER_ID);
      expect(result.value.title).toBe("Keep This");
      expect(result.value.content).toEqual(content);
      expect(result.value.createdAt).toBe(NOW);
    }
  });
});

// ── wordCount ──

describe("wordCount", () => {
  test("returns 0 for empty doc", () => {
    expect(wordCount({ type: "doc" })).toBe(0);
  });

  test("returns 0 for doc with empty content array", () => {
    expect(wordCount({ type: "doc", content: [] })).toBe(0);
  });

  test("counts words in a paragraph node", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world from Microblogger" }],
        },
      ],
    };
    expect(wordCount(doc)).toBe(4);
  });

  test("counts across nested nodes (headings, lists, blockquotes)", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "My Title" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First item" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second item" }],
                },
              ],
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "A quote here" }],
            },
          ],
        },
      ],
    };
    // "My Title" (2) + "First item" (2) + "Second item" (2) + "A quote here" (3) = 9
    expect(wordCount(doc)).toBe(9);
  });

  test("ignores non-text nodes", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        { type: "horizontalRule" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Only this" }],
        },
        { type: "hardBreak" },
      ],
    };
    expect(wordCount(doc)).toBe(2);
  });

  test("counts formatted text in single paragraph correctly", () => {
    // "Hello **bold** world" — 3 text nodes in one paragraph
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            {
              type: "text",
              text: "bold",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " world" },
          ],
        },
      ],
    };
    expect(wordCount(doc)).toBe(3);
  });

  test("does not split word at mark boundary", () => {
    // "un" + "believable" (word split across marks) → 1 word
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "un" },
            {
              type: "text",
              text: "believable",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    };
    expect(wordCount(doc)).toBe(1);
  });

  test("hardBreak between text nodes counts as word separator", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "before" },
            { type: "hardBreak" },
            { type: "text", text: "after" },
          ],
        },
      ],
    };
    expect(wordCount(doc)).toBe(2);
  });

  test("adjacent bold + italic formatting counts correctly", () => {
    // "one **two** *three* four" — mixed formatting
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "one " },
            {
              type: "text",
              text: "two",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " " },
            {
              type: "text",
              text: "three",
              marks: [{ type: "italic" }],
            },
            { type: "text", text: " four" },
          ],
        },
      ],
    };
    expect(wordCount(doc)).toBe(4);
  });
});
