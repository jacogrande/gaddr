/**
 * deps.ts — the composition root for the three constellation-run routes (plan
 * §6, mock-vs-real selection). The handler cores take their dependencies as data;
 * this module is the ONE place that decides, per `isE2ETesting()`, whether those
 * are the real provider/Postgres stack or the mock/in-memory stack.
 *
 * IMPORT-SAFETY (critical, matches spark `deps.ts`): NOTHING statically imported
 * here may touch `DATABASE_URL`/`BETTER_AUTH_*` at import time. The db client and
 * the real `requireSession` are pulled in ONLY via dynamic import inside the real
 * branch (`getRealBackends`), which runs only when NOT in E2E mode. The repo/
 * sink/query factories, the adapters, and the provider registry all read env
 * lazily (at call time) or not at all, so they import safely.
 */

import { after } from "next/server";

import { isE2ETesting } from "../../../infra/env";
import { createConstellationRunner } from "../../../infra/jobs/constellation-runner";
import type {
  ConstellationRunner,
  DiscoveryPortFactory,
  NodesPortFactory,
} from "../../../infra/jobs/constellation-runner";
import { RUN_STALE_AFTER_MS } from "../../../infra/jobs/constellation-runner";
import { createDiscoveryPort } from "../../../infra/llm/discovery-adapter";
import { createNodeGenerationPort } from "../../../infra/llm/nodes-adapter";
import {
  createMockDiscoveryPort,
  createMockNodeGenerationPort,
} from "../../../infra/llm/mock-constellation-adapter";
import {
  createStructuredClientFor,
  resolveDiscoveryLlm,
  resolveNodesLlm,
} from "../../../infra/llm/providers";
import { ok } from "../../../domain/types/result";
import type { ConstellationRunRepo } from "../../../domain/constellation/ports";
import type { InferenceAttemptSink } from "../../../infra/db/inference-attempt-repo";
import type { ServedSparkQuestionsQuery } from "../../../infra/db/served-spark-query";
import type {
  ConstellationRunReadDeps,
  ConstellationRunStartDeps,
  NodeStatusDeps,
  RequireSession,
} from "./handler";
import {
  createRateLimiter,
  NODE_STATUS_RATE_LIMIT,
  NODE_STATUS_RATE_WINDOW_MS,
  RUN_RATE_LIMIT,
  RUN_RATE_WINDOW_MS,
} from "./rate-limit";
import { sharedE2EConstellationStore } from "./in-memory-store";
import { resolveE2ESession } from "../spark/session";

/** How long each staged mock beat pauses in E2E, so a GET poll can observe the
 * `s1` loading beat and the `s3` stars-only beat before nodes (the D12 two-beat).
 * Must comfortably exceed the board's ~2s poll interval or the stars-only beat
 * can slip between two polls and the eval cannot assert it. Real mode has no such
 * delay — the model calls ARE the beats. */
const E2E_STAGE_DELAY_MS = 2_500;

/** Discovery gates the whole run and its atomic validator can fail on the first
 * of several per-star faults, so it earns one extra repair over the default (§5.2
 * / the adapter's note); node generation keeps the disposable default (1). */
const DISCOVERY_REPAIR_CAP = 2;

/** ONE limiter INSTANCE per rate class for the whole process (pure in-memory,
 * env-free — shared across requests and the real/E2E modes). */
const sharedRunLimiter = createRateLimiter(RUN_RATE_LIMIT, RUN_RATE_WINDOW_MS);
const sharedPatchLimiter = createRateLimiter(
  NODE_STATUS_RATE_LIMIT,
  NODE_STATUS_RATE_WINDOW_MS,
);

/** A no-op attempt sink for E2E mode (no DB): telemetry is a non-event there, and
 * `toOnAttempt` swallows outcomes anyway. */
const e2eAttemptSink: InferenceAttemptSink = {
  record: () => Promise.resolve(ok(undefined)),
};

/** No served sparks in E2E (the in-memory spark store carries lenses, not
 * questions); the runner fails open on this read regardless. */
const e2eServedSparkQuestions: ServedSparkQuestionsQuery = () =>
  Promise.resolve(ok([]));

/** Run the multi-minute pipeline after the 202 is sent (§5.4). `after` extends
 * the serverless invocation up to the route's `maxDuration`. */
function runInBackground(work: () => Promise<void>): void {
  after(work);
}

// ── Real backends (memoized; built once per process on first real request) ────

interface RealBackends {
  readonly requireSession: RequireSession;
  readonly repo: ConstellationRunRepo;
  readonly runner: ConstellationRunner;
}

let realBackends: Promise<RealBackends> | null = null;

