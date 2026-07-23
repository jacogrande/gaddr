/**
 * Contract tests for the OpenAI seam adapter (llm-provider-portability §2 P2).
 *
 * All against the PURE exported mapping functions — no network, no
 * OPENAI_API_KEY. The load-bearing assertions, in order of how expensive their
 * regressions would be:
 *
 *  1. `store: false` on every built request — the Responses API default is
 *     store:true (≥30-day server-side retention of the response body), the
 *     sharpest violation of the drafts-never-at-rest posture (infra.md §7.4).
 *  2. The outcome-mapping table: refusal-part-with-status-completed → refused
 *     (the status is NOT authoritative), incomplete → truncated/refused by
 *     reason, null incomplete_details → truncated (known provider bug),
 *     failed → throw (classified as transport upstream).
 *  3. Strict structured output requested; reasoning effort pinned.
 *  4. The adapter-private echo convention round-trips.
 */

import { describe, expect, test } from "bun:test";
import type OpenAI from "openai";
import {
  buildResponsesRequest,
  fromResponsesResponse,
  toResponsesInput,
} from "../../../../src/infra/llm/openai-client";
import type { StructuredCallRequest } from "../../../../src/infra/llm/structured-call";

const REQUEST: StructuredCallRequest = {
  modelId: "gpt-5.6-luna",
  system: "system prompt",
  maxTokens: 1024,
  schema: { type: "object", additionalProperties: false, required: [], properties: {} },
  messages: [{ role: "user", text: "draft content" }],
};

/** Build a Response carrying only the fields the mapper reads. The cast is
 * test-local and deliberate: constructing every required SDK field would bury
 * the assertions under boilerplate the mapper never touches. */
function fakeResponse(overrides: {
  status?: string;
  output?: readonly unknown[];
  incomplete_details?: { reason?: string } | null;
  error?: { code: string; message: string } | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: { cached_tokens: number };
  };
}): OpenAI.Responses.Response {
  return {
    status: "completed",
    output: [],
    incomplete_details: null,
    error: null,
    ...overrides,
  } as unknown as OpenAI.Responses.Response;
}

function textMessage(text: string): unknown {
  return {
    type: "message",
    role: "assistant",
    content: [{ type: "output_text", text, annotations: [] }],
  };
}

// ── Request building ────────────────────────────────────────────────────────

describe("buildResponsesRequest", () => {
  const built = buildResponsesRequest(REQUEST, "none");

  test("NEVER stores: store is false on every request (infra.md §7.4)", () => {
    expect(built.store).toBe(false);
  });

  test("requests strict structured output with the caller's schema", () => {
    expect(built.text?.format?.type).toBe("json_schema");
    if (built.text?.format?.type === "json_schema") {
      expect(built.text.format.strict).toBe(true);
      expect(built.text.format.schema).toEqual(REQUEST.schema);
    }
  });

  test("pins reasoning effort (spark-class latency budgets)", () => {
    expect(built.reasoning?.effort).toBe("none");
  });

  test("threads model, system-as-instructions, and the token budget", () => {
    expect(built.model).toBe("gpt-5.6-luna");
    expect(built.instructions).toBe("system prompt");
    expect(built.max_output_tokens).toBe(1024);
  });
});

// ── Input mapping + echo round-trip ─────────────────────────────────────────

describe("toResponsesInput", () => {
  test("user turns carry text; assistant echo turns flatten this adapter's own blocks", () => {
    const input = toResponsesInput([
      { role: "user", text: "hello" },
      { role: "assistant", content: [{ type: "output_text", text: "prior output" }] },
      { role: "user", text: "repair instruction" },
    ]);
    expect(input).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "prior output" },
      { role: "user", content: "repair instruction" },
    ]);
  });

  test("round-trip: rawContent emitted by the mapper flattens back to the same text", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({ output: [textMessage('{"a":1}')] }),
    );
    const input = toResponsesInput([
      { role: "assistant", content: mapped.rawContent },
    ]);
    expect(input[0]?.content).toBe('{"a":1}');
  });
});

// ── Outcome mapping ─────────────────────────────────────────────────────────

describe("fromResponsesResponse — outcome mapping", () => {
  test("completed with output_text → complete; text concatenated across parts", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({
        output: [textMessage('{"candidates"'), textMessage(":[]}")],
        usage: {
          input_tokens: 40,
          output_tokens: 30,
          input_tokens_details: { cached_tokens: 12 },
        },
      }),
    );
    expect(mapped.outcome).toBe("complete");
    expect(mapped.text).toBe('{"candidates":[]}');
    expect(mapped.usage).toEqual({
      inputTokens: 40,
      outputTokens: 30,
      cachedInputTokens: 12,
    });
  });

  test("a refusal part with status still 'completed' → refused (the refusal channel is authoritative)", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "refusal", refusal: "I can't help with that." }],
          },
        ],
      }),
    );
    expect(mapped.outcome).toBe("refused");
    expect(mapped.providerStopReason).toBe("refusal");
    expect(mapped.stopDetails?.explanation).toBe("I can't help with that.");
  });

  test("incomplete + max_output_tokens → truncated", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      }),
    );
    expect(mapped.outcome).toBe("truncated");
    expect(mapped.providerStopReason).toBe("incomplete:max_output_tokens");
  });

  test("incomplete + NULL incomplete_details → truncated (known provider bug, defensive)", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({ status: "incomplete", incomplete_details: null }),
    );
    expect(mapped.outcome).toBe("truncated");
    expect(mapped.providerStopReason).toBe("incomplete:unknown");
  });

  test("incomplete + content_filter → refused with the category preserved", () => {
    const mapped = fromResponsesResponse(
      fakeResponse({
        status: "incomplete",
        incomplete_details: { reason: "content_filter" },
      }),
    );
    expect(mapped.outcome).toBe("refused");
    expect(mapped.stopDetails?.category).toBe("content-filter");
  });

  test("failed → throws with the response's error message (classified as transport upstream)", () => {
    expect(() =>
      fromResponsesResponse(
        fakeResponse({
          status: "failed",
          error: { code: "server_error", message: "upstream exploded" },
        }),
      ),
    ).toThrow("upstream exploded");
  });

  test("a background-mode status on a sync call → other, never a crash", () => {
    const mapped = fromResponsesResponse(fakeResponse({ status: "cancelled" }));
    expect(mapped.outcome).toBe("other");
    expect(mapped.providerStopReason).toBe("cancelled");
  });
});
