/**
 * Contract tests for the three constellation-run handler cores (plan §6, §8 step
 * 5). Pure `(request, deps)` functions, so the whole HTTP contract — auth, each
 * reject, the lease outcomes, the novel-only rate charge, the staleness rule, and
 * the PATCH tenancy/legality/reaction semantics — is exercised with plain
 * `Request` objects and stub deps, no Next server.
 *
 * GET/PATCH run against the FAITHFUL in-memory repo seeded with a real assembled
 * constellation; POST runs against a hand-stubbed runner so every lease branch is
 * reachable without a pipeline.
 */

import { describe, expect, test } from "bun:test";
import {
  handleConstellationRunRead,
  handleConstellationRunStart,
  handleNodeStatusUpdate,
  type ConstellationRunReadDeps,
  type ConstellationRunStartDeps,
  type NodeStatusDeps,
} from "../../../../../src/app/api/constellation-run/handler";
import { createInMemoryConstellationStore } from "../../../../../src/app/api/constellation-run/in-memory-store";
import type { RateLimiter } from "../../../../../src/app/api/constellation-run/rate-limit";
import type { ConstellationRunner } from "../../../../../src/infra/jobs/constellation-runner";
import type { RunStartOutcome } from "../../../../../src/infra/jobs/constellation-runner";
import { assembleConstellation } from "../../../../../src/domain/constellation/assemble-constellation";
import type { Constellation } from "../../../../../src/domain/constellation/assemble-constellation";
import type {
  Discovery,
  ValidatedNode,
} from "../../../../../src/domain/constellation/node-types";
import { nodeRowId } from "../../../../../src/infra/db/constellation-run-repo";
import { ok, err } from "../../../../../src/domain/types/result";
import type { Result } from "../../../../../src/domain/types/result";
import type { Session } from "../../../../../src/domain/auth/session";
import type { AuthError } from "../../../../../src/domain/types/errors";
import {
  runId as makeRunId,
  sprintId as makeSprintId,
  userId as makeUserId,
} from "../../../../../src/domain/types/branded";
import type { RunId, SprintId, UserId } from "../../../../../src/domain/types/branded";

const UID: UserId = (() => {
  const r = makeUserId("user-1");
  if (!r.ok) throw new Error("uid");
  return r.value;
})();
const OTHER_UID: UserId = (() => {
  const r = makeUserId("user-2");
  if (!r.ok) throw new Error("uid2");
  return r.value;
})();
const SID: SprintId = (() => {
  const r = makeSprintId("22222222-3333-4444-8555-666666666666");
  if (!r.ok) throw new Error("sid");
  return r.value;
})();
const RID: RunId = (() => {
  const r = makeRunId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  if (!r.ok) throw new Error("rid");
  return r.value;
})();

const okSession = (): Promise<Result<Session, AuthError>> =>
  Promise.resolve(ok({ userId: UID, email: "e@x", name: "n", image: null }));
const noSession = (): Promise<Result<Session, AuthError>> =>
  Promise.resolve(err({ kind: "AuthError", message: "no session" }));

const ALLOW: RateLimiter = { check: () => ({ allowed: true }), size: () => 0 };
const DENY: RateLimiter = {
  check: () => ({ allowed: false, retryAfterSeconds: 42 }),
  size: () => 0,
};

