"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SprintPhase } from "../../../domain/editor/sprint";
import type { WizardMode } from "./freewrite-wizard";
import {
  SPRINT_STALE_THRESHOLD_MS,
  loadSprintState,
  saveSprintState,
  type PersistedSprintState,
} from "./sprint-persistence";

const WIZARD_ENTER_MS = 900;
const WIZARD_EXIT_MS = 520;
const ONE_MINUTE_MS = 60_000;

export type SprintOption = {
  readonly id: string;
  readonly durationMs: number;
};

export type ResumeOption = {
  readonly remainingMs: number;
  readonly persisted: PersistedSprintState;
};

export type SprintSession = {
  readonly sprintPhase: SprintPhase;
  readonly sprintEndsAtMs: number | null;
  readonly pausedSprintRemainingMs: number | null;
  readonly sprintNowMs: number;
  readonly sprintOption: string;
  readonly hasRestored: boolean;
  readonly wizardMode: WizardMode;
  readonly resumeOption: ResumeOption | null;
  readonly pauseSprint: () => void;
  readonly resumeSprint: () => void;
  readonly addOneMinute: () => void;
  readonly resetToWizard: () => void;
  readonly handleWizardSelect: (optionId: string) => void;
  readonly handleWizardResume: () => void;
};

type UseSprintSessionOptions = {
  readonly options: readonly SprintOption[];
  readonly defaultOptionId: string;
  /** Called once during restoration if the saved sprint was already completed. */
  readonly onRestoredCompleted?: () => void;
  /** Called whenever the sprint state is reset (new sprint started, or stop/reset to wizard). */
  readonly onSprintReset?: () => void;
};

/**
 * Owns the full freewrite sprint lifecycle: state, timer tick, persistence
 * (load + save + pause-on-leave), wizard control, and resume-after-stale flow.
 *
 * Side-effects on board/editor state happen via the `onRestoredCompleted` and
 * `onSprintReset` callbacks so this hook stays independent of the board layer.
 */
