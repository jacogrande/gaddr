import { getAnthropicClient } from "./client";
import { GADFLY_MODEL } from "./config";
import type { Tool, WebSearchTool20250305 } from "@anthropic-ai/sdk/resources/messages/messages";
import { isPrimaryResearchQuestionRequest } from "../../domain/gadfly/research";
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

function parseActionsFromContent(content: Array<{ type: string; name?: string }>): {
  actions: GadflyAction[];
  droppedArtifacts: GadflyDroppedArtifact[];
} {
  const droppedArtifacts: GadflyDroppedArtifact[] = [];

  for (const block of content) {
    if (block.type !== "tool_use") {
      continue;
    }

    droppedArtifacts.push({
      reason: "unsupported_tool",
      artifactSnippet: block.name ?? "unknown",
    });
  }

  return {
    actions: [],
    droppedArtifacts,
  };
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

  try {
    const response = await client.messages.create({
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
      tools,
      tool_choice: {
        type: "auto",
      },
    });

    const parsed = parseActionsFromContent(response.content);
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
      actions: parsed.actions,
      droppedArtifacts: parsed.droppedArtifacts,
      diagnostics: {
        webSearchEligible: true,
        webSearchIncluded: true,
        webSearchFallbackUsed: false,
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
