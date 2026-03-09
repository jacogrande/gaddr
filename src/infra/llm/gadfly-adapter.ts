import { getAnthropicClient } from "./client";
import { GADFLY_MODEL } from "./config";
import type {
  BetaTool,
  BetaWebFetchTool20250910,
  BetaWebSearchTool20250305,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
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

const GADFLY_CLIENT_TOOLS: BetaTool[] = [];

const GADFLY_WEB_SEARCH_TOOL: BetaWebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 1,
  strict: true,
  user_location: {
    type: "approximate",
    country: "US",
  },
};

const GADFLY_WEB_FETCH_TOOL: BetaWebFetchTool20250910 = {
  type: "web_fetch_20250910",
  name: "web_fetch",
  max_uses: 2,
  max_content_tokens: 2800,
  strict: true,
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

function buildTools(): Array<BetaTool | BetaWebSearchTool20250305 | BetaWebFetchTool20250910> {
  return [...GADFLY_CLIENT_TOOLS, GADFLY_WEB_SEARCH_TOOL, GADFLY_WEB_FETCH_TOOL];
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

  const modeSection = isPrimaryResearchQuestion
    ? [
        "<mode>",
        "primary_research_question",
        "</mode>",
        "<mode_requirements>",
        "- The draft is an explicit real-world question.",
        "- Use web_search before concluding unless external lookup is truly unnecessary.",
        "- After search, use web_fetch on 1-2 strongest URLs from search results.",
        "</mode_requirements>",
      ].join("\n")
    : [
        "<mode>",
        "general_writing",
        "</mode>",
        "<mode_requirements>",
        "- Use tools only if external verification/source discovery is necessary.",
        "</mode_requirements>",
      ].join("\n");

  return [
    "<task>",
    "Analyze this writing update for research-worthy questions.",
    "Do not rewrite user prose. Do not provide replacement sentences.",
    "</task>",
    "<tools>",
    "Available tools: web_search, web_fetch.",
    "Never use tools for sentence-level style, clarity, or tone feedback.",
    "</tools>",
    modeSection,
    "<decision_policy>",
    "- If no external lookup is needed, call no tools.",
    "- If lookup is needed: search first, fetch strongest source URLs, then synthesize.",
    "- Do not narrate your process.",
    "</decision_policy>",
    "<output_contract>",
    "After any tool use, produce one final text block in this exact shape:",
    "<synthesis>",
    "- finding one",
    "- finding two",
    "</synthesis>",
    "Requirements:",
    "- 2-4 bullet findings starting with '- '.",
    "- Findings must be factual takeaways grounded in tool results.",
    "- No first-person/process language (e.g., \"I'll search\", \"let me\").",
    "- No placeholders or punctuation-only output.",
    "</output_contract>",
    "<examples>",
    "<example>",
    "<input>Why are headlights so bright nowadays?</input>",
    "<good_output><synthesis>\n- Modern headlights often use high-intensity LED/HID systems with greater peak luminance than many legacy halogen setups.\n- Vehicle height mismatch and misalignment can increase perceived glare for oncoming drivers.\n- Regulatory differences in beam patterns and testing methods can affect real-world glare outcomes.\n</synthesis></good_output>",
    "<bad_output>I'll search for current information.</bad_output>",
    "</example>",
    "<example>",
    "<input>I wonder why eggs are more expensive lately.</input>",
    "<good_output><synthesis>\n- Avian flu outbreaks have reduced laying hen supply in multiple regions, increasing egg prices.\n- Feed, energy, and transport costs have also contributed to higher retail prices.\n- Prices can remain volatile because supply recovery lags demand.\n</synthesis></good_output>",
    "<bad_output>.</bad_output>",
    "</example>",
    "</examples>",
    "<request_payload>",
    serializeRequest(request),
    "</request_payload>",
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
    const response = await client.beta.messages.create({
      model: GADFLY_MODEL,
      max_tokens: 640,
      temperature: 0.2,
      system: [
        "You are Gaddr Gadfly, a Socratic writing reviewer.",
        "Never write replacement prose.",
        "Never output rewritten sentences or paragraphs.",
        "Use XML sections from the user prompt as authoritative task constraints.",
        "Only produce tool calls using the provided tools.",
        "No client-side action tools are enabled in this mode.",
        "Use tools only when factual verification or source discovery is necessary.",
        "If lookup is unnecessary, do not call any tool.",
        "When search is used, fetch the strongest URLs and then provide final synthesized findings.",
        "Never end on process narration. End with a valid <synthesis> block.",
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
