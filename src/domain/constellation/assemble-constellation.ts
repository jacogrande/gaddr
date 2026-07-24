/**
 * assemble-constellation.ts — the pure assembly of validated nodes into the
 * constellation the board renders (plan §4.4, D5). This is a DOMAIN FUNCTION,
 * never a model call: the tool owns dedup, ranking, diversity, and selection —
 * never the model, never user-approval signals (co-thinker principle 5). Given
 * the same inputs it always produces the same constellation — replayable and
 * testable — which is why every stochastic tie-break is a seeded FNV hash of the
 * run, not `Math.random`.
 *
 * The pipeline, in order:
 *  1. **Dedup against served sparks** — a board that re-asks a spark's own
 *     question is a visible "the AI repeats itself" moment; a sparked dimension
 *     may only reappear DEVELOPED (spark plan §6). Bare re-asks are dropped;
 *     developed treatments survive (payoff-overlap test, §4.4).
 *  2. **Cross-kind dedup** — the four S3 calls share the same S1 gap notes, so a
 *     `question` and a `direction` circling the identical gap is the EXPECTED
 *     duplicate; within-kind dedup would miss it. Near-identical = normalized
 *     token Jaccard over payoff+body above the threshold, with a softer bound
 *     when the grounding span is shared. Keeps the highest model rank, preferring
 *     the counterargument when a duplicate ties (the composition guarantee needs
 *     counterarguments).
 *  3. **Crux scoring** — deterministic in Run 1: `star.weight × count(validated
 *     counterarguments on the star)`. No model-emitted strength features until
 *     S5 (Run 2). One core star gets the ⚡ marker; off-map is excluded.
 *  4. **Rank & caps** — order by crux, then weight, then seed; off-map last;
 *     within a star, model emission order. Cap ≤ per-star and ≤ total visible,
 *     the remainder ranked but hidden behind "more" (never dropped).
 *  5. **Composition guarantees** — ≥1 counterargument visible when one exists;
 *     the off-map cluster always present when S1 seeded it (its slots reserved
 *     before the core budget is spent). A thin run stays thin — assembly never
 *     pads; 3 honest nodes beat 15 filler ones, so if only 3 survive, 3 show.
 */

import type { RunId } from "../types/branded";
import type { ConstellationNode, Star, ValidatedNode } from "./node-types";
import {
  DEDUP_JACCARD_THRESHOLD,
  GROUNDING_DEDUP_JACCARD,
  NODES_VISIBLE_PER_STAR,
  NODES_VISIBLE_TOTAL,
  OFF_MAP_VISIBLE_MAX,
  SERVED_SPARK_DEDUP_JACCARD,
} from "./node-types";
import { matchTokens, normalizeForMatch } from "../text/span-matching";

/** Everything the pure assembly needs. `nodes` are the validator survivors from
 * all four S3 calls, in model emission order (that order is the base rank).
 * `servedSparkQuestions` are the sprint's served sparks (already an S1 input),
 * checked so the board never re-asks one. */
export type AssembleInput = {
  readonly runId: RunId;
  readonly stars: readonly Star[];
  readonly nodes: readonly ValidatedNode[];
  readonly servedSparkQuestions: readonly string[];
};

/** The assembled constellation: the ranked, capped, visibility-flagged nodes,
 * the stars they hang on, and the one crux star (⚡) — `null` when no
 * counterargument exists to make any star a crux. */
export type Constellation = {
  readonly stars: readonly Star[];
  readonly nodes: readonly ConstellationNode[];
  readonly cruxStarId: string | null;
};

/** A node carried through assembly with its precomputed match sets and stable
 * emission order. Internal — never leaves this module. */
type WorkNode = {
  readonly node: ValidatedNode;
  readonly emissionIndex: number;
  readonly tokens: ReadonlySet<string>;
  readonly payoffTokens: ReadonlySet<string>;
  readonly groundingKey: string;
};

// ── Small pure helpers ───────────────────────────────────────────────────────

