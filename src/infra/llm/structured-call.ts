/**
 * structured-call.ts — the shared structured-generation discipline. THE HARNESS SEED.
 *
 * One function, `structuredCall`, encodes the generation-reliability rules every
 * future constellation stage (S1–S5) will reuse — so its API design matters more
 * than any single call site. Spark is only its first consumer. The rules it bakes
 * in (plan §4.1):
 *
 *  1. Call the model with a caller-owned JSON output schema (the wire schema is
 *     the caller's — this helper never imposes one, so a stage whose schema puts
 *     free-text reasoning first, as Spark's does, is expressible without change).
 *  2. Branch EXHAUSTIVELY on the neutral `CallOutcome` before touching content.
 *     The vocabulary is PROVIDER-NEUTRAL (llm-provider-portability research §2
 *     P1): each client adapter translates its native taxonomy — Anthropic
 *     `stop_reason`, OpenAI `status`/`incomplete_details`/refusal parts — into
 *     this closed set; the discipline never sees provider strings:
 *       - refused   → non-retryable InferenceError{malformed-output}
 *       - truncated → ONE retry with a larger budget, then dead-end
 *       - paused    → continue the turn (echo the assistant blocks back AND
 *                     carry the pre-pause text forward, so the eventual parse
 *                     sees the whole turn). Anthropic-only (`pause_turn`); the
 *                     OpenAI adapter never emits it. NB: continuation semantics
 *                     are not yet verified against real Anthropic pause
 *                     payloads — that lands with the first tool-bearing stage.
 *       - complete  → parse
 *       - other     → mapped to malformed-output, never a crash (the adapter
 *                     preserves the raw provider value in `providerStopReason`
 *                     for the error message).
 *  3. Hand the text to the caller's parse+validate function. A validation failure
 *     triggers a repair retry carrying the EXACT validator error text in the
 *     retry prompt — capped per call (`repairCap`, default 1); exhausting the
 *     cap dead-ends as malformed-output.
 *  4. Map every SDK/transport failure (rate limit, timeout, network, 4xx/5xx)
 *     into the existing `InferenceError` variants. No exception escapes.
 *  5. Surface one `InferenceAttempt` record per model call as DATA (the
 *     `onAttempt` seam) — the `inference_attempt` table lands in Phase 4, and this
 *     record is shaped so that phase can persist it without reshaping.
 *
 * The model client is INJECTED (a parameter, never a module import): the seam the
 * contract tests stub, and the seam future stages swap. Real implementations wrap
 * the native provider SDKs — `anthropic-client.ts` / `openai-client.ts`, selected
 * per stage by `providers.ts`. This module imports no SDK type and knows nothing
 * about any provider; it duck-types transport errors so it stays provider-agnostic.
 *
 * Infra, not domain: latency is timed with an injected clock defaulting to
 * `Date.now()`, which this layer is allowed to call.
 */

import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";

// ── The wire schema is the caller's (structured outputs, strict-mode-friendly) ──

/** A JSON Schema object. Opaque here — the caller owns its shape (plan §4.1). */
export type JsonSchema = { readonly [key: string]: unknown };

// ── The injectable model-call seam ──────────────────────────────────────────
//
// A narrow, provider-agnostic interface. The real adapters (anthropic-client.ts,
// openai-client.ts) translate their wire payloads into these shapes; a
// contract-test stub implements them directly with canned responses. Assistant
// echo turns carry the prior response's content blocks OPAQUELY (`unknown[]`),
// so pause/repair continuation round-trips losslessly without this module
// knowing block shapes — each adapter defines (and consumes) its own block
// convention; blocks never cross adapters.

/** One conversation turn. User turns carry text; assistant echo turns carry the
 * opaque prior content blocks (for pause_turn / repair continuation). */
export type StructuredTurn =
  | { readonly role: "user"; readonly text: string }
  | { readonly role: "assistant"; readonly content: readonly unknown[] };

/**
 * A single model call the seam must satisfy.
 *
 * Deliberately future-shaped for the harness: the input is already a
 * `messages[]` turn list (not a single prompt string), and a `tools` field is a
 * PLANNED extension for the retrieval-bearing constellation stages (S1/S3) —
 * which is also why the discipline handles `pause_turn` even though Spark never
 * sends tools. Do not collapse this to a single-string input when refactoring;
 * the shape is the point. The tools/messages features themselves land with the
 * stage that needs them, not before.
 */
