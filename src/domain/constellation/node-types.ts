/**
 * node-types.ts — the six-kind constellation taxonomy (plan §4.1), new domain
 * material sitting BESIDE the existing drip types in `types.ts`, never merged
 * into them (D2: two regimes, two taxonomies, one boundary). The during-sprint
 * `Finding` family stays exactly as it is; the sprint-end run speaks this
 * vocabulary instead.
 *
 * Vocabulary (plan §0): the sprint-end run produces a **constellation** of
 * **stars** (3–6 core ideas plus a mandatory off-map cluster) and **nodes** (the
 * co-thinker kinds). "Finding" continues to mean the during-sprint drip's output
 * only.
 *
 * Purity: pure data shapes. An infra adapter translates the model's wire JSON
 * into `WireConstellationNode` on the way in; nothing here imports a framework
 * or SDK type. `PositionIntent` and `ProvenanceTier` are reused from `types.ts`
 * so there is one definition of each, not a fork.
 */

import type { PositionIntent, ProvenanceTier } from "./types";

/**
 * The full co-thinker node taxonomy. All six kinds exist in the domain from day
 * one so the schema, the board, and the validators are stable across runs, but
 * Run 1 has **no generator** for the sourced tier: `evidence` and `citation`
 * require the fetch → relevance → entailment machinery that is Run 2's whole job
 * (D1). The validator rejects them outright until that machinery exists (§4.3
 * rule 4), so a well-formed `evidence` node is still an invalid Run 1 node.
 */
export type NodeKind =
  | "evidence"
  | "argument"
  | "counterargument"
  | "citation"
  | "direction"
  | "question";

/** The inference-tier kinds Run 1 actually generates (D1). */
export const INFERENCE_TIER_KINDS: readonly NodeKind[] = [
  "argument",
  "counterargument",
  "direction",
  "question",
];

/**
 * The sourced-tier kinds — validator-blocked in Run 1 (no generator, no
 * retrieval). Run 2 unblocks them behind retrieval + entailment; D7's reject
 * rules become S4's demotion rules (§10 extension map).
 */
export const SOURCED_TIER_KINDS: readonly NodeKind[] = ["evidence", "citation"];

/**
 * The only kinds allowed to attach to an off-map star (D10, §4.3 rule 9). The
 * off-map cluster ("what you didn't write about") is the least-defended quadrant
 * — no grounding, no sources — so it does not get to assert positions; a
 * question or a direction delivers the same anti-mirroring value at a fraction
 * of the risk. Off-map arguments and counterarguments return with retrieval.
 */
export const OFF_MAP_NODE_KINDS: readonly NodeKind[] = ["question", "direction"];

/** Whether a star is one of the writer's own core ideas or a deliberate
 * off-map seed ("what you didn't write about", D10). Off-map stars carry no
 * grounding requirement — they attach to the topic, not to a draft span. */
export type StarKind = "star" | "off-map";

/**
 * The node lifecycle (D12). Wired from day one — `unseen → opened →
 * resolved / dismissed / deferred`, one tap, shame-free, no unread counts — so
 * Sprint 3's tour, node chats, and reaction-*gated* resolution ride on this same
 * data model with no migration. Run 1 reaches `resolved` only through the
 * minimal reaction affordance (a submitted one-liner); the richer gated path is
 * Sprint 3.
 */
export type NodeStatus =
  | "unseen"
  | "opened"
  | "resolved"
  | "dismissed"
  | "deferred";

/**
 * A star: one of the writer's load-bearing ideas (`kind: "star"`) or a deliberate
 * off-map seed (`kind: "off-map"`). `weight` is the S1-emitted load-bearing
 * integer 1–5 that drives crux scoring (§4.4). `grounding` is a verbatim draft
 * span for core stars (matched after normalization, the spark contract);
 * off-map stars ground on the topic, so their grounding is a short rationale, not
 * a draft span (validation enforces the distinction). `id` is an opaque local
 * reference the S1 adapter assigns (e.g. "s1"…"sN"); nodes point back at it via
 * `starId`, and assembly groups on it — the domain never generates it.
 */
export type Star = {
  readonly id: string;
  readonly label: string;
  readonly intent: PositionIntent;
  readonly weight: number;
  readonly grounding: string;
  readonly kind: StarKind;
};

/**
 * The raw, UNVALIDATED shape of a node as it arrives from the model over the
 * wire. `kind` is an arbitrary string here (the model can emit anything);
 * validation narrows it to `NodeKind` or drops the node. `starId` references the
 * star this node attaches to — the validator resolves it against the run's stars
 * (an unresolved ref is a rejected node). Kept distinct from the validated shape
 * so the type system tracks "has this been validated?", exactly as
 * `WireSparkCandidate` does for sparks.
 *
 * Run 1's wire carries no `tier`/`source` fields: the model is asked for
 * inference-tier content only, so there is no tier claim to lie about — the
 * `kind` IS the tier claim (an `evidence`/`citation` kind is the sourced claim,
 * rejected by §4.3 rule 4). Run 2 adds the source-bearing wire fields.
 */
