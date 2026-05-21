/**
 * Pure trigger detector for background intelligence during a freewrite.
 *
 * Reads a stream of (text, time) events and emits triggers when a moment
 * worth analyzing has occurred. No side effects, no I/O. Wiring layer is
 * responsible for capturing editor text and dispatching logs/work.
 *
 * Trigger reasons (each unique):
 *  - "paragraph-ended"   — a new paragraph break (\n\n) was just added (structural)
 *  - "question-posed"    — the writer just typed "? " (structural)
 *  - "idle-pause"        — idle for N ms with enough new content since last trigger
 *  - "word-volume"       — enough new content has accumulated since last trigger
 *
 * Structural triggers fire on transition and ignore token gates.
 * Volume triggers (idle-pause, word-volume) gate on tokens since the last fire.
 */

export type TriggerReason =
  | "paragraph-ended"
  | "question-posed"
  | "idle-pause"
  | "word-volume";

export type TriggerConfig = {
  readonly idlePauseMs: number;
  readonly idleTokenFloor: number;
  readonly wordVolumeThreshold: number;
};

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  idlePauseMs: 4000,
  idleTokenFloor: 40,
  wordVolumeThreshold: 100,
};

export type TriggerDetectorState = {
  readonly lastText: string;
  readonly lastEditAtMs: number;
  readonly lastTriggerTokenCount: number;
};

export type TriggerEvent = {
  readonly text: string;
  readonly nowMs: number;
};

export type TriggerEvaluation = {
  readonly triggers: readonly TriggerReason[];
  readonly nextState: TriggerDetectorState;
};

export function createTriggerDetectorState(
  nowMs: number,
  initialText = "",
): TriggerDetectorState {
  return {
    lastText: initialText,
    lastEditAtMs: nowMs,
    lastTriggerTokenCount: estimateTokens(initialText),
  };
}

/**
 * Rough token estimate. Whitespace-split word count × 1.3 approximates
 * BPE token count for English prose well enough for gating decisions.
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount * 1.3);
}

export function evaluateTrigger(
  state: TriggerDetectorState,
  event: TriggerEvent,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG,
): TriggerEvaluation {
  const { text, nowMs } = event;
  const isEdit = text !== state.lastText;
  const currentTokens = estimateTokens(text);
  const tokensSinceLast = Math.max(currentTokens - state.lastTriggerTokenCount, 0);

  const triggers: TriggerReason[] = [];

  if (isEdit && justEndedAParagraph(state.lastText, text)) {
    triggers.push("paragraph-ended");
  }

  if (isEdit && justPostedAQuestion(state.lastText, text)) {
    triggers.push("question-posed");
  }

  if (
    !isEdit &&
    tokensSinceLast >= config.idleTokenFloor &&
    nowMs - state.lastEditAtMs >= config.idlePauseMs
  ) {
    triggers.push("idle-pause");
  }

  if (tokensSinceLast >= config.wordVolumeThreshold) {
    triggers.push("word-volume");
  }

  const fired = triggers.length > 0;

  const nextState: TriggerDetectorState = {
    lastText: text,
    lastEditAtMs: isEdit ? nowMs : state.lastEditAtMs,
    lastTriggerTokenCount: fired ? currentTokens : state.lastTriggerTokenCount,
  };

  return { triggers, nextState };
}

function countParagraphBreaks(text: string): number {
  const matches = text.match(/\n\n/g);
  return matches?.length ?? 0;
}

function justEndedAParagraph(previousText: string, currentText: string): boolean {
  return countParagraphBreaks(currentText) > countParagraphBreaks(previousText);
}

function justPostedAQuestion(previousText: string, currentText: string): boolean {
  const currentMatches = /\?\s$/.test(currentText);
  if (!currentMatches) {
    return false;
  }

  return !/\?\s$/.test(previousText);
}
