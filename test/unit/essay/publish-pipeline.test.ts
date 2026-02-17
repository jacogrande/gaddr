import { describe, expect, test } from "bun:test";
import { preparePublishWithVersion } from "../../../src/domain/essay/publish-pipeline";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { Essay, TipTapDoc } from "../../../src/domain/essay/essay";
import type { EssayId, EssayVersionId, UserId } from "../../../src/domain/types/branded";

const TEST_ESSAY_ID = "550e8400-e29b-41d4-a716-446655440000" as EssayId;
const TEST_USER_ID = "test-user-123" as UserId;
const TEST_VERSION_ID = "660e8400-e29b-41d4-a716-446655440001" as EssayVersionId;
const NOW = new Date("2026-01-15T12:00:00Z");

const VALID_CONTENT: TipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Some real content here" }] }],
};

function makeDraft(overrides?: Partial<Essay>): Essay {
  return {
    id: TEST_ESSAY_ID,
    userId: TEST_USER_ID,
    title: "My Essay",
    content: VALID_CONTENT,
    status: "draft",
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: null,
    ...overrides,
  };
}

describe("preparePublishWithVersion", () => {
  test("happy path: draft essay produces published essay + version snapshot", () => {
    const result = preparePublishWithVersion({
      essay: makeDraft(),
      versionId: TEST_VERSION_ID,
      currentVersionCount: 0,
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.published.status).toBe("published");
      expect(result.value.published.publishedAt).toBe(NOW);
      expect(result.value.snapshot.versionNumber).toBe(1);
      expect(result.value.snapshot.essayId).toBe(TEST_ESSAY_ID);
      expect(result.value.snapshot.title).toBe("My Essay");
    }
  });

  test("propagates EmptyContent error for empty content", () => {
    const result = preparePublishWithVersion({
      essay: makeDraft({ content: { type: "doc" } }),
      versionId: TEST_VERSION_ID,
      currentVersionCount: 0,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("EmptyContent");
    }
  });

  test("propagates EmptyTitle error for empty title", () => {
    const result = preparePublishWithVersion({
      essay: makeDraft({ title: "" }),
      versionId: TEST_VERSION_ID,
      currentVersionCount: 0,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("EmptyTitle");
    }
  });

  test("propagates EmptyTitle error for whitespace-only title", () => {
    const result = preparePublishWithVersion({
      essay: makeDraft({ title: "   " }),
      versionId: TEST_VERSION_ID,
      currentVersionCount: 0,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("EmptyTitle");
    }
  });

  test("version number is currentVersionCount + 1", () => {
    const result = preparePublishWithVersion({
      essay: makeDraft(),
      versionId: TEST_VERSION_ID,
      currentVersionCount: 5,
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.snapshot.versionNumber).toBe(6);
    }
  });
});
