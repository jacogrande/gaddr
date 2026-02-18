// Assistant port — adapter interface, no framework imports

import type { AssistantEvent } from "./assistant";

export type AssistantMode = "chat" | "full_review";

export type HistoryEntry = {
  readonly role: "user" | "assistant";
  readonly content: string;
};

export type AssistantRequest = {
  readonly essayText: string;
  readonly essayTitle: string;
  readonly wordCount: number;
  readonly userMessage: string;
  readonly conversationHistory: readonly HistoryEntry[];
  readonly mode: AssistantMode;
};

export type AssistantPort = {
  chat(request: AssistantRequest): AsyncIterable<AssistantEvent>;
};