/** FNV-1a over a string — the seeded-determinism primitive (mirrors the spark
 * `hashSprintId` pattern). Purity-safe stochasticity: no `Math.random`, stable
 * per run, well-spread across runs. Unsigned so callers can take a modulo. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenSet(text: string): ReadonlySet<string> {
  return new Set(matchTokens(text));
}

/** Jaccard overlap of two token sets. 0 when either is empty (an empty node
 * cannot duplicate anything — but the validator already rejected empties). */
function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  return intersection / (a.size + b.size - intersection);
}

function toWorkNode(node: ValidatedNode, emissionIndex: number): WorkNode {
  return {
    node,
    emissionIndex,
    tokens: tokenSet(`${node.payoff} ${node.body}`),
    payoffTokens: tokenSet(node.payoff),
    groundingKey: normalizeForMatch(node.grounding),
  };
}

// ── 1. Served-spark dedup ────────────────────────────────────────────────────

function dropServedSparkReasks(
  nodes: readonly WorkNode[],
  servedSparkQuestions: readonly string[],
): readonly WorkNode[] {
  if (servedSparkQuestions.length === 0) {
    return nodes;
  }
  const sparkTokenSets = servedSparkQuestions.map(tokenSet);
  return nodes.filter((work) => {
    const reasks = sparkTokenSets.some(
      (spark) => jaccard(work.payoffTokens, spark) >= SERVED_SPARK_DEDUP_JACCARD,
    );
    return !reasks;
  });
}

// ── 2. Cross-kind dedup ──────────────────────────────────────────────────────

/** Are two nodes near-duplicates? Payoff+body Jaccard over the threshold, OR a
 * shared grounding span with a softer overlap (grounding-overlap collapse). */
function areDuplicates(a: WorkNode, b: WorkNode): boolean {
  const overlap = jaccard(a.tokens, b.tokens);
  if (overlap >= DEDUP_JACCARD_THRESHOLD) {
    return true;
  }
  return (
    a.groundingKey.length > 0 &&
    a.groundingKey === b.groundingKey &&
    overlap >= GROUNDING_DEDUP_JACCARD
  );
}

/** Among a cluster of mutually-colliding nodes, which one survives? Prefer a
 * counterargument (the composition guarantee needs them); otherwise the earliest
 * emission (the higher model rank). A total order, so the pick is deterministic. */
function pickWinner(cluster: readonly WorkNode[]): WorkNode {
  return cluster.reduce((best, node) => {
    const bestIsCounter = best.node.kind === "counterargument";
    const nodeIsCounter = node.node.kind === "counterargument";
    if (nodeIsCounter && !bestIsCounter) return node;
    if (!nodeIsCounter && bestIsCounter) return best;
    return node.emissionIndex < best.emissionIndex ? node : best;
  });
}

/**
 * Collapse near-duplicates. For each incoming node, gather ALL kept nodes it
 * collides with (not just the first — the four S3 calls share gap notes, so a
 * node can bridge two previously-distinct kept nodes), pick a single winner
 * across the incoming plus every colliding kept node, and replace them all with
 * it. This is the fix for the greedy single-link bug: a bare left-to-right sweep
 * that stopped at the first collision could leave two ~50%-overlapping cards on
 * the board — exactly the "the AI repeats itself" moment dedup exists to prevent.
 */
function dedupCrossKind(nodes: readonly WorkNode[]): readonly WorkNode[] {
  let kept: WorkNode[] = [];
  for (const incoming of nodes) {
    const colliding = kept.filter((k) => areDuplicates(k, incoming));
    if (colliding.length === 0) {
      kept.push(incoming);
      continue;
    }
    const winner = pickWinner([incoming, ...colliding]);
    kept = kept.filter((k) => !colliding.includes(k));
    kept.push(winner);
  }
  return kept;
}

// ── 3. Crux scoring ──────────────────────────────────────────────────────────

/** Per-star crux score: `weight × counterargument count`, computed over the
 * DEDUPED survivors. Off-map stars are excluded (score 0). */
function computeCruxScores(
  nodes: readonly WorkNode[],
  starById: ReadonlyMap<string, Star>,
): ReadonlyMap<string, number> {
  const counterCount = new Map<string, number>();
  for (const work of nodes) {
    if (work.node.kind === "counterargument") {
      counterCount.set(
        work.node.starId,
        (counterCount.get(work.node.starId) ?? 0) + 1,
      );
    }
  }
  const scores = new Map<string, number>();
  for (const [starId, star] of starById) {
    if (star.kind === "off-map") {
      scores.set(starId, 0);
      continue;
    }
    scores.set(starId, star.weight * (counterCount.get(starId) ?? 0));
  }
  return scores;
}

