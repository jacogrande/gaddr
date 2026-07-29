/**
 * constellation-run-repo.ts — the `ConstellationRunRepo` adapter (plan §4.5,
 * §5.3, §8 step 3). The durable spine the checkpointed runner (step 5) and the
 * board routes (step 6) write through.
 *
 * THIN (architecture.md §7.1): the LOGIC that can be wrong — id derivation, row
 * mapping, read narrowing — is in PURE exported functions, unit-tested without a
 * database. The factory does only I/O orchestration over the injected drizzle
 * client (stubbed in tests, real Postgres in the smoke).
 *
 * IDEMPOTENCY + LEASE (§5.4): the two checkpoints are ATOMIC transactions whose
 * FIRST statement is a status-CAS (`UPDATE … WHERE status = <expected>`
 * `RETURNING`). If the CAS matches no row (a stale/raced/already-advanced run),
 * the method returns `false` and no artifacts are written — one rule covering
 * double-fire, zombie resumes, and concurrent POSTs. Star/node ids are STABLE
 * and content-derived, so a retried checkpoint upserts the same rows.
 *
 * CONTENT POSTURE: only model output + verbatim grounding spans persist (D11);
 * the draft is never written. No throw escapes — every failure is a
 * `PersistenceError` Result.
 */

import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { err, ok } from "../../domain/types/result";
import type { PersistenceError } from "../../domain/types/errors";
import type { RunId } from "../../domain/types/branded";
import type {
  Discovery,
  NodeKind,
  NodeStatus,
  Star,
  StarKind,
  ValidatedNode,
} from "../../domain/constellation/node-types";
import { NODE_KINDS } from "../../domain/constellation/node-types";
import type {
  PositionIntent,
  ProvenanceTier,
} from "../../domain/constellation/types";
import { POSITION_INTENTS } from "../../domain/constellation/types";
import type { ConstellationRunRepo } from "../../domain/constellation/ports";
import type {
  NewRunInput,
  PersistedNode,
  ResumeState,
  RunStatus,
  RunView,
} from "../../domain/constellation/run-types";

/** The drizzle client this repo needs. Injected — the module never imports the
 * connection singleton (which throws at import when DATABASE_URL is unset). */
export type ConstellationDb = PostgresJsDatabase<typeof schema>;

type RunRow = typeof schema.constellationRun.$inferInsert;
type StarRow = typeof schema.constellationStar.$inferInsert;
type NodeRow = typeof schema.constellationNode.$inferInsert;

// ── Stable id derivation (pure) ──────────────────────────────────────────────

/** A star's run-scoped persistence id — stable across resume/retry so the S1
 * checkpoint upsert is idempotent and nodes resolve their star by the same key.
 * The domain star id (`localRef`, e.g. "s1") is opaque and run-local; prefixing
 * with the run uuid AND a `:s:` namespace segment makes it globally unique and
 * DISJOINT from the node id space — so even a pathological `localRef` of "n:0"
 * can never collide with a node id (they live in separate PK namespaces today,
 * but a shared cross-entity map would misresolve without this). */
export function starRowId(runId: string, localRef: string): string {
  return `${runId}:s:${localRef}`;
}

/** A node's run-scoped persistence id — stable because assembly is deterministic,
 * so a resumed run re-derives the same `(runId, rank)`. The PATCH route targets
 * a node by this id. The `:n:` namespace keeps it disjoint from star ids. */
export function nodeRowId(runId: string, rank: number): string {
  return `${runId}:n:${String(rank)}`;
}

/** The inverse of `starRowId`: recover a star's DOMAIN-LOCAL ref (`s1`, `o2`)
 * from its persisted row id (`${runId}:s:${localRef}`). Used ONLY on the resume
 * read (`getResumeState`), where the runner must hand S3 generation + assembly
 * the same local ids a fresh S1 would — the persisted `${runId}:s:…` id would
 * double-prefix through `starRowId` at the next save and break the star FK. The
 * `:s:` delimiter is unambiguous because a local ref never contains it (the
 * adapter assigns `s1…`/`o1…`); a row id lacking the prefix (corruption) falls
 * back to itself rather than throwing the board read. */
export function starLocalRef(runId: string, rowId: string): string {
  const prefix = `${runId}:s:`;
  return rowId.startsWith(prefix) ? rowId.slice(prefix.length) : rowId;
}

// ── Write mappers (pure, exported for the unit table) ────────────────────────

