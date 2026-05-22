/**
 * Pure trigger detector for background intelligence during a freewrite.
 *
 * Triggers fire when a moment worth analyzing has occurred. Each emission
 * carries metadata (boundary type, pause duration, effective threshold) so
 * downstream consumers can route different signals to different tools.
 *
 * Trigger reasons:
 *  - "production-pause" — writer paused after a meaningful boundary. The
 *    primary generic trigger. Replaces the old paragraph-ended + idle-pause
 *    pair. Base threshold is 2s; adaptive after the writer's first 10
 *    pauses (40th percentile of observed pauses, bounded to [1s, 5s]).
 *    Mid-word pauses never fire; all other boundary types do.
 *  - "question-posed" — writer just typed "? " (question mark + space).
 *    Structural; fires regardless of pause. Unchanged in semantics.
 *  - "max-quiet-time" — safety net. Fires when at least `maxQuietTimeMs`
 *    has elapsed since the last trigger and content has changed since,
 *    catching writers who produce long unbroken runs without pauses.
 *
 * Design notes:
 *  - Pause detection is position-classified, not just time-thresholded. A
 *    pause at a paragraph break is different signal from a pause mid-word;
 *    the detector encodes the position and the consumer decides how to use it.
 *  - Adaptive threshold tunes to the writer's natural pace. A fast typist's
 *    threshold settles low; a deliberate writer's settles higher.
 *  - The detector is pure and synchronous. Async gating (e.g., LLM-judged
 *    semantic completion) lives in the hook layer that consumes these events.
 */

export type TriggerReason = "production-pause" | "question-posed" | "max-quiet-time";

export type BoundaryType =
  | "paragraph-break"
  | "sentence-boundary"
  | "clause-boundary"
  | "between-words"
  | "mid-word";

export type TriggerEmission = {
  readonly reason: TriggerReason;
  readonly boundary?: BoundaryType;
  readonly pauseDurationMs?: number;
  readonly thresholdMs?: number;
};

export type AdaptiveConfig = {
  readonly minPauseMs: number;
  readonly maxPauseMs: number;
  readonly minSampleSize: number;
  readonly percentile: number;
  readonly minThresholdMs: number;
  readonly maxThresholdMs: number;
  readonly historyCap: number;
};

export type TriggerConfig = {
  readonly basePauseMs: number;
  readonly maxQuietTimeMs: number;
  readonly adaptive: AdaptiveConfig;
};

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  minPauseMs: 500,
  maxPauseMs: 30_000,
  minSampleSize: 10,
  percentile: 0.4,
  minThresholdMs: 1000,
  maxThresholdMs: 5000,
  historyCap: 30,
};

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  basePauseMs: 2000,
  maxQuietTimeMs: 60_000,
  adaptive: DEFAULT_ADAPTIVE_CONFIG,
};

export type TriggerDetectorState = {
  readonly lastText: string;
  readonly lastEditAtMs: number;
  readonly lastTriggerAtMs: number;
  readonly pauseHistoryMs: readonly number[];
};

export type TriggerEvent = {
  readonly text: string;
  readonly nowMs: number;
};

export type TriggerEvaluation = {
  readonly triggers: readonly TriggerEmission[];
  readonly nextState: TriggerDetectorState;
};

export function createTriggerDetectorState(
  nowMs: number,
  initialText = "",
): TriggerDetectorState {
  return {
    lastText: initialText,
    lastEditAtMs: nowMs,
    lastTriggerAtMs: nowMs,
    pauseHistoryMs: [],
  };
}

/**
 * Rough token estimate. Whitespace-split word count × 1.3 approximates
 * BPE token count for English prose. Kept for downstream logging /
 * observability, no longer used by the detector itself.
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount * 1.3);
}

/**
 * Classify the boundary the writer is sitting at, based on the trailing
 * characters of the produced text. Used to weight whether a pause should
 * fire production-pause (and lets downstream tools route on signal strength).
 */
export function classifyBoundary(text: string): BoundaryType {
  if (text.length === 0) {
    return "between-words";
  }

  if (/\n\n\s*$/.test(text)) {
    return "paragraph-break";
  }

  const trimmed = text.replace(/\s+$/, "");
  if (trimmed.length === 0) {
    return "between-words";
  }

  const hasTrailingWhitespace = text.length > trimmed.length;
  const lastChar = trimmed[trimmed.length - 1] ?? "";

  if (hasTrailingWhitespace) {
    if (lastChar === "." || lastChar === "?" || lastChar === "!") {
      return "sentence-boundary";
    }
    if (lastChar === "," || lastChar === ";" || lastChar === ":") {
      return "clause-boundary";
    }
    return "between-words";
  }

  if (/[\p{L}\p{N}]/u.test(lastChar)) {
    return "mid-word";
  }

  return "between-words";
}

