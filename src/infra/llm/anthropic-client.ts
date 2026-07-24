/**
 * anthropic-client.ts — SERVER-ONLY Anthropic SDK client factory and the seam
 * adapter that wraps it as a `StructuredCallClient` (plan §4.1/§8 step 3).
 *
 * SERVER-ONLY. This module constructs the Anthropic SDK and reads
 * `ANTHROPIC_API_KEY`. It must never be imported into a client bundle. There is
 * no `server-only` package in this project to enforce that with a build error, so
 * the guarantee is by convention PLUS the deliberate shape below: the key is read
 * from `process.env` only when the client is first CALLED, never at import time.
 * A stray import that never invokes the client therefore cannot leak the key or
 * explode a bundle/test; only an actual generation call requires the key, and it
 * fails with a clear, actionable error if the key is missing.
 *
 * It is the ONLY module that touches Anthropic SDK types. Everything downstream
 * (structured-call, the spark adapter, the contract tests) speaks the narrow,
 * provider-agnostic `StructuredCallClient` seam. This is where wire payloads are
 * translated into domain-adjacent shapes — the thin-adapter rule (architecture.md
 * §7.1): perform I/O, translate, return; no business logic.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  CallOutcome,
  ReasoningEffort,
  StructuredCallClient,
  StructuredCallRequest,
  StructuredCallResponse,
  StructuredTurn,
} from "./structured-call";

const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";

/** The effort levels Anthropic's `output_config.effort` accepts (SDK
 * `OutputConfig`). The neutral scale is a subset — it omits `"max"` — so this is
 * the exact type this adapter can emit. */
type AnthropicEffort = "low" | "medium" | "high" | "xhigh";

/**
 * Neutral effort → Anthropic `output_config.effort` (model-routing research §1).
 * `low | medium | high | xhigh` map 1:1 (all valid on Anthropic's `low…max`
 * dial). `"none"` (or absent) leaves effort UNSET so the model uses its own
 * default — Anthropic's adaptive thinking has no true off switch, so a stage
 * that wants the floor passes `"low"` explicitly (documented on `ReasoningEffort`).
 * Exported pure for the contract-test translation table.
 */
export function toAnthropicEffort(
  effort: ReasoningEffort | undefined,
): AnthropicEffort | undefined {
  return effort === undefined || effort === "none" ? undefined : effort;
}

/**
 * Read the API key at call time (not import time). Throwing here is allowed —
 * infra may throw; only the domain must stay Result-only. The structured-call
 * discipline that sits above this catches the throw and maps it to an
 * `InferenceError` before it reaches any domain boundary.
 */
function requireApiKey(): string {
  const key = process.env[ANTHROPIC_API_KEY_ENV];
  if (key === undefined || key.length === 0) {
    throw new Error(
      `${ANTHROPIC_API_KEY_ENV} is not set — the Anthropic client cannot be constructed. ` +
        "Set it in the server environment (dev + Vercel). It is read at call time, not " +
        "import time, so client bundles and tests that never invoke the client are unaffected.",
    );
  }
  return key;
}

function toSdkMessages(
  turns: readonly StructuredTurn[],
): Anthropic.MessageParam[] {
  return turns.map((turn): Anthropic.MessageParam => {
    if (turn.role === "user") {
      return { role: "user", content: turn.text };
    }
    // Opaque prior blocks (from a previous response) echoed back as assistant
    // content for pause_turn / repair continuation. They originated from the SDK,
    // so this boundary cast is safe.
    const content = turn.content as Anthropic.ContentBlockParam[];
    return { role: "assistant", content };
  });
}

/**
 * Anthropic `stop_reason` → the neutral `CallOutcome` (portability research §2
 * P1). This table is the ONLY place Anthropic's stop vocabulary exists; the
 * discipline in structured-call branches on the neutral set alone.
 */
function toCallOutcome(stopReason: string | null): CallOutcome {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
    case null:
      return "complete";
    case "max_tokens":
    case "model_context_window_exceeded":
      return "truncated";
    case "refusal":
      return "refused";
    case "pause_turn":
      return "paused";
    default:
      // tool_use or any future stop reason — preserved raw in
      // providerStopReason for the malformed-output message.
      return "other";
  }
}

/** Exported pure for the contract-test mapping table (same convention as the
 * OpenAI adapter's mappers). */
export function toStructuredResponse(
  message: Anthropic.Message,
): StructuredCallResponse {
  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  const stopDetails = message.stop_details
    ? {
        category: message.stop_details.category,
        explanation: message.stop_details.explanation ?? undefined,
      }
    : null;
  return {
    outcome: toCallOutcome(message.stop_reason),
    // The model the API reports serving — the alias-drift signal telemetry
    // records (portability research §2 P5): current-gen Anthropic models are
    // alias-only, so this is how a silent re-resolution surfaces.
    model: message.model,
    providerStopReason: message.stop_reason,
    stopDetails,
    text,
    rawContent: message.content,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cachedInputTokens: message.usage.cache_read_input_tokens ?? undefined,
    },
  };
}

/**
 * Construct the real Anthropic-backed `StructuredCallClient`. The SDK client is
 * built lazily and memoized on first use, so constructing this seam (e.g. at a
 * composition root) does not require the key — only the first generation does.
 * Structured outputs are requested via `output_config.format` with the caller's
 * strict JSON schema; reasoning effort, when the call sets one, rides in the
 * same `output_config.effort` (model-routing research §6); the response is
 * normalized into the seam's shape.
 */
export function createAnthropicStructuredClient(): StructuredCallClient {
  let sdk: Anthropic | undefined;
  const client = (): Anthropic => {
    sdk ??= new Anthropic({ apiKey: requireApiKey() });
    return sdk;
  };

  return {
    async create(
      request: StructuredCallRequest,
    ): Promise<StructuredCallResponse> {
      const effort = toAnthropicEffort(request.effort);
      const message = await client().messages.create(
        {
          model: request.modelId,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: toSdkMessages(request.messages),
          // Effort is set only when the stage asked for reasoning; `"none"`/
          // absent leaves it unset so the model uses its default (see
          // `toAnthropicEffort`), which preserves the prior no-effort behaviour.
          output_config: {
            format: { type: "json_schema", schema: request.schema },
            ...(effort !== undefined ? { effort } : {}),
          },
        },
        // Cancellation passthrough: aborting surfaces as an APIUserAbortError,
        // which structured-call deliberately classifies as "transport" (see
        // classifyError) until the error taxonomy grows a cancellation variant.
        { signal: request.signal },
      );
      return toStructuredResponse(message);
    },
  };
}
