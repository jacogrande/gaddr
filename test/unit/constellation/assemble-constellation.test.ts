import { describe, expect, test } from "bun:test";
import {
  assembleConstellation,
  type AssembleInput,
} from "../../../src/domain/constellation/assemble-constellation";
import type {
  NodeKind,
  Star,
  ValidatedNode,
} from "../../../src/domain/constellation/node-types";
import {
  NODES_VISIBLE_PER_STAR,
  NODES_VISIBLE_TOTAL,
  OFF_MAP_VISIBLE_MAX,
} from "../../../src/domain/constellation/node-types";
import { runId as makeRunId } from "../../../src/domain/types/branded";
import type { RunId } from "../../../src/domain/types/branded";

function run(hex = "11111111-2222-4333-8444-555555555555"): RunId {
  const result = makeRunId(hex);
  if (!result.ok) throw new Error("bad test run id");
  return result.value;
}
const RUN = run();

/** Disjoint-vocabulary sentences so fixtures never accidentally dedup. */
const BANK = [
  "Cheap furniture crowded out durable heirlooms families once repaired.",
  "Assembly lines replaced apprenticeships across nineteenth century workshops.",
  "Rivers absorbed dye runoff from booming coastal textile mills.",
  "Shoppers now discard sneakers faster than cobblers can mend.",
  "Container ports reshaped which nations manufacture household objects.",
  "Nobody teaches darning, whittling, or soldering to teenagers anymore.",
  "Advertising trained buyers to crave novelty above quiet longevity.",
  "Lobbyists quietly softened safety standards for imported plastic toys.",
  "Manufacturers engineer inkjet printers to fail just past warranty.",
  "Grocery wages stagnated while distant executive bonuses steadily ballooned.",
  "Skyscrapers packed clerical workers into denser downtown office cores.",
  "Streaming platforms eliminated neighborhood physical record shops overnight.",
  "Marketplace ranking algorithms reward vendors who flood cheap listings.",
  "Patents let incumbents charge rent on trivial cosmetic improvements.",
  "Founders gleefully dismantle industries their engineers never truly understood.",
  "Grandmothers carried seasoning recipes no printed cookbook ever transcribed.",
  "Bankers securitized suburban mortgages nobody bothered reading carefully.",
  "Farmers weighed planting today against uncertain harvests years away.",
  "Diners rarely notice whether their waiters earn a living wage.",
  "Modelers draw demand curves ignoring how appetites actually form.",
];

function vnode(i: number, overrides: Partial<ValidatedNode> = {}): ValidatedNode {
  return {
    kind: "question",
    tier: "inferred",
    starId: "s1",
    payoff: `Point number ${String(i)}`,
    body: BANK[i % BANK.length] ?? `Fallback body ${String(i)}`,
    grounding: `ground ${String(i)}`,
    ...overrides,
  };
}

function star(id: string, overrides: Partial<Star> = {}): Star {
  return {
    id,
    label: `Star ${id}`,
    intent: "asserting",
    weight: 3,
    grounding: `span ${id}`,
    kind: "star",
    ...overrides,
  };
}

const BASE_STARS: readonly Star[] = [
  star("s1", { weight: 5 }),
  star("s2", { weight: 3, intent: "testing" }),
  star("off1", { weight: 1, intent: "wondering", kind: "off-map" }),
];

function assemble(overrides: Partial<AssembleInput>): ReturnType<typeof assembleConstellation> {
  return assembleConstellation({
    runId: RUN,
    stars: BASE_STARS,
    nodes: [],
    servedSparkQuestions: [],
    ...overrides,
  });
}

// ── Basic shape ──────────────────────────────────────────────────────────────

describe("assembleConstellation — basic shape", () => {
  test("ranks nodes 0..n, marks them visible, defaults status to unseen", () => {
    const result = assemble({ nodes: [vnode(0), vnode(1), vnode(2)] });
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((n) => n.rank)).toEqual([0, 1, 2]);
    expect(result.nodes.every((n) => n.visible)).toBe(true);
    expect(result.nodes.every((n) => n.status === "unseen")).toBe(true);
    expect(result.nodes.every((n) => n.tier === "inferred")).toBe(true);
  });

  test("a thin run stays thin — assembly never pads", () => {
    const result = assemble({ nodes: [vnode(0), vnode(1), vnode(2)] });
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.filter((n) => n.visible)).toHaveLength(3);
  });

  test("no counterargument means no crux star", () => {
    const result = assemble({ nodes: [vnode(0), vnode(1)] });
    expect(result.cruxStarId).toBeNull();
    expect(result.nodes.every((n) => n.cruxScore === 0)).toBe(true);
  });
});

// ── Crux scoring ─────────────────────────────────────────────────────────────

