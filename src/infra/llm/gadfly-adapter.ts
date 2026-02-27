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
    name: "annotation.manage",
    description:
      "Manage inline writing annotations. Use action enum: annotate, clear, clear_in_range, update_annotation, set_severity, set_status.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "annotate",
            "clear",
            "clear_in_range",
            "update_annotation",
            "set_severity",
            "set_status",
          ],
        },
        annotation: {
          type: "object",
          properties: {
            id: { type: "string" },
            anchor: {
              type: "object",
              properties: {
                from: { type: "integer", minimum: 0 },
                to: { type: "integer", minimum: 0 },
                quote: { type: "string" },
              },
              required: ["from", "to", "quote"],
            },
            category: {
              type: "string",
              enum: ["clarity", "structure", "evidence", "tone", "logic"],
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            status: {
              type: "string",
              enum: ["active", "acknowledged", "resolved", "dismissed", "snoozed"],
            },
            explanation: { type: "string" },
            rule: { type: "string" },
            question: { type: "string" },
          },
        },
        annotationId: { type: "string" },
        range: {
          type: "object",
          properties: {
            from: { type: "integer", minimum: 0 },
            to: { type: "integer", minimum: 0 },
          },
          required: ["from", "to"],
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        status: {
          type: "string",
          enum: ["active", "acknowledged", "resolved", "dismissed", "snoozed"],
        },
      },
      required: ["action"],
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

  if (name === "annotation.manage") {
    const action = input["action"];
    if (typeof action !== "string") {
      return null;
    }

    if (action === "annotate" || action === "update_annotation") {
      return {
        type: "annotation.manage",
        action,
        annotation: input["annotation"],
      };
    }

    if (action === "clear") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
      };
    }

    if (action === "clear_in_range") {
      return {
        type: "annotation.manage",
        action,
        range: input["range"],
      };
    }

    if (action === "set_severity") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
        severity: input["severity"],
      };
    }

    if (action === "set_status") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
        status: input["status"],
      };
    }
  }

  // Legacy tool fallback support.
  if (name === "annotate") {
    return {
      type: "annotation.manage",
      action: "annotate",
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
      type: "annotation.manage",
      action: "clear",
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
    `Return at most ${String(MAX_GADFLY_ACTIONS)} annotation.manage calls total.`,
    "Use action=annotate for new findings.",
    "Use action=update_annotation for refinement of existing findings.",
    "Use action=clear, clear_in_range, set_severity, or set_status only when appropriate.",
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
    if (
      toolName !== "annotation.manage" &&
      toolName !== "annotate" &&
      toolName !== "clear"
    ) {
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

    if (
      (validatedAction.value.action === "annotate" ||
        validatedAction.value.action === "update_annotation") &&
      validatedAction.value.annotation.category === "tone"
    ) {
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
        "Only produce tool calls using annotation.manage.",
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