function postRequest(body: unknown, raw?: string): Request {
  return new Request("http://t/api/constellation-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

function stubRunner(outcome: RunStartOutcome): ConstellationRunner {
  return { start: () => Promise.resolve(outcome) };
}

function startDeps(
  over: Partial<ConstellationRunStartDeps> & {
    readonly runner: ConstellationRunner;
  },
): { deps: ConstellationRunStartDeps; scheduled: (() => Promise<void>)[] } {
  const scheduled: (() => Promise<void>)[] = [];
  const deps: ConstellationRunStartDeps = {
    requireSession: okSession,
    runInBackground: (w) => scheduled.push(w),
    now: () => 1_000,
    ...over,
  };
  return { deps, scheduled };
}

// ── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/constellation-run", () => {
  const exec: RunStartOutcome = {
    kind: "executable",
    runId: RID,
    status: "s1",
    novel: true,
    execute: () => Promise.resolve(),
  };

  test("401 without a session", async () => {
    const { deps } = startDeps({ runner: stubRunner(exec), requireSession: noSession });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "hi" }),
      deps,
    );
    expect(res.status).toBe(401);
  });

  test("400 on invalid JSON", async () => {
    const { deps } = startDeps({ runner: stubRunner(exec) });
    const res = await handleConstellationRunStart(postRequest(null, "{not json"), deps);
    expect(res.status).toBe(400);
  });

  test("400 when the body is missing a draft", async () => {
    const { deps } = startDeps({ runner: stubRunner(exec) });
    const res = await handleConstellationRunStart(postRequest({ sprintId: SID }), deps);
    expect(res.status).toBe(400);
  });

  test("413 when the draft exceeds the cap", async () => {
    const { deps } = startDeps({ runner: stubRunner(exec) });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "x".repeat(50_001) }),
      deps,
    );
    expect(res.status).toBe(413);
  });

  test("a novel executable run → 202, scheduled once, body carries runId + status", async () => {
    const { deps, scheduled } = startDeps({ runner: stubRunner(exec) });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "a real draft" }),
      deps,
    );
    expect(res.status).toBe(202);
    expect(scheduled).toHaveLength(1);
    const body = (await res.json()) as { runId: string; status: string };
    expect(body.runId).toBe(RID);
    expect(body.status).toBe("s1");
  });

  test("a rate-limited outcome → 429 + Retry-After, NOT scheduled", async () => {
    // The runner (not the handler) owns the novel-run cap; the handler only maps.
    const { deps, scheduled } = startDeps({
      runner: stubRunner({ kind: "rate-limited", retryAfterSeconds: 42 }),
    });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "a real draft" }),
      deps,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(scheduled).toHaveLength(0);
  });

  test("a non-novel (resume) executable run → 202, scheduled (handler does not re-gate)", async () => {
    const resume: RunStartOutcome = { ...exec, novel: false };
    const { deps, scheduled } = startDeps({ runner: stubRunner(resume) });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "a real draft" }),
      deps,
    );
    expect(res.status).toBe(202);
    expect(scheduled).toHaveLength(1);
  });

  test("in-flight → 202 without scheduling", async () => {
    const { deps, scheduled } = startDeps({
      runner: stubRunner({ kind: "in-flight", runId: RID, status: "s3" }),
    });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "d" }),
      deps,
    );
    expect(res.status).toBe(202);
    expect(scheduled).toHaveLength(0);
  });

  test("a persistence error → 503", async () => {
    const { deps } = startDeps({
      runner: stubRunner({
        kind: "error",
        error: { kind: "PersistenceError", message: "db down" },
      }),
    });
    const res = await handleConstellationRunStart(
      postRequest({ sprintId: SID, draft: "d" }),
      deps,
    );
    expect(res.status).toBe(503);
  });
});

// ── Seeding a real assembled run into the in-memory repo ─────────────────────

const DISCOVERY: Discovery = {
  brief: "the brief",
  confidence: "high",
  stars: [
    { id: "s1", label: "Claim", intent: "asserting", weight: 5, grounding: "goods got cheap", kind: "star" },
    { id: "s3", label: "Thread", intent: "wondering", weight: 2, grounding: "did anyone choose", kind: "star" },
  ],
  offMapSeeds: [],
};

function assembled(): Constellation {
  const nodes: readonly ValidatedNode[] = [
    { kind: "counterargument", tier: "inferred", starId: "s1", payoff: "the case against", body: "b1", grounding: "goods got cheap" },
    { kind: "question", tier: "inferred", starId: "s3", payoff: "what if not?", body: "b2", grounding: "did anyone choose" },
  ];
  return assembleConstellation({
    runId: RID,
    stars: [...DISCOVERY.stars, ...DISCOVERY.offMapSeeds],
    nodes,
    servedSparkQuestions: [],
  });
}

