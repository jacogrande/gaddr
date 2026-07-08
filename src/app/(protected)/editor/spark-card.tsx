"use client";

import { useEffect, useRef, useState } from "react";
import { SparkleIcon } from "@phosphor-icons/react";
import type { SparkCandidate } from "../../../domain/spark/types";
import type { SparkSessionState } from "../../../domain/spark/spark-session";
import { SPARK_CARD_FADE_MS } from "./spark-glue";

/**
 * The spark card: ONE line, quiet type, rendered adjacent to the affordance at
 * the surface edge — never at the cursor, never overlaying text (plan §5.2).
 *
 * It is a thin presentation of the reducer state (no business rules — arch §8.3):
 *  - `summoning` → a calm STATIC glyph placeholder (no spinner, no "thinking…").
 *  - `showing`   → the question, plus a "different spark" control that is present
 *    exactly while `rerollAvailable` and gone after one use.
 *  - leaving either (first keystroke, escape, sprint end, fizzle) → the node
 *    fades (a pure CSS opacity transition) and then unmounts.
 *
 * The fade is CSS (`.gaddr-spark-card` transition); this component only flips the
 * `opacity` and, after `SPARK_CARD_FADE_MS` (kept equal to that CSS duration),
 * drops the node. That is the whole of the interruption exit: no error chrome, no
 * toast — a fizzle just dissolves the placeholder.
 *
 * Width cap: `calc(100vw - 6.25rem)` = viewport minus the 4.75rem right anchor
 * plus a 1.5rem left margin, so on narrow viewports the card shrinks instead of
 * overflowing the left edge (which would create horizontal scroll).
 */
type Display =
  | { readonly kind: "card"; readonly candidate: SparkCandidate; readonly rerollAvailable: boolean }
  | { readonly kind: "placeholder" };

export function SparkCard({
  state,
  onReroll,
}: {
  readonly state: SparkSessionState;
  readonly onReroll: () => void;
}) {
  const [display, setDisplay] = useState<Display | null>(null);
  const [visible, setVisible] = useState(false);
  const unmountTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (state.status === "showing") {
      setDisplay({
        kind: "card",
        candidate: state.candidate,
        rerollAvailable: state.rerollAvailable,
      });
      setVisible(true);
    } else if (state.status === "summoning") {
      setDisplay({ kind: "placeholder" });
      setVisible(true);
    } else {
      // resting / spent → fade whatever is up, then unmount after the transition.
      setVisible(false);
      unmountTimerRef.current = window.setTimeout(() => {
        unmountTimerRef.current = null;
        setDisplay(null);
      }, SPARK_CARD_FADE_MS);
    }
    return () => {
      if (unmountTimerRef.current !== null) {
        window.clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, [state]);

  if (display === null) {
    return null;
  }

  return (
    <div
      data-testid="spark-card"
      data-visible={visible ? "true" : "false"}
      role="status"
      aria-live="polite"
      className="gaddr-spark-card fixed bottom-[4.5rem] right-[4.75rem] z-[56] max-w-[min(22rem,calc(100vw-6.25rem))] rounded-xl border px-4 py-3"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {display.kind === "placeholder" ? (
        <span
          data-testid="spark-placeholder"
          aria-hidden="true"
          className="gaddr-spark-placeholder flex h-5 w-5 items-center justify-center"
        >
          <SparkleIcon size={15} weight="regular" />
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          <p
            data-testid="spark-card-question"
            className="gaddr-spark-question text-[0.9375rem] leading-6"
          >
            {display.candidate.question}
          </p>
          {display.rerollAvailable ? (
            <button
              type="button"
              data-testid="spark-reroll"
              onClick={onReroll}
              // During the fade-out the node is invisible but still mounted; an
              // invisible click target is sloppy (even though the click would be
              // a reducer no-op), so hit-testing is disabled while not visible.
              className={`gaddr-spark-reroll self-start text-[0.8125rem] font-medium tracking-[0.02em]${
                visible ? "" : " pointer-events-none"
              }`}
            >
              Different spark
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
