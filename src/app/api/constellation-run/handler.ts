/**
 * handler.ts — the three constellation-run handler cores (plan §6). Thin per
 * architecture §8.2: validate → compose the runner/repo → map the Result to HTTP.
 * Every business rule (the lease, checkpointing, assembly, staleness) lives in
 * the runner and the domain; these cores only validate, compose, and map — so the
 * whole contract (auth, each reject, the lease outcomes, the staleness rule, the
 * batch semantics) is testable with plain `Request` objects and stub deps, no
 * Next server required.
 *
 * CONTENT POSTURE: error bodies are terse and content-free (`jsonError`); the
 * draft never appears in a response, header, or log.
 */

import { declaredContentLengthExceeds, jsonError } from "../spark/http";
import {
  MAX_NODE_STATUS_BODY_BYTES,
  MAX_RUN_BODY_BYTES,
  parseNodeStatusBody,
  parseRunBody,
  parseSprintIdParam,
} from "./validate";
import type { RateLimiter } from "./rate-limit";
import type { Session } from "../../../domain/auth/session";
import type { AuthError } from "../../../domain/types/errors";
import type { Result } from "../../../domain/types/result";
import type {
  ConstellationRunRepo,
} from "../../../domain/constellation/ports";
import type { ConstellationRunner } from "../../../infra/jobs/constellation-runner";
import {
  isTerminalRunStatus,
  type RunView,
} from "../../../domain/constellation/run-types";
import { statusPredecessors } from "../../../domain/constellation/node-types";

/** Session resolver seam — the real `requireSession` or the E2E bypass. */
export type RequireSession = () => Promise<Result<Session, AuthError>>;

export interface ConstellationRunStartDeps {
  readonly requireSession: RequireSession;
  /** The runner owns the lease AND the novel-run rate charge (both must be atomic
   * with `createOrGet`'s novel-vs-resume decision), so this core does not hold a
   * limiter — it just maps the runner's outcome to HTTP. */
  readonly runner: ConstellationRunner;
  /** Schedule the (multi-minute) run to continue after the 202 is sent — wired to
   * `after`/`waitUntil` in the route, and to an awaitable capture in tests. */
  readonly runInBackground: (work: () => Promise<void>) => void;
  readonly now: () => number;
}

export interface ConstellationRunReadDeps {
  readonly requireSession: RequireSession;
  readonly repo: ConstellationRunRepo;
  readonly now: () => number;
  /** The staleness horizon (§5.4) the GET applies to surface a stuck run as
   * resumable. */
  readonly staleAfterMs: number;
}

export interface NodeStatusDeps {
  readonly requireSession: RequireSession;
  readonly repo: ConstellationRunRepo;
  readonly patchLimiter: RateLimiter;
  readonly now: () => number;
}

/** Fixed Retry-After (s) when the PATCH cap trips. (The POST cap's Retry-After is
 * supplied by the runner's `rate-limited` outcome.) */
const PATCH_CAP_RETRY_AFTER_SECONDS = 5;

// ── POST /api/constellation-run ──────────────────────────────────────────────

