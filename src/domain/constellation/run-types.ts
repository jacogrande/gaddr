/**
 * run-types.ts — the durable-run vocabulary (plan §5.3/§5.4), the boundary shapes
 * the checkpointed runner and the board routes speak to the persistence port.
 * Pure data; no framework or SDK types. The persistence *columns* live in
 * `infra/db/schema.ts`, but the STATUS machine and the read/write shapes are a
 * domain concern (the run is the constellation's lifecycle), so they live here.
 */

import type { RunId, SprintId, UserId } from "../types/branded";
import type { PositionIntent } from "./types";
import type { ConstellationNode, Star } from "./node-types";

/**
 * The run status machine (plan §5.3, §3). `s1` → `s3` → (`assembling`) →
 * `complete`, or `failed` from any non-terminal state. The board reveals in two
 * beats: stars at `s3` (S1 done), nodes at `complete` (D12). `assembling` is a
 * transient in-memory state (pure assembly does no I/O) — kept in the union for
 * forward-compatibility, but Run 1's runner checkpoints `s3` → `complete`.
 */
export type RunStatus = "s1" | "s3" | "assembling" | "complete" | "failed";

/** The statuses with no runner work left (the lease never re-executes these
 * except a `failed` run reset to resumable — §5.4). */
export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = [
  "complete",
  "failed",
];

export function isTerminalRunStatus(status: RunStatus): boolean {
  return TERMINAL_RUN_STATUSES.includes(status);
}

/**
 * What a run is created with — BEFORE any model call (D3). `runId` is minted by
 * the infra layer (it owns randomness); the domain never generates it. The
 * version fingerprints are also folded into `runKey` upstream.
 */
export type NewRunInput = {
  readonly runId: RunId;
  readonly userId: UserId;
  readonly sprintId: SprintId;
  readonly runKey: string;
  readonly draftWordCount: number;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly modelId: string;
};

/**
 * The lease/resume view: enough for the runner to decide run-vs-resume-vs-return
 * (§5.4). `createdFresh` distinguishes a just-inserted run from a resumed one;
 * `updatedAtMs` feeds the staleness rule (the caller owns the clock, so the repo
 * hands back the stored instant as epoch millis rather than judging staleness
 * itself).
 */
export type RunSnapshot = {
  readonly runId: RunId;
  readonly status: RunStatus;
  readonly updatedAtMs: number;
  readonly createdFresh: boolean;
};

/**
 * A node as the board reads it: the assembled `ConstellationNode` plus its
 * persistence `id` (the PATCH route targets it) — `status`/`reaction` reflect
 * the writer's live lifecycle, not the assemble-time defaults.
 */
export type PersistedNode = ConstellationNode & { readonly id: string };

/**
 * What the checkpointed runner reads to RESUME a run at its first incomplete
 * stage (plan §5.4). A re-POST (stale run, or a retry of a `failed` one) rebuilds
 * from durable state, not React memory: if S1 already checkpointed (`brief` +
 * `stars` present), the runner skips it and re-runs only S3. The `stars` carry
 * their DOMAIN-LOCAL ids (`s1…`/`o1…`), NOT the persisted `${runId}:s:…` row ids
 * — S3 generation, validation, and assembly all speak the local ref, and the
 * repo restores it on read (`starLocalRef`), so a resumed S3 is byte-for-byte the
 * shape a fresh S3 would see.
 */
export type ResumeState = {
  readonly status: RunStatus;
  readonly brief: string | null;
  readonly confidence: "high" | "low" | null;
  readonly stars: readonly Star[];
};

/**
 * The board read (plan §6 GET): run status + stars + nodes. `stars` carry their
 * run-scoped persisted ids, and `nodes[].starId` uses the same ids, so the board
 * groups nodes under stars by identity. `cruxStarId` is the persisted star id (or
 * null). `updatedAtMs` lets the route apply the staleness rule.
 */
export type RunView = {
  readonly runId: RunId;
  readonly status: RunStatus;
  readonly failedStage: string | null;
  readonly errorReason: string | null;
  readonly confidence: "high" | "low" | null;
  readonly cruxStarId: string | null;
  readonly stars: readonly Star[];
  readonly nodes: readonly PersistedNode[];
  readonly updatedAtMs: number;
};

/** Intent axis re-exported so route/repo code narrows against one source. */
export type { PositionIntent };
