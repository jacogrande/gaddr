"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SprintPhase } from "../../../domain/editor/sprint";

export type BoardMode = "hidden" | "transition_in" | "visible" | "transition_out";

const BOARD_TRANSITION_MS = 1400;
const SPRINT_RECENT_ACTIVITY_MS = 3000;
const IDLE_POLL_INTERVAL_MS = 500;

export type BoardEntry = {
  readonly boardMode: BoardMode;
  readonly setBoardMode: (mode: BoardMode) => void;
  readonly showBoardReopen: boolean;
  readonly resetForNewSprint: () => void;
  readonly markBoardShown: () => void;
  readonly exitBoard: () => void;
};

type UseBoardEntryOptions = {
  readonly sprintPhase: SprintPhase;
  readonly editorReady: boolean;
  readonly lastEditAtMsRef: { current: number };
};

/**
 * Owns the board overlay's mode and the transitions between hidden / entering /
 * visible / exiting. Watches for post-sprint idle and triggers entry, plays the
 * exit animation when leaving back to the editor. Focus is the parent's
 * responsibility — call exitBoard then focus the editor in your handler.
 */
export function useBoardEntry({
  sprintPhase,
  editorReady,
  lastEditAtMsRef,
}: UseBoardEntryOptions): BoardEntry {
  const [boardMode, setBoardMode] = useState<BoardMode>("hidden");
  const hasShownForSprintRef = useRef(false);

  // Watch for post-sprint idle to trigger entry.
  useEffect(() => {
    if (sprintPhase !== "completed") return;
    if (boardMode !== "hidden") return;
    if (hasShownForSprintRef.current) return;
    if (!editorReady) return;

    const checkIdle = () => {
      if (Date.now() - lastEditAtMsRef.current >= SPRINT_RECENT_ACTIVITY_MS) {
        hasShownForSprintRef.current = true;
        setBoardMode("transition_in");
      }
    };

    checkIdle();
    const interval = window.setInterval(checkIdle, IDLE_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [boardMode, editorReady, lastEditAtMsRef, sprintPhase]);

  useEffect(() => {
    if (boardMode !== "transition_in") return;
    const timer = window.setTimeout(() => {
      setBoardMode("visible");
    }, BOARD_TRANSITION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [boardMode]);

  useEffect(() => {
    if (boardMode !== "transition_out") return;
    const timer = window.setTimeout(() => {
      setBoardMode("hidden");
    }, BOARD_TRANSITION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [boardMode]);

  const exitBoard = useCallback(() => {
    setBoardMode("transition_out");
  }, []);

  const resetForNewSprint = useCallback(() => {
    hasShownForSprintRef.current = false;
    setBoardMode("hidden");
  }, []);

  const markBoardShown = useCallback(() => {
    hasShownForSprintRef.current = true;
  }, []);

  const showBoardReopen =
    sprintPhase === "completed" &&
    boardMode === "hidden" &&
    hasShownForSprintRef.current;

  return {
    boardMode,
    setBoardMode,
    showBoardReopen,
    resetForNewSprint,
    markBoardShown,
    exitBoard,
  };
}
