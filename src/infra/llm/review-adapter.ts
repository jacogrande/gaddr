// Review adapter — agentic loop implementing ReviewPort

import type Anthropic from "@anthropic-ai/sdk";
import type { ReviewPort, ReviewRequest } from "../../domain/review/port";
import type { ReviewEvent } from "../../domain/review/review";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
} from "../../domain/review/schemas";
import { validateArtifact } from "../../domain/review/constraints";
import { isErr } from "../../domain/types/result";
import { anthropic } from "./client";
import { REVIEW_SYSTEM_PROMPT } from "./prompts/review-system-prompt";
import { reviewTools } from "./tools/review-tools";
import { reportError } from "../observability/report-error";

const MODEL = process.env["LLM_MODEL"] ?? "claude-sonnet-4-5-20250929";
const MAX_ITERATIONS = 10;

function buildUserPrompt(request: ReviewRequest): string {
  return `Please review the following micro-essay.

**Title:** ${request.essayTitle || "(Untitled)"}
**Word count:** ${String(request.wordCount)}

---

${request.essayText}

---

Provide your coaching feedback using the tools in the specified order: inline comments first, then issues, then Socratic questions, then rubric scores for all 5 dimensions.`;
}

type ToolResult = Anthropic.ToolResultBlockParam;

function parseToolCall(
  name: string,
  input: unknown,
): ReviewEvent | null {
  switch (name) {
    case "add_inline_comment": {
      const parsed = InlineCommentSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "inline_comment", data: parsed.data };
    }
    case "add_issue": {
      const parsed = ReviewIssueSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "issue", data: parsed.data };
    }
    case "ask_question": {
      const parsed = SocraticQuestionSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "question", data: parsed.data };
    }
    case "score_rubric": {
      const parsed = RubricScoreSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "rubric_score", data: parsed.data };
    }
    default:
      return null;
  }
}

async function* reviewGenerator(
  request: ReviewRequest,
): AsyncIterable<ReviewEvent> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(request) },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: REVIEW_SYSTEM_PROMPT,
        tools: reviewTools,
        messages,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown LLM error";
      yield { type: "error", message };
      return;
    }

    const toolResults: ToolResult[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      const event = parseToolCall(block.name, block.input);

      if (!event) {
        reportError(new Error(`Invalid tool input for ${block.name}: ${JSON.stringify(block.input)}`), {
          action: `review.parseToolCall:${block.name}`,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Error: Invalid tool input. Please check the required fields and try again.",
          is_error: true,
        });
        continue;
      }

      const validated = validateArtifact(event);

      if (isErr(validated)) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Authorship violation: ${validated.error.message}. No field may contain replacement prose. Never start any field with "Replace with:", "Change to:", "Rewrite as:", or "Try:". Describe WHAT the writer should do, not the text to use.`,
          is_error: true,
        });
        continue;
      }

      yield validated.value;
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: "Recorded.",
      });
    }

    if (response.stop_reason === "end_turn") {
      yield { type: "done" };
      return;
    }

    if (response.stop_reason !== "tool_use") {
      yield { type: "error", message: `Review interrupted: unexpected stop reason '${String(response.stop_reason)}'` };
      return;
    }

    // Append assistant turn + tool results for next iteration
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  // Safety: max iterations reached without end_turn
  yield { type: "error", message: "Review incomplete: max iterations reached" };
}

export const reviewAdapter: ReviewPort = {
  review: reviewGenerator,
};