async function getRealBackends(): Promise<RealBackends> {
  realBackends ??= (async () => {
    const { db } = await import("../../../infra/db/client");
    const { requireSession } = await import(
      "../../../infra/auth/require-session"
    );
    const { createConstellationRunRepo } = await import(
      "../../../infra/db/constellation-run-repo"
    );
    const { createInferenceAttemptSink } = await import(
      "../../../infra/db/inference-attempt-repo"
    );
    const { createServedSparkQuestionsQuery } = await import(
      "../../../infra/db/served-spark-query"
    );

    const repo = createConstellationRunRepo(db);
    const attemptSink = createInferenceAttemptSink(db);
    const servedSparkQuestions = createServedSparkQuestionsQuery(db);

    // S1 and S3 share the constellation model (D6); each provider is resolved
    // once. The client factories read their API key lazily, so composition needs
    // no key.
    const discoveryLlm = resolveDiscoveryLlm();
    const nodesLlm = resolveNodesLlm();
    const discoveryClient = createStructuredClientFor(discoveryLlm.provider);
    const nodesClient = createStructuredClientFor(nodesLlm.provider);

    const makeDiscoveryPort: DiscoveryPortFactory = (onAttempt) =>
      createDiscoveryPort(discoveryClient, {
        modelId: discoveryLlm.modelId,
        effort: discoveryLlm.effort,
        repairCap: DISCOVERY_REPAIR_CAP,
        onAttempt,
      });
    const makeNodesPort: NodesPortFactory = (onAttempt) =>
      createNodeGenerationPort(nodesClient, {
        modelId: nodesLlm.modelId,
        effort: nodesLlm.effort,
        onAttempt,
      });

    const runner = createConstellationRunner({
      repo,
      makeDiscoveryPort,
      makeNodesPort,
      attemptSink,
      servedSparkQuestions,
      rateLimiter: sharedRunLimiter,
      modelId: discoveryLlm.modelId,
    });

    return { requireSession, repo, runner };
  })();
  return realBackends;
}

/** The E2E runner: the REAL `constellation-runner` (so checkpointing, the lease,
 * resume, and the two-beat are all exercised) over the in-memory repo + mock,
 * staged ports. */
function e2eRunner(): ConstellationRunner {
  const repo = sharedE2EConstellationStore.repo;
  const makeDiscoveryPort: DiscoveryPortFactory = () =>
    createMockDiscoveryPort({ stageDelayMs: E2E_STAGE_DELAY_MS });
  const makeNodesPort: NodesPortFactory = () =>
    createMockNodeGenerationPort({ stageDelayMs: E2E_STAGE_DELAY_MS });
  return createConstellationRunner({
    repo,
    makeDiscoveryPort,
    makeNodesPort,
    attemptSink: e2eAttemptSink,
    servedSparkQuestions: e2eServedSparkQuestions,
    rateLimiter: sharedRunLimiter,
    modelId: "mock-constellation",
  });
}

// ── The three resolvers ──────────────────────────────────────────────────────

export async function resolveConstellationRunStartDeps(): Promise<ConstellationRunStartDeps> {
  const base: Pick<ConstellationRunStartDeps, "runInBackground" | "now"> = {
    runInBackground,
    now: Date.now,
  };
  if (isE2ETesting()) {
    return {
      requireSession: () => Promise.resolve(resolveE2ESession()),
      runner: e2eRunner(),
      ...base,
    };
  }
  const backends = await getRealBackends();
  return {
    requireSession: backends.requireSession,
    runner: backends.runner,
    ...base,
  };
}

export async function resolveConstellationRunReadDeps(): Promise<ConstellationRunReadDeps> {
  const base: Pick<ConstellationRunReadDeps, "now" | "staleAfterMs"> = {
    now: Date.now,
    staleAfterMs: RUN_STALE_AFTER_MS,
  };
  if (isE2ETesting()) {
    return {
      requireSession: () => Promise.resolve(resolveE2ESession()),
      repo: sharedE2EConstellationStore.repo,
      ...base,
    };
  }
  const backends = await getRealBackends();
  return {
    requireSession: backends.requireSession,
    repo: backends.repo,
    ...base,
  };
}

export async function resolveNodeStatusDeps(): Promise<NodeStatusDeps> {
  const base: Pick<NodeStatusDeps, "patchLimiter" | "now"> = {
    patchLimiter: sharedPatchLimiter,
    now: Date.now,
  };
  if (isE2ETesting()) {
    return {
      requireSession: () => Promise.resolve(resolveE2ESession()),
      repo: sharedE2EConstellationStore.repo,
      ...base,
    };
  }
  const backends = await getRealBackends();
  return {
    requireSession: backends.requireSession,
    repo: backends.repo,
    ...base,
  };
}
