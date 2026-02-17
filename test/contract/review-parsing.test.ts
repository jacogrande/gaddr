// Contract test: validates that realistic LLM tool_use outputs parse correctly
// through Zod schemas + authorship constraints. Uses mock data shaped like
// real Anthropic API responses.

import { describe, expect, test } from "bun:test";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
  ReviewEventSchema,
} from "../../src/domain/review/schemas";
import { validateArtifact } from "../../src/domain/review/constraints";
import { isOk, isErr } from "../../src/domain/types/result";
import type {
  ReviewEvent,
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
} from "../../src/domain/review/review";

// ── Realistic tool_use inputs (shaped like Claude's actual output) ──

const REALISTIC_INLINE_COMMENT: InlineComment = {
  quotedText: "Studies have shown that remote work increases productivity",
  problem:
    "This claim cites 'studies' without specifying which ones, making it impossible for readers to verify.",
  why: "Unattributed claims weaken the essay's credibility, especially when the essay's central argument depends on this evidence.",
  question: "Which specific studies are you referring to, and what were their methodologies?",
  suggestedAction:
    "Identify at least one specific study by name, author, or institution. Include the year and a brief note on what it measured.",
};

const REALISTIC_ISSUE: ReviewIssue = {
  tag: "structure",
  severity: "medium",
  description:
    "The essay jumps between three distinct arguments without transition sentences, making it hard to follow the logical progression.",
  suggestedAction:
    "Add a transitional sentence at the start of paragraphs 2 and 3 that connects back to the previous point.",
};

const REALISTIC_QUESTION: SocraticQuestion = {
  question:
    "If a skeptic challenged your main claim with data showing the opposite trend, how would you respond?",
  context:
    "The essay presents remote work productivity as settled fact, but the research is actually mixed.",
};

const REALISTIC_RUBRIC: RubricScore = {
  dimension: "evidence",
  score: 2,
  rationale:
    "Only one source is cited, and it's mentioned vaguely. The essay makes several empirical claims that lack any supporting evidence.",
};

// ── Schema parsing ──

describe("contract: schema parsing of realistic LLM outputs", () => {
  test("inline comment parses from realistic tool_use input", () => {
    const result = InlineCommentSchema.safeParse(REALISTIC_INLINE_COMMENT);
    expect(result.success).toBe(true);
  });

  test("issue parses from realistic tool_use input", () => {
    const result = ReviewIssueSchema.safeParse(REALISTIC_ISSUE);
    expect(result.success).toBe(true);
  });

  test("question parses from realistic tool_use input", () => {
    const result = SocraticQuestionSchema.safeParse(REALISTIC_QUESTION);
    expect(result.success).toBe(true);
  });

  test("rubric score parses from realistic tool_use input", () => {
    const result = RubricScoreSchema.safeParse(REALISTIC_RUBRIC);
    expect(result.success).toBe(true);
  });
});

// ── Authorship constraint validation on realistic data ──

describe("contract: authorship constraints on realistic LLM outputs", () => {
  test("realistic inline comment passes authorship check", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: REALISTIC_INLINE_COMMENT,
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("realistic issue passes authorship check", () => {
    const event: ReviewEvent = {
      type: "issue",
      data: REALISTIC_ISSUE,
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("realistic question passes authorship check", () => {
    const event: ReviewEvent = {
      type: "question",
      data: REALISTIC_QUESTION,
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("realistic rubric score passes authorship check", () => {
    const event: ReviewEvent = {
      type: "rubric_score",
      data: REALISTIC_RUBRIC,
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });
});

// ── ReviewEventSchema (full SSE event validation) ──

describe("contract: ReviewEventSchema validates SSE frames", () => {
  test("validates inline_comment event", () => {
    const result = ReviewEventSchema.safeParse({
      type: "inline_comment",
      data: REALISTIC_INLINE_COMMENT,
    });
    expect(result.success).toBe(true);
  });

  test("validates issue event", () => {
    const result = ReviewEventSchema.safeParse({
      type: "issue",
      data: REALISTIC_ISSUE,
    });
    expect(result.success).toBe(true);
  });

  test("validates done event", () => {
    const result = ReviewEventSchema.safeParse({ type: "done" });
    expect(result.success).toBe(true);
  });

  test("validates error event", () => {
    const result = ReviewEventSchema.safeParse({
      type: "error",
      message: "Rate limit exceeded",
    });
    expect(result.success).toBe(true);
  });

  test("rejects malformed event", () => {
    const result = ReviewEventSchema.safeParse({
      type: "unknown_type",
      data: {},
    });
    expect(result.success).toBe(false);
  });

  test("rejects event with missing required data fields", () => {
    const result = ReviewEventSchema.safeParse({
      type: "inline_comment",
      data: { quotedText: "test" }, // missing other fields
    });
    expect(result.success).toBe(false);
  });

  test("rejects event with invalid enum values", () => {
    const result = ReviewEventSchema.safeParse({
      type: "issue",
      data: {
        tag: "grammar", // not a valid tag
        severity: "critical", // not a valid severity
        description: "test",
        suggestedAction: "test",
      },
    });
    expect(result.success).toBe(false);
  });

  // Authorship violation detected in a realistic-looking bad output
  test("catches replacement prose in otherwise well-formed output", () => {
    const badComment: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "The results were significant",
        problem: "Vague quantification",
        why: "Readers need specific numbers",
        question: "What were the exact figures?",
        suggestedAction:
          "Replace with: The results showed a statistically significant 23% improvement (p < 0.05) over the control group",
      },
    };
    // Schema accepts it (structurally valid)
    const schemaParsed = ReviewEventSchema.safeParse(badComment);
    expect(schemaParsed.success).toBe(true);
    // But authorship constraint rejects it
    const validated = validateArtifact(badComment);
    expect(isErr(validated)).toBe(true);
  });
});
