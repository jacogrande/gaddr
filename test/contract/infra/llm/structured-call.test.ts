/**
 * Contract tests for the shared structured-call discipline (plan §7, §8 step 3).
 *
 * Everything runs against a STUBBED injectable client — no network, no
 * ANTHROPIC_API_KEY. These lock the harness-seed behaviour every future stage
 * inherits: each stop_reason branch, the bounded repair loop (with the exact
 * validator text threaded into the retry prompt), strict turn alternation
 * across pause/repair, per-attempt telemetry sequencing, and total
 * transport-error mapping (never a throw).
 *
 * The transport-mapping fixtures are REAL `@anthropic-ai/sdk` error instances
 * (constructing them makes no network call): SDK 0.110.0 error subclasses never
 * set `this.name`, so every instance reports `name: "Error"` and the only
 * reliable discriminators are `status` and the message text. Stubs shaped as
 * `{ name: "RateLimitError", ... }` would assert a fiction.
 */

import { describe, expect, test } from "bun:test";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "@anthropic-ai/sdk";
import { err, ok } from "../../../../src/domain/types/result";
import {
  structuredCall,
  type InferenceAttempt,
  type StructuredCallClient,
  type StructuredCallRequest,
  type StructuredCallResponse,
  type StructuredParseOutcome,
} from "../../../../src/infra/llm/structured-call";

// ── Stub client ─────────────────────────────────────────────────────────────

type Reply =
  | { readonly kind: "response"; readonly response: StructuredCallResponse }
  | { readonly kind: "throw"; readonly error: unknown };

function reply(overrides: Partial<StructuredCallResponse> = {}): Reply {
  return {
    kind: "response",
    response: {
      stopReason: "end_turn",
      stopDetails: null,
      text: "{}",
      rawContent: [{ type: "text", text: "{}" }],
      usage: { inputTokens: 10, outputTokens: 5 },
      ...overrides,
    },
  };
}

function throwing(error: unknown): Reply {
  return { kind: "throw", error };
}

function makeStub(replies: readonly Reply[]): {
  readonly client: StructuredCallClient;
  readonly calls: StructuredCallRequest[];
} {
  const calls: StructuredCallRequest[] = [];
  let index = 0;
  const client: StructuredCallClient = {
    create(request) {
      calls.push(request);
      const next = replies[index];
      index += 1;
      if (next === undefined) {
        return Promise.reject(
          new Error(`stub: no reply queued for call ${String(index)}`),
        );
      }
      if (next.kind === "throw") {
        return Promise.reject(next.error);
      }
      return Promise.resolve(next.response);
    },
  };
  return { client, calls };
}

function makeClock(): () => number {
  let now = 0;
  return () => {
    now += 5;
    return now;
  };
}

interface RunResult<T> {
  readonly result: Awaited<ReturnType<typeof structuredCall<T>>>;
  readonly calls: readonly StructuredCallRequest[];
  readonly attempts: readonly InferenceAttempt[];
}

async function run<T>(
  replies: readonly Reply[],
  parse: (rawText: string) => StructuredParseOutcome<T>,
  maxTokens = 200,
): Promise<RunResult<T>> {
  const attempts: InferenceAttempt[] = [];
  const { client, calls } = makeStub(replies);
  const result = await structuredCall<T>({
    client,
    modelId: "model-x",
    system: "system",
    userContent: "draft content",
    schema: { type: "object" },
    maxTokens,
    parse,
    telemetry: { stage: "spark", inputHash: "hash-1", promptVersion: "v1" },
    onAttempt: (attempt) => attempts.push(attempt),
    clock: makeClock(),
  });
  return { result, calls, attempts };
}

const okParse =
  <T>(value: T, yieldInfo: Partial<StructuredParseOutcome<T>> = {}) =>
  (): StructuredParseOutcome<T> => ({ result: ok(value), ...yieldInfo });

// ── stop_reason branches ────────────────────────────────────────────────────

