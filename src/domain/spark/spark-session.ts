/**
 * The pure spark-card lifecycle, as a small state machine. Modelling it here —
 * rather than as ad-hoc flags in the hook — is what makes the interruption
 * contract testable without a browser (plan §3.4): the invariants that keep
 * Spark from becoming an unbidden co-presence are reducer laws with unit tests.
 *
 * States:
 *  - `resting`   — the affordance is armed; no card. The only exit is `summon`.
 *  - `summoning` — the writer summoned but the cache was stale/empty, so a
 *    fallback request is in flight; a quiet placeholder shows (plan §5.2).
 *  - `showing`   — a card is up. `rerollAvailable` tracks the one permitted
 *    alternative.
 *  - `spent`     — a card has done its job (served, faded, or dismissed) or a
 *    summon fizzled. Rests until the writer writes again.
 *
 * Fizzle is NOT a distinct state (the plan leaves this to us): a failed or
 * empty summon transitions `summoning → spent` directly. This matches the
 * product posture — no error chrome, the affordance simply rests, re-armed by
 * the next edit (plan §5.2) — and keeps the machine to four states.
 *
 * `keystroke` vs `edit`: both are the writer typing, but they carry different
 * meaning to the machine. A `keystroke` (any keypress, including navigation)
 * eagerly dismisses a live card — the card fades on the *first* key, so the
 * hook can fire it on keydown. An `edit` (the writer producing new content) is
 * the RE-ARM signal: only an `edit` brings `spent` back to `resting`, so a bare
 * arrow-key press does not resurrect the affordance. In every state where a
 * card is live they coincide (both end it); they diverge only in `spent`
 * (edit re-arms, keystroke does not) and `resting` (both are no-ops).
 *
 * Sprint-phase gating lives OUTSIDE this reducer (plan §3.4). The machine has
 * no concept of running/paused/ended; the hook only dispatches events while the
 * sprint is running, and dispatches `sprintEnd` when it stops. Keeping phase
 * out keeps the machine total and pure.
 */

import type { SparkCandidate } from "./types";

type RestingState = { readonly status: "resting" };
type SummoningState = { readonly status: "summoning" };
type ShowingState = {
  readonly status: "showing";
  readonly candidate: SparkCandidate;
  /** Whether the one permitted re-roll is still available. */
  readonly rerollAvailable: boolean;
};
type SpentState = { readonly status: "spent" };

export type SparkSessionState =
  | RestingState
  | SummoningState
  | ShowingState
  | SpentState;

/**
 * Inputs to the machine. Candidate-bearing events carry the candidate the hook
 * selected from the pure `selectSpark` — all selection *decisions* stay in
 * `select-spark.ts`; the reducer only sequences the lifecycle (plan §5.1):
 *  - `summon`         — writer invoked Spark. A fresh-cache summon carries the
 *    selected candidate (→ `showing`); a stale/empty-cache summon carries
 *    `null` (→ `summoning`, awaiting the fallback request).
 *  - `candidatesReady`— the fallback request resolved. A candidate → `showing`;
 *    `null` (nothing servable) → fizzle.
 *  - `reroll`         — writer asked for the alternative. Carries the next
 *    candidate, or `null` if none is left.
 *  - `keystroke`      — a keypress; dismisses a live card.
 *  - `escape`         — writer pressed Escape.
 *  - `sprintEnd`      — the sprint stopped.
 *  - `edit`           — writer produced new content (the re-arm signal).
 *  - `failed`         — the fallback request errored or timed out.
 */
export type SparkSessionEvent =
  | { readonly type: "summon"; readonly candidate: SparkCandidate | null }
  | { readonly type: "candidatesReady"; readonly candidate: SparkCandidate | null }
  | { readonly type: "reroll"; readonly candidate: SparkCandidate | null }
  | { readonly type: "keystroke" }
  | { readonly type: "escape" }
  | { readonly type: "sprintEnd" }
  | { readonly type: "edit" }
  | { readonly type: "failed" };

const RESTING: RestingState = { status: "resting" };
const SUMMONING: SummoningState = { status: "summoning" };
const SPENT: SpentState = { status: "spent" };

/** The starting state: armed, no card. */
export function initialSparkSession(): SparkSessionState {
  return RESTING;
}

function showing(candidate: SparkCandidate): ShowingState {
  return { status: "showing", candidate, rerollAvailable: true };
}

// ── Per-state reducers ──────────────────────────────────────────────────────
//
// One reducer per state keeps each law localised and each switch exhaustive.

/** Law: nothing transitions out of `resting` except `summon`. */
function fromResting(event: SparkSessionEvent): SparkSessionState {
  switch (event.type) {
    case "summon":
      // Fresh cache carries a candidate → show it; otherwise await the fallback.
      return event.candidate ? showing(event.candidate) : SUMMONING;
    case "candidatesReady":
    case "reroll":
    case "keystroke":
    case "escape":
    case "sprintEnd":
    case "edit":
    case "failed":
      return RESTING;
  }
}

/**
 * `summoning` resolves via `candidatesReady`/`failed`; any writer action while
 * waiting (keystroke, escape, sprint end, or a new edit) consumes the pending
 * summon and drops to `spent`, so a late `candidatesReady` — which is ignored
 * everywhere but `summoning` — can never resurrect a card the writer has moved
 * past (plan §3.4).
 */
function fromSummoning(event: SparkSessionEvent): SparkSessionState {
  switch (event.type) {
    case "candidatesReady":
      return event.candidate ? showing(event.candidate) : SPENT; // fizzle if empty
    case "failed":
      return SPENT; // fizzle
    case "keystroke":
    case "escape":
    case "sprintEnd":
    case "edit":
      return SPENT; // writer moved on; abandon the pending summon
    case "summon":
    case "reroll":
      return SUMMONING; // already summoning; nothing to re-roll yet
  }
}

/**
 * A card is up. Laws: `reroll` is accepted at most once; any keystroke, escape,
 * sprint end, or edit ends the card (→ `spent`); a late `candidatesReady` (or
 * `summon`/`failed`) is ignored so nothing swaps the card out from under the
 * writer (plan §3.4).
 */
function fromShowing(
  state: ShowingState,
  event: SparkSessionEvent,
): SparkSessionState {
  switch (event.type) {
    case "reroll":
      if (!state.rerollAvailable) {
        return state; // the one re-roll is spent
      }
      return event.candidate
        ? { status: "showing", candidate: event.candidate, rerollAvailable: false }
        : SPENT; // no alternative left to rotate to
    case "keystroke":
    case "escape":
    case "sprintEnd":
    case "edit":
      return SPENT;
    case "summon":
    case "candidatesReady":
    case "failed":
      return state;
  }
}

/** Law: `spent` re-arms only on `edit` — the affordance rests until the writer writes again. */
function fromSpent(event: SparkSessionEvent): SparkSessionState {
  switch (event.type) {
    case "edit":
      return RESTING;
    case "summon":
    case "candidatesReady":
    case "reroll":
    case "keystroke":
    case "escape":
    case "sprintEnd":
    case "failed":
      return SPENT;
  }
}

/**
 * The spark-session reducer: current state + event → next state. Total and
 * pure. Reference equality of the returned state is meaningful — an ignored
 * event returns the same object, so consumers can skip re-renders on no-ops.
 */
export function sparkSession(
  state: SparkSessionState,
  event: SparkSessionEvent,
): SparkSessionState {
  switch (state.status) {
    case "resting":
      return fromResting(event);
    case "summoning":
      return fromSummoning(event);
    case "showing":
      return fromShowing(state, event);
    case "spent":
      return fromSpent(event);
  }
}
