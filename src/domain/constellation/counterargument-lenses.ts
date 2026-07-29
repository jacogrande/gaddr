/**
 * counterargument-lenses.ts — seeded school-of-thought hints for the S3
 * counterargument call (plan D10, the `hintLensesForSprint` pattern keyed on the
 * RUN instead of the sprint).
 *
 * WHY (D10, anti-homogenization): two writers circling the same topic must not
 * receive the SAME objection — that is the Doshi & Hauser homogenization failure
 * at the generation side. So the counterargument call is seeded with 1–2 lenses
 * to enter the opposition through, chosen deterministically from the run id. Same
 * run → same hint (replayable, so telemetry can re-derive it and it is never
 * persisted); different runs spread across the taxonomy.
 *
 * The lenses are GENERIC REASONING ANGLES, never named thinkers or specific
 * schools tied to one field — D7 forbids named-thinker attribution, and a
 * topic-agnostic angle ("the incentives objection") applies to a philosophy
 * freewrite and an economics one alike. They are a MENU, not a mandate: the
 * prompt says "if the draft invites it" and the model may ignore them, so a hint
 * that does not fit costs nothing.
 *
 * Purity: the seed is an FNV-1a hash of the run id (same primitive as
 * `assemble-constellation.ts`) — no `Math.random`, stable per run.
 */

import type { RunId } from "../types/branded";

/**
 * The lens taxonomy: generic adversarial angles a strong opposing case can be
 * built through. Kept deliberately abstract (no field-specific jargon, no named
 * figures) so the same menu serves any freewrite.
 */
export const COUNTERARGUMENT_LENSES: readonly string[] = [
  "the empirical objection — what would the evidence actually have to show, and does it?",
  "the historical-precedent lens — has this been tried before, and how did it go?",
  "the incentives objection — who benefits, and how would they game it?",
  "the second-order-effects lens — what does this set in motion downstream?",
  "the distributional objection — who bears the cost that the framing hides?",
  "the scale objection — does this still hold at ten times, or a tenth, the size?",
  "the trade-off objection — what is quietly being given up to get this?",
  "the base-rate objection — is this the typical case or the flattering exception?",
  "the definitional challenge — does the load-bearing term survive a hard look?",
  "the reversibility lens — what happens when the same logic is turned around?",
];

/** How many lenses to put on the menu for one run. Two is enough to steer
 * without over-constraining; a run with a tiny taxonomy just gets what's left. */
export const HINT_LENS_COUNT = 2;

/** FNV-1a over a string — the seeded-determinism primitive shared with
 * `assemble-constellation.ts`. Unsigned so callers can take a modulo. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Pick the counterargument lens hints for a run — a deterministic, well-spread
 * `HINT_LENS_COUNT`-subset of `COUNTERARGUMENT_LENSES` seeded on the run id. The
 * two picks are distinct; the second is drawn from a different byte of the seed
 * so consecutive ids don't collapse to the same pair.
 */
export function hintLensesForRun(runId: RunId): readonly string[] {
  const pool = COUNTERARGUMENT_LENSES;
  if (pool.length <= HINT_LENS_COUNT) {
    return pool;
  }
  const seed = fnv1a(runId);
  const first = pool[seed % pool.length];
  if (first === undefined) {
    return pool.slice(0, HINT_LENS_COUNT);
  }
  const rest = pool.filter((lens) => lens !== first);
  const second = rest[(seed >>> 8) % rest.length];
  return second === undefined ? [first] : [first, second];
}