export function useSprintSession({
  options,
  defaultOptionId,
  onRestoredCompleted,
  onSprintReset,
}: UseSprintSessionOptions): SprintSession {
  const [sprintPhase, setSprintPhase] = useState<SprintPhase>("idle");
  const [sprintEndsAtMs, setSprintEndsAtMs] = useState<number | null>(null);
  const [pausedSprintRemainingMs, setPausedSprintRemainingMs] = useState<number | null>(null);
  const [sprintNowMs, setSprintNowMs] = useState(() => Date.now());
  const [sprintOption, setSprintOption] = useState(defaultOptionId);
  const [wizardMode, setWizardMode] = useState<WizardMode>("hidden");
  const [hasRestored, setHasRestored] = useState(false);
  const [resumeOption, setResumeOption] = useState<ResumeOption | null>(null);

  const onRestoredCompletedRef = useRef(onRestoredCompleted);
  onRestoredCompletedRef.current = onRestoredCompleted;

  const onSprintResetRef = useRef(onSprintReset);
  onSprintResetRef.current = onSprintReset;

  const startSprint = useCallback(
    (optionId: string) => {
      const option = options.find((entry) => entry.id === optionId);
      if (!option) {
        return;
      }
      const now = Date.now();
      setSprintNowMs(now);
      setSprintOption(option.id);
      setSprintPhase("running");
      setSprintEndsAtMs(now + option.durationMs);
      setPausedSprintRemainingMs(null);
      onSprintResetRef.current?.();
    },
    [options],
  );

  const pauseSprint = useCallback(() => {
    if (sprintPhase !== "running" || sprintEndsAtMs === null) {
      return;
    }
    const now = Date.now();
    const remainingMs = Math.max(sprintEndsAtMs - now, 0);
    setSprintNowMs(now);
    if (remainingMs === 0) {
      setSprintPhase("completed");
      setSprintEndsAtMs(null);
      setPausedSprintRemainingMs(null);
      return;
    }
    setSprintPhase("paused");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(remainingMs);
  }, [sprintEndsAtMs, sprintPhase]);

  const resumeSprint = useCallback(() => {
    if (sprintPhase !== "paused" || pausedSprintRemainingMs === null) {
      return;
    }
    const now = Date.now();
    setSprintNowMs(now);
    setSprintPhase("running");
    setSprintEndsAtMs(now + pausedSprintRemainingMs);
    setPausedSprintRemainingMs(null);
  }, [pausedSprintRemainingMs, sprintPhase]);

  const addOneMinute = useCallback(() => {
    const now = Date.now();
    setSprintNowMs(now);
    if (sprintPhase === "running" && sprintEndsAtMs !== null) {
      setSprintEndsAtMs(sprintEndsAtMs + ONE_MINUTE_MS);
      return;
    }
    if (sprintPhase === "paused" && pausedSprintRemainingMs !== null) {
      setPausedSprintRemainingMs(pausedSprintRemainingMs + ONE_MINUTE_MS);
    }
  }, [pausedSprintRemainingMs, sprintEndsAtMs, sprintPhase]);

  const resetToWizard = useCallback(() => {
    setSprintPhase("idle");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(null);
    setResumeOption(null);
    setWizardMode("transition_in");
    onSprintResetRef.current?.();
  }, []);

  const handleWizardSelect = useCallback(
    (optionId: string) => {
      if (wizardMode !== "visible" && wizardMode !== "transition_in") {
        return;
      }
      if (!options.some((option) => option.id === optionId)) {
        return;
      }
      setWizardMode("transition_out");
      setResumeOption(null);
      startSprint(optionId);
    },
    [options, startSprint, wizardMode],
  );

  const handleWizardResume = useCallback(() => {
    if (!resumeOption) {
      return;
    }
    if (wizardMode !== "visible" && wizardMode !== "transition_in") {
      return;
    }
    const { persisted, remainingMs } = resumeOption;
    const now = Date.now();
    setWizardMode("transition_out");
    setSprintNowMs(now);
    if (options.some((option) => option.id === persisted.optionId)) {
      setSprintOption(persisted.optionId);
    }
    setSprintPhase("running");
    setSprintEndsAtMs(now + remainingMs);
    setPausedSprintRemainingMs(null);
    setResumeOption(null);
    onSprintResetRef.current?.();
  }, [options, resumeOption, wizardMode]);

  // Wizard transition_in → visible
  useEffect(() => {
    if (wizardMode !== "transition_in") return;
    const timer = window.setTimeout(() => {
      setWizardMode("visible");
    }, WIZARD_ENTER_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [wizardMode]);

  // Wizard transition_out → hidden
  useEffect(() => {
    if (wizardMode !== "transition_out") return;
    const timer = window.setTimeout(() => {
      setWizardMode("hidden");
    }, WIZARD_EXIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [wizardMode]);

  // 1-Hz clock tick while running
  useEffect(() => {
    if (sprintPhase !== "running") return;
    const tick = () => {
      setSprintNowMs(Date.now());
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [sprintPhase]);

  // Detect natural completion
  useEffect(() => {
    if (
      sprintPhase !== "running" ||
      sprintEndsAtMs === null ||
      sprintNowMs < sprintEndsAtMs
    ) {
      return;
    }
    setSprintPhase("completed");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(null);
  }, [sprintEndsAtMs, sprintNowMs, sprintPhase]);

  // Restore on mount
  useEffect(() => {
    const persisted = loadSprintState();
    const now = Date.now();

    if (persisted && options.some((option) => option.id === persisted.optionId)) {
      setSprintOption(persisted.optionId);
    }

    if (!persisted || persisted.phase === "idle") {
      setWizardMode("transition_in");
      setHasRestored(true);
      return;
    }

    if (persisted.phase === "completed") {
      setSprintPhase("completed");
      onRestoredCompletedRef.current?.();
      setHasRestored(true);
      return;
    }

    const absenceMs = Math.max(0, now - persisted.lastActiveAtMs);
    const remainingMs =
      persisted.phase === "running" && persisted.endsAtMs !== null
        ? Math.max(0, persisted.endsAtMs - persisted.lastActiveAtMs)
        : persisted.phase === "paused" && persisted.pausedRemainingMs !== null
          ? persisted.pausedRemainingMs
          : 0;

    const isStale = absenceMs > SPRINT_STALE_THRESHOLD_MS;

    if (isStale) {
      if (remainingMs > 0) {
        setResumeOption({ remainingMs, persisted });
      }
      setWizardMode("transition_in");
      setHasRestored(true);
      return;
    }

    if (persisted.phase === "running" && persisted.endsAtMs !== null) {
      const shiftedEndsAt = persisted.endsAtMs + absenceMs;
      if (shiftedEndsAt > now) {
        setSprintPhase("running");
        setSprintEndsAtMs(shiftedEndsAt);
        setSprintNowMs(now);
      } else {
        setSprintPhase("completed");
        onRestoredCompletedRef.current?.();
      }
    } else if (persisted.phase === "paused" && persisted.pausedRemainingMs !== null) {
      setSprintPhase("paused");
      setPausedSprintRemainingMs(persisted.pausedRemainingMs);
      setSprintNowMs(now);
    } else {
      setWizardMode("transition_in");
    }

    setHasRestored(true);
  }, [options]);

  // Persist on every sprint state change
  useEffect(() => {
    if (!hasRestored) return;
    saveSprintState({
      phase: sprintPhase,
      endsAtMs: sprintEndsAtMs,
      pausedRemainingMs: pausedSprintRemainingMs,
      optionId: sprintOption,
      lastActiveAtMs: Date.now(),
    });
  }, [hasRestored, sprintPhase, sprintEndsAtMs, pausedSprintRemainingMs, sprintOption]);

  // Persist on page hide with a fresh lastActiveAtMs so absence doesn't count
  // against the timer.
  useEffect(() => {
    if (!hasRestored) return;
    const persistOnLeave = () => {
      if (sprintPhase === "idle") return;
      saveSprintState({
        phase: sprintPhase,
        endsAtMs: sprintEndsAtMs,
        pausedRemainingMs: pausedSprintRemainingMs,
        optionId: sprintOption,
        lastActiveAtMs: Date.now(),
      });
    };
    window.addEventListener("pagehide", persistOnLeave);
    window.addEventListener("beforeunload", persistOnLeave);
    return () => {
      window.removeEventListener("pagehide", persistOnLeave);
      window.removeEventListener("beforeunload", persistOnLeave);
    };
  }, [hasRestored, sprintPhase, sprintEndsAtMs, pausedSprintRemainingMs, sprintOption]);

  return {
    sprintPhase,
    sprintEndsAtMs,
    pausedSprintRemainingMs,
    sprintNowMs,
    sprintOption,
    hasRestored,
    wizardMode,
    resumeOption,
    pauseSprint,
    resumeSprint,
    addOneMinute,
    resetToWizard,
    handleWizardSelect,
    handleWizardResume,
  };
}
