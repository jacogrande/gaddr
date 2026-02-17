import { describe, expect, test } from "bun:test";
import {
  prepareReviewRequest,
  validateReviewStream,
} from "../../../src/domain/review/pipeline";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { Essay } from "../../../src/domain/essay/essay";
import type { EssayId } from "../../../src/domain/types/branded";
import type { UserId } from "../../../src/domain/types/branded";
import type { ReviewEvent } from "../../../src/domain/review/review";

const TEST_ESSAY_ID = "550e8400-e29b-41d4-a716-446655440000" as EssayId;
const TEST_USER_ID = "test-user-123" as UserId;
const NOW = new Date("2026-01-15T12:00:00Z");

function makeEssay(overrides?: Partial<Essay>): Essay {
  return {
    id: TEST_ESSAY_ID,
    userId: TEST_USER_ID,
    title: "Test Essay",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is a test essay with enough words to be reviewable by the coaching system.",
            },
          ],
        },
      ],
    },
    status: "draft",
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: null,
    ...overrides,
  };
}

// ── prepareReviewRequest ──

describe("prepareReviewRequest", () => {
  test("creates request from essay with content", () => {
    const result = prepareReviewRequest(makeEssay());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.essayTitle).toBe("Test Essay");
      expect(result.value.wordCount).toBeGreaterThan(0);
      expect(result.value.essayText.length).toBeGreaterThan(0);
    }
  });

  test("rejects empty essay", () => {
    const result = prepareReviewRequest(
      makeEssay({ content: { type: "doc" } }),
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.message).toContain("empty");
    }
  });

  test("rejects essay with empty paragraphs only", () => {
    const result = prepareReviewRequest(
      makeEssay({
        content: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    );
    expect(isErr(result)).toBe(true);
  });
});

// ── validateReviewStream ──

async function collectEvents(
  events: AsyncIterable<ReviewEvent>,
): Promise<ReviewEvent[]> {
  const result: ReviewEvent[] = [];
  for await (const event of events) {
    result.push(event);
  }
  return result;
}

async function* fromArray(
  events: ReviewEvent[],
): AsyncIterable<ReviewEvent> {
  for (const event of events) {
    yield await Promise.resolve(event);
  }
}

describe("validateReviewStream", () => {
  test("passes through complete review", async () => {
    const input: ReviewEvent[] = [
      {
        type: "inline_comment",
        data: {
          quotedText: "test",
          problem: "issue",
          why: "reason",
          question: "why?",
          suggestedAction: "fix it",
        },
      },
      {
        type: "rubric_score",
        data: { dimension: "clarity", score: 4, rationale: "good" },
      },
      {
        type: "rubric_score",
        data: { dimension: "evidence", score: 3, rationale: "ok" },
      },
      {
        type: "rubric_score",
        data: { dimension: "structure", score: 4, rationale: "solid" },
      },
      {
        type: "rubric_score",
        data: { dimension: "argument", score: 3, rationale: "decent" },
      },
      {
        type: "rubric_score",
        data: { dimension: "originality", score: 5, rationale: "great" },
      },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateReviewStream(fromArray(input)),
    );
    // No error events injected — all 5 dimensions present
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(0);
    expect(result[result.length - 1]).toEqual({ type: "done" });
  });

  test("injects error before done when rubric dimensions missing", async () => {
    const input: ReviewEvent[] = [
      {
        type: "rubric_score",
        data: { dimension: "clarity", score: 4, rationale: "good" },
      },
      {
        type: "rubric_score",
        data: { dimension: "evidence", score: 3, rationale: "ok" },
      },
      // Missing: structure, argument, originality
      { type: "done" },
    ];

    const result = await collectEvents(
      validateReviewStream(fromArray(input)),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(1);
    if (errors[0]?.type === "error") {
      expect(errors[0].message).toContain("structure");
      expect(errors[0].message).toContain("argument");
      expect(errors[0].message).toContain("originality");
    }
    // done event still emitted after the error
    expect(result[result.length - 1]).toEqual({ type: "done" });
  });

  test("passes through error events without completeness check", async () => {
    const input: ReviewEvent[] = [
      { type: "error", message: "LLM failed" },
    ];

    const result = await collectEvents(
      validateReviewStream(fromArray(input)),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "error", message: "LLM failed" });
  });

  test("filters out events with authorship violations (defense-in-depth)", async () => {
    const input: ReviewEvent[] = [
      {
        type: "inline_comment",
        data: {
          quotedText: "test",
          problem: "issue",
          why: "reason",
          question: "why?",
          suggestedAction: "Replace with: better text here that the writer could copy-paste",
        },
      },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateReviewStream(fromArray(input)),
    );
    // The authorship-violating comment should be replaced with an error
    const comments = result.filter((e) => e.type === "inline_comment");
    expect(comments).toHaveLength(0);
    const errors = result.filter((e) => e.type === "error");
    expect(errors.length).toBeGreaterThan(0);
  });
});
