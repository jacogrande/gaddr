/**
 * Contract tests for the checkpointed constellation runner (plan §7 contract
 * lane, §8 step 5). The runner's ORCHESTRATION is what's under test — the lease
 * laws, the two-beat checkpoint ordering, and resume-without-re-running-S1 — so
 * it runs against the FAITHFUL in-memory repo (same CAS/create-once/newest-first
 * semantics as Postgres) with deterministic stub ports and a controllable clock.
 *
 * The pure `decideExecution` lease decision is unit-tested directly; the
 * end-to-end paths (happy, two-beat, stale resume, failed retry, in-flight lease)
 * drive the real `createConstellationRunner`.
 */

import { describe, expect, test } from "bun:test";
import {
  CONSTELLATION_PROMPT_VERSION,
  CONSTELLATION_SCHEMA_VERSION,
  computeRunKey,
  createConstellationRunner,
  decideExecution,
  RUN_STALE_AFTER_MS,
} from "../../../../src/infra/jobs/constellation-runner";
import { createInMemoryConstellationStore } from "../../../../src/app/api/constellation-run/in-memory-store";
import { eligibleStarsForKind } from "../../../../src/domain/constellation/node-gating";
import { ok } from "../../../../src/domain/types/result";
import type { Result } from "../../../../src/domain/types/result";
import type { InferenceError } from "../../../../src/domain/types/errors";
import type { InferenceAttemptSink } from "../../../../src/infra/db/inference-attempt-repo";
import type {
  DiscoveryPort,
  NodeGenerationPort,
} from "../../../../src/domain/constellation/ports";
import type {
  Discovery,
  Star,
  ValidatedNode,
} from "../../../../src/domain/constellation/node-types";
import type {
  ConstellationRunInput,
} from "../../../../src/infra/jobs/constellation-runner";
import { runId as makeRunId, sprintId as makeSprintId, userId as makeUserId } from "../../../../src/domain/types/branded";

const MODEL = "mock-constellation";
const DRAFT = "Mass production made goods cheap. Craft became a luxury. Did anyone choose that?";

const UID = (() => {
  const r = makeUserId("user-1");
  if (!r.ok) throw new Error("uid");
  return r.value;
})();
const SID = (() => {
  const r = makeSprintId("22222222-3333-4444-8555-666666666666");
  if (!r.ok) throw new Error("sid");
  return r.value;
})();

const STARS: readonly Star[] = [
  { id: "s1", label: "Central claim", intent: "asserting", weight: 5, grounding: "Mass production made goods cheap", kind: "star" },
  { id: "s2", label: "Tested idea", intent: "testing", weight: 3, grounding: "Craft became a luxury", kind: "star" },
  { id: "s3", label: "Open thread", intent: "wondering", weight: 2, grounding: "Did anyone choose that", kind: "star" },
];
const OFF_MAP: readonly Star[] = [
  { id: "o1", label: "Unwritten dimension", intent: "wondering", weight: 1, grounding: "a topic rationale", kind: "off-map" },
];

const DISCOVERY: Discovery = {
  brief: "The tool's own summary of the throughline.",
  stars: STARS,
  offMapSeeds: OFF_MAP,
  confidence: "high",
};

const noopAttemptSink: InferenceAttemptSink = {
  record: () => Promise.resolve(ok(undefined)),
};

/** A discovery port that returns a fixed Discovery and counts its calls. */
function discoveryStub(counter: { count: number }): DiscoveryPort {
  return {
    discover(): Promise<Result<Discovery, InferenceError>> {
      counter.count += 1;
      return Promise.resolve(ok(DISCOVERY));
    },
  };
}

/** A node port that returns one node per eligible star and counts its calls.
 * `onFirstCall` (optional) runs before the first generate resolves — the seam the
 * two-beat test uses to observe the `s3` state. */
function nodesStub(
  counter: { count: number },
  onFirstCall?: () => Promise<void>,
): NodeGenerationPort {
  return {
    async generate(input): Promise<Result<readonly ValidatedNode[], InferenceError>> {
      counter.count += 1;
      if (counter.count === 1 && onFirstCall) await onFirstCall();
      const nodes: ValidatedNode[] = eligibleStarsForKind(input.stars, input.kind).map(
        (star) => ({
          kind: input.kind,
          tier: "inferred",
          starId: star.id,
          payoff: `payoff ${input.kind}`,
          body: `body for ${input.kind}`,
          grounding: star.grounding,
        }),
      );
      return ok(nodes);
    },
  };
}