/** The single ⚡ crux star: the highest-scoring core star with a positive score.
 * Ties break by star weight, then by seeded FNV so the choice is deterministic
 * yet not always the first-listed star. `null` when no counterargument exists. */
function pickCruxStar(
  stars: readonly Star[],
  cruxScores: ReadonlyMap<string, number>,
  runId: RunId,
): string | null {
  const contenders = stars.filter(
    (star) => star.kind === "star" && (cruxScores.get(star.id) ?? 0) > 0,
  );
  if (contenders.length === 0) {
    return null;
  }
  const ranked = [...contenders].sort((a, b) => {
    const scoreDelta =
      (cruxScores.get(b.id) ?? 0) - (cruxScores.get(a.id) ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
    if (b.weight !== a.weight) return b.weight - a.weight;
    return fnv1a(`${runId}|${a.id}`) - fnv1a(`${runId}|${b.id}`);
  });
  return ranked[0]?.id ?? null;
}

// ── 4. Ordering ──────────────────────────────────────────────────────────────

/** Order stars for display: core stars first by crux score, then weight, then a
 * seeded tie-break; the off-map cluster always last. */
function orderStars(
  stars: readonly Star[],
  cruxScores: ReadonlyMap<string, number>,
  runId: RunId,
): readonly Star[] {
  return [...stars].sort((a, b) => {
    // Off-map always after core.
    if (a.kind !== b.kind) {
      return a.kind === "off-map" ? 1 : -1;
    }
    const scoreDelta =
      (cruxScores.get(b.id) ?? 0) - (cruxScores.get(a.id) ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
    if (b.weight !== a.weight) return b.weight - a.weight;
    return fnv1a(`${runId}|${a.id}`) - fnv1a(`${runId}|${b.id}`);
  });
}

/** Flatten nodes into display order: by ordered star, then model emission order
 * within each star's cluster. Nodes whose star S1 did not emit are dropped
 * defensively (the validator already guarantees resolution, so this is a
 * belt-and-suspenders filter). */
function orderNodes(
  nodes: readonly WorkNode[],
  orderedStars: readonly Star[],
): readonly WorkNode[] {
  const starRank = new Map<string, number>(
    orderedStars.map((star, index) => [star.id, index]),
  );
  return nodes
    .filter((work) => starRank.has(work.node.starId))
    .sort((a, b) => {
      const starDelta =
        (starRank.get(a.node.starId) ?? 0) - (starRank.get(b.node.starId) ?? 0);
      if (starDelta !== 0) return starDelta;
      return a.emissionIndex - b.emissionIndex;
    });
}

// ── 5. Visibility (caps + composition guarantees) ────────────────────────────

/**
 * Decide which ordered nodes are visible. Per-star cap first, then a global
 * budget of `NODES_VISIBLE_TOTAL` — but the off-map cluster's slots are RESERVED
 * before the core budget is spent, so "what you didn't write about" is always
 * present when S1 seeded it (D10). Finally the counterargument composition
 * guarantee: if one exists but none is visible, promote the best one and demote
 * the weakest visible non-counterargument to stay within budget.
 */
function computeVisibility(
  ordered: readonly WorkNode[],
  starById: ReadonlyMap<string, Star>,
): boolean[] {
  const visible = ordered.map(() => false);
  const perStarCount = new Map<string, number>();

  // Per-star cap gate: a node is cap-eligible if its star has not already shown
  // NODES_VISIBLE_PER_STAR nodes ahead of it.
  const capEligible = ordered.map((work) => {
    const seen = perStarCount.get(work.node.starId) ?? 0;
    perStarCount.set(work.node.starId, seen + 1);
    return seen < NODES_VISIBLE_PER_STAR;
  });

  const isOffMap = (index: number): boolean =>
    starById.get(ordered[index]?.node.starId ?? "")?.kind === "off-map";
  const starOf = (index: number): string => ordered[index]?.node.starId ?? "";
  const isCounter = (index: number): boolean =>
    ordered[index]?.node.kind === "counterargument";

  // Reserve off-map slots first (guaranteed cluster) — but only up to
  // OFF_MAP_VISIBLE_MAX, so the sidebar can never consume the whole budget —
  // then fill with core nodes in rank order until the total budget is spent.
  let budget = NODES_VISIBLE_TOTAL;
  let offMapShown = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (budget <= 0) break;
    if (capEligible[i] && isOffMap(i) && offMapShown < OFF_MAP_VISIBLE_MAX) {
      visible[i] = true;
      budget -= 1;
      offMapShown += 1;
    }
  }
  for (let i = 0; i < ordered.length; i++) {
    if (budget <= 0) break;
    if (capEligible[i] && !isOffMap(i) && !visible[i]) {
      visible[i] = true;
      budget -= 1;
    }
  }

  // Composition guarantee: ≥1 counterargument visible when one exists (D10). If
  // the caps hid every counterargument, surface the best one — WITHOUT breaching
  // either cap. (Operating on the local `visible` — no parameter is mutated.)
  const counterIndices = ordered
    .map((work, index) => ({ kind: work.node.kind, index }))
    .filter(({ kind }) => kind === "counterargument")
    .map(({ index }) => index);
  const alreadyVisible = counterIndices.some((index) => visible[index]);
  if (counterIndices.length > 0 && !alreadyVisible) {
    // Prefer a cap-eligible counterargument (its star has room); else the
    // highest-ranked one (a star already full of visible nodes still owes the
    // board its steelman).
    const promote =
      counterIndices.find((index) => capEligible[index]) ?? counterIndices[0];
    if (promote !== undefined) {
      const promoteStar = starOf(promote);
      const visibleOnStar = visible.filter(
        (v, i) => v && starOf(i) === promoteStar,
      ).length;
      // Choose a demotion target that holds BOTH caps. If the promoted
      // counterargument's star is already at its per-star cap, the demotion MUST
      // come from that same star (else the star would render 6). Otherwise demote
      // the globally weakest visible core node, holding the total budget.
      let demote = -1;
      if (visibleOnStar >= NODES_VISIBLE_PER_STAR) {
        for (let i = ordered.length - 1; i >= 0; i--) {
          if (visible[i] && starOf(i) === promoteStar && !isCounter(i)) {
            demote = i;
            break;
          }
        }
      } else {
        for (let i = ordered.length - 1; i >= 0; i--) {
          if (visible[i] && !isOffMap(i) && !isCounter(i)) {
            demote = i;
            break;
          }
        }
      }
      if (demote >= 0) {
        visible[demote] = false;
        visible[promote] = true;
      } else if (budget > 0) {
        // No node to demote, but the budget has slack (off-map is capped, so
        // this holds whenever core is sparse) — surface it into the free slot.
        visible[promote] = true;
      }
      // else: surfacing would breach a cap with nothing to give back — the caps
      // win (an all-but-impossible corner once off-map is bounded).
    }
  }

  return visible;
}

// ── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Assemble validated nodes into the constellation the board renders. Pure and
 * deterministic: same input, same output.
 */
export function assembleConstellation(input: AssembleInput): Constellation {
  const { runId, stars, nodes, servedSparkQuestions } = input;
  const starById = new Map<string, Star>(stars.map((star) => [star.id, star]));

  const work = nodes.map(toWorkNode);
  const afterSparkDedup = dropServedSparkReasks(work, servedSparkQuestions);
  const deduped = dedupCrossKind(afterSparkDedup);

  const cruxScores = computeCruxScores(deduped, starById);
  const cruxStarId = pickCruxStar(stars, cruxScores, runId);

  const orderedStars = orderStars(stars, cruxScores, runId);
  const ordered = orderNodes(deduped, orderedStars);
  const visible = computeVisibility(ordered, starById);

  const assembled: ConstellationNode[] = ordered.map((work, rank) => ({
    ...work.node,
    cruxScore: cruxScores.get(work.node.starId) ?? 0,
    rank,
    visible: visible[rank] ?? false,
    status: "unseen",
  }));

  return { stars: orderedStars, nodes: assembled, cruxStarId };
}