/**
 * Compute the writer's calibrated pause threshold from observed pauses.
 * Returns null if we don't have enough samples yet (falls back to base).
 * Bounded to [minThresholdMs, maxThresholdMs] to keep crazy outliers from
 * pushing the threshold somewhere unusable.
 */
export function computeAdaptiveThreshold(
  pauses: readonly number[],
  config: AdaptiveConfig,
): number | null {
  if (pauses.length < config.minSampleSize) {
    return null;
  }
  const sorted = [...pauses].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * config.percentile));
  const raw = sorted[idx];
  if (raw === undefined) {
    return null;
  }
  return Math.min(config.maxThresholdMs, Math.max(config.minThresholdMs, raw));
}

export function effectivePauseThreshold(
  pauses: readonly number[],
  config: TriggerConfig,
): number {
  const adaptive = computeAdaptiveThreshold(pauses, config.adaptive);
  return adaptive ?? config.basePauseMs;
}

function justPostedAQuestion(previousText: string, currentText: string): boolean {
  if (!/\?\s$/.test(currentText)) {
    return false;
  }
  return !/\?\s$/.test(previousText);
}

function appendBounded(buffer: readonly number[], value: number, cap: number): readonly number[] {
  const next = [...buffer, value];
  return next.length > cap ? next.slice(-cap) : next;
}

export function evaluateTrigger(
  state: TriggerDetectorState,
  event: TriggerEvent,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG,
): TriggerEvaluation {
  const { text, nowMs } = event;
  const isEdit = text !== state.lastText;
  const triggers: TriggerEmission[] = [];

  // Phase 2: record the pause that just ended (an edit terminates a pause).
  let pauseHistoryMs = state.pauseHistoryMs;
  if (isEdit) {
    const pauseDur = nowMs - state.lastEditAtMs;
    if (
      pauseDur >= config.adaptive.minPauseMs &&
      pauseDur <= config.adaptive.maxPauseMs
    ) {
      pauseHistoryMs = appendBounded(pauseHistoryMs, pauseDur, config.adaptive.historyCap);
    }
  }

  // Compute the writer's effective pause threshold once per evaluation.
  // Surfaced on every emission so downstream observers can see the pace
  // estimate the detector is currently using, regardless of which trigger fires.
  const thresholdMs = effectivePauseThreshold(pauseHistoryMs, config);

  // Structural trigger: question posed.
  if (isEdit && justPostedAQuestion(state.lastText, text)) {
    triggers.push({ reason: "question-posed", thresholdMs });
  }

  // Production-pause: tick events with enough idle time and a meaningful boundary.
  if (!isEdit) {
    const sinceLastEdit = nowMs - state.lastEditAtMs;
    // Don't refire while the writer is still idle on the same content.
    // At creation lastTriggerAtMs == lastEditAtMs (both set to nowMs), so this
    // also correctly suppresses an initial pause before the writer has typed
    // anything — there's no edit to anchor analysis to.
    const alreadyFiredSinceLastEdit = state.lastTriggerAtMs >= state.lastEditAtMs;
    if (sinceLastEdit >= thresholdMs && !alreadyFiredSinceLastEdit) {
      const boundary = classifyBoundary(state.lastText);
      if (boundary !== "mid-word") {
        triggers.push({
          reason: "production-pause",
          boundary,
          pauseDurationMs: sinceLastEdit,
          thresholdMs,
        });
      }
    }
  }

  // Safety net: max-quiet-time. Suppressed if any other trigger fires in this
  // evaluation — production-pause covers the same idle moment, and a
  // question-posed during a long unbroken run gives the LLM the same triage
  // opportunity (the safety net only matters when nothing else has fired).
  if (triggers.length === 0) {
    const contentChangedSinceLastTrigger = state.lastEditAtMs > state.lastTriggerAtMs;
    const elapsedSinceLastTrigger = nowMs - state.lastTriggerAtMs;
    if (
      contentChangedSinceLastTrigger &&
      elapsedSinceLastTrigger >= config.maxQuietTimeMs
    ) {
      triggers.push({ reason: "max-quiet-time", thresholdMs });
    }
  }

  const fired = triggers.length > 0;

  const nextState: TriggerDetectorState = {
    lastText: text,
    lastEditAtMs: isEdit ? nowMs : state.lastEditAtMs,
    lastTriggerAtMs: fired ? nowMs : state.lastTriggerAtMs,
    pauseHistoryMs,
  };

  return { triggers, nextState };
}
