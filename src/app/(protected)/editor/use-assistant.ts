"use client";

import { useCallback, useRef, useState } from "react";
import type { AssistantEvent } from "../../../domain/assistant/assistant";
import type {
  ChatMessage,
  Conversation,
  AssistantContentBlock,
  ReviewBlock,
  SourceBlock,
} from "../../../domain/assistant/conversation";
import {
  emptyConversation,
  appendMessage,
  emptyReviewBlock,
  emptySourceBlock,
} from "../../../domain/assistant/conversation";
import {
  AssistantEventSchema,
  StoredConversationSchema,
} from "../../../domain/assistant/schemas";
import type { AssistantMode, HistoryEntry } from "../../../domain/assistant/port";

type AssistantStatus = "idle" | "loading" | "done" | "error";

type AssistantState = {
  conversation: Conversation;
  status: AssistantStatus;
  errorMessage: string | null;
};

function storageKey(essayId: string): string {
  return `assistant:${essayId}`;
}

function saveToStorage(essayId: string, conversation: Conversation): void {
  try {
    sessionStorage.setItem(storageKey(essayId), JSON.stringify(conversation));
  } catch {
    // Private browsing or quota exceeded — silently ignore
  }
}

function loadFromStorage(essayId: string): Conversation | null {
  try {
    const raw = sessionStorage.getItem(storageKey(essayId));
    if (!raw) return null;
    const json: unknown = JSON.parse(raw);
    const result = StoredConversationSchema.safeParse(json);
    if (!result.success) return null;
    return result.data as Conversation;
  } catch {
    return null;
  }
}

function toApiHistory(messages: readonly ChatMessage[]): HistoryEntry[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return { role: "user" as const, content: msg.content };
    }
    // Flatten assistant blocks to text for API history
    const text = msg.blocks
      .map((block) => {
        switch (block.kind) {
          case "text":
            return block.text;
          case "review":
            return "[structured review feedback]";
          case "source":
            return "[source suggestions]";
        }
      })
      .join("\n");
    return { role: "assistant" as const, content: text };
  });
}

function parseErrorResponse(text: string): string {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    if (typeof json.error === "string") return json.error;
  } catch {
    // Not JSON — use raw text
  }
  return text || "Request failed";
}

function nextMessageId(): string {
  return `msg-${crypto.randomUUID()}`;
}

