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
 * homogenization (Doshi & Hauser). `hintLensesForSprint` extends the seed to
 * the GENERATION side (conditioning the model's proposal set, which selection
 * alone cannot reach), and `CHALLENGE_CADENCE` adds a deliberate register
 * beat — but *measured* cross-session lens weighting fed by `spark_event`
 * distributions remains the documented follow-up. Do not read more into this
 * module than seeded spread.
 */

import type { SprintId } from "../types/branded";
import { SPARK_LENSES } from "./types";
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
/** A servable set carries at most this many candidates (plan §3.1: 2–3,
 * distinct lenses, ranked). The assembly cap lives with the assembly rule. */
export const SPARK_SET_MAX_CANDIDATES = 3;

/**
 * Assemble the servable candidate list from validator survivors (plan §4.3's
 * "assemble SparkCandidateSet" step, kept pure so the adapter stays genuinely
 * thin — architecture.md §7.1). Rules, in rank order (rank = input order = the
 * model's emission order, which is preserved):
 *  - drop candidates whose lens was already served this sprint
 *    (belt-and-suspenders with the prompt exclusion and with `selectSpark`),
 *  - dedupe by lens AND by question, keeping the first (highest-ranked)
 *    occurrence — a repeated lens adds no rotation headroom and a repeated
 *    question adds no variety,
 *  - cap at `SPARK_SET_MAX_CANDIDATES`.
 * May return an empty list: "every valid candidate is excluded" is a
 * legitimate nothing-to-serve outcome, not an error — the caller decides what
 * an empty assembly means for its flow.
 */
export function assembleSparkSet(
  candidates: readonly SparkCandidate[],
  servedLenses: readonly SparkLens[],
): readonly SparkCandidate[] {
  const served: ReadonlySet<SparkLens> = new Set(servedLenses);
  const seenLenses = new Set<SparkLens>();
  const seenQuestions = new Set<string>();
  const assembled: SparkCandidate[] = [];
  for (const candidate of candidates) {
    if (served.has(candidate.lens)) {
      continue;
    }
    if (
      seenLenses.has(candidate.lens) ||
      seenQuestions.has(candidate.question)
    ) {
      continue;
    }
    seenLenses.add(candidate.lens);
    seenQuestions.add(candidate.question);
    assembled.push(candidate);
    if (assembled.length >= SPARK_SET_MAX_CANDIDATES) {
      break;
    }
  }
  return assembled;
}

/**
 * Every Nth spark of a sprint is a "challenge beat": if an unserved adversarial
 * candidate is available, it is served in preference to the seeded pick. This is
 * register bias done harness-side (deterministic, logged via `spark_event.lens`,
 * instantly reversible) rather than model-side — conditioning beats sampling for
 * controlled variation. A re-roll counts as a serve for cadence purposes: the
 * writer saw that spark, so the beat advances. When no adversarial candidate is
 * available (or it was already served), the beat silently falls through to the
 * seeded pick — the cadence is a preference, never a blocking requirement.
 */
export const CHALLENGE_CADENCE = 3;

/** The lens a challenge beat prefers: the steelmanned case against the draft's
 * direction — the register the writer least seeks out unprompted. */
const CHALLENGE_LENS: SparkLens = "adversarial";

/** Does the spark at this 0-based serve position land on a challenge beat?
 * Shared by `selectSpark` (serve side) and `hintLensesForSprint` (generation
 * side) so the two mechanisms compose: the hint puts adversarial on the menu
 * for exactly the serves where selection will prefer it. */
function isChallengeBeat(serveOrdinal: number): boolean {
  return (serveOrdinal + 1) % CHALLENGE_CADENCE === 0;
}

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
  // Challenge cadence: the spark about to be served sits at 0-based ordinal
  // `servedLenses.length` within the sprint.
  if (isChallengeBeat(servedLenses.length)) {
    const challenge = available.find(
      (candidate) => candidate.lens === CHALLENGE_LENS,
    );
    if (challenge !== undefined) {
      return challenge;
    }
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

/** A generation hint names at most this many lenses. Two is deliberate: one
 * hint would over-steer the proposal set toward a single lens; three would
 * dictate the whole set and erase the model's own gap-reading. */
export const HINT_LENS_COUNT = 2;

/**
 * Seeded anti-homogenization hint for the GENERATION side (the documented
 * follow-up in this module's header: seeded selection can only pick within
 * what the model proposes, so a model that never proposes a lens starves that
 * lens for every writer). The hint names lenses for the prompt to *consider* —
 * the prompt text keeps draft-lack as the overriding criterion, so a hinted
 * lens the draft already works in is still skipped by the model.
 *
 * Deterministic and recomputable by design: the hint is a pure function of
 * (sprintId, servedLenses), so it is never persisted — telemetry can re-derive
 * it — and the same sprint state always hints the same way while different
 * sprints spread across the taxonomy. Serve progress is mixed into the seed so
 * each regeneration within a sprint nudges different territory.
 *
 * Composition with the challenge cadence: when the NEXT serve lands on a
 * challenge beat and adversarial is unserved, adversarial leads the hint — the
 * generation side puts the lens on the menu for exactly the serve where
 * `selectSpark` will prefer it.
 *
 * Returns the whole remaining pool when it has shrunk to the hint size, and an
 * empty list when every lens has been served.
 */
export function hintLensesForSprint(
  sprintId: SprintId,
  servedLenses: readonly SparkLens[],
): readonly SparkLens[] {
  const served: ReadonlySet<SparkLens> = new Set(servedLenses);
  const pool = SPARK_LENSES.filter((lens) => !served.has(lens));
  if (pool.length <= HINT_LENS_COUNT) {
    return pool;
  }
  // Golden-ratio mix of sprint identity and serve progress: stable per state,
  // well-spread across sprints and across successive serves in one sprint.
  const seed =
    (hashSprintId(sprintId) ^
      Math.imul(servedLenses.length + 1, 0x9e3779b1)) >>>
    0;
  const cadenceWantsChallenge =
    isChallengeBeat(servedLenses.length) && !served.has(CHALLENGE_LENS);
  const first = cadenceWantsChallenge
    ? CHALLENGE_LENS
    : pool[seed % pool.length];
  if (first === undefined) {
    return pool.slice(0, HINT_LENS_COUNT);
  }
  const rest = pool.filter((lens) => lens !== first);
  const second = rest[(seed >>> 8) % rest.length];
  return second === undefined ? [first] : [first, second];
}
