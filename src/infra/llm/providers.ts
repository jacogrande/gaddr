/**
 * providers.ts — the stage → provider/model registry (llm-provider-portability
 * research §2 P3). The single place a provider choice is made; everything else
 * speaks the `StructuredCallClient` seam.
 *
 * Convention change, logged: model IDs used to live in the prompt module
 * ("never hardcoded at call sites" — spark plan §4.1). With two providers the
 * model is a *deployment* choice, not a prompt property, so it moves here —
 * but prompts are still TUNED against a model (the spark-v2/v3 lesson), so a
 * provider flip is an eval-gated rollout, never just this file: re-run the
 * golden corpus, watch first-attempt yield, expect a prompt tune
 * (portability research §3).
 *
 * Selection is env-driven and read at call time (the same discipline as the
 * API keys): `LLM_PROVIDER=openai|anthropic`, defaulting to OpenAI since the
 * 2026-07 migration. A per-stage override can be added when a stage needs to
 * diverge (e.g. constellation on a different provider than spark) — the
 * registry shape already supports it.
 *
 * Model pinning per provider:
 *  - Anthropic: dated snapshot where one exists (alias re-resolution silently
 *    confounds telemetry under an unchanged inputHash — spark-v2 lesson).
 *  - OpenAI: `gpt-5.6-luna` is ALIAS-ONLY — /v1/models listed no dated
 *    snapshot (verified 2026-07-23, same posture as current-gen Anthropic
 *    models), so the response-reported model is the drift signal. Yield gate
 *    passed the same day: 3/3 first-attempt on the smoke corpus, no tune.
 */

import type { ReasoningEffort, StructuredCallClient } from "./structured-call";
import { createAnthropicStructuredClient } from "./anthropic-client";
import { createOpenAIStructuredClient } from "./openai-client";

export type LlmProvider = "anthropic" | "openai";

/**
 * A stage's resolved routing choice — the 2-D point (model-routing research §1):
 * a capability tier (`provider` + `modelId`) and a reasoning `effort`. `maxTokens`
 * is optional here: spark's budget lives in its prompt module (`SPARK_MAX_TOKENS`),
 * but the field exists so a synthesis stage can size its own budget from the
 * registry (restoring the portability-research P3 shape). Adding a per-stage
 * entry beside `spark` is how a future constellation stage picks Sonnet + high
 * effort — config, not code.
 */
export interface StageLlmConfig {
  readonly provider: LlmProvider;
  readonly modelId: string;
  readonly effort: ReasoningEffort;
  readonly maxTokens?: number;
}

const LLM_PROVIDER_ENV = "LLM_PROVIDER";
const DEFAULT_PROVIDER: LlmProvider = "openai";

/** Spark's cheap-fast tier per provider (portability research §2 P3 mapping). */
const SPARK_MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-5.6-luna",
};

function resolveProvider(env: NodeJS.ProcessEnv): LlmProvider {
  const raw = env[LLM_PROVIDER_ENV];
  if (raw === undefined || raw === "") {
    return DEFAULT_PROVIDER;
  }
  if (raw === "anthropic" || raw === "openai") {
    return raw;
  }
  // A typo'd provider must fail loudly at composition, not silently pick a
  // default — infra may throw; the route maps it before any domain boundary.
  throw new Error(
    `${LLM_PROVIDER_ENV}="${raw}" is not a known provider (anthropic | openai).`,
  );
}

/** The spark stage's routing choice, resolved from the environment. Effort is
 * pinned `"none"`: spark's summon→fallback path is latency-bounded (~4s), and a
 * reasoning pass would blow first-token latency (model-routing research §4.3). */
export function resolveSparkLlm(
  env: NodeJS.ProcessEnv = process.env,
): StageLlmConfig {
  const provider = resolveProvider(env);
  return { provider, modelId: SPARK_MODEL_BY_PROVIDER[provider], effort: "none" };
}

/** Construct the structured-call client for a provider. Both factories read
 * their API key lazily at first generation, so constructing the unused one is
 * free and safe. */
export function createStructuredClientFor(
  provider: LlmProvider,
): StructuredCallClient {
  return provider === "anthropic"
    ? createAnthropicStructuredClient()
    : createOpenAIStructuredClient();
}
