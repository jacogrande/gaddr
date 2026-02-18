import { describe, expect, test } from "bun:test";
import {
  prepareAssistantRequest,
  validateAssistantStream,
} from "../../../src/domain/assistant/pipeline";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { Essay } from "../../../src/domain/essay/essay";
import type { EssayId } from "../../../src/domain/types/branded";
import type { UserId } from "../../../src/domain/types/branded";
import type { AssistantEvent } from "../../../src/domain/assistant/assistant";

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

// ── prepareAssistantRequest ──

describe("prepareAssistantRequest", () => {
  test("creates request for chat mode", () => {
    const result = prepareAssistantRequest(
      makeEssay(),
      "How can I improve my argument?",
      [],
      "chat",
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.essayTitle).toBe("Test Essay");
      expect(result.value.wordCount).toBeGreaterThan(0);
      expect(result.value.userMessage).toBe("How can I improve my argument?");
      expect(result.value.mode).toBe("chat");
    }
  });

  test("creates request for full_review mode with empty message", () => {
    const result = prepareAssistantRequest(makeEssay(), "", [], "full_review");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.mode).toBe("full_review");
    }
  });

  test("rejects empty essay", () => {
    const result = prepareAssistantRequest(
      makeEssay({ content: { type: "doc" } }),
      "Hello",
      [],
      "chat",
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.message).toContain("empty");
    }
  });

  test("rejects empty chat message in chat mode", () => {
    const result = prepareAssistantRequest(makeEssay(), "", [], "chat");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.message).toContain("empty");
    }
  });

  test("trims whitespace from user message", () => {
    const result = prepareAssistantRequest(
      makeEssay(),
      "  hello  ",
      [],
      "chat",
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.userMessage).toBe("hello");
    }
  });

  test("passes conversation history through", () => {
    const history = [
      { role: "user" as const, content: "Hi" },
      { role: "assistant" as const, content: "Hello!" },
    ];
    const result = prepareAssistantRequest(
      makeEssay(),
      "Follow up",
      history,
      "chat",
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.conversationHistory).toHaveLength(2);
    }
  });
});

// ── validateAssistantStream ──

async function collectEvents(
  events: AsyncIterable<AssistantEvent>,
): Promise<AssistantEvent[]> {
  const result: AssistantEvent[] = [];
  for await (const event of events) {
    result.push(event);
  }
  return result;
}

async function* fromArray(
  events: AssistantEvent[],
): AsyncIterable<AssistantEvent> {
  for (const event of events) {
    yield await Promise.resolve(event);
  }
}

describe("validateAssistantStream", () => {
  test("passes through chat events in chat mode", async () => {
    const input: AssistantEvent[] = [
      { type: "text_delta", text: "Great question." },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "chat"),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("text_delta");
    expect(result[1]?.type).toBe("done");
  });

  test("passes through complete review in full_review mode", async () => {
    const input: AssistantEvent[] = [
      { type: "review_start" },
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
      { type: "review_done" },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "full_review"),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(0);
  });

  test("emits error for incomplete rubric in full_review mode", async () => {
    const input: AssistantEvent[] = [
      { type: "review_start" },
      {
        type: "rubric_score",
        data: { dimension: "clarity", score: 4, rationale: "good" },
      },
      { type: "review_done" },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "full_review"),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(1);
    if (errors[0]?.type === "error") {
      expect(errors[0].message).toContain("evidence");
      expect(errors[0].message).toContain("structure");
    }
  });

  test("does NOT check rubric completeness in chat mode", async () => {
    const input: AssistantEvent[] = [
      { type: "text_delta", text: "Your clarity score would be about 3." },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "chat"),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(0);
  });

  test("filters authorship violations", async () => {
    const input: AssistantEvent[] = [
      {
        type: "inline_comment",
        data: {
          quotedText: "test",
          problem: "issue",
          why: "reason",
          question: "why?",
          suggestedAction:
            "Replace with: better text here that the writer could copy-paste",
        },
      },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "chat"),
    );
    const comments = result.filter((e) => e.type === "inline_comment");
    expect(comments).toHaveLength(0);
    const errors = result.filter((e) => e.type === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  test("detects ghostwriting in accumulated text_delta at done", async () => {
    const input: AssistantEvent[] = [
      { type: "text_delta", text: "Here's a revised version " },
      { type: "text_delta", text: "of your paragraph that flows better." },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "chat"),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(1);
    if (errors[0]?.type === "error") {
      expect(errors[0].message).toContain("ghostwrite");
    }
    // done event should still be emitted after the error
    expect(result[result.length - 1]?.type).toBe("done");
  });

  test("does not flag normal coaching text as ghostwriting", async () => {
    const input: AssistantEvent[] = [
      { type: "text_delta", text: "Your argument could be stronger. " },
      { type: "text_delta", text: "Consider adding more evidence." },
      { type: "done" },
    ];

    const result = await collectEvents(
      validateAssistantStream(fromArray(input), "chat"),
    );
    const errors = result.filter((e) => e.type === "error");
    expect(errors).toHaveLength(0);
  });
});
