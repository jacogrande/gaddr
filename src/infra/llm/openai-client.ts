/**
 * openai-client.ts — SERVER-ONLY OpenAI SDK client factory and the seam adapter
 * that wraps it as a `StructuredCallClient` (llm-provider-portability research
 * §2 P2). The OpenAI sibling of `anthropic-client.ts`, and the second proof the
 * seam is real: everything downstream (structured-call, the spark adapter, the
 * contract tests) is untouched by which provider sits here.
 *
 * SERVER-ONLY. Reads `OPENAI_API_KEY` at call time (never import time), same
 * lazy-key discipline as the Anthropic factory. It is the ONLY module that
 * touches OpenAI SDK types.
 *
 * Three hard rules from the portability research, encoded here:
 *
 *  1. `store: false` on EVERY call. The Responses API defaults to `store: true`,
 *     which persists response bodies server-side for ≥30 days — the single
 *     sharpest violation of the drafts-never-at-rest posture (infra.md §7.4).
 *     Hard-coded in `buildResponsesRequest`, asserted by contract test.
 *  2. Reasoning effort pinned low by default. GPT-5-class models can spend the
 *     entire `max_output_tokens` budget on reasoning and return `incomplete`
 *     with empty text; spark-class calls have latency budgets that an unbounded
 *     reasoning pass would blow.
 *  3. `incomplete_details` may arrive null on an `incomplete` response (known
 *     provider bug) — classified defensively as `truncated` so the one
 *     bigger-budget retry gets its chance instead of crashing.
 *
 * Outcome translation (the neutral `CallOutcome` vocabulary): `paused` is never
 * emitted — the Responses API has no `pause_turn` concept; hosted tools run to
 * completion server-side.
 *
 * rawContent convention (adapter-private, per the structured-call seam rule that
 * blocks never cross adapters): this adapter emits a single normalized
 * `{ type: "output_text", text }` block and, on echo, flattens assistant blocks
 * back to a plain-text assistant message.
 */

import OpenAI from "openai";
import type {
  CallOutcome,
  ReasoningEffort,
  StructuredCallClient,
  StructuredCallRequest,
  StructuredCallResponse,
  StructuredTurn,
} from "./structured-call";

const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

/** Reasoning effort on the GPT-5.6-family scale (the first live smoke 400'd on
 * the older "minimal" value — the 5.6 generation renamed the scale). Identical
 * to the neutral `ReasoningEffort` — OpenAI is the reference scale, so no
 * translation table is needed here; the value passes straight through. Kept as a
 * named alias for the construction-time default option. */
export type OpenAIReasoningEffort = ReasoningEffort;

/** The per-client default effort, used only when a call does not set its own
 * (`request.effort`). Latency-bounded stages default to no reasoning so tokens
 * never eat the output budget. */
const DEFAULT_EFFORT: OpenAIReasoningEffort = "none";

function requireApiKey(): string {
  const key = process.env[OPENAI_API_KEY_ENV];
  if (key === undefined || key.length === 0) {
    throw new Error(
      `${OPENAI_API_KEY_ENV} is not set — the OpenAI client cannot be constructed. ` +
        "Set it in the server environment (dev + Vercel). It is read at call time, not " +
        "import time, so client bundles and tests that never invoke the client are unaffected.",
    );
  }
  return key;
}

/** Flatten this adapter's own opaque echo blocks back to plain text. Blocks
 * only ever round-trip through the adapter that emitted them, so the shape is
 * known: `{ type: "output_text", text }`. Anything else contributes nothing. */
