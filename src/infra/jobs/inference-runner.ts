/**
 * Inference runner — the imperative shell that coordinates background work.
 *
 * It owns everything that is inherently stateful and temporal (a throttle, a
 * queue, in-flight bookkeeping, cancellation) and delegates every *decision* to
 * the pure core:
 *   - whether to escalate a burst        -> domain `shouldEscalate`
 *   - how a triage/finding folds in       -> domain `applyTriage` / `applyFinding`
 *   - whether a finding may be accepted    -> domain `validateFinding`
 *
 * Concurrency model (deliberately small and explicit so it can grow):
 *   - Triage is the throttled unit. At most `maxConcurrent` triage calls run at
 *     once; excess bursts wait in a queue capped at `maxQueued`, dropping the
 *     OLDEST when full (the freshest burst is the most relevant). Today
 *     maxConcurrent = 1 / maxQueued = 1 — the "one in flight, queue one, drop
 *     the rest" rule from the research. Bumping `maxConcurrent` to N is the only
 *     change needed to allow multiple in-flight jobs later.
 *   - Analysis (tier 2) is fire-and-forget and NOT throttled — it writes into
 *     the substrate whenever it returns, per the research's fire-and-forget rule.
 *
 * Cancellation is generation-based: `reset` / `dispose` bump a generation
 * counter, and any in-flight callback whose generation is stale discards its
 * result instead of polluting a new sprint's substrate.
 */

import type { SprintId } from "../../domain/types/branded";
import type { BoundaryType, TriggerReason } from "../../domain/editor/trigger-detector";
import type {
  AnalysisPort,
  SprintContext,
  TriagePort,
} from "../../domain/constellation/ports";
import type { PBurst, Substrate, TriageResult } from "../../domain/constellation/types";
import { shouldEscalate } from "../../domain/constellation/routing";
import {
  applyFinding,
  applyTriage,
  emptySubstrate,
} from "../../domain/constellation/substrate";
import { validateFinding } from "../../domain/constellation/no-ghostwriting";
import { inferenceLog } from "../debug-log";

function substrateSummary(s: Substrate): string {
  return (
    `themes:${String(s.themes.length)} ` +
    `positions:${String(s.positions.length)} ` +
    `tensions:${String(s.tensions.length)} ` +
    `findings:${String(s.findings.length)}`
  );
}

/** What the trigger observer hands the runner. */
export type BurstInput = {
  /** New content since the last delivered trigger. */
  readonly text: string;
  /** The freewrite so far — context a real adapter caches as a prompt prefix. */
  readonly fullText: string;
  readonly reason: TriggerReason;
  readonly boundary?: BoundaryType;
};

export type InferenceRunnerConfig = {
  /** Max concurrent triage calls. 1 today; bump to allow multiple in flight. */
  readonly maxConcurrent: number;
  /** Max bursts waiting behind the in-flight set. Oldest dropped when full. */
  readonly maxQueued: number;
};

export const DEFAULT_RUNNER_CONFIG: InferenceRunnerConfig = {
  maxConcurrent: 1,
  maxQueued: 1,
};

export type InferencePorts = {
  readonly triage: TriagePort;
  readonly analysis: AnalysisPort;
};

export type SubstrateListener = (substrate: Substrate) => void;

export type InferenceRunner = {
  /** Submit a burst for triage (subject to the throttle). */
  submit(input: BurstInput): void;
  /** Subscribe to substrate changes. Returns an unsubscribe fn. */
  subscribe(listener: SubstrateListener): () => void;
  /** Current substrate snapshot. */
  snapshot(): Substrate;
  /** Abandon in-flight work and start a fresh substrate for a new sprint. */
  reset(sprintId: SprintId): void;
  /** Permanently stop; abandons in-flight work and clears listeners. */
  dispose(): void;
};

/**
 * In-memory-only substrate id for the window between a runner's construction and
 * its first `reset(sprintId)`. It is deliberately NOT a UUID and would fail the
 * `sprintId()` brand validator — that is the point: this value must never leave
 * the runner. It is never persisted to Postgres and never joined against; the
 * durable sprint id used for spark logging and the constellation handoff is the
 * client-generated UUID threaded in from the session, not `substrate.sprintId`.
 * On the normal path `useBackgroundInference` resets the runner with the real
 * id before the trigger detector is enabled, so bursts don't carry the
 * placeholder — but that is an emergent property of effect ordering, not an
 * enforced invariant; nothing downstream may assume it.
 */