describe("assembleConstellation — crux scoring", () => {
  test("crux = weight × counterargument count; the heaviest wins the marker", () => {
    // s1 (weight 5): two counterarguments → 10. s2 (weight 3): one → 3.
    const result = assemble({
      nodes: [
        vnode(0, { starId: "s1", kind: "counterargument" }),
        vnode(1, { starId: "s1", kind: "counterargument" }),
        vnode(2, { starId: "s2", kind: "counterargument" }),
      ],
    });
    expect(result.cruxStarId).toBe("s1");
    const s1Node = result.nodes.find((n) => n.starId === "s1");
    const s2Node = result.nodes.find((n) => n.starId === "s2");
    expect(s1Node?.cruxScore).toBe(10);
    expect(s2Node?.cruxScore).toBe(3);
  });

  test("off-map is excluded from crux even with a counterargument on it", () => {
    // (A counterargument would never validate onto an off-map star, but assembly
    // must still exclude off-map from crux structurally.)
    const result = assemble({
      nodes: [vnode(0, { starId: "off1", kind: "counterargument" })],
    });
    expect(result.cruxStarId).toBeNull();
  });

  test("the crux star's cluster ranks ahead of lighter stars", () => {
    const result = assemble({
      nodes: [
        vnode(0, { starId: "s2" }),
        vnode(1, { starId: "s1", kind: "counterargument" }),
      ],
    });
    // s1 has the counterargument → higher crux → its node ranks first.
    expect(result.nodes[0]?.starId).toBe("s1");
  });
});

// ── Dedup ────────────────────────────────────────────────────────────────────

describe("assembleConstellation — dedup", () => {
  test("collapses cross-kind near-duplicates, preferring the counterargument", () => {
    const shared = { payoff: "Identical payoff line here", body: BANK[0], grounding: "same ground" };
    const result = assemble({
      nodes: [
        vnode(0, { ...shared, kind: "question" }),
        vnode(1, { ...shared, kind: "counterargument" }),
      ],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.kind).toBe("counterargument");
  });

  test("collapses on a shared grounding span at the softer bound", () => {
    // Same grounding, moderate body overlap — collapses via grounding-overlap.
    const result = assemble({
      nodes: [
        vnode(0, { grounding: "wage stagnation across decades", body: "Wages stagnated while bonuses ballooned steadily upward." }),
        vnode(1, { grounding: "wage stagnation across decades", body: "Wages stagnated while executive bonuses ballooned every year." }),
      ],
    });
    expect(result.nodes).toHaveLength(1);
  });

  test("drops a bare re-ask of a served spark, keeps a developed treatment", () => {
    const result = assemble({
      nodes: [
        vnode(0, { kind: "question", payoff: "What about affordability?" }),
        vnode(1, {
          kind: "direction",
          payoff: "Compare affordability across three distinct historical eras and wage levels",
        }),
      ],
      servedSparkQuestions: ["What about affordability?"],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.kind).toBe("direction");
  });
});

// ── Caps ─────────────────────────────────────────────────────────────────────

describe("assembleConstellation — caps", () => {
  test("caps visible nodes per star, hiding the rest behind 'more'", () => {
    const nodes = Array.from({ length: NODES_VISIBLE_PER_STAR + 2 }, (_, i) =>
      vnode(i, { starId: "s1" }),
    );
    const result = assemble({ nodes });
    const visible = result.nodes.filter((n) => n.visible);
    expect(visible).toHaveLength(NODES_VISIBLE_PER_STAR);
    expect(result.nodes).toHaveLength(NODES_VISIBLE_PER_STAR + 2); // none dropped
  });

  test("caps total visible nodes across many stars", () => {
    const manyStars: Star[] = ["a", "b", "c", "d"].map((id) => star(id));
    const nodes: ValidatedNode[] = [];
    let idx = 0;
    for (const s of manyStars) {
      for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) {
        nodes.push(vnode(idx, { starId: s.id }));
        idx++;
      }
    }
    const result = assembleConstellation({
      runId: RUN,
      stars: manyStars,
      nodes,
      servedSparkQuestions: [],
    });
    expect(result.nodes.filter((n) => n.visible)).toHaveLength(NODES_VISIBLE_TOTAL);
    expect(result.nodes).toHaveLength(4 * NODES_VISIBLE_PER_STAR); // 20, none dropped
  });
});

// ── Composition guarantees ───────────────────────────────────────────────────

describe("assembleConstellation — composition guarantees", () => {
  test("the off-map cluster stays visible even when the core budget is full", () => {
    const coreStars: Star[] = ["a", "b", "c", "d"].map((id) => star(id));
    const stars: Star[] = [...coreStars, star("off1", { kind: "off-map" })];
    const nodes: ValidatedNode[] = [];
    let idx = 0;
    for (const s of coreStars) {
      for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) {
        nodes.push(vnode(idx, { starId: s.id }));
        idx++;
      }
    }
    nodes.push(vnode(idx++, { starId: "off1", kind: "question" }));
    nodes.push(vnode(idx++, { starId: "off1", kind: "direction" }));

    const result = assembleConstellation({ runId: RUN, stars, nodes, servedSparkQuestions: [] });
    const offMap = result.nodes.filter((n) => n.starId === "off1");
    expect(offMap.every((n) => n.visible)).toBe(true);
    expect(result.nodes.filter((n) => n.visible)).toHaveLength(NODES_VISIBLE_TOTAL);
  });

  test("surfaces a counterargument the caps would otherwise hide", () => {
    // s1: 5 questions fill the per-star cap; a 6th node is the only
    // counterargument, cap-ineligible → the guarantee must promote it.
    const nodes: ValidatedNode[] = [];
    for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) {
      nodes.push(vnode(k, { starId: "s1", kind: "question" }));
    }
    nodes.push(vnode(99, { starId: "s1", kind: "counterargument" }));
    const result = assemble({ nodes });
    const counter = result.nodes.find((n) => n.kind === "counterargument");
    expect(counter?.visible).toBe(true);
    // Budget held: still exactly the per-star cap visible on s1.
    expect(result.nodes.filter((n) => n.visible)).toHaveLength(NODES_VISIBLE_PER_STAR);
  });

  test("the guarantee never pushes a star past its per-star cap (multi-star)", () => {
    // s1: 5 questions (fills its cap) + 1 counterargument (cap-ineligible).
    // s2: 5 questions (fills its own cap). The demotion to surface s1's
    // counterargument must come from s1, never from s2 — else s1 renders 6.
    const nodes: ValidatedNode[] = [];
    let i = 0;
    for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) nodes.push(vnode(i++, { starId: "s1" }));
    nodes.push(vnode(i++, { starId: "s1", kind: "counterargument" }));
    for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) nodes.push(vnode(i++, { starId: "s2" }));

    const result = assemble({ nodes });
    expect(result.nodes.find((n) => n.kind === "counterargument")?.visible).toBe(true);
    for (const id of ["s1", "s2"]) {
      const visibleOnStar = result.nodes.filter((n) => n.starId === id && n.visible);
      expect(visibleOnStar.length).toBeLessThanOrEqual(NODES_VISIBLE_PER_STAR);
    }
  });

  test("the off-map cluster cannot consume more than its sidebar cap", () => {
    // One off-map star with more nodes than the sidebar allows.
    const stars: Star[] = [star("s1"), star("off1", { kind: "off-map" })];
    const nodes: ValidatedNode[] = [];
    let i = 0;
    for (let k = 0; k < NODES_VISIBLE_PER_STAR; k++) {
      nodes.push(vnode(i++, { starId: "off1", kind: "question" }));
    }
    for (let k = 0; k < 3; k++) nodes.push(vnode(i++, { starId: "s1" }));

    const result = assembleConstellation({ runId: RUN, stars, nodes, servedSparkQuestions: [] });
    const offMapVisible = result.nodes.filter((n) => n.starId === "off1" && n.visible);
    expect(offMapVisible.length).toBeLessThanOrEqual(OFF_MAP_VISIBLE_MAX);
    expect(offMapVisible.length).toBe(OFF_MAP_VISIBLE_MAX); // capped, not all 5
  });
});