async function seedComplete(
  store: ReturnType<typeof createInMemoryConstellationStore>,
): Promise<void> {
  await store.repo.createOrGet({
    runId: RID,
    userId: UID,
    sprintId: SID,
    runKey: "seed-key",
    draftWordCount: 10,
    promptVersion: "p",
    schemaVersion: "s",
    modelId: "m",
  });
  await store.repo.saveDiscovery({ runId: RID, discovery: DISCOVERY, inputTokens: 0, outputTokens: 0 });
  await store.repo.saveNodes({ runId: RID, constellation: assembled(), inputTokens: 0, outputTokens: 0 });
}

// ── GET ──────────────────────────────────────────────────────────────────────

function readDeps(
  store: ReturnType<typeof createInMemoryConstellationStore>,
  over: Partial<ConstellationRunReadDeps> = {},
): ConstellationRunReadDeps {
  return {
    requireSession: okSession,
    repo: store.repo,
    now: () => 1_000_000,
    staleAfterMs: 120_000,
    ...over,
  };
}

function getRequest(sprintId: string | null): Request {
  const url =
    sprintId === null
      ? "http://t/api/constellation-run"
      : `http://t/api/constellation-run?sprintId=${sprintId}`;
  return new Request(url, { method: "GET" });
}

describe("GET /api/constellation-run", () => {
  test("401 without a session", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    const res = await handleConstellationRunRead(getRequest(SID), readDeps(store, { requireSession: noSession }));
    expect(res.status).toBe(401);
  });

  test("400 when sprintId is missing or malformed", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    expect((await handleConstellationRunRead(getRequest(null), readDeps(store))).status).toBe(400);
    expect((await handleConstellationRunRead(getRequest("not-a-uuid"), readDeps(store))).status).toBe(400);
  });

  test("200 { run: null } when the sprint has no run", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    const res = await handleConstellationRunRead(getRequest(SID), readDeps(store));
    expect(res.status).toBe(200);
    expect((await res.json()) as { run: unknown }).toEqual({ run: null });
  });

  test("a complete run → 200 with stars, nodes, and resumable false", async () => {
    const store = createInMemoryConstellationStore(() => 1_000);
    await seedComplete(store);
    const res = await handleConstellationRunRead(getRequest(SID), readDeps(store));
    const body = (await res.json()) as { run: { status: string; resumable: boolean; stars: unknown[]; nodes: unknown[] } };
    expect(body.run.status).toBe("complete");
    expect(body.run.resumable).toBe(false);
    expect(body.run.stars.length).toBe(2);
    expect(body.run.nodes.length).toBeGreaterThan(0);
  });

  test("a stale non-terminal run reads as resumable", async () => {
    let clock = 1_000;
    const store = createInMemoryConstellationStore(() => clock);
    await store.repo.createOrGet({
      runId: RID, userId: UID, sprintId: SID, runKey: "k",
      draftWordCount: 1, promptVersion: "p", schemaVersion: "s", modelId: "m",
    });
    await store.repo.saveDiscovery({ runId: RID, discovery: DISCOVERY, inputTokens: 0, outputTokens: 0 });
    // Advance the read clock well past the staleness horizon.
    clock = 1_000 + 200_000;
    const res = await handleConstellationRunRead(getRequest(SID), readDeps(store, { now: () => clock }));
    const body = (await res.json()) as { run: { status: string; resumable: boolean } };
    expect(body.run.status).toBe("s3");
    expect(body.run.resumable).toBe(true);
  });

  test("a failed run reads as resumable", async () => {
    const store = createInMemoryConstellationStore(() => 1_000);
    await store.repo.createOrGet({
      runId: RID, userId: UID, sprintId: SID, runKey: "k",
      draftWordCount: 1, promptVersion: "p", schemaVersion: "s", modelId: "m",
    });
    await store.repo.markFailed({ runId: RID, failedStage: "discovery", errorReason: "transport" });
    const res = await handleConstellationRunRead(getRequest(SID), readDeps(store));
    const body = (await res.json()) as { run: { status: string; resumable: boolean; failedStage: string } };
    expect(body.run.status).toBe("failed");
    expect(body.run.resumable).toBe(true);
    expect(body.run.failedStage).toBe("discovery");
  });
});

