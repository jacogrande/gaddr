/**
 * validate.ts — pure input validation for the three constellation-run routes
 * (thin-shell step 1, architecture §8.2). No I/O, no framework — the whole
 * accept/reject surface is contract-tested with plain objects.
 *
 * It NEVER echoes the draft (reject messages are fixed, field-oriented strings),
 * and does no business logic — the lease, generation, assembly, and rate limiting
 * live in the runner and the handler.
 */

import { runId as toRunId, sprintId as toSprintId } from "../../../domain/types/branded";
import type { RunId, SprintId } from "../../../domain/types/branded";
import { ok, err } from "../../../domain/types/result";
import type { Result } from "../../../domain/types/result";
import {
  isValidReaction,
  REACTION_MAX_CHARS,
} from "../../../domain/constellation/node-types";
import type { NodeStatus } from "../../../domain/constellation/node-types";

/** Draft cap — the same order of magnitude as the spark route: 50k chars is an
 * order of magnitude beyond any real freewrite sprint. Over it → 413. */
export const MAX_DRAFT_CHARS = 50_000;

/** The client-sent substrate snapshot is machine-generated themes/positions, not
 * prose — a few KB at most. Bounded so a hostile client can't smuggle bulk text
 * through the fenced-but-forgeable field (D8). */
export const MAX_SUBSTRATE_CHARS = 20_000;

/** Pre-parse byte cap for the POST body (draft-bearing) — mirrors the spark
 * generate cap; the char caps below remain authoritative. */
export const MAX_RUN_BODY_BYTES = 262_144;

/** Pre-parse byte cap for the PATCH body — a batch of 20 node updates with
 * maximal reactions is a few KB; 64KB is generous headroom. */
export const MAX_NODE_STATUS_BODY_BYTES = 65_536;

/** Per-request cap on node-status updates. The board mutates a handful at a time;
 * 20 is generous headroom, and it bounds the per-request DB work. */
export const MAX_NODE_STATUS_BATCH = 20;

/** A node id is the run-scoped composite `${runId}:n:${rank}` — short. Bound it
 * so a hostile client can't stuff bulk text into the lookup key. */
export const MAX_NODE_ID_CHARS = 200;

export interface RunBody {
  readonly sprintId: SprintId;
  readonly draft: string;
  readonly substrateSnapshot: string;
}

export interface NodeStatusUpdate {
  readonly nodeId: string;
  readonly status: NodeStatus;
  readonly reaction?: string;
}

export interface NodeStatusBody {
  readonly runId: RunId;
  readonly updates: readonly NodeStatusUpdate[];
}