// ── Transitive dedup ─────────────────────────────────────────────────────────

describe("assembleConstellation — dedup transitivity", () => {
  test("a bridging duplicate leaves no two overlapping cards (single-link bug)", () => {
    // a and b are disjoint; c's body is a+b, so c collides with BOTH. A greedy
    // single-link sweep would stop at c's first collision and let b and c
    // (≈50% overlap) both survive. The multi-collision merge must collapse all.
    const A = "alpha bravo charlie delta echo foxtrot";
    const B = "papa quebec romeo sierra tango uniform";
    const result = assemble({
      nodes: [
        vnode(0, { kind: "question", payoff: "shared prefix", body: A, grounding: "g a" }),
        vnode(1, { kind: "question", payoff: "shared prefix", body: B, grounding: "g b" }),
        vnode(2, {
          kind: "counterargument",
          payoff: "shared prefix",
          body: `${A} ${B}`,
          grounding: "g c",
        }),
      ],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.kind).toBe("counterargument");
  });
});

// ── Determinism ──────────────────────────────────────────────────────────────

describe("assembleConstellation — determinism", () => {
  test("same input yields an identical constellation", () => {
    const nodes = [
      vnode(0, { starId: "s2" }),
      vnode(1, { starId: "s1", kind: "counterargument" }),
      vnode(2, { starId: "off1", kind: "direction" }),
    ];
    const a = assemble({ nodes });
    const b = assemble({ nodes });
    expect(a).toEqual(b);
  });

  test("a seeded tie-break orders equal-crux stars stably", () => {
    // Two zero-crux core stars, one node each — order is seeded but deterministic.
    const stars: Star[] = [star("s1", { weight: 3 }), star("s2", { weight: 3 })];
    const nodes = [vnode(0, { starId: "s1" }), vnode(1, { starId: "s2" })];
    const first = assembleConstellation({ runId: RUN, stars, nodes, servedSparkQuestions: [] });
    const second = assembleConstellation({ runId: RUN, stars, nodes, servedSparkQuestions: [] });
    expect(first.nodes.map((n) => n.starId)).toEqual(second.nodes.map((n) => n.starId));
  });
});

// Guard: NodeKind stays exhaustive if the taxonomy grows.
const _kindGuard: readonly NodeKind[] = [
  "evidence",
  "argument",
  "counterargument",
  "citation",
  "direction",
  "question",
];
void _kindGuard;