// ── PATCH ──────────────────────────────────────────────────────────────────────

function patchRequest(body: unknown, raw?: string): Request {
  return new Request("http://t/api/constellation-run/node-status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

function patchDeps(
  store: ReturnType<typeof createInMemoryConstellationStore>,
  over: Partial<NodeStatusDeps> = {},
): NodeStatusDeps {
  return {
    requireSession: okSession,
    repo: store.repo,
    patchLimiter: ALLOW,
    now: () => 1_000,
    ...over,
  };
}

describe("PATCH /api/constellation-run/node-status", () => {
  const firstNode = nodeRowId(RID, 0);

  test("401 without a session", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    const res = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "opened" }] }),
      patchDeps(store, { requireSession: noSession }),
    );
    expect(res.status).toBe(401);
  });

  test("400 when the body is malformed", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    expect(
      (await handleNodeStatusUpdate(patchRequest({ updates: [] }), patchDeps(store))).status,
    ).toBe(400);
  });

  test("400 when resolving without a reaction (D12)", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    const res = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "resolved" }] }),
      patchDeps(store),
    );
    expect(res.status).toBe(400);
  });

  test("429 when the limiter denies", async () => {
    const store = createInMemoryConstellationStore(() => 0);
    const res = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "opened" }] }),
      patchDeps(store, { patchLimiter: DENY }),
    );
    expect(res.status).toBe(429);
  });

  test("open then resolve-with-reaction persists across a read", async () => {
    const store = createInMemoryConstellationStore(() => 1_000);
    await seedComplete(store);

    const open = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "opened" }] }),
      patchDeps(store),
    );
    expect(((await open.json()) as { results: { updated: boolean }[] }).results[0]?.updated).toBe(true);

    const resolve = await handleNodeStatusUpdate(
      patchRequest({
        runId: RID,
        updates: [{ nodeId: firstNode, status: "resolved", reaction: "this reframes my whole section" }],
      }),
      patchDeps(store),
    );
    expect(((await resolve.json()) as { results: { updated: boolean }[] }).results[0]?.updated).toBe(true);

    const view = await store.repo.readBySprint(UID, SID);
    const node = view.ok && view.value ? view.value.nodes.find((n) => n.id === firstNode) : undefined;
    expect(node?.status).toBe("resolved");
    expect(node?.reaction).toBe("this reframes my whole section");
  });

  test("an illegal transition reports updated:false (unseen → resolved is not allowed)", async () => {
    const store = createInMemoryConstellationStore(() => 1_000);
    await seedComplete(store); // node starts at unseen
    const res = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "resolved", reaction: "x" }] }),
      patchDeps(store),
    );
    // unseen → resolved has no predecessor path (must go through opened) → no-op.
    expect(((await res.json()) as { results: { updated: boolean }[] }).results[0]?.updated).toBe(false);
  });

  test("tenancy: another user's session cannot touch the node", async () => {
    const store = createInMemoryConstellationStore(() => 1_000);
    await seedComplete(store);
    const otherSession = (): Promise<Result<Session, AuthError>> =>
      Promise.resolve(ok({ userId: OTHER_UID, email: "o@x", name: "o", image: null }));
    const res = await handleNodeStatusUpdate(
      patchRequest({ runId: RID, updates: [{ nodeId: firstNode, status: "opened" }] }),
      patchDeps(store, { requireSession: otherSession }),
    );
    expect(((await res.json()) as { results: { updated: boolean }[] }).results[0]?.updated).toBe(false);
  });
});
