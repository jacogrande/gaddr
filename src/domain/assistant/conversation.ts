// Chat conversation model — pure types and operations, no framework imports

import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
} from "../review/review";
import type { SourceSuggestion } from "./assistant";

// ── Content Blocks ──

export type TextBlock = {
  readonly kind: "text";
  readonly text: string;
};

export type ReviewBlock = {
  readonly kind: "review";
  readonly comments: readonly InlineComment[];
  readonly issues: readonly ReviewIssue[];
  readonly questions: readonly SocraticQuestion[];
  readonly scores: readonly RubricScore[];
};

export type SourceBlock = {
  readonly kind: "source";
  readonly sources: readonly SourceSuggestion[];
};

export type AssistantContentBlock = TextBlock | ReviewBlock | SourceBlock;

// ── Messages ──

export type UserMessage = {
  readonly role: "user";
  readonly id: string;
  readonly content: string;
  readonly timestamp: number;
};

export type AssistantMessage = {
  readonly role: "assistant";
  readonly id: string;
  readonly blocks: AssistantContentBlock[];
  readonly timestamp: number;
};

export type ChatMessage = UserMessage | AssistantMessage;

// ── Conversation ──

export type Conversation = {
  readonly essayId: string;
  readonly messages: ChatMessage[];
};

// ── Operations ──

export function emptyConversation(essayId: string): Conversation {
  return { essayId, messages: [] };
}

export function appendMessage(
  conversation: Conversation,
  message: ChatMessage,
): Conversation {
  return { ...conversation, messages: [...conversation.messages, message] };
}

export function emptyReviewBlock(): ReviewBlock {
  return { kind: "review", comments: [], issues: [], questions: [], scores: [] };
}

export function emptySourceBlock(): SourceBlock {
  return { kind: "source", sources: [] };
}
