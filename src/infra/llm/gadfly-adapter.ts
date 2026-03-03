import { getAnthropicClient } from "./client";
import { GADFLY_MODEL } from "./config";
import type { Tool, WebSearchTool20250305 } from "@anthropic-ai/sdk/resources/messages/messages";
import {
  isPrimaryResearchQuestionRequest,
  shouldEnableResearchForRequest,
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
const DEBUG_TOOL_ENABLED = process.env.NODE_ENV !== "production";
const PROVIDER_TOOL_NAMES = {
  annotationManage: "annotation_manage",
  promptManage: "prompt_manage",
  preferenceManage: "preference_manage",
  researchManage: "research_manage",
  debugEmit: "debug_emit",
} as const;

const GADFLY_CLIENT_TOOLS: Tool[] = [
  {
    name: PROVIDER_TOOL_NAMES.annotationManage,
    description:
      "Manage inline writing annotations. Use action enum: annotate, clear, clear_in_range, clear_by_category, update_annotation, set_severity, set_status, snooze_until, unsnooze, pin_annotation, unpin_annotation, link_annotations. For annotate/update_annotation, annotation must include id, anchor, category, severity, explanation, rule, and question.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "annotate",
            "clear",
            "clear_in_range",
            "clear_by_category",
            "update_annotation",
            "set_severity",
            "set_status",
            "snooze_until",
            "unsnooze",
            "pin_annotation",
            "unpin_annotation",
            "link_annotations",
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
            prompts: {
              type: "array",
            },
            research: {
              type: "object",
            },
          },
          required: ["id", "anchor", "category", "severity", "explanation", "rule", "question"],
        },
        annotationId: { type: "string" },
        relatedAnnotationIds: {
          type: "array",
          items: { type: "string" },
        },
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
        category: {
          type: "string",
          enum: ["clarity", "structure", "evidence", "tone", "logic"],
        },
        until: { type: "string" },
      },
      required: ["action"],
    },
  },
  {
    name: PROVIDER_TOOL_NAMES.promptManage,
    description:
      "Add a Socratic prompt tied to an existing annotation. Use action enum: ask_followup_question, add_clarity_prompt, add_structure_prompt, add_evidence_prompt, add_counterpoint_prompt, add_tone_consistency_prompt.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "ask_followup_question",
            "add_clarity_prompt",
            "add_structure_prompt",
            "add_evidence_prompt",
            "add_counterpoint_prompt",
            "add_tone_consistency_prompt",
          ],
        },
        annotationId: { type: "string" },
        prompt: { type: "string" },
      },
      required: ["action", "annotationId", "prompt"],
    },
  },
  {
    name: PROVIDER_TOOL_NAMES.preferenceManage,
    description:
      "Manage Gadfly feedback policy and user learning goals. Use action enum: mute_category, unmute_category, set_learning_goal, clear_learning_goal.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "mute_category",
            "unmute_category",
            "set_learning_goal",
            "clear_learning_goal",
          ],
        },
        category: {
          type: "string",
          enum: ["clarity", "structure", "evidence", "tone", "logic"],
        },
        goal: { type: "string" },
      },
      required: ["action"],
    },
  },
  {
    name: PROVIDER_TOOL_NAMES.researchManage,
    description:
      "Manage fact-check and evidence-gathering workflow for an existing annotation that marks the user's question or claim. Use action enum: flag_fact_check_needed, create_research_task, attach_research_result.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "flag_fact_check_needed",
            "create_research_task",
            "attach_research_result",
          ],
        },
        annotationId: { type: "string" },
        note: { type: "string" },
        task: {
          type: "object",
          properties: {
            id: { type: "string" },
            kind: {
              type: "string",
              enum: ["fact_check", "supporting_evidence", "counterpoint", "context"],
            },
            question: { type: "string" },
          },
          required: ["id", "kind", "question"],
        },
        taskId: { type: "string" },
        result: {
          type: "object",
          properties: {
            verdict: {
              type: "string",
              enum: ["unverified", "supported", "mixed", "contradicted"],
            },
            findings: {
              type: "array",
              items: { type: "string" },
            },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" },
                  pageAge: { type: "string" },
                },
                required: ["title", "url"],
              },
            },
          },
          required: ["verdict", "findings", "sources"],
        },
      },
      required: ["action", "annotationId"],
    },
  },
  ...(DEBUG_TOOL_ENABLED
    ? ([
        {
          name: PROVIDER_TOOL_NAMES.debugEmit,
          description:
            "Emit a structured dev-only debug event when useful for instrumentation. Use action enum: emit_debug_event.",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["emit_debug_event"],
              },
              event: {
                type: "object",
                properties: {
                  eventName: { type: "string" },
                  detail: { type: "string" },
                },
                required: ["eventName", "detail"],
              },
            },
            required: ["action", "event"],
          },
        },
      ] satisfies Tool[])
    : []),
];

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

function shouldEnableWebSearch(request: GadflyAnalyzeRequest): boolean {
  return shouldEnableResearchForRequest(request);
}