const PLACEHOLDER_SPRINT_ID = "sprint-pending" as SprintId;

export function createInferenceRunner(
  ports: InferencePorts,
  config: InferenceRunnerConfig = DEFAULT_RUNNER_CONFIG,
): InferenceRunner {
  let substrate = emptySubstrate(PLACEHOLDER_SPRINT_ID);
  let seq = 0;
  let activeTriage = 0;
  let generation = 0;
  let disposed = false;
  const queue: BurstInput[] = [];
  const listeners = new Set<SubstrateListener>();

  function emit(): void {
    for (const listener of listeners) {
      listener(substrate);
    }
  }

  function runAnalysis(
    burst: PBurst,
    triage: TriageResult,
    ctx: SprintContext,
    gen: number,
  ): void {
    void ports.analysis
      .analyze(burst, triage, ctx)
      .then((result) => {
        if (gen !== generation) return;
        if (!result.ok) return;
        const validated = validateFinding(result.value);
        if (!validated.ok) {
          inferenceLog(
            "runner",
            `finding for burst#${String(burst.seq)} rejected: ${validated.error.message}`,
          );
          return;
        }
        substrate = applyFinding(substrate, validated.value);
        emit();
        inferenceLog(
          "runner",
          `finding stored for burst#${String(burst.seq)} · ${substrateSummary(substrate)}`,
        );
      })
      .catch(() => {
        // Adapters return Result; a throw is unexpected. Drop it silently —
        // background work must never surface an error to the writer.
      });
  }

  function runTriage(input: BurstInput): void {
    activeTriage += 1;
    const gen = generation;
    const burst: PBurst = {
      sprintId: substrate.sprintId,
      seq: seq++,
      text: input.text,
      reason: input.reason,
      boundary: input.boundary,
    };
    const ctx: SprintContext = { fullText: input.fullText };

    void ports.triage
      .triage(burst, ctx)
      .then((result) => {
        // Stale resolution (a reset/dispose happened mid-flight): reset()
        // already zeroed activeTriage and the queue, so this callback must
        // touch neither — decrementing here would drive the counter negative
        // and corrupt the next sprint's throttle.
        if (gen !== generation) return;
        activeTriage -= 1;
        if (result.ok) {
          substrate = applyTriage(substrate, burst, result.value);
          emit();
          const escalate = shouldEscalate(result.value);
          inferenceLog(
            "runner",
            `burst#${String(burst.seq)} ${escalate ? "escalate → analysis" : "hold (triage only)"}` +
              ` · ${substrateSummary(substrate)}`,
          );
          if (escalate) {
            runAnalysis(burst, result.value, ctx, gen);
          }
        }
        drainQueue();
      })
      .catch(() => {
        if (gen !== generation) return;
        activeTriage -= 1;
        drainQueue();
      });
  }

  function drainQueue(): void {
    while (!disposed && activeTriage < config.maxConcurrent && queue.length > 0) {
      const next = queue.shift();
      if (next) runTriage(next);
    }
  }

  return {
    submit(input: BurstInput): void {
      if (disposed) return;
      if (activeTriage < config.maxConcurrent) {
        runTriage(input);
        return;
      }
      queue.push(input);
      // Backpressure: keep only the freshest `maxQueued`, drop the oldest.
      while (queue.length > config.maxQueued) {
        queue.shift();
        inferenceLog("runner", "throttle busy → dropped oldest queued burst");
      }
    },

    subscribe(listener: SubstrateListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    snapshot(): Substrate {
      return substrate;
    },

    reset(sprintId: SprintId): void {
      generation += 1;
      activeTriage = 0;
      seq = 0;
      queue.length = 0;
      substrate = emptySubstrate(sprintId);
      emit();
      inferenceLog("runner", `reset → ${sprintId} (substrate cleared)`);
    },

    dispose(): void {
      generation += 1;
      disposed = true;
      activeTriage = 0;
      queue.length = 0;
      listeners.clear();
    },
  };
}
