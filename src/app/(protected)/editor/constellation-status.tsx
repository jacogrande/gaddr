"use client";

/**
 * constellation-status.tsx — the board's status line: the TWO-BEAT REVEAL (D12)
 * and the honest failure state.
 *
 * The run takes minutes and lands at the most fragile moment in the product —
 * right after the sprint, when momentum is the point — so it is never a spinner:
 *   beat 0 (`s1`)      the zoom-out itself is the first beat; the line says what
 *                      is happening in the writer's terms ("Reading your draft").
 *   beat 1 (`s3`)      stars ignite; the line reports what was found.
 *   beat 2 (`complete`) cards constellate in; the line reports the count and
 *                      hands the writer their next act.
 *   failure            the same UI missing its second beat, plus an honest line
 *                      and a retry — never a blank board, never a lie.
 *
 * It lives in ONE bottom-centre stack with the existing sprint-complete actions,
 * so nothing collides in a corner (the 2026-03 audit's failure #1) and the
 * writer's eye has a single place to look.
 */

import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import type { RunStatus } from "../../../domain/constellation/run-types";

export interface ConstellationStatusProps {
  /** `null` before a run exists (e.g. an empty draft) — the board shows only the
   * sprint-complete actions. */
  readonly status: RunStatus | null;
  readonly starCount: number;
  readonly cardCount: number;
  readonly resumable: boolean;
  readonly confidence: "high" | "low" | null;
  readonly onRetry: () => void;
}

function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

export function ConstellationStatus({
  status,
  starCount,
  cardCount,
  resumable,
  confidence,
  onRetry,
}: ConstellationStatusProps): React.JSX.Element | null {
  if (status === null) return null;

  // Failure (or a stuck run the client is re-POSTing): say so plainly and offer
  // the one useful action. A partial constellation stays on screen behind this.
  if (status === "failed" || resumable) {
    return (
      <div
        className="gaddr-constellation-status"
        data-testid="constellation-status"
        role="status"
      >
        <p className="gaddr-constellation-status__line gaddr-constellation-status__line--failed">
          {starCount > 0
            ? "This constellation stopped partway. What's here is real."
            : "The constellation didn't come through this time."}
        </p>
        <button
          type="button"
          className="gaddr-constellation-status__retry"
          data-testid="constellation-retry"
          onClick={onRetry}
        >
          <ArrowClockwiseIcon size={13} weight="bold" aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div
        className="gaddr-constellation-status"
        data-testid="constellation-status"
        role="status"
      >
        <p className="gaddr-constellation-status__line" data-status="complete">
          {cardCount === 0
            ? `${plural(starCount, "idea", "ideas")} mapped. Nothing worth pushing on — that happens.`
            : `${plural(starCount, "idea", "ideas")} mapped. Open what pulls you.`}
        </p>
      </div>
    );
  }

  // In flight — beats 0 and 1. `aria-live` announces each beat once, so the wait
  // is legible to assistive tech too, not just visible.
  const working = status === "s1";
  return (
    <div
      className="gaddr-constellation-status"
      data-testid="constellation-status"
      role="status"
    >
      <p
        className="gaddr-constellation-status__line gaddr-constellation-status__line--working"
        data-status={status}
      >
        <span className="gaddr-constellation-status__pulse" aria-hidden />
        {working
          ? "Reading what you wrote…"
          : `${plural(starCount, "idea", "ideas")} mapped${
              confidence === "low" ? " (a broad read — the draft is still thin)" : ""
            }. Thinking about them…`}
      </p>
    </div>
  );
}