export type WireConstellationNode = {
  readonly kind: string;
  readonly starId: string;
  readonly payoff: string;
  readonly body: string;
  readonly grounding: string;
};

/**
 * The raw, UNVALIDATED shape of a star as S1 emits it over the wire. `intent`
 * and `kind` are arbitrary strings here; `validateStar` narrows them or drops
 * the star. Kept distinct from `Star` so the type system tracks validation,
 * exactly as `WireConstellationNode` does for nodes.
 */
export type WireStar = {
  readonly id: string;
  readonly label: string;
  readonly intent: string;
  readonly weight: number;
  readonly grounding: string;
  readonly kind: string;
};

/** The raw, UNVALIDATED S1 discovery payload. `validateDiscovery` narrows the
 * stars, enforces the counts, and applies the low-confidence collapse. */
export type WireDiscovery = {
  readonly brief: string;
  readonly stars: readonly WireStar[];
  readonly offMapSeeds: readonly WireStar[];
  readonly confidence: string;
};

/**
 * A node that has passed `validateNode` — `kind` is a known `NodeKind`, `tier`
 * is `"inferred"` (Run 1's only tier), the caps and grammar and provocation
 * rules all hold, and grounding is proven. Not yet scored, ranked, or capped:
 * those are assembly's job, so a `ValidatedNode` deliberately lacks
 * `cruxScore`/`rank`/`visible`/`status`. `assembleConstellation` turns a batch
 * of these into `ConstellationNode`s.
 */
export type ValidatedNode = {
  readonly kind: NodeKind;
  readonly tier: ProvenanceTier;
  readonly starId: string;
  readonly payoff: string;
  readonly body: string;
  readonly grounding: string;
};

/**
 * A fully assembled node — the shape the board renders and persistence stores
 * (plan §4.1). Adds the assembly-computed fields (`cruxScore`, `rank`,
 * `visible`) and the lifecycle (`status`, optional `reaction`) to a
 * `ValidatedNode`.
 *
 * Envelope fields the INFRA layer attaches (not modelled here, matching the
 * spark posture where `SparkCandidate` carries no id): the persistence `id`, the
 * `runId` FK, and `createdAt`/`statusChangedAt` timestamps. The domain never
 * generates ids or reads a clock, so they are attached at the persistence
 * boundary, keeping this type pure.
 */
export type ConstellationNode = ValidatedNode & {
  /** `star.weight × count(validated counterarguments on the star)` (§4.4).
   * Deterministic in Run 1; off-map nodes score 0 (excluded from crux). */
  readonly cruxScore: number;
  /** 0-based position in the assembled order — lower is more prominent. */
  readonly rank: number;
  /** Survives the per-star and global caps (§4.4); the rest sit behind "more". */
  readonly visible: boolean;
  readonly status: NodeStatus;
  /** The writer's one-line reaction, once written (D12). Absent until then. */
  readonly reaction?: string;
};

/**
 * The S1 discovery output (plan §4.2). The substrate refresh sketched in early
 * drafts is CUT from Run 1 (D5): it had no consumer and no storage. `stars` are
 * the writer's core ideas (`kind: "star"`); `offMapSeeds` are the anti-mirroring
 * cluster (`kind: "off-map"`). `confidence` drives graceful degradation — low
 * confidence means S1 emitted fewer, broader, hedged stars (Journey C); the
 * hedged phrasing lives in the prompt and rubric (a validator cannot check
 * "hedged"), the star COUNT is what validation enforces.
 */
export type Discovery = {
  readonly brief: string;
  readonly stars: readonly Star[];
  readonly offMapSeeds: readonly Star[];
  readonly confidence: "high" | "low";
};

// ── Constants (plan §4.1) ────────────────────────────────────────────────────

/** The one-line scent payoff on a card face — a headline, not a paragraph. */
export const NODE_PAYOFF_MAX_CHARS = 140;

/** A node body. A steelman needs a real paragraph, so this is far above the
 * drip note's 280-char `NOTE_MAX_CHARS` — but still bounded: past this it has
 * stopped pointing and started drafting (the no-ghostwriting ceiling). */
export const NODE_BODY_MAX_CHARS = 900;

/** A constellation carries 1–6 core stars (§4.1). The floor is 1, not 0: a run
 * that discovered nothing to anchor is a failure, not an empty success. */
export const STAR_MIN = 1;
export const STAR_MAX = 6;

/** A low-confidence discovery collapses to at most this many broad stars
 * (Journey C graceful degradation, §4.2). */
export const STAR_MAX_LOW_CONFIDENCE = 2;

/** The mandatory off-map cluster is 1–3 seeds (D10). The MINIMUM is a prompt
 * contract and a rubric check — a discovery with no off-map seed is thin, not
 * invalid, so assembly tolerates it (§4.4 thin-run honesty) rather than failing
 * the whole run over one missing anti-mirroring seed. The MAXIMUM is enforced by
 * validation (an over-eager S1 does not get to flood the board). */
export const OFF_MAP_MIN = 1;
export const OFF_MAP_MAX = 3;