/** The run row a fresh run is created with — status `s1`, no output yet. */
export function toRunRow(input: NewRunInput): RunRow {
  return {
    id: input.runId,
    userId: input.userId,
    sprintId: input.sprintId,
    runKey: input.runKey,
    status: "s1",
    draftWordCount: input.draftWordCount,
    promptVersion: input.promptVersion,
    schemaVersion: input.schemaVersion,
    modelId: input.modelId,
  };
}

/** Star rows for the S1 checkpoint: core stars first, then off-map seeds, ranked
 * by that emission order (the crux star is conveyed by `crux_star_id` + the ⚡
 * marker, not by rank position — §6). */
export function toStarRows(runId: string, discovery: Discovery): StarRow[] {
  const all: readonly Star[] = [...discovery.stars, ...discovery.offMapSeeds];
  return all.map((star, rank) => ({
    id: starRowId(runId, star.id),
    runId,
    label: star.label,
    kind: star.kind,
    intent: star.intent,
    weight: star.weight,
    grounding: star.grounding,
    rank,
  }));
}

/** Node rows for the assemble checkpoint. `status`/`reaction` take the
 * assemble-time defaults on INSERT; the create-once upsert never overwrites a
 * writer's later mutation. */
export function toNodeRows(
  runId: string,
  nodes: readonly (ValidatedNode & {
    readonly cruxScore: number;
    readonly rank: number;
    readonly visible: boolean;
    readonly status: NodeStatus;
    readonly reaction?: string;
  })[],
): NodeRow[] {
  return nodes.map((node) => ({
    id: nodeRowId(runId, node.rank),
    runId,
    starId: starRowId(runId, node.starId),
    kind: node.kind,
    tier: node.tier,
    payoff: node.payoff,
    body: node.body,
    grounding: node.grounding,
    cruxScore: node.cruxScore,
    rank: node.rank,
    visible: node.visible,
    status: node.status,
    reaction: node.reaction ?? null,
  }));
}

// ── Read narrowing (pure) ────────────────────────────────────────────────────
//
// Text columns come back as `string`; narrow to the domain unions. Infra wrote
// these values, so a miss means a corrupted row — narrow to a safe fallback
// rather than throw (the read must never crash the board), and never silently
// widen the type.

const RUN_STATUSES: ReadonlySet<string> = new Set<string>([
  "s1",
  "s3",
  "assembling",
  "complete",
  "failed",
]);
const KIND_SET: ReadonlySet<string> = new Set<string>(NODE_KINDS);
const INTENT_SET: ReadonlySet<string> = new Set<string>(POSITION_INTENTS);
const NODE_STATUSES: ReadonlySet<string> = new Set<string>([
  "unseen",
  "opened",
  "resolved",
  "dismissed",
  "deferred",
]);

/**
 * A read narrowing hit a value outside its union — a corrupted column. The read
 * must not crash the board, so we fall back to a safe value, but the event must
 * not go unnoticed either (it mislabels the writer's data). Latched like the
 * inference-attempt drop-log: log the first corruption per process, then
 * suppress the flood. Module-level state is fine — this is per-process
 * observability, not correctness.
 */
let loggedCorruptRead = false;
function logCorruptRead(field: string, raw: string): void {
  if (loggedCorruptRead) return;
  loggedCorruptRead = true;
  console.error(
    `[gaddr:constellation-run] corrupted ${field} value "${raw}" read from the ` +
      "database — narrowing to a safe fallback; suppressing further corruption logs",
  );
}

function toRunStatus(raw: string): RunStatus {
  if (isRunStatus(raw)) return raw;
  logCorruptRead("run.status", raw);
  return "failed";
}
function isRunStatus(raw: string): raw is RunStatus {
  return RUN_STATUSES.has(raw);
}
function toStarKind(raw: string): StarKind {
  if (raw === "off-map" || raw === "star") return raw;
  logCorruptRead("star.kind", raw);
  return "star";
}
function toIntent(raw: string): PositionIntent {
  if (isIntent(raw)) return raw;
  logCorruptRead("star.intent", raw);
  return "wondering";
}
function isIntent(raw: string): raw is PositionIntent {
  return INTENT_SET.has(raw);
}
function toNodeKind(raw: string): NodeKind {
  if (isNodeKind(raw)) return raw;
  logCorruptRead("node.kind", raw);
  return "question";
}
function isNodeKind(raw: string): raw is NodeKind {
  return KIND_SET.has(raw);
}
function toTier(raw: string): ProvenanceTier {
  if (raw === "sourced" || raw === "heuristic" || raw === "inferred") return raw;
  logCorruptRead("node.tier", raw);
  return "inferred";
}
function toNodeStatus(raw: string): NodeStatus {
  if (isNodeStatus(raw)) return raw;
  logCorruptRead("node.status", raw);
  return "unseen";
}
function isNodeStatus(raw: string): raw is NodeStatus {
  return NODE_STATUSES.has(raw);
}
function toConfidence(raw: string | null): "high" | "low" | null {
  if (raw === null || raw === "high" || raw === "low") return raw;
  logCorruptRead("run.confidence", raw);
  return null;
}

