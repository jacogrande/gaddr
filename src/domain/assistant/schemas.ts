// Assistant validation schemas — Zod at the boundary

import { z } from "zod";
import type { SourceSuggestion, AssistantEvent } from "./assistant";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
} from "../review/schemas";

export const SourceSuggestionSchema: z.ZodType<SourceSuggestion> = z.object({
  title: z.string().min(1),
  url: z.url().refine(
    (u) => u.startsWith("https://") || u.startsWith("http://"),
    { message: "URL must use http or https scheme" },
  ),
  snippet: z.string().min(1),
  relevance: z.string().min(1),
  stance: z.enum(["supporting", "opposing", "neutral"]),
});

export const AssistantEventSchema: z.ZodType<AssistantEvent> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text_delta"), text: z.string() }),
    z.object({ type: z.literal("inline_comment"), data: InlineCommentSchema }),
    z.object({ type: z.literal("issue"), data: ReviewIssueSchema }),
    z.object({ type: z.literal("question"), data: SocraticQuestionSchema }),
    z.object({ type: z.literal("rubric_score"), data: RubricScoreSchema }),
    z.object({
      type: z.literal("source_suggestion"),
      data: SourceSuggestionSchema,
    }),
    z.object({ type: z.literal("review_start") }),
    z.object({ type: z.literal("review_done") }),
    z.object({ type: z.literal("done") }),
    z.object({ type: z.literal("error"), message: z.string() }),
  ]);

export const ChatRequestSchema = z.object({
  essayId: z.uuid(),
  message: z.string().max(2000),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(10_000),
    }),
  ).max(50),
  mode: z.enum(["chat", "full_review"]),
});

// ── SessionStorage validation ──

const TextBlockStorageSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

const ReviewBlockStorageSchema = z.object({
  kind: z.literal("review"),
  comments: z.array(InlineCommentSchema),
  issues: z.array(ReviewIssueSchema),
  questions: z.array(SocraticQuestionSchema),
  scores: z.array(RubricScoreSchema),
});

const SourceBlockStorageSchema = z.object({
  kind: z.literal("source"),
  sources: z.array(SourceSuggestionSchema),
});

const ContentBlockStorageSchema = z.discriminatedUnion("kind", [
  TextBlockStorageSchema,
  ReviewBlockStorageSchema,
  SourceBlockStorageSchema,
]);

export const StoredConversationSchema = z.object({
  essayId: z.string(),
  messages: z.array(
    z.discriminatedUnion("role", [
      z.object({
        role: z.literal("user"),
        id: z.string(),
        content: z.string(),
        timestamp: z.number(),
      }),
      z.object({
        role: z.literal("assistant"),
        id: z.string(),
        blocks: z.array(ContentBlockStorageSchema),
        timestamp: z.number(),
      }),
    ]),
  ),
});
