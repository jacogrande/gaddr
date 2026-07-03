"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SprintId } from "../../../domain/types/branded";
import type { Substrate } from "../../../domain/constellation/types";
import {
  createInferenceRunner,
  DEFAULT_RUNNER_CONFIG,
  type InferenceRunner,
} from "../../../infra/jobs/inference-runner";
import { createMockTriagePort } from "../../../infra/llm/mock-triage-adapter";
import { createMockAnalysisPort } from "../../../infra/llm/mock-analysis-adapter";
import type { TriggerObserver } from "./use-trigger-detector";

/**
 * React adapter over the inference runner. The hook owns nothing but lifecycle
 * glue: it builds the runner with the (currently mock) ports, mirrors the
 * substrate into React state for rendering, hands back a stable `observe`
 * callback for the trigger detector, and resets the substrate at each new
 * sprint.
 *
 * Ports are injected here at the composition root. Today they're the mock
 * adapters running in-process; wiring the real Anthropic adapter means swapping
 * these two factories for a server-backed remote port — nothing else changes.
 *
 * Concurrency lives in DEFAULT_RUNNER_CONFIG; bump `maxConcurrent` there to
 * allow multiple in-flight jobs.
 */

export type UseBackgroundInferenceOptions = {
  /**
   * The durable id of the current sprint, or null while idle / pre-start. A new
   * non-null id starts a fresh substrate; a repeated id (pause→resume, reload
   * mid-sprint) preserves it. The reset keys on *id change*, never on a running
   * edge — so pausing and resuming the same sprint does not wipe the substrate.
   */
  readonly sprintId: SprintId | null;
};

export type UseBackgroundInferenceResult = {
  readonly observe: TriggerObserver;
  readonly substrate: Substrate;
};

export function useBackgroundInference({
  sprintId,
}: UseBackgroundInferenceOptions): UseBackgroundInferenceResult {
  const runnerRef = useRef<InferenceRunner | null>(null);

  // Lazily create the runner, recreating it if a prior unmount disposed it.
  // Keeping this idempotent makes the hook StrictMode-safe: the simulated
  // unmount disposes and nulls the runner, and the next mount rebuilds it here.
  const getRunner = useCallback((): InferenceRunner => {
    const existing = runnerRef.current;
    if (existing) return existing;
    const created = createInferenceRunner(
      { triage: createMockTriagePort(), analysis: createMockAnalysisPort() },
      DEFAULT_RUNNER_CONFIG,
    );
    runnerRef.current = created;
    return created;
  }, []);

  const [substrate, setSubstrate] = useState<Substrate>(() =>
    getRunner().snapshot(),
  );

  // The subscription effect owns the runner's lifecycle: one runner per mount,
  // disposed on unmount. Recreated by getRunner on the next mount.
  useEffect(() => {
    const runner = getRunner();
    const unsubscribe = runner.subscribe(setSubstrate);
    return () => {
      unsubscribe();
      runner.dispose();
      runnerRef.current = null;
    };
  }, [getRunner]);

  // Reset the runner when — and only when — a new sprint id arrives.
  //
  // The marker records *which runner instance* was last reset *for which id*.
  // Keying on both is what makes this correct under two independent forces:
  //   - Sprint id change (a genuinely new sprint) → id differs → reset. A
  //     repeated id (pause→resume, reload mid-sprint) → id matches → no reset,
  //     so the substrate survives.
  //   - StrictMode's simulated remount disposes the runner and rebuilds a fresh
  //     one on the second pass; the runner instance differs even though the id
  //     did not, so the fresh runner still gets its reset. Without the runner
  //     leg of the comparison, the rebuilt runner would be stranded on its
  //     pre-reset placeholder substrate.
  const lastResetRef = useRef<{
    readonly runner: InferenceRunner;
    readonly sprintId: SprintId;
  } | null>(null);
  useEffect(() => {
    if (sprintId === null) return;
    const runner = getRunner();
    const last = lastResetRef.current;
    if (last && last.runner === runner && last.sprintId === sprintId) return;
    lastResetRef.current = { runner, sprintId };
    runner.reset(sprintId);
  }, [sprintId, getRunner]);

  const observe = useCallback<TriggerObserver>(
    (observation) => {
      getRunner().submit({
        text: observation.burst,
        fullText: observation.text,
        reason: observation.reason,
        boundary: observation.boundary,
      });
    },
    [getRunner],
  );

  return { observe, substrate };
}