function buildTools(request: GadflyAnalyzeRequest): Array<Tool | WebSearchTool20250305> {
  if (!shouldEnableWebSearch(request)) {
    return GADFLY_CLIENT_TOOLS;
  }

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
    "Analyze this writing update and use only tool calls.",
    "Do not rewrite user text and do not provide replacement prose.",
    "For tone feedback: only annotate tone when it is inconsistent with the surrounding writing style.",
    "Do not flag tone based only on professionalism or informality in isolation.",
    ...(isPrimaryResearchQuestion
      ? [
          "Primary mode: the user's draft is an explicit real-world question.",
          "Prioritize research_manage and web_search over spelling, grammar, or wording feedback.",
          "In this mode, use web_search before returning research findings unless external lookup is genuinely unnecessary.",
          "Create exactly one complete annotation on the question span and reuse that same id for every related research_manage call in this response.",
          "If you use web_search in this mode, return both create_research_task and attach_research_result for the same task id in the same response whenever possible.",
          "attach_research_result should include 2-4 concise findings and source metadata from the search results.",
          "Do not spend tool budget on minor copyediting unless the wording blocks understanding of the question.",
          "In this mode, do not annotate nits like 'now adays' vs 'nowadays' instead of researching the question.",
        ]
      : []),
    `Return at most ${String(MAX_GADFLY_ACTIONS)} tool calls total across all available tools.`,
    "Choose tools by intent:",
    `1. ${PROVIDER_TOOL_NAMES.annotationManage} for inline issue lifecycle and highlight state.`,
    `2. ${PROVIDER_TOOL_NAMES.promptManage} for deeper Socratic follow-up prompts on an existing annotation.`,
    `3. ${PROVIDER_TOOL_NAMES.preferenceManage} only when the user is clearly expressing a stable preference or goal.`,
    `4. ${PROVIDER_TOOL_NAMES.researchManage} only for explicit real-world questions or fact-check requests.`,
    `5. ${PROVIDER_TOOL_NAMES.debugEmit} only in development, and only when it adds meaningful instrumentation.`,
    "Use action=annotate for new inline findings.",
    "Every annotate/update_annotation call must include annotation.id, anchor, category, severity, explanation, rule, and question.",
    "Use action=update_annotation only when refining an existing finding rather than creating a new one.",
    "Use action=clear, clear_in_range, clear_by_category, set_severity, set_status, snooze_until, unsnooze, pin_annotation, unpin_annotation, or link_annotations only when the state change is clearly justified.",
    `Use ${PROVIDER_TOOL_NAMES.promptManage} actions only to add Socratic prompts for an annotationId, never as a replacement for annotate.`,
    "If you create a new annotation and prompt together, reuse the same annotation id in both calls.",
    `Use ${PROVIDER_TOOL_NAMES.researchManage} only when the user's draft contains an explicit real-world question or fact-check request.`,
    "Example: I wonder why new headlights are so bright?",
    "Example: Why are headlights so bright nowadays?",
    "Do not create research actions just because the draft mentions evidence, research, or data in the abstract.",
    "If web_search is available, use it sparingly and only to help answer that explicit user question.",
    "Never use web_search for sentence-level style, clarity, or tone feedback.",
    "Use action=flag_fact_check_needed when a claim needs verification.",
    "Use action=create_research_task to queue a bounded research question.",
    "Use action=attach_research_result only after gathering sources, and return only findings plus source metadata.",
    "If you create_research_task and already used web_search, usually also attach_research_result in the same response.",
    `Use ${PROVIDER_TOOL_NAMES.preferenceManage} mute/unmute only for broad user-level feedback policy, not one-off annotations.`,
    "Use set_learning_goal only when the user consistently signals a learning objective.",
    "When tone is discussed, prefer add_tone_consistency_prompt only if the issue is inconsistency with surrounding voice.",
    "Use add_counterpoint_prompt only for argumentative balance gaps, not generic disagreement.",
    "Do not emit overlapping tools for the same change unless each one serves a distinct purpose.",
    "Do not invent ids. Reuse annotation ids you just created when adding follow-up actions.",
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
  const tools = buildTools(request);
  const webSearchEligible = shouldEnableWebSearch(request);
  const webSearchIncluded = tools.some((tool) => tool.type === "web_search_20250305");
  let webSearchFallbackUsed = false;

  const runRequest = async (requestTools: Array<Tool | WebSearchTool20250305>) => {
    return client.messages.create({
      model: GADFLY_MODEL,
      max_tokens: 640,
      temperature: 0.2,
      system: [
        "You are Gaddr Gadfly, a Socratic writing reviewer.",
        "Never write replacement prose.",
        "Never output rewritten sentences or paragraphs.",
        "Only flag tone when it is inconsistent with surrounding style.",
        "Only produce tool calls using the provided tools.",
        "Prefer the smallest correct tool family for each intent.",
        `${PROVIDER_TOOL_NAMES.annotationManage} handles inline issue state.`,
        `${PROVIDER_TOOL_NAMES.promptManage} handles deeper Socratic prompts attached to an annotation.`,
        `${PROVIDER_TOOL_NAMES.preferenceManage} handles stable user policy or learning-goal state.`,
        `${PROVIDER_TOOL_NAMES.researchManage} handles explicit real-world questions and fact-check workflows.`,
        `${PROVIDER_TOOL_NAMES.debugEmit} is dev-only instrumentation and should be rare.`,
        "Use web_search only when factual verification or source discovery is necessary.",
        "Keep feedback concise, precise, and instructional.",
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
    let response;

    try {
      response = await runRequest(tools);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      const webSearchWasEnabled = tools.some((tool) => tool.type === "web_search_20250305");
      const webSearchFailure =
        webSearchWasEnabled &&
        (message.includes("web_search") ||
          message.includes("server tool") ||
          message.includes("invalid tool") ||
          message.includes("unsupported"));

      if (!webSearchFailure) {
        throw cause;
      }

      webSearchFallbackUsed = true;
      response = await runRequest(GADFLY_CLIENT_TOOLS);
    }

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