export interface StructuredCallRequest {
  readonly modelId: string;
  readonly system: string;
  readonly maxTokens: number;
  readonly schema: JsonSchema;
  readonly messages: readonly StructuredTurn[];
  /** Cancellation passthrough — the client adapter wires it to the SDK call so
   * a route can abandon generation when its own request dies. */
  readonly signal?: AbortSignal;
}

/**
 * The neutral outcome vocabulary — the closed set the discipline branches on.
 * Each client adapter owns the translation from its provider's native taxonomy
 * (the full mapping table lives in `docs/research/llm-provider-portability.md`
 * §2 P1). `paused` is Anthropic-only; adapters for providers without a pause
 * concept simply never emit it.
 */
export type CallOutcome =
  | "complete"
  | "truncated"
  | "refused"
  | "paused"
  | "other";

/** The normalized model response. `text` is the concatenated text blocks (for
 * parsing); `rawContent` is the opaque block list (echoed back on continuation,
 * in a shape only the emitting adapter needs to understand). */
export interface StructuredCallResponse {
  readonly outcome: CallOutcome;
  /** The raw provider stop value (`stop_reason` / `status`+`incomplete_details`
   * shorthand), preserved for diagnostics and the `other`-outcome error message.
   * Never branched on here — that is what `outcome` is for. */
  readonly providerStopReason: string | null;
  readonly stopDetails: {
    readonly category: string | null;
    readonly explanation?: string;
  } | null;
  readonly text: string;
  readonly rawContent: readonly unknown[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    /** Prompt tokens served from the provider's cache, when reported
     * (Anthropic `cache_read_input_tokens` / OpenAI `cached_tokens`).
     * Optional: absent when the provider omits the detail. */
    readonly cachedInputTokens?: number;
  };
}

/** The injected model client. Stubbed by contract tests; wrapped around the
 * Anthropic SDK by `anthropic-client.ts`. */
export interface StructuredCallClient {
  create(request: StructuredCallRequest): Promise<StructuredCallResponse>;
}

// ── Per-attempt telemetry (the inference_attempt seam) ──────────────────────
//
// Emitted once per model call, as DATA, BEFORE the table exists (plan §4.4).
// Field-for-field the shape Phase 4 will persist: `stage` already generalizes
// across constellation stages; `candidatesReturned` vs `candidatesValid` is the
// YIELD metric; `rejectReasons` feeds the quality lane. Designed so Phase 4 can
// insert it directly without reshaping.

export type InferenceAttemptOutcome =
  | "ok"
  | "validation-failed"
  | "refusal"
  | "max-tokens"
  | "pause-turn"
  | "rate-limited"
  | "timeout"
  | "transport"
  | "malformed-output";

export interface InferenceAttempt {
  readonly stage: string;
  /**
   * Correlates the attempt to the sprint that produced it, when the stage has
   * one (spark does; future harness stages may not). structured-call itself is
   * sprint-agnostic — adapters enrich their caller's `onAttempt` with this
   * before forwarding, so per-sprint yield stays a plain SQL slice.
   */
  readonly sprintId?: string;
  readonly inputHash: string;
  readonly promptVersion: string;
  readonly modelId: string;
  readonly outcome: InferenceAttemptOutcome;
  /** 0 for the first model call; incremented per retry / continuation. */
  readonly retryCount: number;
  /** Wire-level candidate count before validation (parse-path attempts only). */
  readonly candidatesReturned?: number;
  /**
   * SERVABLE candidates after the domain validator AND set assembly
   * (served-lens exclusion, dedupe, cap) — the post-exclusion count, because
   * that is the yield metric plan §4.4 defines ("returned vs. valid catches a
   * starving pipeline", and a candidate excluded from serving is not yield).
   * Parse-path attempts only. Phase 4 persists this meaning unchanged.
   */
  readonly candidatesValid?: number;
  /** Machine-readable validator reject codes for the yield/quality lane. */
  readonly rejectReasons?: readonly string[];
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Cached prompt tokens, when the provider reports them. Not yet persisted —
   * the `inference_attempt` column piggybacks on the constellation migration
   * (portability research §2 P5); sinks map fields explicitly and ignore it
   * until then. */
  readonly cachedInputTokens?: number;
}

// ── The caller's parse+validate seam ────────────────────────────────────────
//
// The caller parses the model text and validates it with its DOMAIN validator,
// returning both the control-flow Result and the yield telemetry. `reasons` on
// failure are the EXACT validator error texts, threaded verbatim into the repair
// prompt (plan §4.1 step 3).

