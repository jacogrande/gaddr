import { describe, expect, test } from "bun:test";
import { sprintId as makeSprintId } from "../../../src/domain/types/branded";
import type { SprintId } from "../../../src/domain/types/branded";
import {
  applyFinding,
  applyTriage,
  emptySubstrate,
  rankFindings,
} from "../../../src/domain/constellation/substrate";
import type {
  Finding,
  PBurst,
  TriageResult,
} from "../../../src/domain/constellation/types";

const SID: SprintId = (() => {
  const result = makeSprintId("33333333-3333-3333-3333-333333333333");
  if (!result.ok) throw new Error("test sprint id");
  return result.value;
})();

function burst(seq: number, text: string): PBurst {
  return { sprintId: SID, seq, text, reason: "production-pause" };
}

function triage(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    intent: "testing",
    themeDelta: "new-direction",
    retrievalSignals: [],
    tier: "inferred",
    ...overrides,
  };
}

describe("applyTriage", () => {
  test("records a position with a trimmed excerpt", () => {
    const next = applyTriage(
      emptySubstrate(SID),
      burst(0, "  the meaning   of\nwork  "),
      triage({ intent: "asserting" }),
    );
    expect(next.positions).toHaveLength(1);
    expect(next.positions[0]?.excerpt).toBe("the meaning of work");
    expect(next.positions[0]?.intent).toBe("asserting");
  });

  test("upserts a theme and increments its weight on recurrence", () => {
    let s = emptySubstrate(SID);
    s = applyTriage(s, burst(0, "first"), triage({ theme: "freedom" }));
    s = applyTriage(s, burst(1, "second"), triage({ theme: "freedom" }));
    expect(s.themes).toHaveLength(1);
    expect(s.themes[0]?.weight).toBe(2);
    expect(s.themes[0]?.firstSeq).toBe(0);
    expect(s.themes[0]?.lastSeq).toBe(1);
  });

  test("surfaces a tension when one theme is both asserted and wondered", () => {
    let s = emptySubstrate(SID);
    s = applyTriage(
      s,
      burst(0, "freedom is the only thing that matters"),
      triage({ theme: "freedom", intent: "asserting" }),
    );
    s = applyTriage(
      s,
      burst(1, "but is freedom really coherent?"),
      triage({ theme: "freedom", intent: "wondering" }),
    );
    expect(s.tensions).toHaveLength(1);
    expect(s.tensions[0]).toEqual({
      theme: "freedom",
      assertingSeq: 0,
      wonderingSeq: 1,
    });
  });

  test("no tension when intents agree on a theme", () => {
    let s = emptySubstrate(SID);
    s = applyTriage(s, burst(0, "a"), triage({ theme: "x", intent: "asserting" }));
    s = applyTriage(s, burst(1, "b"), triage({ theme: "x", intent: "asserting" }));
    expect(s.tensions).toHaveLength(0);
  });
});

describe("findings", () => {
  function f(overrides: Partial<Finding>): Finding {
    return {
      kind: "assumption",
      tier: "inferred",
      claimSeq: 0,
      pointer: "p",
      note: "n?",
      ...overrides,
    };
  }

  test("rankFindings sorts sourced before inferred, then newest claim first", () => {
    const ranked = rankFindings([
      f({ tier: "inferred", claimSeq: 1 }),
      f({ tier: "sourced", claimSeq: 0, kind: "citation" }),
      f({ tier: "inferred", claimSeq: 5 }),
      f({ tier: "heuristic", claimSeq: 9 }),
    ]);
    expect(ranked.map((x) => `${x.tier}:${String(x.claimSeq)}`)).toEqual([
      "sourced:0",
      "inferred:5",
      "inferred:1",
      "heuristic:9",
    ]);
  });

  test("applyFinding keeps the findings list ranked", () => {
    let s = emptySubstrate(SID);
    s = applyFinding(s, f({ tier: "inferred", claimSeq: 1 }));
    s = applyFinding(s, f({ tier: "sourced", claimSeq: 0, kind: "citation" }));
    expect(s.findings[0]?.tier).toBe("sourced");
  });
});