function flattenEchoBlocks(blocks: readonly unknown[]): string {
  return blocks
    .map((block) => {
      if (typeof block === "object" && block !== null && "text" in block) {
        const text: unknown = (block as Record<string, unknown>).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

/** Seam turns → Responses API input items. User turns carry text; assistant
 * echo turns (repair continuation) flatten to a plain assistant message. */
export function toResponsesInput(
  turns: readonly StructuredTurn[],
): OpenAI.Responses.EasyInputMessage[] {
  return turns.map((turn): OpenAI.Responses.EasyInputMessage => {
    if (turn.role === "user") {
      return { role: "user", content: turn.text };
    }
    return { role: "assistant", content: flattenEchoBlocks(turn.content) };
  });
}

/**
 * Build the non-streaming Responses API payload. Exported pure so the contract
 * test can assert the invariants that must never regress: `store: false`, strict
 * structured output, and per-call reasoning effort. The PER-CALL `request.effort`
 * (the stage's choice, model-routing research §1) wins; `fallbackEffort` is the
 * per-client default used only when the call sets none. The neutral effort is
 * OpenAI's own scale, so it passes straight through with no translation.
 */
export function buildResponsesRequest(
  request: StructuredCallRequest,
  fallbackEffort: OpenAIReasoningEffort,
): OpenAI.Responses.ResponseCreateParamsNonStreaming {
  return {
    model: request.modelId,
    instructions: request.system,
    input: toResponsesInput(request.messages),
    max_output_tokens: request.maxTokens,
    reasoning: { effort: request.effort ?? fallbackEffort },
    text: {
      format: {
        type: "json_schema",
        name: "structured_output",
        strict: true,
        // JsonSchema is a readonly index type; the SDK wants a mutable one.
        schema: request.schema as { [key: string]: unknown },
      },
    },
    // NEVER remove: the API default is store:true, which retains response
    // bodies ≥30 days server-side (infra.md §7.4).
    store: false,
  };
}

/**
 * OpenAI response → the neutral `CallOutcome` + seam shape. Exported pure for
 * the contract-test mapping table. Throws on `status: "failed"` (the response
 * carries an error object, not content) so structured-call's classifier maps it
 * like any transport failure.
 */
export function fromResponsesResponse(
  response: OpenAI.Responses.Response,
): StructuredCallResponse {
  if (response.status === "failed") {
    throw new Error(
      response.error?.message ?? "OpenAI response reported status: failed",
    );
  }

  let text = "";
  let refusal: string | null = null;
  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type === "output_text") {
        text += part.text;
      } else {
        // The SDK types the content union as output_text | refusal exactly.
        refusal = part.refusal;
      }
    }
  }

  let outcome: CallOutcome;
  let providerStopReason: string;
  let stopDetails: StructuredCallResponse["stopDetails"] = null;

  if (refusal !== null) {
    // A refusal part can arrive with status still "completed" — the refusal
    // channel, not the status, is authoritative (parity map §2).
    outcome = "refused";
    providerStopReason = "refusal";
    stopDetails = { category: "refusal", explanation: refusal };
  } else if (response.status === "incomplete") {
    const reason = response.incomplete_details?.reason;
    if (reason === "content_filter") {
      outcome = "refused";
      providerStopReason = "incomplete:content_filter";
      stopDetails = { category: "content-filter" };
    } else {
      // "max_output_tokens" — or a null incomplete_details (known provider
      // bug): default to truncated so the bigger-budget retry gets its chance.
      outcome = "truncated";
      providerStopReason = `incomplete:${reason ?? "unknown"}`;
    }
  } else if (response.status === "completed" || response.status === undefined) {
    outcome = "complete";
    providerStopReason = "completed";
  } else {
    // cancelled / in_progress / queued — background-mode states that should
    // never surface on a synchronous call; explicit, never a crash.
    outcome = "other";
    providerStopReason = response.status;
  }

  return {
    outcome,
    // The model the API reports serving — the alias-drift signal telemetry
    // records (portability research §2 P5). `gpt-5.6-luna` is alias-only, so this
    // is how a silent re-resolution under an unchanged input hash surfaces.
    model: response.model,
    providerStopReason,
    stopDetails,
    text,
    rawContent: [{ type: "output_text", text }],
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      cachedInputTokens: response.usage?.input_tokens_details.cached_tokens,
    },
  };
}

/**
 * Construct the real OpenAI-backed `StructuredCallClient`. SDK built lazily and
 * memoized on first use — constructing the seam needs no key; the first
 * generation does.
 */
export function createOpenAIStructuredClient(
  options: { readonly reasoningEffort?: OpenAIReasoningEffort } = {},
): StructuredCallClient {
  // Per-client fallback effort. A per-call `request.effort` overrides it; this
  // only applies when a stage sets none (model-routing research §6).
  const fallbackEffort = options.reasoningEffort ?? DEFAULT_EFFORT;
  let sdk: OpenAI | undefined;
  const client = (): OpenAI => {
    sdk ??= new OpenAI({ apiKey: requireApiKey() });
    return sdk;
  };

  return {
    async create(
      request: StructuredCallRequest,
    ): Promise<StructuredCallResponse> {
      const response = await client().responses.create(
        buildResponsesRequest(request, fallbackEffort),
        // Cancellation passthrough, same posture as the Anthropic adapter:
        // an abort classifies as "transport" until the taxonomy grows a
        // cancellation variant.
        { signal: request.signal },
      );
      return fromResponsesResponse(response);
    },
  };
}