export interface StructuredParseFailure {
  readonly reasons: readonly string[];
}

export interface StructuredParseOutcome<T> {
  readonly result: Result<T, StructuredParseFailure>;
  readonly candidatesReturned?: number;
  readonly candidatesValid?: number;
  readonly rejectReasons?: readonly string[];
}

// ── Call options ────────────────────────────────────────────────────────────

export interface StructuredCallOptions<T> {
  readonly client: StructuredCallClient;
  readonly modelId: string;
  readonly system: string;
  readonly userContent: string;
  readonly schema: JsonSchema;
  readonly maxTokens: number;
  readonly parse: (rawText: string) => StructuredParseOutcome<T>;
  readonly telemetry: {
    readonly stage: string;
    readonly inputHash: string;
    readonly promptVersion: string;
  };
  /** Per-attempt telemetry sink (the inference_attempt seam). */
  readonly onAttempt?: (attempt: InferenceAttempt) => void;
  /** Injected clock for latency, defaults to Date.now (infra is allowed clocks). */
  readonly clock?: () => number;
  /** Validation-repair retries permitted before dead-ending (default 1 —
   * spark's disposable-artifact cap). Per-call because stages differ: a
   * constellation discovery call may afford more than a spark. Sustained
   * repair rate at ANY cap is a prompt defect, never an operating cost. */
  readonly repairCap?: number;
  /** Override the repair prompt wording; must still carry the reason texts. */
  readonly buildRepairPrompt?: (reasons: readonly string[]) => string;
  /** Cancellation signal, forwarded on every model call this run makes. */
  readonly signal?: AbortSignal;
}

// ── Bounds ──────────────────────────────────────────────────────────────────

const MAX_TOKENS_RETRY_MULTIPLIER = 2;
/** Safety net against a runaway pause loop (server tools aren't used by
 * Spark, so this should never bind — but the harness must not spin). */
const MAX_PAUSE_CONTINUATIONS = 4;
/** The default validation-repair cap. Spark's is 1 (a spark is disposable —
 * plan §4.1); constellation stages pass their own via `repairCap`
 * (constellation plan D8.5). */
const DEFAULT_REPAIR_CAP = 1;
/** Model calls possible outside the repair path: the initial call, one
 * max_tokens retry, and the pause continuations. The absolute per-call ceiling
 * is this plus the repair cap — resized with the cap, as a belt-and-suspenders
 * backstop the sub-budgets should always bind before. */
const NON_REPAIR_ATTEMPT_BUDGET = 2 + MAX_PAUSE_CONTINUATIONS;

function inferenceError(
  reason: InferenceError["reason"],
  message: string,
  cause?: unknown,
): InferenceError {
  return { kind: "InferenceError", reason, message, cause };
}

function defaultRepairPrompt(reasons: readonly string[]): string {
  return (
    "Your previous response could not be used. Fix these problems and reply " +
    "with corrected JSON that matches the required schema exactly:\n" +
    reasons.map((reason) => `- ${reason}`).join("\n")
  );
}

// ── Transport-error classification (duck-typed; no SDK import) ───────────────

