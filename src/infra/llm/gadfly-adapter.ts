import { getAnthropicClient } from "./client";
import { GADFLY_MODEL } from "./config";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import {
  parseGadflyAction,
  validateGadflyAction,
} from "../../domain/gadfly/guards";
import type {
  GadflyAction,
  GadflyAnalyzeRequest,
  GadflyAnalyzeResponse,
  GadflyDroppedArtifact,
} from "../../domain/gadfly/types";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";

type GadflyAdapterError = {
  code: "llm_timeout" | "provider_error";
  message: string;
  details?: unknown;
};

type ToolInputRecord = Record<string, unknown>;

const MAX_GADFLY_ACTIONS = 3;
const TONE_INCONSISTENCY_PATTERN = /\b(inconsisten|inconsistency|shift|mismatch|deviat|breaks\s+pattern)\b/i;

const GADFLY_TOOLS: Tool[] = [
  {
    name: "annotate",
    description:
      "Add one Socratic writing annotation for an existing sentence range. Keep guidance high-level and never rewrite text.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        from: { type: "integer", minimum: 0 },
        to: { type: "integer", minimum: 0 },
        quote: { type: "string" },
        category: {
          type: "string",
          enum: ["clarity", "structure", "evidence", "tone", "logic"],
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        explanation: { type: "string" },
        rule: { type: "string" },
        question: { type: "string" },
      },
      required: [
        "id",
        "from",
        "to",
        "quote",
        "category",
        "severity",
        "explanation",
        "rule",
        "question",
      ],
    },
  },
  {
    name: "clear",
    description: "Clear a previously issued annotation id that is no longer relevant.",
    input_schema: {
      type: "object",
      properties: {
        annotationId: { type: "string" },
      },
      required: ["annotationId"],
    },
  },
];

function isObject(value: unknown): value is ToolInputRecord {
  return typeof value === "object" && value !== null;
}

function toActionFromTool(name: string, input: unknown): unknown {
  if (!isObject(input)) {
    return null;
  }

  if (name === "annotate") {
    return {
      type: "annotate",
      annotation: {
        id: input["id"],
        anchor: {
          from: input["from"],
          to: input["to"],
          quote: input["quote"],
        },
        category: input["category"],
        severity: input["severity"],
        explanation: input["explanation"],
        rule: input["rule"],
        question: input["question"],
      },
    };
  }

  if (name === "clear") {
    return {
      type: "clear",
      annotationId: input["annotationId"],
    };
  }

  return null;
}

function serializeRequest(request: GadflyAnalyzeRequest): string {
  return JSON.stringify(
    {
      noteId: request.noteId,
      docVersion: request.docVersion,
      changedRanges: request.changedRanges,
      contextWindow: request.contextWindow,
      plainText: request.plainText,
    },
    null,
    2,
  );
}

function buildPrompt(request: GadflyAnalyzeRequest): string {
  return [
    "Analyze this writing update and use only tool calls.",
    "Do not rewrite user text and do not provide replacement prose.",
    "For tone feedback: only annotate tone when it is inconsistent with the surrounding writing style.",
    "Do not flag tone based only on professionalism or informality in isolation.",
    `Return at most ${String(MAX_GADFLY_ACTIONS)} annotate calls total.`,
    "Use clear only if an existing annotation should be removed.",
    "Each annotation must be Socratic: diagnosis + rule + question.",
    "Request payload:",
    serializeRequest(request),
  ].join("\n\n");
}

function parseActionsFromContent(content: Array<{ type: string; name?: string; input?: unknown }>): {
  actions: GadflyAction[];
  droppedArtifacts: GadflyDroppedArtifact[];
} {
  const actions: GadflyAction[] = [];
  const droppedArtifacts: GadflyDroppedArtifact[] = [];

  for (const block of content) {
    if (block.type !== "tool_use") {
      continue;
    }

    const toolName = block.name;
    if (toolName !== "annotate" && toolName !== "clear") {
      droppedArtifacts.push({
        reason: "unsupported_tool",
        artifactSnippet: toolName ?? "unknown",
      });
      continue;
    }

    const maybeAction = toActionFromTool(toolName, block.input);
    if (!maybeAction) {
      droppedArtifacts.push({
        reason: "invalid_tool_input",
        artifactSnippet: JSON.stringify(block.input).slice(0, 180),
      });
      continue;
    }

    const parsedAction = parseGadflyAction(maybeAction);
    if (!parsedAction.ok) {
      droppedArtifacts.push({
        reason: `invalid_action:${parsedAction.error.field ?? "unknown"}`,
        artifactSnippet: parsedAction.error.message.slice(0, 180),
      });
      continue;
    }

    const validatedAction = validateGadflyAction(parsedAction.value);
    if (!validatedAction.ok) {
      droppedArtifacts.push(validatedAction.error);
      continue;
    }

    if (validatedAction.value.type === "annotate" && validatedAction.value.annotation.category === "tone") {
      const toneText = [
        validatedAction.value.annotation.explanation,
        validatedAction.value.annotation.rule,
        validatedAction.value.annotation.question,
      ].join(" ");

      if (!TONE_INCONSISTENCY_PATTERN.test(toneText)) {
        droppedArtifacts.push({
          reason: "tone_policy_requires_inconsistency",
          artifactSnippet: toneText.slice(0, 180),
        });
        continue;
      }
    }

    actions.push(validatedAction.value);
  }

  return { actions, droppedArtifacts };
}

export async function analyzeWithGadfly(
  request: GadflyAnalyzeRequest,
): Promise<Result<GadflyAnalyzeResponse, GadflyAdapterError>> {
  const client = getAnthropicClient();
  if (!client) {
    return ok({
      requestId: `gadfly-disabled-${String(Date.now())}`,
      model: "anthropic-disabled",
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      latencyMs: 0,
      actions: [],
      droppedArtifacts: [],
      rawResponse: {
        provider: "anthropic",
        disabled: true,
        reason: "ANTHROPIC_API_KEY is not configured",
      },
    });
  }

  const startedAt = Date.now();

  try {
    const response = await client.messages.create({
      model: GADFLY_MODEL,
      max_tokens: 640,
      temperature: 0.2,
      system: [
        "You are Gaddr Gadfly, a Socratic writing reviewer.",
        "Never write replacement prose.",
        "Never output rewritten sentences or paragraphs.",
        "Only flag tone when it is inconsistent with surrounding style.",
        "Only produce tool calls using annotate or clear.",
        "Keep feedback concise, precise, and instructional.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: buildPrompt(request),
        },
      ],
      tools: GADFLY_TOOLS,
      tool_choice: {
        type: "auto",
      },
    });

    const parsed = parseActionsFromContent(response.content);
    const boundedActions = parsed.actions.slice(0, MAX_GADFLY_ACTIONS);

    return ok({
      requestId: response.id,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs: Date.now() - startedAt,
      actions: boundedActions,
      droppedArtifacts: parsed.droppedArtifacts,
      rawResponse: {
        id: response.id,
        type: response.type,
        model: response.model,
        stopReason: response.stop_reason,
        usage: response.usage,
        content: response.content,
      },
    });
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : "Gadfly provider request failed";
    const lower = message.toLowerCase();
    const timeoutLike = lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort");

    if (timeoutLike) {
      return err({
        code: "llm_timeout",
        message,
        details: cause,
      });
    }

    return err({
      code: "provider_error",
      message,
      details: cause,
    });
  }
}