/** A star row → the domain `Star` the board renders (id is the persisted id). */
export function toStarView(row: typeof schema.constellationStar.$inferSelect): Star {
  return {
    id: row.id,
    label: row.label,
    intent: toIntent(row.intent),
    weight: row.weight,
    grounding: row.grounding,
    kind: toStarKind(row.kind),
  };
}

/** A star row → the domain `Star` the RUNNER resumes with: identical to
 * `toStarView` except the id is restored to its domain-local ref, so a resumed
 * S3 speaks the same star ids a fresh S1 would (see `starLocalRef`). */
export function toResumeStar(
  runId: string,
  row: typeof schema.constellationStar.$inferSelect,
): Star {
  return {
    id: starLocalRef(runId, row.id),
    label: row.label,
    intent: toIntent(row.intent),
    weight: row.weight,
    grounding: row.grounding,
    kind: toStarKind(row.kind),
  };
}

/** A node row → the `PersistedNode` the board renders. */
export function toNodeView(
  row: typeof schema.constellationNode.$inferSelect,
): PersistedNode {
  return {
    id: row.id,
    kind: toNodeKind(row.kind),
    tier: toTier(row.tier),
    starId: row.starId,
    payoff: row.payoff,
    body: row.body,
    grounding: row.grounding,
    cruxScore: row.cruxScore,
    rank: row.rank,
    visible: row.visible,
    status: toNodeStatus(row.status),
    reaction: row.reaction ?? undefined,
  };
}

function persistenceError(
  message: string,
  cause?: unknown,
): PersistenceError {
  return { kind: "PersistenceError", message, cause };
}

// ── The factory ──────────────────────────────────────────────────────────────

