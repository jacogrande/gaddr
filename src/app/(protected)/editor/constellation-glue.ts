/**
 * constellation-glue.ts — the PURE request-building + response-narrowing seam for
 * the constellation client (plan §6), the sibling of `spark-glue.ts`. No React,
 * no fetch — just the request bodies the hook POSTs and defensive narrowers over
 * the untyped route responses, so the whole shape contract is unit-tested without
 * a browser. The E2E-vs-real split is entirely server-side, so this code is
 * identical in both modes.
 *
 * The board NEVER trusts the GET body as typed: a narrower drops a malformed run
 * to `null` (the board shows its pre-run state) rather than rendering garbage.
 */

import type {
  NodeKind,
  NodeStatus,
  StarKind,
} from "../../../domain/constellation/node-types";
import { NODE_KINDS, NODE_STATUSES } from "../../../domain/constellation/node-types";
import type {
  PositionIntent,
  ProvenanceTier,
} from "../../../domain/constellation/types";
import { POSITION_INTENTS } from "../../../domain/constellation/types";
import type { RunStatus } from "../../../domain/constellation/run-types";
import { isTerminalRunStatus } from "../../../domain/constellation/run-types";

export const CONSTELLATION_RUN_ENDPOINT = "/api/constellation-run";
export const CONSTELLATION_NODE_STATUS_ENDPOINT =
  "/api/constellation-run/node-status";

// ── Client-side view types (mirror the server GET DTO) ───────────────────────

/** A star as the board renders it — the persisted (run-scoped) id, so nodes group
 * by `node.starId === star.id`, and `kind` distinguishes the writer's core stars
 * from the off-map cluster. */
export interface BoardStar {
  readonly id: string;
  readonly label: string;
  readonly intent: PositionIntent;
  readonly weight: number;
  readonly grounding: string;
  readonly kind: StarKind;
}

/** A node card the board renders. `id` is what the PATCH targets; `status`/
 * `reaction` reflect the writer's live lifecycle. */
export interface BoardNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly tier: ProvenanceTier;
  readonly starId: string;
  readonly payoff: string;
  readonly body: string;
  readonly grounding: string;
  readonly cruxScore: number;
  readonly rank: number;
  readonly visible: boolean;
  readonly status: NodeStatus;
  readonly reaction?: string;
}

/** The whole board read: run status + the two-beat content + the resumable flag. */
export interface BoardRunView {
  readonly runId: string;
  readonly status: RunStatus;
  readonly resumable: boolean;
  readonly failedStage: string | null;
  readonly errorReason: string | null;
  readonly confidence: "high" | "low" | null;
  readonly cruxStarId: string | null;
  readonly stars: readonly BoardStar[];
  readonly nodes: readonly BoardNode[];
}

// ── Narrowing primitives ─────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const RUN_STATUS_SET: ReadonlySet<string> = new Set<string>([
  "s1",
  "s3",
  "assembling",
  "complete",
  "failed",
]);
const KIND_SET: ReadonlySet<string> = new Set<string>(NODE_KINDS);
const STATUS_SET: ReadonlySet<string> = new Set<string>(NODE_STATUSES);
const INTENT_SET: ReadonlySet<string> = new Set<string>(POSITION_INTENTS);
const TIER_SET: ReadonlySet<string> = new Set<string>([
  "sourced",
  "inferred",
  "heuristic",
]);

// ── Request builders ─────────────────────────────────────────────────────────

/** The POST body that starts (or resumes) a run. `substrateSnapshot` is the
 * client's drip substrate, stringified — the server fences + shape-validates it. */
export function buildRunRequest(input: {
  readonly sprintId: string;
  readonly draft: string;
  readonly substrateSnapshot: string;
}): { sprintId: string; draft: string; substrateSnapshot: string } {
  return {
    sprintId: input.sprintId,
    draft: input.draft,
    substrateSnapshot: input.substrateSnapshot,
  };
}

/** One node-status change the PATCH batch carries. A `resolved` MUST carry a
 * reaction (the server enforces it too); every other target must not. */
export interface NodeStatusChange {
  readonly nodeId: string;
  readonly status: Extract<
    NodeStatus,
    "opened" | "resolved" | "dismissed" | "deferred"
  >;
  readonly reaction?: string;
}

