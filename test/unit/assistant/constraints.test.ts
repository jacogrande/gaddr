import { describe, expect, test } from "bun:test";
import {
  validateAssistantEvent,
  checkTextForGhostwriting,
} from "../../../src/domain/assistant/constraints";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { AssistantEvent } from "../../../src/domain/assistant/assistant";

// ── validateAssistantEvent ──

describe("validateAssistantEvent", () => {
  test("passes through text_delta events", () => {
    const event: AssistantEvent = {
      type: "text_delta",
      text: "Your argument could be stronger here.",
    };
    const result = validateAssistantEvent(event);
    expect(isOk(result)).toBe(true);
  });

  test("passes through valid inline_comment events", () => {
    const event: AssistantEvent = {
      type: "inline_comment",
      data: {
        quotedText: "test passage",
        problem: "lacks evidence",
        why: "weakens the argument",
        question: "What sources support this?",
        suggestedAction: "Add a citation from a credible source",
      },
    };
    const result = validateAssistantEvent(event);
    expect(isOk(result)).toBe(true);
  });

  test("rejects inline_comment with replacement prose", () => {
    const event: AssistantEvent = {
      type: "inline_comment",
      data: {
        quotedText: "test",
        problem: "issue",
        why: "reason",
        question: "why?",
        suggestedAction:
          "Replace with: better text here that the writer could copy-paste",
      },
    };
    const result = validateAssistantEvent(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("passes through source_suggestion events", () => {
    const event: AssistantEvent = {
      type: "source_suggestion",
      data: {
        title: "Some Article",
        url: "https://example.com",
        snippet: "Relevant quote",
        relevance: "Supports the argument",
        stance: "supporting",
      },
    };
    const result = validateAssistantEvent(event);
    expect(isOk(result)).toBe(true);
  });

  test("passes through review_start and review_done", () => {
    expect(
      isOk(validateAssistantEvent({ type: "review_start" })),
    ).toBe(true);
    expect(
      isOk(validateAssistantEvent({ type: "review_done" })),
    ).toBe(true);
  });

  test("passes through done and error events", () => {
    expect(isOk(validateAssistantEvent({ type: "done" }))).toBe(true);
    expect(
      isOk(validateAssistantEvent({ type: "error", message: "test" })),
    ).toBe(true);
  });
});

// ── checkTextForGhostwriting ──

describe("checkTextForGhostwriting", () => {
  test("passes normal coaching text", () => {
    const result = checkTextForGhostwriting(
      "Your argument would benefit from more specific evidence. Consider looking at recent studies.",
    );
    expect(isOk(result)).toBe(true);
  });

  test("detects 'here's a revised version' pattern", () => {
    const result = checkTextForGhostwriting(
      "Here's a revised version of your paragraph that flows better.",
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("detects 'I've rewritten' pattern", () => {
    const result = checkTextForGhostwriting(
      "I've rewritten your introduction to be more compelling.",
    );
    expect(isErr(result)).toBe(true);
  });

  test("detects 'here is the updated paragraph' pattern", () => {
    const result = checkTextForGhostwriting(
      "Here is the updated paragraph with better transitions.",
    );
    expect(isErr(result)).toBe(true);
  });

  test("passes text that mentions revision without ghostwriting", () => {
    const result = checkTextForGhostwriting(
      "You should revise this paragraph to strengthen the transition.",
    );
    expect(isOk(result)).toBe(true);
  });

  test("detects 'you could replace it with:' pattern", () => {
    const result = checkTextForGhostwriting(
      'You could replace it with: "A more compelling opening sentence."',
    );
    expect(isErr(result)).toBe(true);
  });

  test("detects 'try writing it as:' pattern", () => {
    const result = checkTextForGhostwriting(
      'Try writing it as: "The evidence clearly shows that..."',
    );
    expect(isErr(result)).toBe(true);
  });

  test("does not flag 'try' without the ghostwriting suffix", () => {
    const result = checkTextForGhostwriting(
      "Try looking at this from a different angle.",
    );
    expect(isOk(result)).toBe(true);
  });
});
