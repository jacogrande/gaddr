/**
 * Contract tests for the S3 node-generation adapter (plan §8 step 4). The pure
 * parse (kind stamping, per-kind validation, repair vs. empty-ok), the adapter
 * over a stubbed client, and the SHARED-PREFIX cache invariant across kinds.
 */

import { describe, expect, test } from "bun:test";
import {
  createNodeGenerationPort,
  parseNodes,
} from "../../../../src/infra/llm/nodes-adapter";
import {
  buildNodesSystemPrompt,
  buildNodesUserContent,
  NODES_WIRE_SCHEMA,
} from "../../../../src/infra/llm/prompts/nodes";
import { portableSchemaViolations } from "../../../../src/infra/llm/portable-schema";
import type { Star } from "../../../../src/domain/constellation/node-types";
import type {
  StructuredCallClient,
  StructuredCallResponse,
} from "../../../../src/infra/llm/structured-call";

const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Craftsmanship became a luxury only the wealthy could afford.";

const STARS: readonly Star[] = [
  { id: "s1", label: "Scale democratized goods", intent: "asserting", weight: 5, grounding: "mass production made goods affordable", kind: "star" },
  { id: "s2", label: "Craft as luxury", intent: "wondering", weight: 3, grounding: "craftsmanship became a luxury", kind: "star" },
];

/** A valid counterargument on s1 (asserting → allowed). */
const VALID_COUNTER = JSON.stringify({
  analysis: "s1 is asserted; the strongest opposing case targets it.",
  nodes: [
    {
      starId: "s1",
      payoff: "Affordability may have moved costs, not removed them",
      body: "The steelman: cheap goods pushed costs onto workers and the environment rather than eliminating them.",
      grounding: "mass production made goods affordable",
    },
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

describe("NODES_WIRE_SCHEMA is portable", () => {
  test("no violations", () => {
    expect(portableSchemaViolations(NODES_WIRE_SCHEMA)).toEqual([]);
  });
});

describe("parseNodes", () => {
  test("stamps the call's kind and keeps validator survivors", () => {
    const out = parseNodes(VALID_COUNTER, DRAFT, STARS, "counterargument");
    expect(out.result.ok).toBe(true);
    if (out.result.ok) {
      expect(out.result.value).toHaveLength(1);
      expect(out.result.value[0]?.kind).toBe("counterargument");
    }
    expect(out.candidatesValid).toBe(1);
  });

  test("no nodes at all is a legitimate empty-ok (not a repair)", () => {
    const out = parseNodes(JSON.stringify({ analysis: "none", nodes: [] }), DRAFT, STARS, "question");
    expect(out.result.ok).toBe(true);
    if (out.result.ok) expect(out.result.value).toHaveLength(0);
  });

  test("nodes emitted but ALL rejected → a repair with validator reasons", () => {
    // A counterargument on a wondering star (s2) → pushback-on-wondering.
    const bad = JSON.stringify({
      analysis: "x",
      nodes: [{ starId: "s2", payoff: "p", body: "the opposing case here", grounding: "craftsmanship became a luxury" }],
    });
    const out = parseNodes(bad, DRAFT, STARS, "counterargument");
    expect(out.result.ok).toBe(false);
    expect(out.rejectReasons).toContain("pushback-on-wondering");
  });
});

describe("createNodeGenerationPort", () => {
  test("generates over a stub, stage telemetry is nodes:<kind>", async () => {
    let stage: string | undefined;
    const port = createNodeGenerationPort(stub([VALID_COUNTER]), {
      modelId: "m",
      onAttempt: (a) => {
        stage = a.stage;
      },
    });
    const result = await port.generate({
      draft: DRAFT,
      brief: "brief",
      stars: STARS,
      kind: "counterargument",
      hints: ["the Austrian objection"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(1);
    expect(stage).toBe("nodes:counterargument");
  });
});

describe("the S3 shared prefix lives in the (cacheable) system prompt", () => {
  const kinds = ["counterargument", "question", "argument", "direction"] as const;

  test("the system prompt is byte-identical across kinds (takes no kind)", () => {
    const systems = kinds.map(() => buildNodesSystemPrompt(DRAFT, "the brief", STARS));
    expect(new Set(systems).size).toBe(1);
    // The shared context (draft + brief + stars) is IN the system, not the user turn.
    expect(systems[0]).toContain("Mass production made goods affordable");
    expect(systems[0]).toContain("the brief");
    expect(systems[0]).toContain("s1 (asserting");
  });

  test("the user turns differ by kind and carry no draft (cache never breaks)", () => {
    const turns = kinds.map((k) => buildNodesUserContent(k));
    expect(new Set(turns).size).toBe(4);
    for (const t of turns) {
      expect(t).not.toContain("Mass production made goods affordable");
    }
  });

  test("the user turn restates the grounding word range (D8 budget restatement)", () => {
    expect(buildNodesUserContent("question")).toMatch(/\d+–\d+ words/);
  });
});
