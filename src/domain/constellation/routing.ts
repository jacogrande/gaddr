/**
 * Pure escalation policy: given a triage result, decide whether the burst is
 * worth a tier-2 (expensive, retrieval-grounded) analysis call.
 *
 * This is business logic about trust-vs-cost, not an I/O concern, so it lives
 * in the core and is unit-tested in isolation. The orchestration shell calls
 * it; it never makes a call itself.
 *
 * Bias is toward false positives: a wasted analysis call costs cents, a missed
 * finding costs the writer's trust (see the routing-accuracy caveat in
 * background-inference-during-freewrite.md).
 */

import type { RetrievalSignal, TriageResult } from "./types";

/**
 * Signals that on their own justify escalation. Emotional markers and
 * topic-shifts are deliberately excluded as sole triggers — they're useful
 * substrate context but don't, alone, warrant retrieval.
 */
const ESCALATING_SIGNALS: ReadonlySet<RetrievalSignal> = new Set([
  "declarative-claim",
  "near-citation",
  "named-entity",
  "hedging-shift",
  "backtrack",
]);

/** The subset of a burst's signals that drove (or would drive) escalation. */
export function escalatingSignals(
  triage: TriageResult,
): readonly RetrievalSignal[] {
  return triage.retrievalSignals.filter((signal) =>
    ESCALATING_SIGNALS.has(signal),
  );
}

/**
 * Escalate when the burst carries at least one retrieval-worthy signal, OR the
 * writer is asserting (committed claims are the highest-value thing to ground
 * or steelman, even without an explicit citation cue).
 */
export function shouldEscalate(triage: TriageResult): boolean {
  if (escalatingSignals(triage).length > 0) {
    return true;
  }
  return triage.intent === "asserting";
}
