import { describe, expect, test } from "bun:test";
import {
  emptyConversation,
  appendMessage,
  emptyReviewBlock,
  emptySourceBlock,
} from "../../../src/domain/assistant/conversation";
import type {
  ChatMessage,
  UserMessage,
  AssistantMessage,
} from "../../../src/domain/assistant/conversation";

describe("emptyConversation", () => {
  test("creates conversation with empty messages", () => {
    const conv = emptyConversation("essay-123");
    expect(conv.essayId).toBe("essay-123");
    expect(conv.messages).toHaveLength(0);
  });
});

describe("appendMessage", () => {
  test("appends user message", () => {
    const conv = emptyConversation("essay-123");
    const msg: UserMessage = {
      role: "user",
      id: "msg-1",
      content: "Hello",
      timestamp: 1000,
    };
    const updated = appendMessage(conv, msg);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]).toEqual(msg);
    // Original is not mutated
    expect(conv.messages).toHaveLength(0);
  });

  test("appends assistant message", () => {
    const conv = emptyConversation("essay-123");
    const msg: AssistantMessage = {
      role: "assistant",
      id: "msg-2",
      blocks: [{ kind: "text", text: "Hello!" }],
      timestamp: 2000,
    };
    const updated = appendMessage(conv, msg);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]?.role).toBe("assistant");
  });

  test("preserves existing messages", () => {
    let conv = emptyConversation("essay-123");
    const msg1: ChatMessage = {
      role: "user",
      id: "msg-1",
      content: "Hi",
      timestamp: 1000,
    };
    const msg2: ChatMessage = {
      role: "assistant",
      id: "msg-2",
      blocks: [{ kind: "text", text: "Hello!" }],
      timestamp: 2000,
    };
    conv = appendMessage(conv, msg1);
    conv = appendMessage(conv, msg2);
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[0]?.role).toBe("user");
    expect(conv.messages[1]?.role).toBe("assistant");
  });
});

describe("emptyReviewBlock", () => {
  test("creates empty review block", () => {
    const block = emptyReviewBlock();
    expect(block.kind).toBe("review");
    expect(block.comments).toHaveLength(0);
    expect(block.issues).toHaveLength(0);
    expect(block.questions).toHaveLength(0);
    expect(block.scores).toHaveLength(0);
  });
});

describe("emptySourceBlock", () => {
  test("creates empty source block", () => {
    const block = emptySourceBlock();
    expect(block.kind).toBe("source");
    expect(block.sources).toHaveLength(0);
  });
});
