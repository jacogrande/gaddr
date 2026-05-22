"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SprintPhase } from "../../../domain/editor/sprint";

const HIDE_DEBOUNCE_MS = 1000;

export type TimerHoverControls = {
  readonly canShowTimerControls: boolean;
  readonly showTimerControls: boolean;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
};

/**
 * Tracks hover state on the timer chip wrapper. Controls are visible whenever
 * the cursor is inside the wrapper, the sprint is paused, or the 1s hide
 * debounce hasn't expired since the cursor last left.
 */
export function useTimerHoverControls(sprintPhase: SprintPhase): TimerHoverControls {
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
      hideTimeoutRef.current = null;
    }, HIDE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  const canShowTimerControls = sprintPhase === "running" || sprintPhase === "paused";
  const showTimerControls = canShowTimerControls && (isHovered || sprintPhase === "paused");

  return {
    canShowTimerControls,
    showTimerControls,
    onMouseEnter,
    onMouseLeave,
  };
}
