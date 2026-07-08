/**
 * Contract tests for the real Spark adapter (plan §7, §8 step 3).
 *
 * Against a STUBBED structured-call client — no network, no SDK, no API key. The
 * load-bearing assertions: the happy path assembles a SparkCandidateSet whose
 * candidates PASS the real domain validator; servedLenses are excluded both from
 * the prompt and from the assembled set; and the input hash is stable for
 * identical inputs but changes when the prompt version (or draft) changes.
 */

import { describe, expect, test } from "bun:test";
import { sprintId as makeSprintId } from "../../../../src/domain/types/branded";
import type { SprintId } from "../../../../src/domain/types/branded";
import { validateSparkCandidateSet } from "../../../../src/domain/spark/validate-spark";
import type { WireSparkCandidate } from "../../../../src/domain/spark/types";
import {
  computeSparkInputHash,
  createSparkGenerationPort,
} from "../../../../src/infra/llm/spark-adapter";
import {
  SPARK_MODEL_ID,
  SPARK_PROMPT_VERSION,
  SPARK_SCHEMA_VERSION,
} from "../../../../src/infra/llm/prompts/spark";
import type {
  InferenceAttempt,
  StructuredCallClient,
  StructuredCallRequest,
  StructuredCallResponse,
} from "../../../../src/infra/llm/structured-call";

const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Handmade objects slowly became a luxury only the rich could buy.";

function sid(raw: string): SprintId {
  const result = makeSprintId(raw);
  if (!result.ok) throw new Error("bad test sprint id");
  return result.value;
}

const SID = sid("11111111-1111-1111-1111-111111111111");

function response(text: string): StructuredCallResponse {
  return {
    stopReason: "end_turn",
    stopDetails: null,
    text,
    rawContent: [{ type: "text", text }],
    usage: { inputTokens: 40, outputTokens: 30 },
  };
}

function modelJson(
  candidates: readonly WireSparkCandidate[],
  analysis = "present: none; absent: several.",
): string {
  return JSON.stringify({ analysis, candidates });
}

/** Three valid, distinct-lens candidates grounded in verbatim spans of DRAFT. */
const VALID_CANDIDATES: readonly WireSparkCandidate[] = [
  {
    lens: "economic",
    question: "What would this cost in practice?",
    grounding: "affordable for",
  },
  {
    lens: "historical",
    question: "When has this happened before?",
    grounding: "mass production",
  },
  { lens: "scale", question: "How large is this really?", grounding: "handmade objects" },
];

function recordingClient(text: string): {
  readonly client: StructuredCallClient;
  readonly calls: StructuredCallRequest[];
} {
  const calls: StructuredCallRequest[] = [];
  const client: StructuredCallClient = {
    create(request) {
      calls.push(request);
      return Promise.resolve(response(text));
    },
  };
  return { client, calls };
}

describe("createSparkGenerationPort — happy path", () => {
  test("assembles a set whose candidates pass the real domain validator", async () => {
    const { client } = recordingClient(modelJson(VALID_CANDIDATES));
    const attempts: InferenceAttempt[] = [];
    const port = createSparkGenerationPort(client, {
      onAttempt: (attempt) => attempts.push(attempt),
    });

    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Rank = model emission order.
    expect(result.value.candidates.map((c) => c.lens)).toEqual([
      "economic",
      "historical",
      "scale",
    ]);
    expect(result.value.sprintId).toBe(SID);
    expect(result.value.promptVersion).toBe(SPARK_PROMPT_VERSION);
    expect(result.value.draftWordCount).toBeGreaterThan(0);

    // The adapter enriches every attempt with the sprint it belongs to
    // (structured-call itself is sprint-agnostic).
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts.every((a) => a.sprintId === SID)).toBe(true);

    // Prove the assembled candidates pass the SHIPPED validator against the draft.
    const revalidated = validateSparkCandidateSet(
      result.value.candidates.map((c) => ({
        lens: c.lens,
        question: c.question,
        grounding: c.grounding,
      })),
      DRAFT,
    );
    expect(revalidated.every((r) => r.ok)).toBe(true);

    // Attempt telemetry: yield + stable input hash.
    expect(attempts.length).toBe(1);
    expect(attempts[0]?.outcome).toBe("ok");
    expect(attempts[0]?.stage).toBe("spark");
    expect(attempts[0]?.candidatesReturned).toBe(3);
    expect(attempts[0]?.candidatesValid).toBe(3);
    expect(attempts[0]?.modelId).toBe(SPARK_MODEL_ID);
    expect(attempts[0]?.inputHash).toBe(
      computeSparkInputHash({
        draft: DRAFT,
        promptVersion: SPARK_PROMPT_VERSION,
        schemaVersion: SPARK_SCHEMA_VERSION,
        modelId: SPARK_MODEL_ID,
      }),
    );
  });
});

