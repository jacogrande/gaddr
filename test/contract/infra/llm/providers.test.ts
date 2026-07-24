/**
 * Contract tests for the stage → provider/model/effort registry (model-routing
 * research §6; portability research §2 P3). Locks the routing SHAPE: a stage's
 * config is the 2-D point (tier + effort), env-selected, failing loud on a typo.
 * Pure — `resolveSparkLlm` takes the env as a parameter, so no process env is
 * mutated.
 */

import { describe, expect, test } from "bun:test";
import { resolveSparkLlm } from "../../../../src/infra/llm/providers";

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