export function createConstellationRunRepo(
  db: ConstellationDb,
): ConstellationRunRepo {
  return {
    async createOrGet(input) {
      try {
        // Insert if absent; RETURNING is empty on conflict (existing run).
        const inserted = await db
          .insert(schema.constellationRun)
          .values(toRunRow(input))
          .onConflictDoNothing({
            target: [
              schema.constellationRun.userId,
              schema.constellationRun.runKey,
            ],
          })
          .returning({
            status: schema.constellationRun.status,
            updatedAt: schema.constellationRun.updatedAt,
          });
        if (inserted[0] !== undefined) {
          return ok({
            runId: input.runId,
            status: toRunStatus(inserted[0].status),
            updatedAtMs: inserted[0].updatedAt.getTime(),
            createdFresh: true,
          });
        }
        // Conflict → read the existing run (same user + run_key).
        const existing = await db
          .select({
            id: schema.constellationRun.id,
            status: schema.constellationRun.status,
            updatedAt: schema.constellationRun.updatedAt,
          })
          .from(schema.constellationRun)
          .where(
            and(
              eq(schema.constellationRun.userId, input.userId),
              eq(schema.constellationRun.runKey, input.runKey),
            ),
          )
          .limit(1);
        const row = existing[0];
        if (row === undefined) {
          return err(
            persistenceError("createOrGet: run vanished after conflict"),
          );
        }
        return ok({
          runId: asRunId(row.id),
          status: toRunStatus(row.status),
          updatedAtMs: row.updatedAt.getTime(),
          createdFresh: false,
        });
      } catch (cause: unknown) {
        return err(persistenceError("Failed to create/get run", cause));
      }
    },

    async transition({ runId, from, to }) {
      try {
        const won = await db
          .update(schema.constellationRun)
          .set({ status: to, updatedAt: sql`now()` })
          .where(
            and(
              eq(schema.constellationRun.id, runId),
              eq(schema.constellationRun.status, from),
            ),
          )
          .returning({ id: schema.constellationRun.id });
        return ok(won.length > 0);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to transition run", cause));
      }
    },

    async claimStaleRun({ runId, expectedStatus, staleBeforeMs }) {
      try {
        // Exclusive time-based claim: bump updated_at IFF the run is at
        // `expectedStatus` AND its updated_at is at/before the staleness cutoff.
        // Under the row lock, the first winner's bump makes every concurrent
        // claimant's `updated_at <= cutoff` predicate false → exactly one wins.
        const won = await db
          .update(schema.constellationRun)
          .set({ updatedAt: sql`now()` })
          .where(
            and(
              eq(schema.constellationRun.id, runId),
              eq(schema.constellationRun.status, expectedStatus),
              sql`${schema.constellationRun.updatedAt} <= to_timestamp(${staleBeforeMs} / 1000.0)`,
            ),
          )
          .returning({ id: schema.constellationRun.id });
        return ok(won.length > 0);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to claim stale run", cause));
      }
    },

    async deleteRun(runId) {
      try {
        await db
          .delete(schema.constellationRun)
          .where(eq(schema.constellationRun.id, runId));
        return ok(undefined);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to delete run", cause));
      }
    },

    async saveDiscovery({ runId, discovery, inputTokens, outputTokens }) {
      try {
        const applied = await db.transaction(async (tx) => {
          const won = await tx
            .update(schema.constellationRun)
            .set({
              status: "s3",
              brief: discovery.brief,
              confidence: discovery.confidence,
              inputTokens: sql`${schema.constellationRun.inputTokens} + ${inputTokens}`,
              outputTokens: sql`${schema.constellationRun.outputTokens} + ${outputTokens}`,
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(schema.constellationRun.id, runId),
                eq(schema.constellationRun.status, "s1"),
              ),
            )
            .returning({ id: schema.constellationRun.id });
          if (won.length === 0) {
            return false; // CAS lost — nothing written
          }
          const starRows = toStarRows(runId, discovery);
          if (starRows.length > 0) {
            await tx
              .insert(schema.constellationStar)
              .values(starRows)
              .onConflictDoNothing({ target: schema.constellationStar.id });
          }
          return true;
        });
        return ok(applied);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to save discovery", cause));
      }
    },

    async saveNodes({ runId, constellation, inputTokens, outputTokens }) {
      try {
        const applied = await db.transaction(async (tx) => {
          const won = await tx
            .update(schema.constellationRun)
            .set({
              status: "complete",
              cruxStarId:
                constellation.cruxStarId === null
                  ? null
                  : starRowId(runId, constellation.cruxStarId),
              completedAt: sql`now()`,
              inputTokens: sql`${schema.constellationRun.inputTokens} + ${inputTokens}`,
              outputTokens: sql`${schema.constellationRun.outputTokens} + ${outputTokens}`,
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(schema.constellationRun.id, runId),
                eq(schema.constellationRun.status, "s3"),
              ),
            )
            .returning({ id: schema.constellationRun.id });
          if (won.length === 0) {
            return false;
          }
          const nodeRows = toNodeRows(runId, constellation.nodes);
          if (nodeRows.length > 0) {
            // Create-once: preserve any writer status/reaction on retry.
            await tx
              .insert(schema.constellationNode)
              .values(nodeRows)
              .onConflictDoNothing({ target: schema.constellationNode.id });
          }
          return true;
        });
        return ok(applied);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to save nodes", cause));
      }
    },

    async markFailed({ runId, failedStage, errorReason }) {
      try {
        // Only a NON-TERMINAL run may be failed — a completed run's artifacts
        // are correct and final, and flipping it to `failed` would strand a good
        // constellation with no recovery path (a resumed saveNodes CAS requires
        // `s3`, which a `failed` run never regains). Matching 0 rows (already
        // terminal) is a safe no-op.
        await db
          .update(schema.constellationRun)
          .set({
            status: "failed",
            failedStage,
            errorReason,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(schema.constellationRun.id, runId),
              notInArray(schema.constellationRun.status, ["complete", "failed"]),
            ),
          );
        return ok(undefined);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to mark run failed", cause));
      }
    },

    async getResumeState(runId) {
      try {
        const runs = await db
          .select({
            status: schema.constellationRun.status,
            brief: schema.constellationRun.brief,
            confidence: schema.constellationRun.confidence,
          })
          .from(schema.constellationRun)
          .where(eq(schema.constellationRun.id, runId))
          .limit(1);
        const run = runs[0];
        if (run === undefined) {
          return ok(null);
        }
        const stars = await db
          .select()
          .from(schema.constellationStar)
          .where(eq(schema.constellationStar.runId, runId))
          .orderBy(schema.constellationStar.rank);
        const state: ResumeState = {
          status: toRunStatus(run.status),
          brief: run.brief,
          confidence: toConfidence(run.confidence),
          stars: stars.map((row) => toResumeStar(runId, row)),
        };
        return ok(state);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to read resume state", cause));
      }
    },

    async readBySprint(userId, sprintId) {
      try {
        // The NEWEST run for the sprint, outright. When an edited draft spawns a
        // new run (a new run_key, same sprint), that newer run IS the current
        // constellation — its loading, its failure, and its staleness must all
        // surface. An older `complete` run must NOT mask a newer in-flight or
        // failed one (that would hide failures forever and freeze the client's
        // staleness re-POST), so recency wins unconditionally. (Supersedes the
        // "prefer complete" phrasing in plan §6 — see the review log.)
        const runs = await db
          .select()
          .from(schema.constellationRun)
          .where(
            and(
              eq(schema.constellationRun.userId, userId),
              eq(schema.constellationRun.sprintId, sprintId),
            ),
          )
          // Newest by created_at; `id` is a deterministic secondary key so two
          // runs sharing a created_at instant resolve to a stable "current" one
          // (matches the replayable-determinism ethos elsewhere).
          .orderBy(desc(schema.constellationRun.createdAt), desc(schema.constellationRun.id))
          .limit(1);
        const run = runs[0];
        if (run === undefined) {
          return ok(null);
        }
        const [stars, nodes] = await Promise.all([
          db
            .select()
            .from(schema.constellationStar)
            .where(eq(schema.constellationStar.runId, run.id))
            .orderBy(schema.constellationStar.rank),
          db
            .select()
            .from(schema.constellationNode)
            .where(eq(schema.constellationNode.runId, run.id))
            .orderBy(schema.constellationNode.rank),
        ]);
        const view: RunView = {
          runId: asRunId(run.id),
          status: toRunStatus(run.status),
          failedStage: run.failedStage,
          errorReason: run.errorReason,
          confidence: toConfidence(run.confidence),
          cruxStarId: run.cruxStarId,
          stars: stars.map(toStarView),
          nodes: nodes.map(toNodeView),
          updatedAtMs: run.updatedAt.getTime(),
        };
        return ok(view);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to read run by sprint", cause));
      }
    },

    async updateNode({ userId, runId, nodeId, status, fromStatuses, reaction }) {
      // An empty predecessor set means the target is unreachable (e.g. `unseen`)
      // — no legal transition exists, so match nothing without touching the DB.
      // (`inArray(col, [])` is also a guaranteed-empty predicate, but short-
      // circuiting keeps the intent explicit and skips the round-trip.)
      if (fromStatuses.length === 0) {
        return ok(false);
      }
      try {
        const updated = await db
          .update(schema.constellationNode)
          .set({
            status,
            // Only overwrite the reaction when one is supplied; a bare status
            // change (dismiss / set-aside) leaves any prior reaction intact.
            ...(reaction === undefined ? {} : { reaction }),
            statusChangedAt: sql`now()`,
          })
          .where(
            and(
              eq(schema.constellationNode.id, nodeId),
              eq(schema.constellationNode.runId, runId),
              // Transition legality, enforced atomically: the node must currently
              // be in one of the target's predecessor statuses (D12). An illegal
              // move (re-opening a terminal node) matches nothing → false, with
              // no read-then-write race.
              inArray(schema.constellationNode.status, [...fromStatuses]),
              // Tenancy: the node's run must belong to this user. A forged
              // runId/nodeId for another writer's node matches nothing → false.
              inArray(
                schema.constellationNode.runId,
                db
                  .select({ id: schema.constellationRun.id })
                  .from(schema.constellationRun)
                  .where(
                    and(
                      eq(schema.constellationRun.id, runId),
                      eq(schema.constellationRun.userId, userId),
                    ),
                  ),
              ),
            ),
          )
          .returning({ id: schema.constellationNode.id });
        return ok(updated.length > 0);
      } catch (cause: unknown) {
        return err(persistenceError("Failed to update node", cause));
      }
    },
  };
}

/** The run id column is a uuid we minted; re-brand it on read. A structural
 * re-brand at the infra boundary, not a domain constructor call. */
function asRunId(raw: string): RunId {
  return raw as RunId;
}
