/**
 * Contract tests for the constellation run repo (plan §8 step 3). Covers the
 * PURE logic — stable id derivation, row mapping, and read narrowing — that can
 * be wrong independent of a database.
 *
 * The factory's TRANSACTIONAL behavior (CAS lease, resume/idempotency, the
 * `readBySprint` ordering + tenancy, `markFailed`'s non-terminal guard,
 * `updateNode`'s tenancy scoping) is NOT exercised here — a faithful drizzle
 * transaction+sql stub would test the mock, not the SQL. It is instead verified
 * against real Postgres by `scripts/constellation-repo-smoke.ts`
 * (`bun run scripts/constellation-repo-smoke.ts` with `DATABASE_URL` set;
 * self-cleaning via ON DELETE CASCADE), the migration-0004 agent-time pattern —
 * run it before the runner (step 5) depends on these semantics.
 */

import { describe, expect, test } from "bun:test";
import {
  nodeRowId,
  starLocalRef,
  starRowId,
  toNodeRows,
  toNodeView,
  toResumeStar,
  toRunRow,
  toStarRows,
  toStarView,
} from "../../../../src/infra/db/constellation-run-repo";
import type { NewRunInput } from "../../../../src/domain/constellation/run-types";
import type {
  ConstellationNode,
  Discovery,
  Star,
} from "../../../../src/domain/constellation/node-types";
import type { Constellation } from "../../../../src/domain/constellation/assemble-constellation";
import { runId as makeRunId } from "../../../../src/domain/types/branded";
import { sprintId as makeSprintId } from "../../../../src/domain/types/branded";
import { userId as makeUserId } from "../../../../src/domain/types/branded";

const RUN = "11111111-2222-4333-8444-555555555555";

function newRun(): NewRunInput {
  const rid = makeRunId(RUN);
  const sid = makeSprintId("22222222-3333-4444-8555-666666666666");
  const uid = makeUserId("user-1");
  if (!rid.ok || !sid.ok || !uid.ok) throw new Error("bad ids");
  return {
    runId: rid.value,
    userId: uid.value,
    sprintId: sid.value,
    runKey: "key-abc",
    draftWordCount: 220,
    promptVersion: "discovery-v1+nodes-v1",
    schemaVersion: "v1",
    modelId: "claude-sonnet-5",
  };
}

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

function node(over: Partial<ConstellationNode> = {}): ConstellationNode {
  return {
    kind: "counterargument",
    tier: "inferred",
    starId: "s1",
    payoff: "a payoff",
    body: "a body",
    grounding: "a span",
    cruxScore: 5,
    rank: 0,
    visible: true,
    status: "unseen",
    ...over,
  };
}

// ── Stable ids ───────────────────────────────────────────────────────────────

describe("stable id derivation", () => {
  test("star and node ids are deterministic and run-scoped", () => {
    expect(starRowId(RUN, "s1")).toBe(`${RUN}:s:s1`);
    expect(nodeRowId(RUN, 3)).toBe(`${RUN}:n:3`);
    // Same inputs → same id (idempotent upsert key).
    expect(starRowId(RUN, "s1")).toBe(starRowId(RUN, "s1"));
    // Star and node namespaces are disjoint even for an adversarial localRef.
    expect(starRowId(RUN, "n:3")).not.toBe(nodeRowId(RUN, 3));
  });

  test("starLocalRef inverts starRowId (the resume round-trip)", () => {
    for (const ref of ["s1", "s6", "o1", "o3"]) {
      expect(starLocalRef(RUN, starRowId(RUN, ref))).toBe(ref);
    }
    // A row id missing the run prefix (corruption) falls back to itself, never
    // throwing the board read.
    expect(starLocalRef(RUN, "unexpected")).toBe("unexpected");
  });
});

// ── Write mappers ────────────────────────────────────────────────────────────

describe("toRunRow", () => {
  test("a fresh run starts at status s1 with no output", () => {
    const row = toRunRow(newRun());
    expect(row.status).toBe("s1");
    expect(row.id).toBe(RUN);
    expect(row.runKey).toBe("key-abc");
    expect(row.brief).toBeUndefined();
  });
});

