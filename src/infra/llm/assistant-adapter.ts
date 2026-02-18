// Assistant adapter — agentic loop implementing AssistantPort

import type Anthropic from "@anthropic-ai/sdk";
import type { AssistantPort, AssistantRequest } from "../../domain/assistant/port";
import type { AssistantEvent } from "../../domain/assistant/assistant";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
} from "../../domain/review/schemas";
import { SourceSuggestionSchema } from "../../domain/assistant/schemas";
import { validateAssistantEvent } from "../../domain/assistant/constraints";
import { isErr } from "../../domain/types/result";
import { anthropic } from "./client";
import {
  ASSISTANT_SYSTEM_PROMPT,
  FULL_REVIEW_USER_PREFIX,
} from "./prompts/assistant-system-prompt";
import { assistantTools, webSearchTool } from "./tools/assistant-tools";
import { reportError } from "../observability/report-error";

const MODEL = process.env["LLM_MODEL"] ?? "claude-sonnet-4-5-20250929";
const MAX_ITERATIONS = 15;

function buildEssayContext(request: AssistantRequest): string {
  return `**Essay Title:** ${request.essayTitle || "(Untitled)"}
**Word count:** ${String(request.wordCount)}

---

${request.essayText}

---`;
}

function buildMessages(
  request: AssistantRequest,
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  // Replay conversation history
  for (const entry of request.conversationHistory) {
    messages.push({ role: entry.role, content: entry.content });
  }

  // Build current user message
  if (request.mode === "full_review") {
    const content = `${FULL_REVIEW_USER_PREFIX}${buildEssayContext(request)}`;
    messages.push({ role: "user", content });
  } else {
    // Chat mode: include essay context in the first message if no history
    if (request.conversationHistory.length === 0) {
      const content = `Here is the essay I'm working on:\n\n${buildEssayContext(request)}\n\n${request.userMessage}`;
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: request.userMessage });
    }
  }

  return messages;
}

type ToolResult = Anthropic.ToolResultBlockParam;

function parseToolCall(
  name: string,
  input: unknown,
): AssistantEvent | null {
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
    case "suggest_source": {
      const parsed = SourceSuggestionSchema.safeParse(input);
      if (!parsed.success) return null;
      return { type: "source_suggestion", data: parsed.data };
    }
    default:
      return null;
  }
}

async function* assistantGenerator(
  request: AssistantRequest,
): AsyncIterable<AssistantEvent> {
  const messages = buildMessages(request);

  if (request.mode === "full_review") {
    yield { type: "review_start" };
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: ASSISTANT_SYSTEM_PROMPT,
        tools: [...assistantTools, webSearchTool],
        messages,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown LLM error";
      yield { type: "error", message };
      return;
    }

    const toolResults: ToolResult[] = [];
    let hasServerToolUse = false;

    for (const block of response.content) {
      // Handle text content blocks — emit as text_delta events
      if (block.type === "text" && block.text.length > 0) {
        yield { type: "text_delta", text: block.text };
      }

      // Handle server-managed tool results (web search).
      // Anthropic injects the results internally — we just track that it happened
      // so we don't push an empty user turn.
      if (block.type === "server_tool_use") {
        hasServerToolUse = true;
        continue;
      }

      if (block.type !== "tool_use") continue;

      const event = parseToolCall(block.name, block.input);

      if (!event) {
        reportError(
          new Error(
            `Invalid tool input for ${block.name}: ${JSON.stringify(block.input)}`,
          ),
          { action: `assistant.parseToolCall:${block.name}` },
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content:
            "Error: Invalid tool input. Please check the required fields and try again.",
          is_error: true,
        });
        continue;
      }

      const validated = validateAssistantEvent(event);

      if (isErr(validated)) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Authorship violation: ${validated.error.message}. No field may contain replacement prose. Describe WHAT the writer should do, not the text to use.`,
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
      if (request.mode === "full_review") {
        yield { type: "review_done" };
      }
      yield { type: "done" };
      return;
    }

    if (response.stop_reason !== "tool_use") {
      yield {
        type: "error",
        message: `Assistant interrupted: unexpected stop reason '${String(response.stop_reason)}'`,
      };
      return;
    }

    // Append assistant turn + tool results for next iteration
    messages.push({ role: "assistant", content: response.content });
    // Only append tool results if we have client-managed tool calls.
    // Server-managed tools (web_search) have their results injected by the API.
    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    } else if (hasServerToolUse) {
      // Server tool results are handled internally by the API — no user turn needed.
      // The API will continue the conversation with the search results available.
    }
  }

  yield {
    type: "error",
    message: "Assistant incomplete: max iterations reached",
  };
}

export const assistantAdapter: AssistantPort = {
  chat: assistantGenerator,
};