export function buildNodeStatusRequest(
  runId: string,
  updates: readonly NodeStatusChange[],
): { runId: string; updates: readonly NodeStatusChange[] } {
  return { runId, updates };
}

// ── Response narrowers ───────────────────────────────────────────────────────

/** Narrow the POST 202 body → `{ runId, status }` or `null`. */
export function parseRunStartResponse(
  data: unknown,
): { runId: string; status: RunStatus } | null {
  if (!isRecord(data)) return null;
  const runId = str(data.runId);
  const status = str(data.status);
  if (runId === null || status === null || !RUN_STATUS_SET.has(status)) {
    return null;
  }
  return { runId, status: status as RunStatus };
}

function parseStar(raw: unknown): BoardStar | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const label = str(raw.label);
  const intent = str(raw.intent);
  const weight = num(raw.weight);
  const grounding = str(raw.grounding);
  const kind = str(raw.kind);
  if (
    id === null ||
    label === null ||
    intent === null ||
    !INTENT_SET.has(intent) ||
    weight === null ||
    grounding === null ||
    (kind !== "star" && kind !== "off-map")
  ) {
    return null;
  }
  return {
    id,
    label,
    intent: intent as PositionIntent,
    weight,
    grounding,
    kind,
  };
}

function parseNode(raw: unknown): BoardNode | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const kind = str(raw.kind);
  const tier = str(raw.tier);
  const starId = str(raw.starId);
  const payoff = str(raw.payoff);
  const body = str(raw.body);
  const grounding = str(raw.grounding);
  const cruxScore = num(raw.cruxScore);
  const rank = num(raw.rank);
  const status = str(raw.status);
  if (
    id === null ||
    kind === null ||
    !KIND_SET.has(kind) ||
    tier === null ||
    !TIER_SET.has(tier) ||
    starId === null ||
    payoff === null ||
    body === null ||
    grounding === null ||
    cruxScore === null ||
    rank === null ||
    status === null ||
    !STATUS_SET.has(status)
  ) {
    return null;
  }
  const reaction = str(raw.reaction);
  return {
    id,
    kind: kind as NodeKind,
    tier: tier as ProvenanceTier,
    starId,
    payoff,
    body,
    grounding,
    cruxScore,
    rank,
    visible: raw.visible === true,
    status: status as NodeStatus,
    ...(reaction !== null ? { reaction } : {}),
  };
}

/**
 * Narrow the GET body → a `BoardRunView` (or `null` for `{ run: null }` OR any
 * malformed payload — the board treats both as "no renderable run"). A single
 * unparseable star/node is DROPPED rather than failing the whole read, so a
 * partial corruption degrades gracefully instead of blanking the board.
 */
export function parseRunViewResponse(data: unknown): BoardRunView | null {
  if (!isRecord(data)) return null;
  const run = data.run;
  if (run === null) return null; // legitimate "no run yet"
  if (!isRecord(run)) return null;

  const runId = str(run.runId);
  const status = str(run.status);
  if (runId === null || status === null || !RUN_STATUS_SET.has(status)) {
    return null;
  }
  const confidenceRaw = str(run.confidence);
  const confidence =
    confidenceRaw === "high" || confidenceRaw === "low" ? confidenceRaw : null;

  const stars = Array.isArray(run.stars)
    ? run.stars.map(parseStar).filter((s): s is BoardStar => s !== null)
    : [];
  const nodes = Array.isArray(run.nodes)
    ? run.nodes.map(parseNode).filter((n): n is BoardNode => n !== null)
    : [];

  return {
    runId,
    status: status as RunStatus,
    resumable: run.resumable === true,
    failedStage: str(run.failedStage),
    errorReason: str(run.errorReason),
    confidence,
    cruxStarId: str(run.cruxStarId),
    stars,
    nodes,
  };
}

// ── Poll control ─────────────────────────────────────────────────────────────

/** The board polls GET while the run is neither complete nor failed (the two-beat
 * unfolds across these). A `resumable` run is terminal-for-polling but triggers a
 * re-POST, handled by the hook. */
export function shouldKeepPolling(view: BoardRunView | null): boolean {
  if (view === null) return true; // no run readable yet — keep looking
  return !isTerminalRunStatus(view.status);
}
