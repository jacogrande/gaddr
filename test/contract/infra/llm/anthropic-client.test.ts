/**
 * Contract test for the Anthropic seam adapter's outcome translation — the
 * only place Anthropic's `stop_reason` vocabulary exists after the neutral
 * `CallOutcome` refactor (llm-provider-portability §2 P1). Locks the mapping
 * table so a vocabulary regression can't silently reroute the discipline.
 */

import { describe, expect, test } from "bun:test";
import type Anthropic from "@anthropic-ai/sdk";
import {
  toAnthropicEffort,
  toStructuredResponse,
} from "../../../../src/infra/llm/anthropic-client";

/** Only the fields the mapper reads; the cast is test-local and deliberate. */
function fakeMessage(overrides: {
  stop_reason: string | null;
  model?: string;
  stop_details?: { category: string | null; explanation?: string } | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
  };
}): Anthropic.Message {
  return {
    content: [{ type: "text", text: "{}" }],
    model: "claude-haiku-4-5-20251001",
    stop_details: null,
    usage: { input_tokens: 10, output_tokens: 5 },
    ...overrides,
  } as unknown as Anthropic.Message;
}

describe("toStructuredResponse — stop_reason → CallOutcome", () => {
  test.each([
    ["end_turn", "complete"],
    ["stop_sequence", "complete"],
    [null, "complete"],
    ["max_tokens", "truncated"],
    ["model_context_window_exceeded", "truncated"],
    ["refusal", "refused"],
    ["pause_turn", "paused"],
    ["tool_use", "other"],
    ["some_future_reason", "other"],
  ] as const)("%p → %s (raw value preserved)", (stopReason, outcome) => {
    const mapped = toStructuredResponse(fakeMessage({ stop_reason: stopReason }));
    expect(mapped.outcome).toBe(outcome);
    expect(mapped.providerStopReason).toBe(stopReason);
  });

  test("refusal carries stop_details through", () => {
    const mapped = toStructuredResponse(
      fakeMessage({
        stop_reason: "refusal",
        stop_details: { category: "cyber", explanation: "declined" },
      }),
    );
    expect(mapped.stopDetails).toEqual({
      category: "cyber",
      explanation: "declined",
    });
  });

  test("cache_read_input_tokens maps to the neutral cachedInputTokens", () => {
    const mapped = toStructuredResponse(
      fakeMessage({
        stop_reason: "end_turn",
        usage: { input_tokens: 40, output_tokens: 30, cache_read_input_tokens: 25 },
      }),
    );
    expect(mapped.usage).toEqual({
      inputTokens: 40,
      outputTokens: 30,
      cachedInputTokens: 25,
    });
  });

  test("surfaces the provider-reported model (alias-drift guard)", () => {
    const mapped = toStructuredResponse(
      fakeMessage({ stop_reason: "end_turn", model: "claude-haiku-4-5-20251001" }),
    );
    expect(mapped.model).toBe("claude-haiku-4-5-20251001");
  });
});

describe("toAnthropicEffort — neutral effort → output_config.effort", () => {
  test.each([
    ["low", "low"],
    ["medium", "medium"],
    ["high", "high"],
    ["xhigh", "xhigh"],
  ] as const)("%p maps 1:1 to %p", (neutral, native) => {
    expect(toAnthropicEffort(neutral)).toBe(native);
  });

  test("'none' and absent leave effort UNSET (Anthropic has no true off switch)", () => {
    expect(toAnthropicEffort("none")).toBeUndefined();
    expect(toAnthropicEffort(undefined)).toBeUndefined();
  });
});
