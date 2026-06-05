"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sprintId as makeSprintId } from "../../../domain/types/branded";
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
  /** True while a sprint is running. Each false->true edge starts a new sprint. */
  readonly active: boolean;
};

export type UseBackgroundInferenceResult = {
  readonly observe: TriggerObserver;
  readonly substrate: Substrate;
};

export function useBackgroundInference({
  active,
}: UseBackgroundInferenceOptions): UseBackgroundInferenceResult {
  const runnerRef = useRef<InferenceRunner | null>(null);
  const sprintCounterRef = useRef(0);

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

  // Start a fresh substrate on each new running sprint.
  useEffect(() => {
    if (!active) return;
    sprintCounterRef.current += 1;
    const id = makeSprintId(`sprint-${String(sprintCounterRef.current)}`);
    if (id.ok) {
      getRunner().reset(id.value);
    }
  }, [active, getRunner]);

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
