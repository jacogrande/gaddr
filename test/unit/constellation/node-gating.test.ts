/**
 * Unit table for the D9 intent gate (`node-gating.ts`). The runner reads
 * `shouldGenerateKind` to SKIP a per-kind S3 call with zero eligible stars, so
 * this must agree with `validate-node.ts` (rule 8 intent gating, rule 9
 * off-map-kind) exactly — a disagreement means the runner either wastes a call
 * whose every node the validator rejects, or skips a call that would have
 * produced valid nodes.
 */

import { describe, expect, test } from "bun:test";
import {
  eligibleStarsForKind,
  shouldGenerateKind,
} from "../../../src/domain/constellation/node-gating";
import type { Star } from "../../../src/domain/constellation/node-types";

function star(id: string, over: Partial<Star> = {}): Star {
  return {
    id,
    label: `Star ${id}`,
    intent: "asserting",
    weight: 3,
    grounding: `span ${id}`,
    kind: "star",
    ...over,
  };
}

const ASSERTING = star("s1", { intent: "asserting" });
const TESTING = star("s2", { intent: "testing" });
const WONDERING = star("s3", { intent: "wondering" });
const OFF_MAP = star("o1", { kind: "off-map", intent: "wondering" });

describe("counterargument gating (rule 8 pushback-on-wondering, rule 9 off-map)", () => {
  test("eligible only on asserting/testing CORE stars", () => {
    const eligible = eligibleStarsForKind(
      [ASSERTING, TESTING, WONDERING, OFF_MAP],
      "counterargument",
    );
    expect(eligible.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  test("an all-wondering draft skips the counterargument call", () => {
    expect(shouldGenerateKind([WONDERING], "counterargument")).toBe(false);
    expect(shouldGenerateKind([WONDERING, OFF_MAP], "counterargument")).toBe(false);
  });

  test("one asserting star is enough to generate", () => {
    expect(shouldGenerateKind([WONDERING, ASSERTING], "counterargument")).toBe(true);
  });
});

describe("argument gating (rule 8 argument-on-asserted, rule 9 off-map)", () => {
  test("eligible only on testing/wondering CORE stars", () => {
    const eligible = eligibleStarsForKind(
      [ASSERTING, TESTING, WONDERING, OFF_MAP],
      "argument",
    );
    expect(eligible.map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  test("an all-asserting draft skips the argument call (no sycophancy)", () => {
    expect(shouldGenerateKind([ASSERTING], "argument")).toBe(false);
  });
});

describe("question / direction — ungated by intent, off-map allowed (rule 9)", () => {
  test("every star is an eligible target, including off-map", () => {
    const stars = [ASSERTING, WONDERING, OFF_MAP];
    for (const kind of ["question", "direction"] as const) {
      expect(eligibleStarsForKind(stars, kind)).toHaveLength(3);
      expect(shouldGenerateKind(stars, kind)).toBe(true);
    }
  });

  test("no stars at all → nothing to generate", () => {
    expect(shouldGenerateKind([], "question")).toBe(false);
    expect(shouldGenerateKind([], "direction")).toBe(false);
  });
});

describe("evidence / citation — sourced-gated, never generated in Run 1", () => {
  test("no star is ever eligible", () => {
    const stars = [ASSERTING, TESTING, WONDERING, OFF_MAP];
    for (const kind of ["evidence", "citation"] as const) {
      expect(eligibleStarsForKind(stars, kind)).toEqual([]);
      expect(shouldGenerateKind(stars, kind)).toBe(false);
    }
  });
});
