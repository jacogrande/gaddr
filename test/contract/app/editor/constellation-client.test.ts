/**
 * Unit table for the constellation client's PURE seams (plan §6): the response
 * narrowers (`constellation-glue.ts`) and the deterministic spatial layout
 * (`constellation-layout.ts`). Both must be right without a browser — the board
 * renders whatever these produce.
 */

import { describe, expect, test } from "bun:test";
import {
  parseRunStartResponse,
  parseRunViewResponse,
  shouldKeepPolling,
  type BoardNode,
  type BoardStar,
} from "../../../../src/app/(protected)/editor/constellation-glue";
import {
  DRAFT_BOARD_HALF_H,
  DRAFT_BOARD_HALF_W,
  DRAFT_CENTER,
  layoutConstellation,
  STAR_HEIGHT,
  STAR_WIDTH,
  visibleCardCount,
} from "../../../../src/app/(protected)/editor/constellation-layout";

function star(id: string, over: Partial<BoardStar> = {}): BoardStar {
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
function node(id: string, over: Partial<BoardNode> = {}): BoardNode {
  return {
    id,
    kind: "counterargument",
    tier: "inferred",
    starId: "s1",
    payoff: "p",
    body: "b",
    grounding: "g",
    cruxScore: 3,
    rank: 0,
    visible: true,
    status: "unseen",
    ...over,
  };
}

// ── Narrowers ────────────────────────────────────────────────────────────────

describe("parseRunStartResponse", () => {
  test("accepts a valid 202 body", () => {
    expect(parseRunStartResponse({ runId: "r", status: "s1" })).toEqual({
      runId: "r",
      status: "s1",
    });
  });
  test("rejects a bad status or shape", () => {
    expect(parseRunStartResponse({ runId: "r", status: "nope" })).toBeNull();
    expect(parseRunStartResponse({ runId: "r" })).toBeNull();
    expect(parseRunStartResponse(null)).toBeNull();
  });
});

describe("parseRunViewResponse", () => {
  test("{ run: null } → null (legitimate no-run-yet)", () => {
    expect(parseRunViewResponse({ run: null })).toBeNull();
  });
  test("a malformed envelope → null (board shows pre-run state)", () => {
    expect(parseRunViewResponse({ run: { status: "s1" } })).toBeNull(); // no runId
    expect(parseRunViewResponse("x")).toBeNull();
  });
  test("a valid run narrows; a corrupt star/node is DROPPED, not fatal", () => {
    const view = parseRunViewResponse({
      run: {
        runId: "r",
        status: "complete",
        resumable: false,
        failedStage: null,
        errorReason: null,
        confidence: "high",
        cruxStarId: "r:s:s1",
        stars: [
          { id: "r:s:s1", label: "L", intent: "asserting", weight: 5, grounding: "g", kind: "star" },
          { id: "bad", label: "L", intent: "GARBAGE", weight: 1, grounding: "g", kind: "star" }, // dropped
        ],
        nodes: [
          { id: "r:n:0", kind: "counterargument", tier: "inferred", starId: "r:s:s1", payoff: "p", body: "b", grounding: "g", cruxScore: 5, rank: 0, visible: true, status: "unseen" },
          { id: "r:n:1", kind: "NOPE", tier: "inferred", starId: "r:s:s1", payoff: "p", body: "b", grounding: "g", cruxScore: 0, rank: 1, visible: true, status: "unseen" }, // dropped
        ],
      },
    });
    expect(view).not.toBeNull();
    expect(view?.status).toBe("complete");
    expect(view?.stars).toHaveLength(1); // the GARBAGE-intent star dropped
    expect(view?.nodes).toHaveLength(1); // the NOPE-kind node dropped
    expect(view?.cruxStarId).toBe("r:s:s1");
  });
});

describe("shouldKeepPolling", () => {
  test("polls while non-terminal or unread; stops at complete/failed", () => {
    expect(shouldKeepPolling(null)).toBe(true);
    const base = { runId: "r", resumable: false, failedStage: null, errorReason: null, confidence: null, cruxStarId: null, stars: [], nodes: [] };
    expect(shouldKeepPolling({ ...base, status: "s1" })).toBe(true);
    expect(shouldKeepPolling({ ...base, status: "s3" })).toBe(true);
    expect(shouldKeepPolling({ ...base, status: "complete" })).toBe(false);
    expect(shouldKeepPolling({ ...base, status: "failed" })).toBe(false);
  });
});

// ── Deterministic layout ─────────────────────────────────────────────────────

describe("layoutConstellation", () => {
  const stars = [
    star("s1", { weight: 5 }),
    star("s2", { weight: 3, intent: "testing" }),
    star("s3", { weight: 2, intent: "wondering" }),
    star("o1", { kind: "off-map", intent: "wondering", weight: 1 }),
  ];
  const nodes = [
    node("n0", { starId: "s1", rank: 0 }),
    node("n1", { starId: "s1", rank: 1, kind: "question" }),
    node("n2", { starId: "s3", rank: 2, kind: "direction" }),
    node("nHidden", { starId: "s1", rank: 3, visible: false }), // not placed
  ];

  test("is deterministic — same input, same coordinates", () => {
    const a = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    const b = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    expect(a).toEqual(b);
  });

  test("the crux takes the prime slot, leads Tab order, and is flagged", () => {
    const { stars: placed } = layoutConstellation({ stars, nodes, cruxStarId: "s2" });
    const crux = placed.find((p) => p.star.id === "s2");
    expect(crux?.isCrux).toBe(true);
    // Prime ring slot AND first Tab stop, regardless of its assembly position.
    expect(crux?.order).toBe(0);
    expect(placed.filter((p) => p.isCrux)).toHaveLength(1);
  });

  test("NO star overlaps the draft card's bounding box (audit failure #2)", () => {
    // The whole point of the draft-centred ring: a star must never sit on top of
    // the writer's own words, the failure the 2026-03 audit caught.
    const { stars: placed } = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    // The draft is scaled down on the board, so clearance is measured against
    // its EFFECTIVE half-extents (see DRAFT_BOARD_SCALE).
    const halfW = DRAFT_BOARD_HALF_W + STAR_WIDTH / 2;
    const halfH = DRAFT_BOARD_HALF_H + STAR_HEIGHT / 2;
    for (const p of placed) {
      const clearsX = Math.abs(p.x - DRAFT_CENTER.x) >= halfW;
      const clearsY = Math.abs(p.y - DRAFT_CENTER.y) >= halfH;
      // Clear on at least one axis ⇒ the rectangles cannot intersect.
      expect(clearsX || clearsY).toBe(true);
    }
  });

  test("the off-map cluster sits in its own zone, clear of the ring", () => {
    const { stars: placed } = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    const offMap = placed.find((p) => p.star.id === "o1");
    expect(offMap?.isOffMap).toBe(true);
    // A column to the RIGHT of every core star by a clear margin — its own
    // region, never mixed into the orbit (D10). It sits beside rather than below
    // because the board's chrome occupies the bottom-centre.
    const rightmostCore = Math.max(
      ...placed.filter((p) => !p.isOffMap).map((p) => p.x),
    );
    expect(offMap && offMap.x - rightmostCore).toBeGreaterThan(200);
  });

  test("off-map stars come last in Tab order", () => {
    const { stars: placed } = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    const offMapOrder = placed.find((p) => p.isOffMap)?.order ?? -1;
    const maxCoreOrder = Math.max(
      ...placed.filter((p) => !p.isOffMap).map((p) => p.order),
    );
    expect(offMapOrder).toBeGreaterThan(maxCoreOrder);
  });

  test("only VISIBLE cards are placed; edges are star→node hub-and-spoke", () => {
    const { cards, edges } = layoutConstellation({ stars, nodes, cruxStarId: "s1" });
    // n0, n1 (s1) + n2 (s3) are visible; nHidden is not.
    expect(cards.map((c) => c.node.id).sort()).toEqual(["n0", "n1", "n2"]);
    expect(edges).toHaveLength(3);
    for (const e of edges) {
      // every edge connects a real star to one of its cards
      expect(nodes.some((n) => n.id === e.nodeId && n.starId === e.starId)).toBe(true);
    }
  });

  test("visibleCardCount counts only visible cards for a star", () => {
    expect(visibleCardCount("s1", nodes)).toBe(2); // n0, n1 (nHidden excluded)
    expect(visibleCardCount("s3", nodes)).toBe(1);
  });
});