type RateLimiter = {
  check: (key: string, now: number) => { allowed: boolean; retryAfterSeconds?: number };
};
const ALLOW: RateLimiter = { check: () => ({ allowed: true }) };
const DENY: RateLimiter = { check: () => ({ allowed: false, retryAfterSeconds: 99 }) };

interface Harness {
  readonly store: ReturnType<typeof createInMemoryConstellationStore>;
  readonly discoveryCalls: { count: number };
  readonly nodesCalls: { count: number };
  readonly runner: ReturnType<typeof createConstellationRunner>;
  now: number;
}

function harness(
  opts: { onFirstNodeCall?: () => Promise<void>; rateLimiter?: RateLimiter } = {},
): Harness {
  const clockBox = { now: 1_000_000 };
  const store = createInMemoryConstellationStore(() => clockBox.now);
  const discoveryCalls = { count: 0 };
  const nodesCalls = { count: 0 };
  const runner = createConstellationRunner({
    repo: store.repo,
    makeDiscoveryPort: () => discoveryStub(discoveryCalls),
    makeNodesPort: () => nodesStub(nodesCalls, opts.onFirstNodeCall),
    attemptSink: noopAttemptSink,
    servedSparkQuestions: () => Promise.resolve(ok([])),
    rateLimiter: opts.rateLimiter ?? ALLOW,
    modelId: MODEL,
    clock: () => clockBox.now,
  });
  return {
    store,
    discoveryCalls,
    nodesCalls,
    runner,
    get now() {
      return clockBox.now;
    },
    set now(v: number) {
      clockBox.now = v;
    },
  };
}

function input(): ConstellationRunInput {
  return { userId: UID, sprintId: SID, draft: DRAFT, substrateSnapshot: "" };
}

// ── The pure lease decision ──────────────────────────────────────────────────

describe("decideExecution — the lease laws (§5.4)", () => {
  const stale = 100_000;
  test("a freshly-created run executes", () => {
    expect(
      decideExecution({ createdFresh: true, status: "s1", updatedAtMs: 0 }, 0, stale),
    ).toBe("executable");
  });
  test("a complete run does nothing", () => {
    expect(
      decideExecution({ createdFresh: false, status: "complete", updatedAtMs: 0 }, 999, stale),
    ).toBe("complete");
  });
  test("an existing non-terminal run is in-flight while fresh, executable once stale", () => {
    const base = { createdFresh: false, status: "s3" as const, updatedAtMs: 0 };
    expect(decideExecution(base, stale - 1, stale)).toBe("in-flight");
    expect(decideExecution(base, stale, stale)).toBe("executable");
  });
  test("a failed run is executable (retry), regardless of age", () => {
    expect(
      decideExecution({ createdFresh: false, status: "failed", updatedAtMs: 0 }, 1, stale),
    ).toBe("executable");
  });
});

// ── End-to-end pipeline ──────────────────────────────────────────────────────

describe("the happy path", () => {
  test("a fresh run completes with stars + nodes; novel is flagged", async () => {
    const h = harness();
    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("executable");
    if (outcome.kind !== "executable") return;
    expect(outcome.novel).toBe(true);
    expect(outcome.status).toBe("s1");

    await outcome.execute();

    expect(h.discoveryCalls.count).toBe(1);
    // All four kinds are eligible (asserting+testing+wondering stars) → four calls.
    expect(h.nodesCalls.count).toBe(4);

    const view = await h.store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value?.status).toBe("complete");
    if (view.ok && view.value) {
      expect(view.value.stars.length).toBe(4); // 3 core + 1 off-map
      expect(view.value.nodes.length).toBeGreaterThan(0);
    }
  });
});