export function useAssistant(essayId: string) {
  const [state, setState] = useState<AssistantState>(() => {
    const stored = loadFromStorage(essayId);
    return {
      conversation: stored ?? emptyConversation(essayId),
      status: "idle",
      errorMessage: null,
    };
  });
  const abortRef = useRef<AbortController | null>(null);
  const essayIdRef = useRef(essayId);
  essayIdRef.current = essayId;
  // Keep a ref to the current conversation to avoid stale closures in sendMessage
  const conversationRef = useRef(state.conversation);
  conversationRef.current = state.conversation;

  const sendMessage = useCallback(
    async (message: string, mode: AssistantMode) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage | null =
        mode === "full_review" && message.trim() === ""
          ? null
          : {
              role: "user",
              id: nextMessageId(),
              content: message.trim(),
              timestamp: Date.now(),
            };

      setState((prev) => {
        const conv = userMsg
          ? appendMessage(prev.conversation, userMsg)
          : prev.conversation;
        // Keep ref in sync with the state we just set
        conversationRef.current = conv;
        return { conversation: conv, status: "loading", errorMessage: null };
      });

      // Read from ref (always current) rather than stale closure over state
      const currentMessages = userMsg
        ? [...conversationRef.current.messages]
        : conversationRef.current.messages;
      const history = toApiHistory(currentMessages);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            essayId: essayIdRef.current,
            message: mode === "full_review" ? "" : message.trim(),
            history,
            mode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: parseErrorResponse(text),
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: "No response stream",
          }));
          return;
        }

        // Accumulate blocks for the assistant message
        let blocks: AssistantContentBlock[] = [];
        let currentTextBuffer = "";
        let inReview = false;
        let currentReview: ReviewBlock = emptyReviewBlock();
        let currentSources: SourceBlock = emptySourceBlock();
        let receivedTerminalEvent = false;

        function flushText(): void {
          if (currentTextBuffer.length > 0) {
            blocks = [...blocks, { kind: "text", text: currentTextBuffer }];
            currentTextBuffer = "";
          }
        }

        function flushSources(): void {
          if (currentSources.sources.length > 0) {
            blocks = [...blocks, currentSources];
            currentSources = emptySourceBlock();
          }
        }

        const assistantMsgId = nextMessageId();

        function updateConversation(finalStatus?: "done" | "error"): void {
          setState((prev) => {
            const assistantMsg: ChatMessage = {
              role: "assistant",
              id: assistantMsgId,
              blocks: [...blocks],
              timestamp: Date.now(),
            };

            // Find if we already added this assistant message
            const existingIdx = prev.conversation.messages.findIndex(
              (m) => m.id === assistantMsgId,
            );

            let messages: ChatMessage[];
            if (existingIdx >= 0) {
              messages = [...prev.conversation.messages];
              messages[existingIdx] = assistantMsg;
            } else {
              messages = [...prev.conversation.messages, assistantMsg];
            }

            const conv = { ...prev.conversation, messages };

            if (finalStatus) {
              saveToStorage(essayIdRef.current, conv);
            }

            return {
              conversation: conv,
              status: finalStatus ?? prev.status,
              errorMessage: prev.errorMessage,
            };
          });
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let readerDone = false;

        while (!readerDone) {
          const { done, value } = await reader.read();
          if (done) {
            readerDone = true;
            continue;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const json = trimmed.slice(6);

            let raw: unknown;
            try {
              raw = JSON.parse(json);
            } catch {
              continue;
            }

            const validated = AssistantEventSchema.safeParse(raw);
            if (!validated.success) continue;
            const event: AssistantEvent = validated.data;

            switch (event.type) {
              case "text_delta":
                if (!inReview) {
                  currentTextBuffer += event.text;
                }
                break;

              case "review_start":
                flushText();
                flushSources();
                inReview = true;
                currentReview = emptyReviewBlock();
                break;

              case "inline_comment":
                if (inReview) {
                  currentReview = {
                    ...currentReview,
                    comments: [...currentReview.comments, event.data],
                  };
                }
                break;

              case "issue":
                if (inReview) {
                  currentReview = {
                    ...currentReview,
                    issues: [...currentReview.issues, event.data],
                  };
                }
                break;

              case "question":
                if (inReview) {
                  currentReview = {
                    ...currentReview,
                    questions: [...currentReview.questions, event.data],
                  };
                }
                break;

              case "rubric_score":
                if (inReview) {
                  currentReview = {
                    ...currentReview,
                    scores: [...currentReview.scores, event.data],
                  };
                }
                break;

              case "source_suggestion":
                flushText();
                currentSources = {
                  ...currentSources,
                  sources: [...currentSources.sources, event.data],
                };
                break;

              case "review_done":
                if (inReview) {
                  blocks = [...blocks, currentReview];
                  inReview = false;
                }
                break;

              case "done":
                flushText();
                flushSources();
                receivedTerminalEvent = true;
                updateConversation("done");
                break;

              case "error":
                flushText();
                flushSources();
                receivedTerminalEvent = true;
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  errorMessage: event.message,
                }));
                updateConversation("error");
                break;
            }

            // Update UI after each event for streaming feel
            if (event.type !== "done" && event.type !== "error") {
              updateConversation();
            }
          }
        }

        // If stream ended without a done/error event, finalize
        if (!receivedTerminalEvent) {
          flushText();
          flushSources();
          updateConversation("done");
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "Request failed",
        }));
      }
    },
    // No dependency on state — we read from conversationRef instead
    [],
  );

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    try {
      sessionStorage.removeItem(storageKey(essayIdRef.current));
    } catch {
      // Silently ignore
    }
    setState({
      conversation: emptyConversation(essayIdRef.current),
      status: "idle",
      errorMessage: null,
    });
  }, []);

  return {
    conversation: state.conversation,
    status: state.status,
    errorMessage: state.errorMessage,
    sendMessage,
    clearConversation,
  };
}
