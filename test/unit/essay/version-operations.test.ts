import { describe, expect, test } from "bun:test";
import {
  createVersionSnapshot,
  diffVersions,
} from "../../../src/domain/essay/version-operations";
import type { Essay, TipTapDoc, TipTapNode } from "../../../src/domain/essay/essay";
import type { EssayId, EssayVersionId, UserId } from "../../../src/domain/types/branded";

const TEST_ESSAY_ID = "550e8400-e29b-41d4-a716-446655440000" as EssayId;
const TEST_VERSION_ID = "660e8400-e29b-41d4-a716-446655440001" as EssayVersionId;
const TEST_USER_ID = "test-user-123" as UserId;
const NOW = new Date("2026-01-15T12:00:00Z");
const LATER = new Date("2026-01-15T12:05:00Z");

function makePublishedEssay(overrides?: Partial<Essay>): Essay {
  return {
    id: TEST_ESSAY_ID,
    userId: TEST_USER_ID,
    title: "Test Essay",
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ],
    },
    status: "published",
    createdAt: NOW,
    updatedAt: LATER,
    publishedAt: LATER,
    ...overrides,
  };
}

function p(text: string): TipTapNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function doc(...blocks: TipTapNode[]): TipTapDoc {
  return { type: "doc", content: blocks };
}

// ── createVersionSnapshot ──

describe("createVersionSnapshot", () => {
  test("captures all essay fields correctly", () => {
    const essay = makePublishedEssay();
    const version = createVersionSnapshot({
      id: TEST_VERSION_ID,
      essay,
      versionNumber: 1,
      now: LATER,
    });

    expect(version.id).toBe(TEST_VERSION_ID);
    expect(version.essayId).toBe(TEST_ESSAY_ID);
    expect(version.userId).toBe(TEST_USER_ID);
    expect(version.versionNumber).toBe(1);
    expect(version.title).toBe("Test Essay");
    expect(version.content).toEqual(essay.content);
    expect(version.publishedAt).toBe(LATER);
  });

  test("sets versionNumber and publishedAt from params", () => {
    const essay = makePublishedEssay();
    const ts = new Date("2026-02-01T00:00:00Z");
    const version = createVersionSnapshot({
      id: TEST_VERSION_ID,
      essay,
      versionNumber: 5,
      now: ts,
    });

    expect(version.versionNumber).toBe(5);
    expect(version.publishedAt).toBe(ts);
  });

  test("content is a faithful copy of the essay TipTap doc", () => {
    const richContent: TipTapDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body paragraph." }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [
            { type: "paragraph", content: [{ type: "text", text: "Item 1" }] },
          ]},
        ]},
      ],
    };
    const essay = makePublishedEssay({ content: richContent });
    const version = createVersionSnapshot({
      id: TEST_VERSION_ID,
      essay,
      versionNumber: 1,
      now: NOW,
    });

    expect(version.content).toEqual(richContent);
  });
});

// ── diffVersions ──

describe("diffVersions", () => {
  test("identical documents → all unchanged", () => {
    const d = doc(p("Hello"), p("World"));
    const diffs = diffVersions(d, d);

    expect(diffs).toHaveLength(2);
    expect(diffs.every((d) => d.kind === "unchanged")).toBe(true);
  });

  test("added blocks at end → added entries", () => {
    const before = doc(p("Hello"));
    const after = doc(p("Hello"), p("World"));
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(2);
    const d0 = diffs[0];
    const d1 = diffs[1];
    expect(d0?.kind).toBe("unchanged");
    expect(d1?.kind).toBe("added");
    if (d1?.kind === "added") {
      expect(d1.block).toEqual(p("World"));
    }
  });

  test("removed blocks → removed entries", () => {
    const before = doc(p("Hello"), p("World"));
    const after = doc(p("Hello"));
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(2);
    const d0 = diffs[0];
    const d1 = diffs[1];
    expect(d0?.kind).toBe("unchanged");
    expect(d1?.kind).toBe("removed");
    if (d1?.kind === "removed") {
      expect(d1.block).toEqual(p("World"));
    }
  });

  test("modified block (same position, different text) → modified with before/after", () => {
    const before = doc(p("Hello"));
    const after = doc(p("Goodbye"));
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(1);
    const d0 = diffs[0];
    expect(d0?.kind).toBe("modified");
    if (d0?.kind === "modified") {
      expect(d0.before).toEqual(p("Hello"));
      expect(d0.after).toEqual(p("Goodbye"));
    }
  });

  test("mixed changes (add + remove + modify + unchanged)", () => {
    const before = doc(p("Keep"), p("Modify"), p("Remove"));
    const after = doc(p("Keep"), p("Modified text"), p("Added"));
    const diffs = diffVersions(before, after);

    // "Keep" → unchanged
    // "Modify" removed + "Modified text" added → modified (same type)
    // "Remove" removed + "Added" added → modified (same type)
    expect(diffs[0]?.kind).toBe("unchanged");
    expect(diffs[1]?.kind).toBe("modified");
    expect(diffs[2]?.kind).toBe("modified");
  });

  test("empty documents → empty diff", () => {
    const empty: TipTapDoc = { type: "doc" };
    const diffs = diffVersions(empty, empty);
    expect(diffs).toHaveLength(0);
  });

  test("empty content arrays → empty diff", () => {
    const empty: TipTapDoc = { type: "doc", content: [] };
    const diffs = diffVersions(empty, empty);
    expect(diffs).toHaveLength(0);
  });

  test("empty before, content after → all added", () => {
    const before: TipTapDoc = { type: "doc" };
    const after = doc(p("Hello"), p("World"));
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(2);
    expect(diffs.every((d) => d.kind === "added")).toBe(true);
  });

  test("content before, empty after → all removed", () => {
    const before = doc(p("Hello"), p("World"));
    const after: TipTapDoc = { type: "doc" };
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(2);
    expect(diffs.every((d) => d.kind === "removed")).toBe(true);
  });

  test("block inserted in the middle", () => {
    const before = doc(p("First"), p("Last"));
    const after = doc(p("First"), p("Middle"), p("Last"));
    const diffs = diffVersions(before, after);

    expect(diffs).toHaveLength(3);
    expect(diffs[0]?.kind).toBe("unchanged"); // First
    expect(diffs[1]?.kind).toBe("added");     // Middle
    expect(diffs[2]?.kind).toBe("unchanged"); // Last
  });

  test("different block types are not merged into modified", () => {
    const before = doc(p("Text"));
    const heading: TipTapNode = {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Title" }],
    };
    const after = doc(heading);
    const diffs = diffVersions(before, after);

    // paragraph removed, heading added — different types, not merged
    expect(diffs).toHaveLength(2);
    expect(diffs[0]?.kind).toBe("removed");
    expect(diffs[1]?.kind).toBe("added");
  });
});