describe("createSparkGenerationPort — servedLenses exclusion", () => {
  test("the served lens appears in the prompt as an exclusion", async () => {
    const { client, calls } = recordingClient(modelJson(VALID_CANDIDATES));
    const port = createSparkGenerationPort(client);

    await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: ["economic"],
    });

    const userTurn = calls[0]?.messages.find((m) => m.role === "user");
    expect(userTurn).toBeDefined();
    if (userTurn?.role === "user") {
      expect(userTurn.text).toContain("economic");
      expect(userTurn.text.toUpperCase()).toContain("DO NOT USE");
    }
  });

  test("a served lens returned by the model is dropped from the set", async () => {
    // Model ignores the exclusion and returns the served lens first.
    const { client } = recordingClient(modelJson(VALID_CANDIDATES));
    const port = createSparkGenerationPort(client);

    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: ["economic"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.map((c) => c.lens)).toEqual([
      "historical",
      "scale",
    ]);
  });
});

describe("computeSparkInputHash", () => {
  const base = {
    draft: "some draft text",
    promptVersion: "spark-v1",
    schemaVersion: "spark-schema-v1",
    modelId: "claude-haiku-4-5",
  };

  test("is stable for identical inputs", () => {
    expect(computeSparkInputHash(base)).toBe(computeSparkInputHash(base));
  });

  test("differs when the prompt version differs", () => {
    expect(computeSparkInputHash(base)).not.toBe(
      computeSparkInputHash({ ...base, promptVersion: "spark-v2" }),
    );
  });

  test("differs when the draft differs", () => {
    expect(computeSparkInputHash(base)).not.toBe(
      computeSparkInputHash({ ...base, draft: "different draft" }),
    );
  });
});

describe("createSparkGenerationPort — exclusion vs. generation failure", () => {
  test("all candidates valid but excluded → ok(empty), ONE call, outcome ok, candidatesValid 0", async () => {
    // Two candidates that PASS the validator, whose lenses are both already
    // served: a legitimate nothing-to-serve outcome, not a generation defect —
    // no repair call is burned and the telemetry is self-consistent.
    const excluded: readonly WireSparkCandidate[] = [
      {
        lens: "economic",
        question: "What would this cost in practice?",
        grounding: "affordable for",
      },
      {
        lens: "historical",
        question: "When has this happened before?",
        grounding: "mass production",
      },
    ];
    const { client, calls } = recordingClient(modelJson(excluded));
    const attempts: InferenceAttempt[] = [];
    const port = createSparkGenerationPort(client, {
      onAttempt: (attempt) => attempts.push(attempt),
    });

    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: ["economic", "historical"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.candidates).toEqual([]);
    expect(calls.length).toBe(1); // no repair call burned
    expect(attempts.length).toBe(1);
    expect(attempts[0]?.outcome).toBe("ok");
    expect(attempts[0]?.candidatesReturned).toBe(2);
    expect(attempts[0]?.candidatesValid).toBe(0); // post-exclusion servable count
    expect(attempts[0]?.rejectReasons).toEqual([]);
  });

  test("zero validator survivors → still repairs once, then dead-ends malformed-output", async () => {
    // A grounding span that does not appear in the draft: every candidate is
    // rejected by the validator, on the first attempt and on the repair.
    const ungrounded: readonly WireSparkCandidate[] = [
      {
        lens: "economic",
        question: "What would this cost in practice?",
        grounding: "totally absent span",
      },
    ];
    const { client, calls } = recordingClient(modelJson(ungrounded));
    const attempts: InferenceAttempt[] = [];
    const port = createSparkGenerationPort(client, {
      onAttempt: (attempt) => attempts.push(attempt),
    });

    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("malformed-output");
    expect(calls.length).toBe(2); // one repair retry, then dead-end
    expect(attempts.map((a) => a.outcome)).toEqual([
      "validation-failed",
      "validation-failed",
    ]);
    expect(attempts[0]?.candidatesReturned).toBe(1);
    expect(attempts[0]?.candidatesValid).toBe(0);
    expect(attempts[0]?.rejectReasons).toEqual(["ungrounded"]);
  });
});

describe("createSparkGenerationPort — failure passthrough", () => {
  test("a transport failure surfaces as an InferenceError, not a throw", async () => {
    const client: StructuredCallClient = {
      create: () =>
        Promise.reject({ name: "APIConnectionError", message: "conn" }),
    };
    const port = createSparkGenerationPort(client);

    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("transport");
  });
});
