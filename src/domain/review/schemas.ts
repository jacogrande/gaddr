// Review validation schemas — Zod at the boundary

import { z } from "zod";
import {
  RUBRIC_DIMENSIONS,
  type InlineComment,
  type ReviewIssue,
  type SocraticQuestion,
  type RubricScore,
  type ReviewEvent,
} from "./review";

export const InlineCommentSchema: z.ZodType<InlineComment> = z.object({
  quotedText: z.string().min(1),
  problem: z.string().min(1),
  why: z.string().min(1),
  question: z.string().min(1),
  suggestedAction: z.string().min(1),
});

export const ReviewIssueSchema: z.ZodType<ReviewIssue> = z.object({
  tag: z.enum(["clarity", "evidence", "structure", "argument", "style"]),
  severity: z.enum(["high", "medium", "low"]),
  description: z.string().min(1),
  suggestedAction: z.string().min(1),
});

export const SocraticQuestionSchema: z.ZodType<SocraticQuestion> = z.object({
  question: z.string().min(1),
  context: z.string().min(1),
});

export const RubricScoreSchema: z.ZodType<RubricScore> = z.object({
  dimension: z.enum(RUBRIC_DIMENSIONS),
  score: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  rationale: z.string().min(1),
});

export const ReviewEventSchema: z.ZodType<ReviewEvent> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("inline_comment"), data: InlineCommentSchema }),
  z.object({ type: z.literal("issue"), data: ReviewIssueSchema }),
  z.object({ type: z.literal("question"), data: SocraticQuestionSchema }),
  z.object({ type: z.literal("rubric_score"), data: RubricScoreSchema }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export const ReviewRequestSchema = z.object({
  essayId: z.uuid(),
});