function readStringField(error: unknown, field: string): string | undefined {
  if (typeof error === "object" && error !== null && field in error) {
    const value: unknown = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function readStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const value: unknown = (error as Record<string, unknown>).status;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

interface ClassifiedError {
  readonly reason: InferenceError["reason"];
  readonly outcome: InferenceAttemptOutcome;
  readonly message: string;
}

/**
 * Map any thrown SDK/transport error into an `InferenceError` reason, without
 * importing the SDK (this module stays provider-agnostic).
 *
 * Classification is STATUS-FIRST, because real `@anthropic-ai/sdk` 0.110.0
 * error instances all report `name: "Error"` — no subclass sets `this.name`
 * (verified against `core/error.js`) — so a class-name branch would be dead
 * code against real errors. The HTTP status is the only reliable discriminator
 * on an API error instance:
 *   - 429                    → rate-limit
 *   - any other numeric 4xx/5xx → transport
 * Errors with NO status are connection-level (`APIConnectionError` and
 * subclasses construct with `status: undefined`). There, timeout and abort are
 * detected structurally on BOTH `name` and `message`, case-insensitively, so
 * real instances (name "Error", message "Request timed out.") and reasonable
 * stubs (name "APIConnectionTimeoutError") classify identically.
 *
 * DELIBERATE mapping decision: user abort (cancellation, e.g.
 * `APIUserAbortError` — "Request was aborted.") is NOT a timeout, but
 * `InferenceError`'s closed reason set (timeout | rate-limit |
 * malformed-output | transport) has no cancellation variant, so aborts land as
 * "transport" until the error taxonomy grows one. Documented so it reads as a
 * decision, not an accident; the branch exists to keep the mapping
 * deterministic and to mark the seam where a future "cancelled" reason slots
 * in. Every failure lands in a variant; nothing escapes as a throw.
 */
function classifyError(error: unknown): ClassifiedError {
  const status = readStatus(error);
  const name = readStringField(error, "name") ?? "";
  const message = readStringField(error, "message") ?? "Model call failed";
  const signature = `${name} ${message}`;

  // Status-first: an HTTP response was received.
  if (status === 429) {
    return { reason: "rate-limit", outcome: "rate-limited", message };
  }
  if (status !== undefined) {
    return { reason: "transport", outcome: "transport", message };
  }

  // No status → connection-level failure. Structural detection on name+message.
  if (/timed?[\s-]?out|timeout/i.test(signature)) {
    return { reason: "timeout", outcome: "timeout", message };
  }
  if (/abort/i.test(signature)) {
    // Cancellation → "transport" (see the doc comment above).
    return { reason: "transport", outcome: "transport", message };
  }
  return { reason: "transport", outcome: "transport", message };
}

/**
 * Append assistant-echo content while keeping the turn list STRICTLY
 * alternating. After a pause_turn continuation the trailing message is already
 * an assistant echo; pushing another assistant turn (e.g. for the repair
 * prompt's echo of the bad response) would produce consecutive same-role
 * messages, which the Messages API rejects with a 400 — misclassified as
 * transport. Instead, merge into the trailing assistant turn by concatenating
 * the content block lists. Pure: returns a new turn list.
 */
function withAssistantEcho(
  messages: readonly StructuredTurn[],
  content: readonly unknown[],
): StructuredTurn[] {
  const last = messages[messages.length - 1];
  if (last !== undefined && last.role === "assistant") {
    return [
      ...messages.slice(0, -1),
      { role: "assistant", content: [...last.content, ...content] },
    ];
  }
  return [...messages, { role: "assistant", content }];
}

// ── The discipline ──────────────────────────────────────────────────────────

/**
 * Run one structured generation with exhaustive stop_reason handling, a bounded
 * repair loop, transport-error mapping, and per-attempt telemetry. Returns the
 * caller's parsed value or an `InferenceError`; never throws for an expected
 * failure. See the module header for the full contract.
 */
export async function structuredCall<T>(
  options: StructuredCallOptions<T>,
): Promise<Result<T, InferenceError>> {
  const clock = options.clock ?? Date.now;
  const buildRepair = options.buildRepairPrompt ?? defaultRepairPrompt;
  const repairCap = options.repairCap ?? DEFAULT_REPAIR_CAP;
  const maxTotalAttempts = NON_REPAIR_ATTEMPT_BUDGET + repairCap;

  let messages: StructuredTurn[] = [
    { role: "user", text: options.userContent },
  ];
  let currentMaxTokens = options.maxTokens;
  let maxTokensRetryUsed = false;
  let repairsUsed = 0;
  let pauseContinuations = 0;
  let attemptIndex = 0;
  // Text emitted BEFORE a pause_turn is carried forward and prepended to the
  // continuation's text, so `parse` sees the whole turn's output, not just the
  // final chunk (review: pre-pause text was echoed into `messages` but dropped
  // from the parse input, so a JSON payload split across a pause never parsed).
  // Reset whenever a NEW generation begins (a max_tokens retry or a repair),
  // since those re-generate rather than continue. NOTE: pause_turn continuation
  // semantics are not yet verified against real Anthropic pause payloads — that
  // lands with the first tool-bearing harness stage (S1); Spark sends no tools,
  // so this path should not fire in production before then.
  let pausePrefix = "";

  const emit = (
    outcome: InferenceAttemptOutcome,
    latencyMs: number,
    usage: StructuredCallResponse["usage"] | null,
    yieldInfo?: Pick<
      InferenceAttempt,
      "candidatesReturned" | "candidatesValid" | "rejectReasons"
    >,
  ): void => {
    options.onAttempt?.({
      stage: options.telemetry.stage,
      inputHash: options.telemetry.inputHash,
      promptVersion: options.telemetry.promptVersion,
      modelId: options.modelId,
      outcome,
      retryCount: attemptIndex,
      latencyMs,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cachedInputTokens: usage?.cachedInputTokens,
      candidatesReturned: yieldInfo?.candidatesReturned,
      candidatesValid: yieldInfo?.candidatesValid,
      rejectReasons: yieldInfo?.rejectReasons,
    });
  };

  for (;;) {
    if (attemptIndex >= maxTotalAttempts) {
      // No attempt record here: no model call happened. "One record per model
      // call" holds exactly — a phantom record with zero latency would corrupt
      // the per-attempt telemetry Phase 4 persists.
      return err(
        inferenceError(
          "malformed-output",
          "Exceeded the structured-call attempt budget",
        ),
      );
    }

    const startedAt = clock();
    let response: StructuredCallResponse;
    try {
      response = await options.client.create({
        modelId: options.modelId,
        system: options.system,
        maxTokens: currentMaxTokens,
        schema: options.schema,
        messages,
        signal: options.signal,
      });
    } catch (caught) {
      const classified = classifyError(caught);
      emit(classified.outcome, clock() - startedAt, null);
      return err(
        inferenceError(classified.reason, classified.message, caught),
      );
    }
    const latencyMs = clock() - startedAt;
    const usage = response.usage;

    switch (response.outcome) {
      case "refused": {
        emit("refusal", latencyMs, usage);
        const explanation =
          response.stopDetails?.explanation ??
          response.stopDetails?.category ??
          "policy refusal";
        return err(
          inferenceError(
            "malformed-output",
            `Model refused to generate: ${explanation}`,
          ),
        );
      }

      case "truncated": {
        emit("max-tokens", latencyMs, usage);
        if (maxTokensRetryUsed) {
          return err(
            inferenceError(
              "malformed-output",
              "Output truncated at the token budget after one retry",
            ),
          );
        }
        maxTokensRetryUsed = true;
        currentMaxTokens = currentMaxTokens * MAX_TOKENS_RETRY_MULTIPLIER;
        pausePrefix = ""; // a retry re-generates — discard any pause accumulation
        attemptIndex += 1;
        continue;
      }

      case "paused": {
        emit("pause-turn", latencyMs, usage);
        if (pauseContinuations >= MAX_PAUSE_CONTINUATIONS) {
          return err(
            inferenceError(
              "malformed-output",
              "Turn did not complete within the pause-continuation budget",
            ),
          );
        }
        // Carry this chunk's text forward so the eventual parse sees the whole
        // turn, and echo the assistant blocks back verbatim (merged into a
        // trailing assistant turn if one exists); the server resumes the turn.
        pausePrefix += response.text;
        messages = withAssistantEcho(messages, response.rawContent);
        pauseContinuations += 1;
        attemptIndex += 1;
        continue;
      }

      case "complete": {
        // Prepend any text carried over from pause continuations so parse
        // sees the whole turn, not just this final chunk.
        const parsed = options.parse(pausePrefix + response.text);
        const yieldInfo = {
          candidatesReturned: parsed.candidatesReturned,
          candidatesValid: parsed.candidatesValid,
          rejectReasons: parsed.rejectReasons,
        };
        if (parsed.result.ok) {
          emit("ok", latencyMs, usage, yieldInfo);
          return ok(parsed.result.value);
        }
        emit("validation-failed", latencyMs, usage, yieldInfo);
        const reasons = parsed.result.error.reasons;
        if (repairsUsed >= repairCap) {
          return err(
            inferenceError(
              "malformed-output",
              `Validation exhausted after repair: ${reasons.join("; ")}`,
            ),
          );
        }
        repairsUsed += 1;
        pausePrefix = ""; // the repair re-generates from scratch — drop the prefix
        // Standard repair shape: echo the bad turn (merging into a trailing
        // assistant echo left by a pause continuation, so roles stay strictly
        // alternating), then a user turn carrying the exact validator error
        // text so the model can correct against it.
        messages = withAssistantEcho(messages, response.rawContent);
        messages.push({ role: "user", text: buildRepair(reasons) });
        attemptIndex += 1;
        continue;
      }

      case "other": {
        // tool_use or any unknown/future provider stop value the adapter could
        // not classify: explicit, never a crash. The switch is exhaustive over
        // the closed CallOutcome union — TypeScript enforces it.
        emit("malformed-output", latencyMs, usage);
        return err(
          inferenceError(
            "malformed-output",
            `Unexpected stop reason: ${response.providerStopReason ?? "unknown"}`,
          ),
        );
      }
    }
  }
}
