/**
 * Pure selection and staleness logic for the spark cache. No clocks, no
 * `Math.random` — determinism is the whole point (plan §3.3): the same sprint
 * always selects the same way, while different sprints vary, so two writers
 * with similar drafts do not both get the model's favourite lens for the topic.
 *
 * Everything the client hook and the route need to decide "can I serve from
 * cache, and which candidate?" lives here, so neither reinvents word-counting
 * or the staleness rule.
 *
 * Honest scope note (plan §3.3): within-sprint lens rotation plus seeded
 * selection is a *variety* mechanism, not a defence against cross-writer
 * homogenization (Doshi & Hauser). That needs cross-session lens weighting,
 * which is a documented follow-up fed by `spark_event`. Do not read more into
 * this module than variety.
 */

import type { SprintId } from "../types/branded";
import type { SparkCandidate, SparkCandidateSet, SparkLens } from "./types";

/**
 * Below this many words there is nothing to ground a sharp dimension on, and
 * "never ungrounded" wins over "always answers a summon" (plan §3.3). A summon
 * below this is a quiet no-op, logged `failed`/`insufficient-ground`.
 */
export const MINIMUM_GROUND_WORDS = 15;

/**
 * The cache is stale once the draft has GROWN this many words since
 * preparation — the ground the candidates were built on has moved on. A `<`
 * bound: growth of `CACHE_MAX_GROWTH_WORDS - 1` is still servable.
 */
export const CACHE_MAX_GROWTH_WORDS = 60;

/**
 * The cache is stale once the draft has SHRUNK this many words since
 * preparation. Tolerating small shrink is deliberate: any-shrink invalidation
 * would cache-miss on every typo fix (plan §3.3). A large deletion still
 * invalidates, because the ground genuinely changed. A `<` bound: a shrink of
 * `CACHE_MAX_SHRINK_WORDS - 1` is still servable.
 */
export const CACHE_MAX_SHRINK_WORDS = 15;

/**
 * Whitespace-delimited word count. The one place word-counting lives — the
 * client hook, the route, and staleness all call this rather than each rolling
 * their own and drifting apart (plan §3.3). Empty / whitespace-only is 0.
 */
export function countWords(draft: string): number {
  const trimmed = draft.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Is there enough draft to ground a spark? (plan §3.3). Named as a predicate;
 * the plan calls the concept `minimumGround`.
 */
export function hasMinimumGround(wordCount: number): boolean {
  return wordCount >= MINIMUM_GROUND_WORDS;
}

/**
 * Is the prepared set still servable for the current draft length? Servable iff
 * the draft has grown fewer than `CACHE_MAX_GROWTH_WORDS` AND shrunk fewer than
 * `CACHE_MAX_SHRINK_WORDS` words since preparation (plan §3.3). Both bounds are
 * strict, so the constants are the first *stale* values.
 */
export function isCacheServable(
  set: SparkCandidateSet,
  currentWordCount: number,
): boolean {
  const delta = currentWordCount - set.draftWordCount;
  if (delta >= CACHE_MAX_GROWTH_WORDS) {
    return false; // grew too far past the ground it was built on
  }
  if (-delta >= CACHE_MAX_SHRINK_WORDS) {
    return false; // deleted enough that the ground changed
  }
  return true;
}

/**
 * A small, pure, deterministic 32-bit string hash (FNV-1a) over a `SprintId`,
 * used to seed selection. Purity-safe stochasticity: no `Math.random`, stable
 * per sprint, well-spread across sprints. Returned unsigned so callers can take
 * a modulo without worrying about sign.
 */
export function hashSprintId(sprintId: SprintId): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < sprintId.length; i++) {
    hash ^= sprintId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0;
}

/**
 * Choose the spark to serve. Picks among the candidates whose lens has NOT been
 * served in this sprint (rotation / no double-serving), using `seed` to decide
 * which — so the choice varies across sprints rather than always landing on the
 * model's rank-0 favourite (plan §3.3).
 *
 * Design decision (plan is ambiguous here): the seed *actively diversifies*
 * across ALL unserved candidates, rather than respecting rank and using the
 * seed only to break exact ties. This is a deliberate deviation in service of
 * the spec's anti-convergence mandate — a rank-respecting pick would hand
 * every similar draft the model's favourite lens, precisely the outcome the
 * seed exists to avoid — and it is pending product ratification: if the
 * ranking signal proves more valuable than the spread, narrow this to a
 * tie-break. The candidate set is already the model's top few (2–3), so
 * choosing among them by seed keeps quality high while spreading lenses
 * across writers.
 *
 * `servedLenses` is supplied by the server, derived from `spark_event`, so
 * rotation survives a reload (plan §3.3). Re-roll is expressed as a second call
 * with the just-served lens now in `servedLenses`: the served lens is filtered
 * out and a different one is chosen deterministically. Returns `null` when
 * every candidate's lens has already been served (nothing left to rotate to).
 */
export function selectSpark(
  set: SparkCandidateSet,
  servedLenses: readonly SparkLens[],
  seed: number,
): SparkCandidate | null {
  const served: ReadonlySet<SparkLens> = new Set(servedLenses);
  const available = set.candidates.filter(
    (candidate) => !served.has(candidate.lens),
  );
  if (available.length === 0) {
    return null;
  }
  // Normalize the seed defensively. Hash-derived seeds are already
  // non-negative integers, but a negative, fractional, or NaN seed from a
  // future caller must degrade to a valid index — never silently return null
  // while candidates exist.
  const finite = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const len = available.length;
  const index = ((finite % len) + len) % len;
  return available[index] ?? null;
}