describe("structuredCall — stop_reason branches", () => {
  test("refusal is a non-retryable malformed-output; parse is never called", async () => {
    let parseCalls = 0;
    const { result, calls, attempts } = await run(
      [
        reply({
          stopReason: "refusal",
          stopDetails: { category: "cyber", explanation: "declined" },
        }),
      ],
      () => {
        parseCalls += 1;
        return { result: ok<readonly string[]>([]) };
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("malformed-output");
    expect(parseCalls).toBe(0);
    expect(calls.length).toBe(1);
    expect(attempts.map((a) => a.outcome)).toEqual(["refusal"]);
    expect(attempts[0]?.retryCount).toBe(0);
  });

  test("max_tokens retries ONCE with a doubled budget, then dead-ends", async () => {
    const { result, calls, attempts } = await run(
      [reply({ stopReason: "max_tokens" }), reply({ stopReason: "max_tokens" })],
      okParse<readonly string[]>([]),
      500,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("malformed-output");
    expect(calls.length).toBe(2);
    expect(calls[0]?.maxTokens).toBe(500);
    expect(calls[1]?.maxTokens).toBe(1000);
    expect(attempts.map((a) => a.outcome)).toEqual(["max-tokens", "max-tokens"]);
    expect(attempts.map((a) => a.retryCount)).toEqual([0, 1]);
  });

  test("pause_turn continues the turn by echoing the assistant blocks back", async () => {
    const pauseContent: readonly unknown[] = [
      { type: "server_tool_use", id: "srv_1" },
    ];
    const { result, calls, attempts } = await run(
      [
        // Empty pre-pause text: this test isolates the block-echo behaviour; the
        // text-accumulation across a pause has its own regression test below.
        reply({ stopReason: "pause_turn", text: "", rawContent: pauseContent }),
        reply({ stopReason: "end_turn", text: "DONE" }),
      ],
      (text) =>
        text === "DONE"
          ? { result: ok<readonly string[]>(["done"]) }
          : { result: err({ reasons: ["not done"] }) },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["done"]);
    expect(calls.length).toBe(2);
    const echoed = calls[1]?.messages.find((m) => m.role === "assistant");
    expect(echoed).toBeDefined();
    if (echoed?.role === "assistant") {
      expect(echoed.content).toEqual(pauseContent);
    }
    expect(attempts.map((a) => a.outcome)).toEqual(["pause-turn", "ok"]);
    expect(attempts.map((a) => a.retryCount)).toEqual([0, 1]);
  });

  test("REGRESSION: pause_turn carries pre-pause text forward so parse sees the whole turn (finding 9)", async () => {
    // The model emits the first half of the JSON, pauses, then completes it. The
    // parse must receive the CONCATENATION of both chunks, not just the final one.
    let sawText: string | undefined;
    const { result, calls } = await run(
      [
        reply({
          stopReason: "pause_turn",
          text: '{"candidates":[',
          rawContent: [{ type: "server_tool_use", id: "srv_1" }],
        }),
        reply({ stopReason: "end_turn", text: "]}" }),
      ],
      (text): StructuredParseOutcome<readonly string[]> => {
        sawText = text;
        return text === '{"candidates":[]}'
          ? { result: ok<readonly string[]>(["whole"]) }
          : { result: err({ reasons: [`partial: ${text}`] }) };
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["whole"]);
    expect(sawText).toBe('{"candidates":[]}'); // concatenated across the pause
    expect(calls.length).toBe(2);
  });

  test("an unknown stop_reason maps to malformed-output without crashing", async () => {
    const { result, calls, attempts } = await run(
      [reply({ stopReason: "tool_use" })],
      okParse<readonly string[]>([]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("malformed-output");
    expect(calls.length).toBe(1);
    expect(attempts.map((a) => a.outcome)).toEqual(["malformed-output"]);
  });

  test("end_turn takes the parse path and returns the parsed value", async () => {
    const { result, attempts } = await run(
      [reply({ stopReason: "end_turn", text: "OK" })],
      okParse<readonly string[]>(["value"], {
        candidatesReturned: 2,
        candidatesValid: 2,
        rejectReasons: [],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["value"]);
    expect(attempts[0]?.outcome).toBe("ok");
    expect(attempts[0]?.candidatesReturned).toBe(2);
    expect(attempts[0]?.candidatesValid).toBe(2);
    expect(attempts[0]?.latencyMs).toBe(5);
  });
});

// ── validation-failure repair loop ──────────────────────────────────────────

describe("structuredCall — repair loop", () => {
  const EXACT_VALIDATOR_TEXT =
    "The grounding span does not appear in the draft";

  test("the repair retry prompt carries the EXACT validator error text", async () => {
    const { calls } = await run(
      [
        reply({
          stopReason: "end_turn",
          text: "ATTEMPT_ONE",
          rawContent: [{ type: "text", text: "ATTEMPT_ONE" }],
        }),
        reply({ stopReason: "end_turn", text: "ATTEMPT_TWO" }),
      ],
      () => ({
        result: err({ reasons: [EXACT_VALIDATOR_TEXT] }),
        candidatesReturned: 3,
        candidatesValid: 0,
        rejectReasons: ["ungrounded"],
      }),
    );

    expect(calls.length).toBe(2);
    const repairTurn = calls[1]?.messages.find(
      (m) => m.role === "user" && m.text.includes(EXACT_VALIDATOR_TEXT),
    );
    expect(repairTurn).toBeDefined();
    // The bad assistant turn is echoed before the repair instruction.
    const echoed = calls[1]?.messages.find((m) => m.role === "assistant");
    expect(echoed).toBeDefined();
  });

  test("a second validation failure dead-ends as malformed-output", async () => {
    const { result, calls, attempts } = await run(
      [reply({ stopReason: "end_turn" }), reply({ stopReason: "end_turn" })],
      () => ({
        result: err({ reasons: ["still bad"] }),
        candidatesReturned: 3,
        candidatesValid: 0,
        rejectReasons: ["ungrounded", "too-long"],
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("malformed-output");
    expect(calls.length).toBe(2);
    expect(attempts.map((a) => a.outcome)).toEqual([
      "validation-failed",
      "validation-failed",
    ]);
    expect(attempts.map((a) => a.retryCount)).toEqual([0, 1]);
    expect(attempts[0]?.candidatesReturned).toBe(3);
    expect(attempts[0]?.candidatesValid).toBe(0);
    expect(attempts[0]?.rejectReasons).toEqual(["ungrounded", "too-long"]);
  });

  test("a repair that succeeds on the second attempt returns ok", async () => {
    let call = 0;
    const { result, attempts } = await run(
      [reply({ stopReason: "end_turn" }), reply({ stopReason: "end_turn" })],
      (): StructuredParseOutcome<readonly string[]> => {
        call += 1;
        return call === 1
          ? { result: err({ reasons: ["fixable"] }), candidatesReturned: 3, candidatesValid: 0 }
          : { result: ok<readonly string[]>(["fixed"]), candidatesReturned: 3, candidatesValid: 1 };
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["fixed"]);
    expect(attempts.map((a) => a.outcome)).toEqual(["validation-failed", "ok"]);
    expect(attempts.map((a) => a.retryCount)).toEqual([0, 1]);
  });
});

// ── SDK / transport error mapping ───────────────────────────────────────────
//
// Fixtures are REAL SDK error instances built the way the SDK builds them:
// HTTP errors via `APIError.generate(status, body, ...)` (which returns the
// status-specific subclass), connection-level errors via their constructors.
// All of them report `name: "Error"` — classification must not depend on names.

function realHttpError(status: number, message: string): unknown {
  return APIError.generate(
    status,
    { type: "error", message },
    undefined,
    new Headers(),
  );
}

describe("structuredCall — transport error mapping (never throws)", () => {
  const cases: ReadonlyArray<{
    readonly label: string;
    readonly error: unknown;
    readonly reason: "rate-limit" | "timeout" | "transport";
    readonly outcome: InferenceAttempt["outcome"];
  }> = [
    {
      label: "real RateLimitError (429, name 'Error')",
      error: realHttpError(429, "rate limited"),
      reason: "rate-limit",
      outcome: "rate-limited",
    },
    {
      label: "real InternalServerError (500, name 'Error')",
      error: realHttpError(500, "boom"),
      reason: "transport",
      outcome: "transport",
    },
    {
      label: "real BadRequestError (400, name 'Error')",
      error: realHttpError(400, "messages: roles must alternate"),
      reason: "transport",
      outcome: "transport",
    },
    {
      label: "real APIConnectionTimeoutError (no status, 'Request timed out.')",
      error: new APIConnectionTimeoutError(),
      reason: "timeout",
      outcome: "timeout",
    },
    {
      label: "real APIConnectionError (no status, 'Connection error.')",
      error: new APIConnectionError({}),
      reason: "transport",
      outcome: "transport",
    },
    {
      // Deliberate mapping: cancellation is NOT a timeout; it lands as
      // transport until InferenceError grows a cancellation variant.
      label: "real APIUserAbortError ('Request was aborted.')",
      error: new APIUserAbortError(),
      reason: "transport",
      outcome: "transport",
    },
    {
      // A reasonable stub: class-like name, unhelpful message. The classifier
      // checks BOTH name and message, so this still lands as timeout.
      label: "name-shaped stub (name 'APIConnectionTimeoutError')",
      error: { name: "APIConnectionTimeoutError", message: "no details" },
      reason: "timeout",
      outcome: "timeout",
    },
  ];

  for (const testCase of cases) {
    test(`${testCase.label} maps to ${testCase.reason} and emits one attempt`, async () => {
      const { result, attempts } = await run(
        [throwing(testCase.error)],
        okParse<readonly string[]>([]),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.reason).toBe(testCase.reason);
      expect(attempts.length).toBe(1);
      expect(attempts[0]?.outcome).toBe(testCase.outcome);
    });
  }

  test("real SDK error instances actually report name 'Error' (probe assumption)", () => {
    expect((realHttpError(429, "x") as Error).name).toBe("Error");
    expect(new APIUserAbortError().name).toBe("Error");
    expect(new APIConnectionTimeoutError().name).toBe("Error");
  });

  test("a bare thrown Error (no status/name shape) maps to transport", async () => {
    const { result } = await run(
      [throwing(new Error("socket hang up"))],
      okParse<readonly string[]>([]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("transport");
  });
});

// ── Turn alternation across pause + repair ──────────────────────────────────

describe("structuredCall — turn alternation", () => {
  test("pause_turn followed by a validation repair keeps roles strictly alternating", async () => {
    const pauseBlocks: readonly unknown[] = [{ type: "server_tool_use", id: "srv_1" }];
    const badBlocks: readonly unknown[] = [{ type: "text", text: "BAD" }];
    let parseCalls = 0;

    const { result, calls } = await run(
      [
        reply({ stopReason: "pause_turn", rawContent: pauseBlocks }),
        reply({ stopReason: "end_turn", text: "BAD", rawContent: badBlocks }),
        reply({ stopReason: "end_turn", text: "GOOD" }),
      ],
      (text): StructuredParseOutcome<readonly string[]> => {
        parseCalls += 1;
        return text === "GOOD"
          ? { result: ok<readonly string[]>(["good"]) }
          : { result: err({ reasons: ["bad output"] }) };
      },
    );

    expect(result.ok).toBe(true);
    expect(parseCalls).toBe(2);
    expect(calls.length).toBe(3);

    // The third call's message list must be strictly alternating: the repair
    // echo merged into the trailing assistant turn left by the pause
    // continuation, instead of a second consecutive assistant message.
    const roles = calls[2]?.messages.map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "user"]);
    const assistant = calls[2]?.messages[1];
    if (assistant?.role === "assistant") {
      expect(assistant.content).toEqual([...pauseBlocks, ...badBlocks]);
    } else {
      throw new Error("expected a merged assistant echo turn");
    }
  });
});

// ── Attempt budget exhaustion ───────────────────────────────────────────────

describe("structuredCall — attempt budget", () => {
  test("budget exhaustion emits NO phantom record: one record per model call, exactly", async () => {
    // 4 pause continuations + 1 max_tokens retry + 1 validation failure =
    // 6 model calls; the repair would be call 7, which exceeds the budget.
    const { result, calls, attempts } = await run(
      [
        reply({ stopReason: "pause_turn" }),
        reply({ stopReason: "pause_turn" }),
        reply({ stopReason: "pause_turn" }),
        reply({ stopReason: "pause_turn" }),
        reply({ stopReason: "max_tokens" }),
        reply({ stopReason: "end_turn" }),
      ],
      (): StructuredParseOutcome<readonly string[]> => ({
        result: err({ reasons: ["never good"] }),
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe("malformed-output");
      expect(result.error.message).toContain("attempt budget");
    }
    expect(calls.length).toBe(6);
    expect(attempts.length).toBe(6); // no 7th phantom record
    expect(attempts.map((a) => a.outcome)).toEqual([
      "pause-turn",
      "pause-turn",
      "pause-turn",
      "pause-turn",
      "max-tokens",
      "validation-failed",
    ]);
  });
});