describe("the two-beat reveal (D12)", () => {
  test("stars are readable at status s3 before any node lands", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    // Capture the s3 beat as primitives (a closure-assigned object confuses TS
    // control-flow narrowing on a nullable local).
    const beat = { status: "", stars: -1, nodes: -1, captured: false };

    const h = harness({
      onFirstNodeCall: async () => {
        // The first node call happens AFTER the S1 checkpoint (status s3, stars
        // persisted) and BEFORE any node is saved — capture that beat, then block.
        const v = await h.store.repo.readBySprint(UID, SID);
        if (v.ok && v.value) {
          beat.status = v.value.status;
          beat.stars = v.value.stars.length;
          beat.nodes = v.value.nodes.length;
        }
        beat.captured = true;
        await gate;
      },
    });

    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("executable");
    if (outcome.kind !== "executable") return;
    const running = outcome.execute();

    // Let execute() reach the blocked first node call.
    while (!beat.captured) await new Promise((r) => setTimeout(r, 2));

    expect(beat.status).toBe("s3");
    expect(beat.stars).toBe(4);
    expect(beat.nodes).toBe(0); // beat one: stars only

    release();
    await running;

    const done = await h.store.repo.readBySprint(UID, SID);
    expect(done.ok && done.value?.status).toBe("complete");
    expect(done.ok && done.value ? done.value.nodes.length : 0).toBeGreaterThan(0);
  });
});

describe("resume (§5.4): kill after S1 → re-POST completes without re-running S1", () => {
  async function seedS1Checkpoint(h: Harness): Promise<void> {
    // Persist a run already checkpointed at s3 (S1 done, S3 not), using the SAME
    // run_key the runner will compute for this draft.
    const runKey = computeRunKey({
      sprintId: SID,
      draft: DRAFT,
      promptVersion: CONSTELLATION_PROMPT_VERSION,
      schemaVersion: CONSTELLATION_SCHEMA_VERSION,
      modelId: MODEL,
    });
    const rid = makeRunId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    if (!rid.ok) throw new Error("rid");
    await h.store.repo.createOrGet({
      runId: rid.value,
      userId: UID,
      sprintId: SID,
      runKey,
      draftWordCount: 10,
      promptVersion: CONSTELLATION_PROMPT_VERSION,
      schemaVersion: CONSTELLATION_SCHEMA_VERSION,
      modelId: MODEL,
    });
    await h.store.repo.saveDiscovery({
      runId: rid.value,
      discovery: DISCOVERY,
      inputTokens: 100,
      outputTokens: 50,
    });
  }

  test("a stale s3 run resumes S3 only; S1 is not re-run", async () => {
    const h = harness();
    const seededAt = h.now;
    await seedS1Checkpoint(h);
    // Make the seeded run STALE.
    h.now = seededAt + RUN_STALE_AFTER_MS + 1;

    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("executable");
    if (outcome.kind !== "executable") return;
    // A resume is NOT novel — the route must not charge the rate bucket for it.
    expect(outcome.novel).toBe(false);

    await outcome.execute();

    // S1 was skipped (discovery never invoked); only S3 ran.
    expect(h.discoveryCalls.count).toBe(0);
    expect(h.nodesCalls.count).toBe(4);

    const view = await h.store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value?.status).toBe("complete");
  });

  test("a fresh (non-stale) in-flight run returns status WITHOUT executing", async () => {
    const h = harness();
    await seedS1Checkpoint(h); // status s3, updated at h.now — fresh
    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("in-flight");
    if (outcome.kind === "in-flight") expect(outcome.status).toBe("s3");
    // No execution happened.
    expect(h.discoveryCalls.count).toBe(0);
    expect(h.nodesCalls.count).toBe(0);
  });
});

const SEED_RUN_KEY = computeRunKey({
  sprintId: SID,
  draft: DRAFT,
  promptVersion: CONSTELLATION_PROMPT_VERSION,
  schemaVersion: CONSTELLATION_SCHEMA_VERSION,
  modelId: MODEL,
});
const SEED_RID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** Seed a run already checkpointed at s3 (S1 done) under the runner's own
 * run_key, so a re-POST for DRAFT resumes it. */
async function seedAtS3(h: Harness): Promise<void> {
  const rid = makeRunId(SEED_RID);
  if (!rid.ok) throw new Error("rid");
  await h.store.repo.createOrGet({
    runId: rid.value,
    userId: UID,
    sprintId: SID,
    runKey: SEED_RUN_KEY,
    draftWordCount: 10,
    promptVersion: CONSTELLATION_PROMPT_VERSION,
    schemaVersion: CONSTELLATION_SCHEMA_VERSION,
    modelId: MODEL,
  });
  await h.store.repo.saveDiscovery({
    runId: rid.value,
    discovery: DISCOVERY,
    inputTokens: 0,
    outputTokens: 0,
  });
}

