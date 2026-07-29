/**
 * constellation-repo-smoke.ts — real-Postgres integration smoke for the
 * ConstellationRunRepo (plan §8 step 3). The factory's transactional CAS lease,
 * resume/idempotency, `readBySprint` ordering + tenancy, `markFailed`'s
 * non-terminal guard, and `updateNode`'s tenancy scoping cannot be honestly
 * verified by a drizzle stub (it would test the mock, not the SQL), so they are
 * verified here against the live DB — the migration-0004 agent-time pattern.
 *
 * Run:  DATABASE_URL=… bun run scripts/constellation-repo-smoke.ts
 * Safe: creates a temp user with deterministic ids and DELETEs it at the end;
 * ON DELETE CASCADE removes every run/star/node/attempt row it touched. Re-runs
 * are clean (the temp user is recreated each time).
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/infra/db/schema";
import { createConstellationRunRepo } from "../src/infra/db/constellation-run-repo";
import {
  runId as mkRun,
  sprintId as mkSprint,
  userId as mkUser,
} from "../src/domain/types/branded";
import type {
  Discovery,
  Star,
} from "../src/domain/constellation/node-types";
import { statusPredecessors } from "../src/domain/constellation/node-types";
import type { Constellation } from "../src/domain/constellation/assemble-constellation";

const url = process.env.DATABASE_URL;
if (url === undefined || url.length === 0) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
const db = drizzle(sql, { schema });
const repo = createConstellationRunRepo(db);

const USER = "9e000000-0000-4000-8000-000000000001";
const RUN_A = "9e000000-0000-4000-8000-000000000002";
const SPRINT = "9e000000-0000-4000-8000-000000000003";
const RUN_B = "9e000000-0000-4000-8000-000000000004";
const rA = mkRun(RUN_A);
const rB = mkRun(RUN_B);
const s = mkSprint(SPRINT);
const u = mkUser(USER);
const other = mkUser("some-other-user");
if (!rA.ok || !rB.ok || !s.ok || !u.ok || !other.ok) throw new Error("bad ids");

const star = (id: string, o: Partial<Star> = {}): Star => ({
  id,
  label: `Star ${id}`,
  intent: "asserting",
  weight: 3,
  grounding: `span ${id}`,
  kind: "star",
  ...o,
});
const discovery: Discovery = {
  brief: "the draft argues scale traded craft for access",
  confidence: "high",
  stars: [star("s1", { weight: 5 }), star("s2", { weight: 3, intent: "testing" })],
  offMapSeeds: [
    star("o1", { kind: "off-map", intent: "wondering", weight: 1, grounding: "labor cost" }),
  ],
};
const constellation: Constellation = {
  stars: [...discovery.stars, ...discovery.offMapSeeds],
  cruxStarId: "s1",
  nodes: [
    { kind: "counterargument", tier: "inferred", starId: "s1", payoff: "hidden costs", body: "the opposing case", grounding: "span s1", cruxScore: 5, rank: 0, visible: true, status: "unseen" },
    { kind: "question", tier: "inferred", starId: "s2", payoff: "what changed?", body: "a question body", grounding: "span s2", cruxScore: 0, rank: 1, visible: true, status: "unseen" },
  ],
};

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.log(`  ✗ FAIL: ${name}`);
  }
}

const newRun = (runId: typeof rA.value, runKey: string) => ({
  runId,
  userId: u.value,
  sprintId: s.value,
  runKey,
  draftWordCount: 200,
  promptVersion: "d1+n1",
  schemaVersion: "v1",
  modelId: "claude-sonnet-5",
});

try {
  const now = new Date();
  await db.insert(schema.user).values({ id: USER, name: "smoke", email: `smoke-${USER}@t.test`, emailVerified: false, createdAt: now, updatedAt: now });

  const c1 = await repo.createOrGet(newRun(rA.value, "smoke-key"));
  check("createOrGet fresh → createdFresh, status s1", c1.ok && c1.value.createdFresh && c1.value.status === "s1");
  const c2 = await repo.createOrGet(newRun(rA.value, "smoke-key"));
  check("createOrGet again → resume (not fresh), same run", c2.ok && !c2.value.createdFresh && c2.value.runId === RUN_A);

  const d1 = await repo.saveDiscovery({ runId: rA.value, discovery, inputTokens: 100, outputTokens: 50 });
  check("saveDiscovery → applied (CAS s1→s3 won)", d1.ok && d1.value);
  const d2 = await repo.saveDiscovery({ runId: rA.value, discovery, inputTokens: 100, outputTokens: 50 });
  check("saveDiscovery again → NOT applied (CAS lost, no double-write)", d2.ok && !d2.value);

  // getResumeState (the runner's resume read): at s3 the stars come back with
  // their DOMAIN-LOCAL ids (s1/s2/o1), NOT the persisted `${runId}:s:…` ids, so a
  // resumed S3 speaks the same refs a fresh S1 would.
  const rs = await repo.getResumeState(rA.value);
  check(
    "getResumeState → status s3, brief set, stars carry local ids",
    rs.ok && rs.value !== null && rs.value.status === "s3" && rs.value.brief === discovery.brief && rs.value.stars.length === 3 && rs.value.stars[0]?.id === "s1",
  );

  const tBad = await repo.transition({ runId: rA.value, from: "s1", to: "assembling" });
  check("transition from wrong status → false", tBad.ok && !tBad.value);

  const n1 = await repo.saveNodes({ runId: rA.value, constellation, inputTokens: 300, outputTokens: 200 });
  check("saveNodes → applied (CAS s3→complete won)", n1.ok && n1.value);
  const n2 = await repo.saveNodes({ runId: rA.value, constellation, inputTokens: 300, outputTokens: 200 });
  check("saveNodes again → NOT applied", n2.ok && !n2.value);

  const v = await repo.readBySprint(u.value, s.value);
  check(
    "readBySprint → complete run, 3 stars, 2 nodes, crux + confidence set",
    v.ok && v.value !== null && v.value.status === "complete" && v.value.stars.length === 3 && v.value.nodes.length === 2 && v.value.cruxStarId === `${RUN_A}:s:s1` && v.value.confidence === "high",
  );

  const nodeId = `${RUN_A}:n:0`;
  const nodeId1 = `${RUN_A}:n:1`;
  const opened = statusPredecessors("opened"); // ["unseen"]
  const resolved = statusPredecessors("resolved"); // ["opened"]
  const dismissed = statusPredecessors("dismissed"); // ["opened"]

  // The D12 lifecycle is enforced atomically: a node must be OPENED before it can
  // be resolved (unseen → opened → resolved), so a direct unseen→resolved is a
  // no-op.
  const directResolve = await repo.updateNode({ userId: u.value, runId: rA.value, nodeId, status: "resolved", fromStatuses: resolved, reaction: "good point" });
  check("updateNode direct unseen→resolved → false (must open first)", directResolve.ok && !directResolve.value);
  const openIt = await repo.updateNode({ userId: u.value, runId: rA.value, nodeId, status: "opened", fromStatuses: opened });
  check("updateNode open (unseen→opened) → true", openIt.ok && openIt.value);
  const up = await repo.updateNode({ userId: u.value, runId: rA.value, nodeId, status: "resolved", fromStatuses: resolved, reaction: "good point" });
  check("updateNode resolve (opened→resolved) → true", up.ok && up.value);
  // A terminal (resolved) node does not transition again in Run 1.
  const reDismiss = await repo.updateNode({ userId: u.value, runId: rA.value, nodeId, status: "dismissed", fromStatuses: dismissed });
  check("updateNode resolved→dismissed → false (terminal, legality enforced)", reDismiss.ok && !reDismiss.value);
  // Tenancy on a still-open node (rank 1, unseen): a legal-shape transition by the
  // WRONG user must not land.
  const upWrongUser = await repo.updateNode({ userId: other.value, runId: rA.value, nodeId: nodeId1, status: "opened", fromStatuses: opened });
  check("updateNode (WRONG user) → false (tenancy enforced)", upWrongUser.ok && !upWrongUser.value);
  const upMiss = await repo.updateNode({ userId: u.value, runId: rA.value, nodeId: "nope", status: "opened", fromStatuses: opened });
  check("updateNode unknown id → false", upMiss.ok && !upMiss.value);

  const v2 = await repo.readBySprint(u.value, s.value);
  const node0 = v2.ok && v2.value ? v2.value.nodes.find((x) => x.id === nodeId) : undefined;
  const node1 = v2.ok && v2.value ? v2.value.nodes.find((x) => x.id === nodeId1) : undefined;
  check("reaction + status persisted; wrong-user write did NOT land", node0?.status === "resolved" && node0?.reaction === "good point" && node1?.status === "unseen");

  const [row] = await sql<{ input_tokens: number; output_tokens: number }[]>`SELECT input_tokens, output_tokens FROM constellation_run WHERE id = ${RUN_A}`;
  check("token totals accumulated (400 in / 250 out)", row?.input_tokens === 400 && row?.output_tokens === 250);

  // markFailed must NOT flip a COMPLETE run.
  await repo.markFailed({ runId: rA.value, failedStage: "nodes", errorReason: "spurious" });
  const [after] = await sql<{ status: string }[]>`SELECT status FROM constellation_run WHERE id = ${RUN_A}`;
  check("markFailed on a complete run is a no-op (stays complete)", after?.status === "complete");

  // Newest-first: a second, in-flight run for the same sprint must win over the
  // older complete run (the readBySprint ordering fix).
  const cB = await repo.createOrGet(newRun(rB.value, "smoke-key-2"));
  check("createOrGet B (new key, same sprint) → fresh s1", cB.ok && cB.value.createdFresh);
  const vB = await repo.readBySprint(u.value, s.value);
  check("readBySprint → the NEWER in-flight run B, not the older complete A", vB.ok && vB.value !== null && vB.value.runId === RUN_B && vB.value.status === "s1");

  // claimStaleRun (the time-based execution lease): run B is at s1 with a just-set
  // updated_at, so a claim with a PAST cutoff must FAIL (fresh = not stale), and a
  // claim with a FUTURE cutoff must WIN (treats it as stale) — exactly the lease
  // gate the runner uses to keep concurrent resumes from double-executing.
  const notStale = await repo.claimStaleRun({ runId: rB.value, expectedStatus: "s1", staleBeforeMs: Date.now() - 3_600_000 });
  check("claimStaleRun on a FRESH run → false (not stale)", notStale.ok && !notStale.value);
  const claimed = await repo.claimStaleRun({ runId: rB.value, expectedStatus: "s1", staleBeforeMs: Date.now() + 3_600_000 });
  check("claimStaleRun with a future cutoff → true (won the lease)", claimed.ok && claimed.value);
  const claimAgain = await repo.claimStaleRun({ runId: rB.value, expectedStatus: "s1", staleBeforeMs: Date.now() - 60_000 });
  check("claimStaleRun again immediately → false (its own bump made it fresh)", claimAgain.ok && !claimAgain.value);
  const claimWrongStatus = await repo.claimStaleRun({ runId: rB.value, expectedStatus: "s3", staleBeforeMs: Date.now() + 3_600_000 });
  check("claimStaleRun with a wrong expected status → false", claimWrongStatus.ok && !claimWrongStatus.value);

  // deleteRun (the rate-denied phantom cleanup): B and its cascade vanish, and the
  // sprint's current run falls back to the older complete A.
  const del = await repo.deleteRun(rB.value);
  check("deleteRun B → ok", del.ok);
  const vAfterDelete = await repo.readBySprint(u.value, s.value);
  check("after deleteRun, readBySprint returns the surviving run A (complete)", vAfterDelete.ok && vAfterDelete.value !== null && vAfterDelete.value.runId === RUN_A);
  const [gone] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM constellation_run WHERE id = ${RUN_B}`;
  check("deleteRun removed the row", gone?.n === 0);
} catch (e) {
  console.error("ERROR:", e instanceof Error ? e.stack : e);
  fail += 1;
} finally {
  try {
    await db.delete(schema.user).where(eq(schema.user.id, USER));
  } catch (e) {
    console.error("cleanup failed:", e);
  }
  await sql.end();
  console.log(`\n${String(pass)} passed, ${String(fail)} failed`);
  process.exit(fail > 0 ? 1 : 0);
}
