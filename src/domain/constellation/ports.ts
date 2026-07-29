/**
 * Ports the background-inference core needs from infrastructure.
 *
 * Each tier is its own interface (interface segregation): the tiers have
 * different inputs, outputs, and failure semantics, so they should not be
 * unioned into one fat "LLM port". Adapters implement these; the domain never
 * sees an SDK type and never sees a thrown exception — every call resolves to a
 * `Result`.
 */

import type { Result } from "../types/result";
import type { InferenceError, PersistenceError } from "../types/errors";
import type { RunId, SprintId, UserId } from "../types/branded";
import type { Finding, PBurst, TriageResult } from "./types";
import type {
  Discovery,
  NodeKind,
  NodeStatus,
  Star,
  ValidatedNode,
} from "./node-types";
import type { Constellation } from "./assemble-constellation";
import type {
  NewRunInput,
  ResumeState,
  RunSnapshot,
  RunStatus,
  RunView,
} from "./run-types";

/**
 * Context shared across a sprint's inference calls. `fullText` is the
 * freewrite-so-far, which a real adapter caches as a stable prompt prefix
 * (see the prompt-caching section of background-inference-during-freewrite.md).
 */
export type SprintContext = {
  readonly fullText: string;
};

/** Tier 1 — cheap, fires on every trigger, classifies and routes. */
export interface TriagePort {
  triage(
    burst: PBurst,
    ctx: SprintContext,
  ): Promise<Result<TriageResult, InferenceError>>;
}

/** Tier 2 — expensive, retrieval-grounded, only on escalated bursts. */
export interface AnalysisPort {
  analyze(
    burst: PBurst,
    triage: TriageResult,
    ctx: SprintContext,
  ): Promise<Result<Finding, InferenceError>>;
}

// ── Sprint-end constellation run (plan §4.5) ─────────────────────────────────
//
// The sprint-end regime (D2). These ports are consumed by the checkpointed
// runner, never by the during-sprint drip. Each resolves to a `Result` — the
// domain never sees an SDK type or a thrown exception. The adapters own prompt
// assembly, `structured-call` discipline, validation, and telemetry; the ports
// expose only the domain-shaped input and output.

/** S1 discovery — one call over the full draft (D5). Warm-started from the
 * client-sent substrate snapshot and the server-queried served sparks; returns
 * the validated `Discovery` (brief, stars, off-map seeds, confidence). */
export interface DiscoveryPort {
  discover(input: {
    readonly draft: string;
    readonly substrateSnapshot: string;
    readonly servedSparks: readonly string[];
  }): Promise<Result<Discovery, InferenceError>>;
}

/** S3 node generation — one call per kind (D5), so the runner can skip a kind
 * with zero eligible stars (D9) and stagger the calls to share the cached
 * prefix. Validation is PER-KIND here (the adapter has the stars, so it runs
 * `validateNodeSet` to drive the repair-with-validator-error discipline, D8.5)
 * and returns the surviving `ValidatedNode`s; the runner then assembles
 * cross-kind (`assembleConstellation`) over all four kinds' survivors — assembly
 * is the only genuinely cross-kind step and stays in the runner. */
export interface NodeGenerationPort {
  generate(input: {
    readonly draft: string;
    readonly brief: string;
    readonly stars: readonly Star[];
    readonly kind: NodeKind;
    readonly hints: readonly string[];
  }): Promise<Result<readonly ValidatedNode[], InferenceError>>;
}

/**
 * The durable run's persistence (plan §4.5/§5.3). One run per (user, run_key),
 * persisted before any model call (D3), with idempotent checkpoint writes and a
 * status-CAS lease (§5.4). Every method resolves to a `Result` — no throw
 * escapes to the runner. Tenancy travels on the call, matching the spark sinks.
 */
export interface ConstellationRunRepo {
  /** Create the run for `(userId, runKey)`, or return the existing one (resume).
   * Idempotent on the unique `(user_id, run_key)` index; `createdFresh`
   * distinguishes the two. Persisted at status `s1` before any model call. */
  createOrGet(
    input: NewRunInput,
  ): Promise<Result<RunSnapshot, PersistenceError>>;

  /** The generic status-CAS lease (§5.4): move `from` → `to` only if the run is
   * currently at `from`, touching `updated_at`. Returns whether it won the
   * transition — the caller uses this to gate execution against a stale/raced
   * run. */
  transition(input: {
    readonly runId: RunId;
    readonly from: RunStatus;
    readonly to: RunStatus;
  }): Promise<Result<boolean, PersistenceError>>;