export interface BodyReject {
  readonly status: number;
  readonly message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * The statuses a client may REQUEST as a transition target. `unseen` is excluded
 * — it is the initial state, and nothing transitions INTO it (a request for it
 * would be a guaranteed no-op). The legality of `opened`/`resolved`/`dismissed`/
 * `deferred` against the node's CURRENT status is enforced atomically at the DB
 * via `statusPredecessors` (see the port), not here.
 */
function isRequestableStatus(value: unknown): value is NodeStatus {
  return (
    value === "opened" ||
    value === "resolved" ||
    value === "dismissed" ||
    value === "deferred"
  );
}

// ── POST /api/constellation-run body ─────────────────────────────────────────

/**
 * Validate the run body. Order matters: the draft cap is checked before the
 * cheaper field checks so an oversized body short-circuits to 413. Every reject
 * is content-free. `substrateSnapshot` is OPTIONAL — absent/null becomes an empty
 * string (a fresh sprint with no drip substrate is legitimate).
 */
export function parseRunBody(raw: unknown): Result<RunBody, BodyReject> {
  if (!isRecord(raw)) {
    return err({ status: 400, message: "invalid request body" });
  }

  const draft = raw.draft;
  if (!isString(draft)) {
    return err({ status: 400, message: "draft must be a string" });
  }
  if (draft.length > MAX_DRAFT_CHARS) {
    return err({ status: 413, message: "draft exceeds maximum length" });
  }

  let substrateSnapshot = "";
  if (raw.substrateSnapshot !== undefined && raw.substrateSnapshot !== null) {
    if (!isString(raw.substrateSnapshot)) {
      return err({ status: 400, message: "substrateSnapshot must be a string" });
    }
    if (raw.substrateSnapshot.length > MAX_SUBSTRATE_CHARS) {
      return err({ status: 413, message: "substrateSnapshot exceeds maximum length" });
    }
    substrateSnapshot = raw.substrateSnapshot;
  }

  const rawSprintId = raw.sprintId;
  if (!isString(rawSprintId)) {
    return err({ status: 400, message: "sprintId must be a string" });
  }
  const sid = toSprintId(rawSprintId);
  if (!sid.ok) {
    return err({ status: 400, message: "sprintId must be a UUID" });
  }

  return ok({ sprintId: sid.value, draft, substrateSnapshot });
}

// ── GET /api/constellation-run?sprintId= ─────────────────────────────────────

/** Validate the `sprintId` query param. */
export function parseSprintIdParam(
  raw: string | null,
): Result<SprintId, BodyReject> {
  if (raw === null) {
    return err({ status: 400, message: "sprintId is required" });
  }
  const sid = toSprintId(raw);
  if (!sid.ok) {
    return err({ status: 400, message: "sprintId must be a UUID" });
  }
  return ok(sid.value);
}

// ── PATCH /api/constellation-run/node-status body ────────────────────────────

/** Validate ONE node-status update. `resolved` REQUIRES a valid reaction (D12:
 * submitting a reaction is what resolves a node); every other target must NOT
 * carry a reaction (a dismiss/set-aside/open is not a reaction). */
function parseUpdate(raw: unknown): Result<NodeStatusUpdate, string> {
  if (!isRecord(raw)) {
    return err("update must be an object");
  }
  const nodeId = raw.nodeId;
  if (!isString(nodeId) || nodeId.length === 0) {
    return err("nodeId must be a non-empty string");
  }
  if (nodeId.length > MAX_NODE_ID_CHARS) {
    return err("nodeId exceeds maximum length");
  }
  const status = raw.status;
  if (!isRequestableStatus(status)) {
    return err("status must be one of opened|resolved|dismissed|deferred");
  }

  const rawReaction = raw.reaction;
  let reaction: string | undefined;
  if (rawReaction !== undefined && rawReaction !== null) {
    if (!isString(rawReaction)) {
      return err("reaction must be a string");
    }
    reaction = rawReaction;
  }

  if (status === "resolved") {
    if (reaction === undefined || !isValidReaction(reaction)) {
      return err(
        `resolving a node requires a reaction of 1–${String(REACTION_MAX_CHARS)} characters`,
      );
    }
  } else if (reaction !== undefined) {
    return err("only a 'resolved' update may carry a reaction");
  }

  return ok(reaction === undefined ? { nodeId, status } : { nodeId, status, reaction });
}

/**
 * Validate the PATCH body: a `runId` (uuid) plus a non-empty, ≤`MAX_NODE_STATUS_
 * BATCH` array of updates. Rejection is WHOLESALE here (unlike the spark events
 * route's per-item best-effort): a node-status change is a deliberate writer
 * action, so a malformed item is a client bug worth surfacing, not silently
 * dropping.
 */
export function parseNodeStatusBody(
  raw: unknown,
): Result<NodeStatusBody, BodyReject> {
  if (!isRecord(raw)) {
    return err({ status: 400, message: "invalid request body" });
  }
  const rawRunId = raw.runId;
  if (!isString(rawRunId)) {
    return err({ status: 400, message: "runId must be a string" });
  }
  const rid = toRunId(rawRunId);
  if (!rid.ok) {
    return err({ status: 400, message: "runId must be a UUID" });
  }
  const rawUpdates = raw.updates;
  if (!Array.isArray(rawUpdates)) {
    return err({ status: 400, message: "updates must be an array" });
  }
  if (rawUpdates.length === 0) {
    return err({ status: 400, message: "updates must not be empty" });
  }
  if (rawUpdates.length > MAX_NODE_STATUS_BATCH) {
    return err({ status: 413, message: "too many updates in one request" });
  }
  const updates: NodeStatusUpdate[] = [];
  for (const rawUpdate of rawUpdates) {
    const parsed = parseUpdate(rawUpdate);
    if (!parsed.ok) {
      return err({ status: 400, message: parsed.error });
    }
    updates.push(parsed.value);
  }
  return ok({ runId: rid.value, updates });
}