export async function handleConstellationRunStart(
  request: Request,
  deps: ConstellationRunStartDeps,
): Promise<Response> {
  const session = await deps.requireSession();
  if (!session.ok) {
    return jsonError(401, "authentication required");
  }
  const userId = session.value.userId;

  if (declaredContentLengthExceeds(request, MAX_RUN_BODY_BYTES)) {
    return jsonError(413, "request body too large");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const parsed = parseRunBody(rawBody);
  if (!parsed.ok) {
    return jsonError(parsed.error.status, parsed.error.message);
  }
  const body = parsed.value;

  const outcome = await deps.runner.start({
    userId,
    sprintId: body.sprintId,
    draft: body.draft,
    substrateSnapshot: body.substrateSnapshot,
  });

  if (outcome.kind === "error") {
    return jsonError(503, "constellation run unavailable");
  }

  // The runner charged the novel-run cap while it held the lease (resume/retry
  // re-POSTs are exempt, §6); map the denial here.
  if (outcome.kind === "rate-limited") {
    return jsonError(429, "rate limited", {
      "Retry-After": String(outcome.retryAfterSeconds),
    });
  }

  // Only the invocation that WON the lease gets an `executable` outcome, so this
  // schedules the pipeline at most once per run.
  if (outcome.kind === "executable") {
    deps.runInBackground(outcome.execute);
  }

  // 202 Accepted for every remaining outcome: the run is in progress (or already
  // complete) and the board's GET poll is the channel. Never blocks the writer.
  return Response.json(
    { runId: outcome.runId, status: outcome.status },
    { status: 202 },
  );
}

// ── GET /api/constellation-run?sprintId= ─────────────────────────────────────

/** The board DTO: the run's status + stars + nodes, plus the derived `resumable`
 * flag (a stale non-terminal run, or an explicit failure). */
function toRunDto(view: RunView, resumable: boolean): unknown {
  return {
    runId: view.runId,
    status: view.status,
    resumable,
    failedStage: view.failedStage,
    errorReason: view.errorReason,
    confidence: view.confidence,
    cruxStarId: view.cruxStarId,
    stars: view.stars,
    nodes: view.nodes,
  };
}

export async function handleConstellationRunRead(
  request: Request,
  deps: ConstellationRunReadDeps,
): Promise<Response> {
  const session = await deps.requireSession();
  if (!session.ok) {
    return jsonError(401, "authentication required");
  }
  const userId = session.value.userId;

  const sprintParam = new URL(request.url).searchParams.get("sprintId");
  const parsed = parseSprintIdParam(sprintParam);
  if (!parsed.ok) {
    return jsonError(parsed.error.status, parsed.error.message);
  }

  const read = await deps.repo.readBySprint(userId, parsed.value);
  if (!read.ok) {
    return jsonError(503, "constellation run unavailable");
  }
  if (read.value === null) {
    // No run for this sprint yet — the board shows its own pre-run state.
    return Response.json({ run: null });
  }

  const view = read.value;
  // Staleness rule (§5.4): a non-terminal run untouched past the horizon reads as
  // resumable, and an explicitly `failed` run is resumable (the retry path). The
  // client auto-re-POSTs on `resumable`.
  const stale =
    !isTerminalRunStatus(view.status) &&
    deps.now() - view.updatedAtMs >= deps.staleAfterMs;
  const resumable = stale || view.status === "failed";

  return Response.json({ run: toRunDto(view, resumable) });
}

// ── PATCH /api/constellation-run/node-status ─────────────────────────────────

export async function handleNodeStatusUpdate(
  request: Request,
  deps: NodeStatusDeps,
): Promise<Response> {
  const session = await deps.requireSession();
  if (!session.ok) {
    return jsonError(401, "authentication required");
  }
  const userId = session.value.userId;

  if (declaredContentLengthExceeds(request, MAX_NODE_STATUS_BODY_BYTES)) {
    return jsonError(413, "request body too large");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const parsed = parseNodeStatusBody(rawBody);
  if (!parsed.ok) {
    return jsonError(parsed.error.status, parsed.error.message);
  }
  const body = parsed.value;

  const verdict = deps.patchLimiter.check(userId, deps.now());
  if (!verdict.allowed) {
    return jsonError(429, "rate limited", {
      "Retry-After": String(
        verdict.retryAfterSeconds ?? PATCH_CAP_RETRY_AFTER_SECONDS,
      ),
    });
  }

  // Per-item apply. The repo enforces tenancy AND transition legality atomically
  // (via `statusPredecessors`), so an illegal or forged update simply reports
  // `updated: false` — the batch never partially aborts. A genuine persistence
  // failure (not a legality miss) is a 503 for the whole batch.
  const results: { nodeId: string; updated: boolean }[] = [];
  for (const update of body.updates) {
    const applied = await deps.repo.updateNode({
      userId,
      runId: body.runId,
      nodeId: update.nodeId,
      status: update.status,
      fromStatuses: statusPredecessors(update.status),
      reaction: update.reaction,
    });
    if (!applied.ok) {
      return jsonError(503, "node update unavailable");
    }
    results.push({ nodeId: update.nodeId, updated: applied.value });
  }

  return Response.json({ results });
}