/** A star's load-bearing weight is an integer 1–5 (S1-emitted, drives crux
 * scoring, §4.4). */
export const STAR_WEIGHT_MIN = 1;
export const STAR_WEIGHT_MAX = 5;

/** Visible-node caps (§4.4). Beyond these, nodes are ranked but hidden behind
 * "more" (`visible: false`), never dropped. */
export const NODES_VISIBLE_PER_STAR = 5;
export const NODES_VISIBLE_TOTAL = 15;

/**
 * The off-map cluster is a guaranteed sidebar, not the main event (D10). It is
 * reserved visible slots FIRST so "what you didn't write about" always shows,
 * but capped here so it can never dominate the board — the writer's own stars
 * keep the majority of the visible budget, and the reservation can never consume
 * the whole of `NODES_VISIBLE_TOTAL` (which would leave the composition
 * guarantee no room and undercut the "co-thinker about YOUR draft" framing).
 */
export const OFF_MAP_VISIBLE_MAX = 4;

/** The writer's reaction one-liner (D12) — the same ceiling as the drip note. */
export const REACTION_MAX_CHARS = 280;

/**
 * Cross-kind dedup fires when two nodes' normalized payoff+body token sets
 * overlap by at least this Jaccard fraction (§4.4). Initial value; tuned through
 * the unit table. The four S3 calls share the same S1 gap notes, so a `question`
 * and a `direction` circling the identical gap is the EXPECTED duplicate shape —
 * within-kind dedup would miss it, so dedup is cross-kind and this is its knob.
 */
export const DEDUP_JACCARD_THRESHOLD = 0.5;

/**
 * A softer Jaccard bound applied only when two nodes share the SAME grounding
 * span (§4.4 "grounding-overlap collapse"). Two nodes making a similar point
 * about the identical draft sentence are more likely the same node than two
 * that merely share vocabulary, so a lower overlap suffices to collapse them.
 */
export const GROUNDING_DEDUP_JACCARD = 0.3;

/**
 * A node is treated as re-asking a served spark (and dropped) when its payoff's
 * normalized token set overlaps a served spark question by at least this
 * fraction (§4.4 "dedup against served sparks"). A DEVELOPED treatment — a
 * direction or argument that builds on the sparked dimension with substantial
 * new prose — has a low payoff overlap and survives; only a bare re-ask of the
 * spark's own question is removed ("a sparked dimension may only appear
 * developed", spark plan §6).
 */
export const SERVED_SPARK_DEDUP_JACCARD = 0.6;

/**
 * The clause-window for a node body's ghost-echo check (§4.3 rule 3). One past
 * spark's 7: node bodies are paragraphs that legitimately discuss the draft's
 * subject, so the echo window is a touch wider to avoid tripping on an
 * incidental shared phrase, while still catching a verbatim run that means the
 * body is mirroring the draft rather than thinking about it.
 */
export const NODE_GHOST_ECHO_NGRAM = 8;

/** A grounding span carries at least this many normalized tokens — the spark
 * floor (a single word grounds nothing). Off-map rationales are exempt from the
 * draft-match but not from being non-empty. */
export const NODE_GROUNDING_MIN_TOKENS = 2;

/**
 * The node kinds, as a value, for membership checks and iteration. Annotated
 * (not `as const`) so each literal is checked against `NodeKind` while staying
 * within the domain's no-type-assertion rule — the `SPARK_LENSES` pattern.
 */
export const NODE_KINDS: readonly NodeKind[] = [
  "evidence",
  "argument",
  "counterargument",
  "citation",
  "direction",
  "question",
];

// ── Reaction & lifecycle (pure rules the PATCH route enforces, D12) ──────────

/**
 * A reaction is the writer's own one-liner. Non-empty and within the ceiling —
 * anything longer has stopped being a reaction and started being an essay. Pure
 * so the route and any client-side check share one rule.
 */
export function isValidReaction(reaction: string): boolean {
  const trimmed = reaction.trim();
  return trimmed.length > 0 && trimmed.length <= REACTION_MAX_CHARS;
}

/**
 * The allowed status transitions in Run 1 (D12). A card is `unseen` until
 * opened; from `opened` the writer can resolve (via a written reaction),
 * dismiss, or set aside (`deferred`). Terminal states do not transition again in
 * Run 1 — reaction-*gated* re-open and resurfacing (Journey E) are Sprint 3.
 * Kept as data so a route validates a requested transition without a switch, and
 * Sprint 3 extends the map rather than rewriting a conditional.
 */
export const NODE_STATUS_TRANSITIONS: Readonly<
  Record<NodeStatus, readonly NodeStatus[]>
> = {
  unseen: ["opened"],
  opened: ["resolved", "dismissed", "deferred"],
  resolved: [],
  dismissed: [],
  deferred: [],
};

/** Is moving from `from` to `to` a permitted Run 1 lifecycle step? */
export function canTransitionStatus(from: NodeStatus, to: NodeStatus): boolean {
  return NODE_STATUS_TRANSITIONS[from].includes(to);
}
