import { getAnthropicClient } from "./client";
import { GADFLY_MODEL } from "./config";
import type { Tool, WebSearchTool20250305 } from "@anthropic-ai/sdk/resources/messages/messages";
import {
  isPrimaryResearchQuestionRequest,
} from "../../domain/gadfly/research";
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

const MAX_GADFLY_ACTIONS = 6;
const TONE_INCONSISTENCY_PATTERN = /\b(inconsisten|inconsistency|shift|mismatch|deviat|breaks\s+pattern)\b/i;
const PROVIDER_TOOL_NAMES = {
  annotationManage: "annotation_manage",
  promptManage: "prompt_manage",
  preferenceManage: "preference_manage",
  researchManage: "research_manage",
  debugEmit: "debug_emit",
} as const;

const GADFLY_CLIENT_TOOLS: Tool[] = [];

const GADFLY_WEB_SEARCH_TOOL: WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 1,
  strict: true,
  user_location: {
    type: "approximate",
    country: "US",
  },
};

function isObject(value: unknown): value is ToolInputRecord {
  return typeof value === "object" && value !== null;
}

function countWebSearchToolUses(
  content: Array<{ type: string; name?: string }>,
): number {
  let count = 0;

  for (const block of content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      count += 1;
    }
  }

  return count;
}

function toActionFromTool(name: string, input: unknown): unknown {
  if (!isObject(input)) {
    return null;
  }

  if (name === PROVIDER_TOOL_NAMES.annotationManage) {
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

    if (action === "clear_by_category") {
      return {
        type: "annotation.manage",
        action,
        category: input["category"],
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

    if (action === "snooze_until") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
        until: input["until"],
      };
    }

    if (action === "unsnooze" || action === "pin_annotation" || action === "unpin_annotation") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
      };
    }

    if (action === "link_annotations") {
      return {
        type: "annotation.manage",
        action,
        annotationId: input["annotationId"],
        relatedAnnotationIds: input["relatedAnnotationIds"],
      };
    }
  }

  if (name === PROVIDER_TOOL_NAMES.promptManage) {
    const action = input["action"];
    if (
      action === "ask_followup_question" ||
      action === "add_clarity_prompt" ||
      action === "add_structure_prompt" ||
      action === "add_evidence_prompt" ||
      action === "add_counterpoint_prompt" ||
      action === "add_tone_consistency_prompt"
    ) {
      return {
        type: "prompt.manage",
        action,
        annotationId: input["annotationId"],
        prompt: input["prompt"],
      };
    }

    return null;
  }

  if (name === PROVIDER_TOOL_NAMES.preferenceManage) {
    const action = input["action"];
    if (action === "mute_category" || action === "unmute_category") {
      return {
        type: "preference.manage",
        action,
        category: input["category"],
      };
    }

    if (action === "set_learning_goal") {
      return {
        type: "preference.manage",
        action,
        goal: input["goal"],
      };
    }

    if (action === "clear_learning_goal") {
      return {
        type: "preference.manage",
        action,
      };
    }

    return null;
  }

  if (name === PROVIDER_TOOL_NAMES.researchManage) {
    const action = input["action"];
    if (action === "flag_fact_check_needed") {
      return {
        type: "research.manage",
        action,
        annotationId: input["annotationId"],
        note: input["note"],
      };
    }

    if (action === "create_research_task") {
      return {
        type: "research.manage",
        action,
        annotationId: input["annotationId"],
        task: input["task"],
      };
    }

    if (action === "attach_research_result") {
      return {
        type: "research.manage",
        action,
        annotationId: input["annotationId"],
        taskId: input["taskId"],
        result: input["result"],
      };
    }

    return null;
  }

  if (name === PROVIDER_TOOL_NAMES.debugEmit) {
    if (input["action"] !== "emit_debug_event") {
      return null;
    }

    return {
      type: "debug.emit",
      action: "emit_debug_event",
      event: input["event"],
    };
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

function buildTools(): Array<Tool | WebSearchTool20250305> {
  return [...GADFLY_CLIENT_TOOLS, GADFLY_WEB_SEARCH_TOOL];
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
  const isPrimaryResearchQuestion = isPrimaryResearchQuestionRequest(request);

  return [
    "Analyze this writing update.",
    "Do not rewrite user text and do not provide replacement prose.",
    "The only available tool is web_search.",
    "If no external lookup is needed, do not call any tool.",
    "Never use web_search for sentence-level style, clarity, or tone feedback.",
    ...(isPrimaryResearchQuestion
      ? [
          "Primary mode: the user's draft is an explicit real-world question.",
          "Use web_search before answering unless external lookup is genuinely unnecessary.",
          "Focus on factual verification and source discovery only.",
        ]
      : []),
    "Example: I wonder why new headlights are so bright?",
    "Example: Why are headlights so bright nowadays?",
    "Do not use web_search just because the draft mentions evidence, research, or data in the abstract.",
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
      toolName !== PROVIDER_TOOL_NAMES.annotationManage &&
      toolName !== PROVIDER_TOOL_NAMES.promptManage &&
      toolName !== PROVIDER_TOOL_NAMES.preferenceManage &&
      toolName !== PROVIDER_TOOL_NAMES.researchManage &&
      toolName !== PROVIDER_TOOL_NAMES.debugEmit &&
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
      diagnostics: {
        webSearchEligible: false,
        webSearchIncluded: false,
        webSearchFallbackUsed: false,
      },
      rawResponse: {
        provider: "anthropic",
        disabled: true,
        reason: "ANTHROPIC_API_KEY is not configured",
      },
    });
  }

  const startedAt = Date.now();
  const tools = buildTools();
  const webSearchEligible = true;
  const webSearchIncluded = tools.some((tool) => tool.type === "web_search_20250305");
  const webSearchFallbackUsed = false;

  const runRequest = async (requestTools: Array<Tool | WebSearchTool20250305>) => {
    return client.messages.create({
      model: GADFLY_MODEL,
      max_tokens: 640,
      temperature: 0.2,
      system: [
        "You are Gaddr Gadfly, a Socratic writing reviewer.",
        "Never write replacement prose.",
        "Never output rewritten sentences or paragraphs.",
        "Only produce tool calls using the provided tools.",
        "No client-side action tools are enabled in this mode.",
        "Use web_search only when factual verification or source discovery is necessary.",
        "If search is unnecessary, do not call any tool.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: buildPrompt(request),
        },
      ],
      tools: requestTools,
      tool_choice: {
        type: "auto",
      },
    });
  };

  try {
    const response = await runRequest(tools);

    const parsed = parseActionsFromContent(response.content);
    const boundedActions = parsed.actions.slice(0, MAX_GADFLY_ACTIONS);
    const webSearchRequests =
      response.usage.server_tool_use?.web_search_requests ?? countWebSearchToolUses(response.content);

    return ok({
      requestId: response.id,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        webSearchRequests,
      },
      latencyMs: Date.now() - startedAt,
      actions: boundedActions,
      droppedArtifacts: parsed.droppedArtifacts,
      diagnostics: {
        webSearchEligible,
        webSearchIncluded,
        webSearchFallbackUsed,
      },
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