describe("toStarRows", () => {
  test("core stars rank before off-map seeds, each id run-scoped", () => {
    const discovery: Discovery = {
      brief: "b",
      confidence: "high",
      stars: [star("s1"), star("s2")],
      offMapSeeds: [star("o1", { kind: "off-map", grounding: "topic" })],
    };
    const rows = toStarRows(RUN, discovery);
    expect(rows.map((r) => r.id)).toEqual([
      `${RUN}:s:s1`,
      `${RUN}:s:s2`,
      `${RUN}:s:o1`,
    ]);
    expect(rows.map((r) => r.rank)).toEqual([0, 1, 2]);
    expect(rows[2]?.kind).toBe("off-map");
    expect(rows.every((r) => r.runId === RUN)).toBe(true);
  });
});

describe("toNodeRows", () => {
  const constellation: Constellation = {
    stars: [star("s1")],
    cruxStarId: "s1",
    nodes: [
      node({ rank: 0, starId: "s1" }),
      node({ rank: 1, starId: "s1", visible: false, kind: "question" }),
    ],
  };

  test("maps node ids and star FKs to the run-scoped ids", () => {
    const rows = toNodeRows(RUN, constellation.nodes);
    expect(rows[0]?.id).toBe(`${RUN}:n:0`);
    expect(rows[1]?.id).toBe(`${RUN}:n:1`);
    expect(rows[0]?.starId).toBe(`${RUN}:s:s1`);
  });

  test("reaction defaults to null on insert; visibility carries through", () => {
    const rows = toNodeRows(RUN, constellation.nodes);
    expect(rows[0]?.reaction).toBeNull();
    expect(rows[0]?.visible).toBe(true);
    expect(rows[1]?.visible).toBe(false);
    expect(rows[0]?.status).toBe("unseen");
  });
});

// ── Read narrowing ───────────────────────────────────────────────────────────

describe("toStarView — narrows text columns to domain unions", () => {
  test("valid values pass through", () => {
    const view = toStarView({
      id: `${RUN}:s1`,
      runId: RUN,
      label: "Star one",
      kind: "off-map",
      intent: "wondering",
      weight: 4,
      grounding: "span",
      rank: 0,
    });
    expect(view.kind).toBe("off-map");
    expect(view.intent).toBe("wondering");
    expect(view.id).toBe(`${RUN}:s1`);
  });

  test("a corrupted intent/kind falls back safely (read never crashes)", () => {
    const view = toStarView({
      id: "x",
      runId: RUN,
      label: "l",
      kind: "garbage",
      intent: "garbage",
      weight: 1,
      grounding: "g",
      rank: 0,
    });
    expect(view.kind).toBe("star");
    expect(view.intent).toBe("wondering");
  });
});

describe("toResumeStar — restores the domain-local id for resume", () => {
  test("id is stripped back to the local ref; the rest narrows like toStarView", () => {
    const resumed = toResumeStar(RUN, {
      id: starRowId(RUN, "o2"),
      runId: RUN,
      label: "an off-map seed",
      kind: "off-map",
      intent: "wondering",
      weight: 1,
      grounding: "a topic rationale",
      rank: 3,
    });
    // The runner speaks the local ref, NOT the persisted `${runId}:s:o2` id —
    // else the next saveNodes would double-prefix and break the star FK.
    expect(resumed.id).toBe("o2");
    expect(resumed.kind).toBe("off-map");
    expect(resumed.intent).toBe("wondering");
  });
});

describe("toNodeView — narrows text columns to domain unions", () => {
  test("valid values pass through; null reaction becomes undefined", () => {
    const view = toNodeView({
      id: `${RUN}:n:0`,
      runId: RUN,
      starId: `${RUN}:s1`,
      kind: "counterargument",
      tier: "inferred",
      payoff: "p",
      body: "b",
      grounding: "g",
      cruxScore: 5,
      rank: 0,
      visible: true,
      status: "resolved",
      reaction: null,
      createdAt: new Date(0),
      statusChangedAt: null,
    });
    expect(view.kind).toBe("counterargument");
    expect(view.status).toBe("resolved");
    expect(view.reaction).toBeUndefined();
  });

  test("a corrupted kind/tier/status falls back safely", () => {
    const view = toNodeView({
      id: "x",
      runId: RUN,
      starId: "y",
      kind: "garbage",
      tier: "garbage",
      payoff: "p",
      body: "b",
      grounding: "g",
      cruxScore: 0,
      rank: 0,
      visible: false,
      status: "garbage",
      reaction: "kept",
      createdAt: new Date(0),
      statusChangedAt: null,
    });
    expect(view.kind).toBe("question");
    expect(view.tier).toBe("inferred");
    expect(view.status).toBe("unseen");
    expect(view.reaction).toBe("kept");
  });
});