describe("retry of a failed run", () => {
  test("a failed run is reset to its resumable stage and completes", async () => {
    const h = harness();
    await seedAtS3(h);
    const rid = makeRunId(SEED_RID);
    if (!rid.ok) throw new Error("rid");
    // Failure during S3 leaves the run `failed` with S1's stars intact.
    await h.store.repo.markFailed({
      runId: rid.value,
      failedStage: "nodes:counterargument",
      errorReason: "transport",
    });

    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("executable"); // failed → retryable
    if (outcome.kind !== "executable") return;
    await outcome.execute();

    // S1 not re-run (its stars are create-once); only S3 replays.
    expect(h.discoveryCalls.count).toBe(0);
    const view = await h.store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value?.status).toBe("complete");
  });
});

describe("the novel-run rate cap (§6)", () => {
  test("a rate-denied NOVEL run → rate-limited, and its phantom row is DELETED", async () => {
    const h = harness({ rateLimiter: DENY });
    const outcome = await h.runner.start(input());
    expect(outcome.kind).toBe("rate-limited");
    if (outcome.kind === "rate-limited") expect(outcome.retryAfterSeconds).toBe(99);
    // The phantom must be gone — else a later exempt resume would drain it and
    // defeat the cap (the reviewed bypass).
    const view = await h.store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value).toBe(null);
    expect(h.discoveryCalls.count).toBe(0);
  });

  test("a RESUME re-POST is EXEMPT from the cap even when the limiter denies", async () => {
    const h = harness({ rateLimiter: DENY });
    const seededAt = h.now;
    await seedAtS3(h);
    h.now = seededAt + RUN_STALE_AFTER_MS + 1; // make it stale → a resume candidate
    const outcome = await h.runner.start(input());
    // The resume path never consults the limiter — it must run despite DENY.
    expect(outcome.kind).toBe("executable");
    if (outcome.kind === "executable") expect(outcome.novel).toBe(false);
  });
});

describe("execute() never throws out of waitUntil (D11-safe failure)", () => {
  test("a thrown dependency → failed with a FIXED reason, not the leaked message", async () => {
    const clockBox = { now: 1_000_000 };
    const store = createInMemoryConstellationStore(() => clockBox.now);
    const runner = createConstellationRunner({
      repo: store.repo,
      // A port that violates its no-throw contract and leaks draft-adjacent text.
      makeDiscoveryPort: () => ({
        discover: (): Promise<Result<Discovery, InferenceError>> => {
          throw new Error("the draft said SECRET");
        },
      }),
      makeNodesPort: () => nodesStub({ count: 0 }),
      attemptSink: noopAttemptSink,
      servedSparkQuestions: () => Promise.resolve(ok([])),
      rateLimiter: ALLOW,
      modelId: MODEL,
      clock: () => clockBox.now,
    });

    const outcome = await runner.start(input());
    expect(outcome.kind).toBe("executable");
    if (outcome.kind !== "executable") return;
    // Must resolve, never reject (it runs detached under waitUntil).
    await outcome.execute();

    const view = await store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value?.status).toBe("failed");
    if (view.ok && view.value) {
      // D11: the thrown message is NOT persisted/exposed.
      expect(view.value.errorReason).toBe("unexpected runner error");
      expect(view.value.errorReason ?? "").not.toContain("SECRET");
    }
  });
});

describe("execution mutex: concurrent resume/retry runs the pipeline ONCE", () => {
  test("two concurrent retries of a failed run → one executes, one is in-flight", async () => {
    const h = harness();
    await seedAtS3(h);
    const rid = makeRunId(SEED_RID);
    if (!rid.ok) throw new Error("rid");
    await h.store.repo.markFailed({ runId: rid.value, failedStage: "nodes:question", errorReason: "transport" });

    // Two re-POSTs racing (two tabs / a manual retry racing the client auto-re-POST).
    const [o1, o2] = await Promise.all([h.runner.start(input()), h.runner.start(input())]);
    // Exactly one wins the lease; the other sees an in-flight run.
    expect([o1.kind, o2.kind].sort()).toEqual(["executable", "in-flight"]);

    await Promise.all(
      [o1, o2].map((o) => (o.kind === "executable" ? o.execute() : Promise.resolve())),
    );

    // The pipeline ran ONCE: S1 skipped (checkpointed), S3 four calls — not eight.
    expect(h.discoveryCalls.count).toBe(0);
    expect(h.nodesCalls.count).toBe(4);
    const view = await h.store.repo.readBySprint(UID, SID);
    expect(view.ok && view.value?.status).toBe("complete");
  });
});
