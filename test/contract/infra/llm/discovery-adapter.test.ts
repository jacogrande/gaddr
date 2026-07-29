/**
 * Contract tests for the S1 discovery adapter (plan §8 step 4). The pure parse
 * (id assignment, coercion, validator wiring, repair signal) and the adapter's
 * repair/telemetry behavior over a stubbed structured-call client.
 */

import { describe, expect, test } from "bun:test";
import {
  createDiscoveryPort,
  parseDiscovery,
} from "../../../../src/infra/llm/discovery-adapter";
import { portableSchemaViolations } from "../../../../src/infra/llm/portable-schema";
import { DISCOVERY_WIRE_SCHEMA } from "../../../../src/infra/llm/prompts/discovery";
import type {
  StructuredCallClient,
  StructuredCallResponse,
} from "../../../../src/infra/llm/structured-call";

const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Craftsmanship became a luxury only the wealthy could afford.";

const VALID = JSON.stringify({
  analysis: "The draft asserts scale democratized access; craft's fate is open.",
  brief: "The draft holds that scale broadened access while pricing out craft.",
  confidence: "high",
  stars: [
    { label: "Mass production democratized goods", intent: "asserting", weight: 5, grounding: "mass production made goods affordable" },
    { label: "Craft became a luxury", intent: "wondering", weight: 3, grounding: "craftsmanship became a luxury" },
  ],
  offMapSeeds: [
    { label: "Who made the cheap goods", intent: "wondering", weight: 1, grounding: "the labor behind the price" },
  ],
});

function completeReply(text: string): StructuredCallResponse {
  return {
    outcome: "complete",
    providerStopReason: "end_turn",
    stopDetails: null,
    text,
    rawContent: [{ type: "text", text }],
    usage: { inputTokens: 10, outputTokens: 5 },
  };
}

function stub(texts: readonly string[]): StructuredCallClient {
  let i = 0;
  return {
    create() {
      const t = texts[i] ?? "{}";
      i += 1;
      return Promise.resolve(completeReply(t));
    },
  };
}

describe("DISCOVERY_WIRE_SCHEMA is portable", () => {
  test("no violations", () => {
    expect(portableSchemaViolations(DISCOVERY_WIRE_SCHEMA)).toEqual([]);
  });
});

describe("parseDiscovery", () => {
  test("assigns s1…/o1… ids and kinds, narrows to a Discovery", () => {
    const out = parseDiscovery(VALID, DRAFT);
    expect(out.result.ok).toBe(true);
    if (out.result.ok) {
      const d = out.result.value;
      expect(d.stars.map((s) => s.id)).toEqual(["s1", "s2"]);
      expect(d.stars.every((s) => s.kind === "star")).toBe(true);
      expect(d.offMapSeeds[0]?.id).toBe("o1");
      expect(d.offMapSeeds[0]?.kind).toBe("off-map");
      expect(d.confidence).toBe("high");
    }
    expect(out.candidatesReturned).toBe(3);
    expect(out.candidatesValid).toBe(3);
  });

  test("malformed JSON → a repairable failure", () => {
    const out = parseDiscovery("not json", DRAFT);
    expect(out.result.ok).toBe(false);
    if (!out.result.ok) {
      expect(out.result.error.reasons[0]).toContain("JSON");
    }
  });

  test("a validator reject surfaces its reason + code for the repair prompt", () => {
    const bad = JSON.stringify({
      analysis: "x",
      brief: "b",
      confidence: "high",
      stars: [], // 0 core stars → star-count
      offMapSeeds: [],
    });
    const out = parseDiscovery(bad, DRAFT);
    expect(out.result.ok).toBe(false);
    expect(out.rejectReasons).toEqual(["star-count"]);
  });
});

describe("createDiscoveryPort", () => {
  test("discovers over a stub client", async () => {
    const port = createDiscoveryPort(stub([VALID]), { modelId: "m" });
    const result = await port.discover({
      draft: DRAFT,
      substrateSnapshot: "",
      servedSparks: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.stars).toHaveLength(2);
  });

  test("repairs once then succeeds; telemetry records the stage + effort", async () => {
    const attempts: string[] = [];
    let effortSeen: string | undefined;
    const port = createDiscoveryPort(stub(["{}", VALID]), {
      modelId: "m",
      effort: "medium",
      onAttempt: (a) => {
        attempts.push(a.outcome);
        effortSeen = a.effort;
      },
    });
    const result = await port.discover({
      draft: DRAFT,
      substrateSnapshot: "s",
      servedSparks: ["what about affordability?"],
    });
    expect(result.ok).toBe(true);
    expect(attempts[0]).toBe("validation-failed");
    expect(attempts.at(-1)).toBe("ok");
    expect(attempts.every((a) => a === "validation-failed" || a === "ok")).toBe(true);
    expect(effortSeen).toBe("medium");
  });
});
