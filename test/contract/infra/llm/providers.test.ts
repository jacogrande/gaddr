/**
 * Contract tests for the stage → provider/model/effort registry (model-routing
 * research §6; portability research §2 P3). Locks the routing SHAPE: a stage's
 * config is the 2-D point (tier + effort), env-selected, failing loud on a typo.
 * Pure — `resolveSparkLlm` takes the env as a parameter, so no process env is
 * mutated.
 */

import { describe, expect, test } from "bun:test";
import {
  resolveDiscoveryLlm,
  resolveNodesLlm,
  resolveSparkLlm,
} from "../../../../src/infra/llm/providers";

function env(provider?: string): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  return provider === undefined ? base : { ...base, LLM_PROVIDER: provider };
}

describe("resolveSparkLlm — the spark stage's routing choice", () => {
  test("openai → gpt-5.6-luna at effort none (latency-bounded)", () => {
    expect(resolveSparkLlm(env("openai"))).toEqual({
      provider: "openai",
      modelId: "gpt-5.6-luna",
      effort: "none",
    });
  });

  test("anthropic → pinned Haiku snapshot at effort none", () => {
    expect(resolveSparkLlm(env("anthropic"))).toEqual({
      provider: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      effort: "none",
    });
  });

  test("defaults to OpenAI when LLM_PROVIDER is unset (the 2026-07 migration)", () => {
    expect(resolveSparkLlm(env()).provider).toBe("openai");
    expect(resolveSparkLlm(env("")).provider).toBe("openai");
  });

  test("a typo'd provider fails loudly at composition", () => {
    expect(() => resolveSparkLlm(env("claude"))).toThrow("not a known provider");
  });
});

describe("resolveDiscoveryLlm / resolveNodesLlm — the constellation strong tier", () => {
  test("both resolve to the same Sonnet-class model at medium effort", () => {
    for (const resolve of [resolveDiscoveryLlm, resolveNodesLlm]) {
      expect(resolve(env("anthropic"))).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-5",
        effort: "medium",
      });
      expect(resolve(env("openai")).modelId).toBe("gpt-5.6-terra");
    }
  });

  test("resolveNodesLlm takes no kind — the cache-safe uniform S3 choice", () => {
    // Structural guarantee (model-routing §4.1): a per-kind model/effort flip
    // would break the shared S3 prefix cache, so the signature forbids it — the
    // only (optional, defaulted) param is `env`, so arity is 0.
    expect(resolveNodesLlm.length).toBe(0);
  });
});