  /** The TIME-BASED execution lease claim (§5.4): atomically touch `updated_at`
   * of a run at `expectedStatus` IFF it is STALE (its `updated_at` is at or before
   * `staleBeforeMs`). Returns whether it won — so exactly ONE of several concurrent
   * resume re-POSTs of a stale run claims the right to execute (the winner's bump
   * makes the losers' staleness predicate false under the row lock). Unlike a
   * `from → to` transition it preserves the status (an s1/s3 resume stays at its
   * stage); the exclusivity comes from the `updated_at < staleBeforeMs`
   * precondition the write itself invalidates. A `failed` run is claimed by
   * `transition(failed → …)` instead (immediate retry, no staleness wait). */
  claimStaleRun(input: {
    readonly runId: RunId;
    readonly expectedStatus: RunStatus;
    readonly staleBeforeMs: number;
  }): Promise<Result<boolean, PersistenceError>>;

  /** Delete a run and its cascade (stars/nodes). Run 1 uses this for ONE thing:
   * a NOVEL run that is rate-denied at creation must not leave a durable row
   * behind, or a later (rate-exempt) resume re-POST could drain it and defeat the
   * per-user cap. The row has no stars/nodes yet at that point, so the delete is
   * a clean compensating action. Idempotent — deleting a missing run is a no-op. */
  deleteRun(runId: RunId): Promise<Result<void, PersistenceError>>;

  /** The S1 checkpoint, ATOMIC: CAS `s1` → `s3`, persist stars + brief +
   * confidence, and accumulate tokens — all in one transaction, so a crash
   * leaves no half-written discovery (D3/§5.4). Returns whether it applied. */
  saveDiscovery(input: {
    readonly runId: RunId;
    readonly discovery: Discovery;
    readonly inputTokens: number;
    readonly outputTokens: number;
  }): Promise<Result<boolean, PersistenceError>>;

  /** The assemble checkpoint, ATOMIC: CAS `s3` → `complete`, persist nodes +
   * crux star, accumulate tokens, stamp `completed_at`. Node writes are
   * create-once (never clobber writer status/reaction). Returns whether it
   * applied. */
  saveNodes(input: {
    readonly runId: RunId;
    readonly constellation: Constellation;
    readonly inputTokens: number;
    readonly outputTokens: number;
  }): Promise<Result<boolean, PersistenceError>>;

  /** Mark a run failed with the stage and reason (from any non-terminal status)
   * — the partial-constellation / retry UI reads these (§3). */
  markFailed(input: {
    readonly runId: RunId;
    readonly failedStage: string;
    readonly errorReason: string;
  }): Promise<Result<void, PersistenceError>>;

  /** The runner's resume read (plan §5.4): the run's durable state keyed by
   * `runId` — its status plus the S1 outputs (`brief`, `confidence`, and the
   * stars restored to their DOMAIN-LOCAL ids) needed to resume S3 without
   * re-running S1. `null` when no such run exists. Distinct from `readBySprint`
   * (which is sprint-keyed, carries no `brief`, and returns persisted star ids
   * for the board) — this is the runner's private resume path. */
  getResumeState(
    runId: RunId,
  ): Promise<Result<ResumeState | null, PersistenceError>>;

  /** The board read: the NEWEST run for the sprint by `created_at`, outright
   * (recency wins — an older complete run must not mask a newer in-flight/failed
   * one; §11 review log), with its stars and nodes, or `null` if none. */
  readBySprint(
    userId: UserId,
    sprintId: SprintId,
  ): Promise<Result<RunView | null, PersistenceError>>;

  /** The PATCH path (D12): a node lifecycle transition plus the optional
   * reaction write. Two invariants enforced AT THE QUERY, never trusted to route
   * code:
   *  - TENANCY — `userId` is REQUIRED; the write lands only if the node's run
   *    belongs to that user, so a forged runId/nodeId can never touch another
   *    writer's node.
   *  - TRANSITION LEGALITY — `fromStatuses` is the set of statuses the node may
   *    currently be in for this transition to be legal (the D12 predecessors of
   *    the target, `statusPredecessors`). The UPDATE carries it as a
   *    `status IN (…)` precondition, so an illegal move (re-opening a dismissed
   *    node, double-resolving) matches nothing ATOMICALLY — no read-then-write
   *    race. An empty `fromStatuses` (an unreachable target) matches nothing.
   * Returns whether a node was found and updated. */
  updateNode(input: {
    readonly userId: UserId;
    readonly runId: RunId;
    readonly nodeId: string;
    readonly status: NodeStatus;
    readonly fromStatuses: readonly NodeStatus[];
    readonly reaction?: string;
  }): Promise<Result<boolean, PersistenceError>>;
}
