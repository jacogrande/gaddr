import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TRIGGER_CONFIG,
  createTriggerDetectorState,
  estimateTokens,
  evaluateTrigger,
} from "../../../src/domain/editor/trigger-detector";

const CONFIG = DEFAULT_TRIGGER_CONFIG;

function makeFiller(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `word${String(i)}`).join(" ");
}

describe("estimateTokens", () => {
  test("returns 0 for empty or whitespace-only text", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("   \n  ")).toBe(0);
  });

  test("scales with word count", () => {
    expect(estimateTokens("hello world")).toBeGreaterThan(1);
    expect(estimateTokens(makeFiller(100))).toBeGreaterThan(100);
  });
});

describe("paragraph-ended", () => {
  test("fires when a new paragraph break is added", () => {
    const seed = makeFiller(60);
    const start = createTriggerDetectorState(1000, seed);
    const { triggers } = evaluateTrigger(start, { text: `${seed}\n\n`, nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("paragraph-ended");
  });

  test("fires for short content as well (paragraph is structural, not volume-gated)", () => {
    const start = createTriggerDetectorState(1000, "short");
    const { triggers } = evaluateTrigger(start, { text: "short\n\n", nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("paragraph-ended");
  });

  test("does not refire on subsequent evaluations with the same text", () => {
    const seed = makeFiller(60);
    const start = createTriggerDetectorState(1000, seed);
    const first = evaluateTrigger(start, { text: `${seed}\n\n`, nowMs: 1100 }, CONFIG);
    expect(first.triggers).toContain("paragraph-ended");

    const second = evaluateTrigger(first.nextState, { text: `${seed}\n\n`, nowMs: 1200 }, CONFIG);
    expect(second.triggers).not.toContain("paragraph-ended");
  });

  test("fires again on a second paragraph break", () => {
    const seed = makeFiller(60);
    const start = createTriggerDetectorState(1000, seed);
    const first = evaluateTrigger(start, { text: `${seed}\n\n`, nowMs: 1100 }, CONFIG);
    expect(first.triggers).toContain("paragraph-ended");

    const second = evaluateTrigger(
      first.nextState,
      { text: `${seed}\n\n${makeFiller(60)}\n\n`, nowMs: 1200 },
      CONFIG,
    );
    expect(second.triggers).toContain("paragraph-ended");
  });
});

describe("question-posed", () => {
  test("fires when text just gained '? '", () => {
    const start = createTriggerDetectorState(1000, "Is this true?");
    const { triggers } = evaluateTrigger(start, { text: "Is this true? ", nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("question-posed");
  });

  test("fires even without meeting the token floor (questions are high signal)", () => {
    const start = createTriggerDetectorState(1000, "Why?");
    const { triggers } = evaluateTrigger(start, { text: "Why? ", nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("question-posed");
  });

  test("does not refire once '? ' is no longer the tail", () => {
    const start = createTriggerDetectorState(1000, "Is this true? ");
    const { triggers } = evaluateTrigger(
      start,
      { text: "Is this true? Maybe", nowMs: 1100 },
      CONFIG,
    );
    expect(triggers).not.toContain("question-posed");
  });

  test("fires again for a second question", () => {
    const start = createTriggerDetectorState(1000, "First? Then continued.");
    const { triggers } = evaluateTrigger(
      start,
      { text: "First? Then continued. Why? ", nowMs: 1100 },
      CONFIG,
    );
    expect(triggers).toContain("question-posed");
  });
});

describe("idle-pause", () => {
  test("fires after the idle threshold with enough accumulated tokens", () => {
    const filler = makeFiller(45);
    const start = createTriggerDetectorState(1000, "");
    const afterType = evaluateTrigger(start, { text: filler, nowMs: 1100 }, CONFIG);

    const afterIdle = evaluateTrigger(
      afterType.nextState,
      { text: filler, nowMs: 1100 + CONFIG.idlePauseMs + 50 },
      CONFIG,
    );
    expect(afterIdle.triggers).toContain("idle-pause");
  });

  test("does not fire if the most recent event is an edit", () => {
    const filler = makeFiller(45);
    const start = createTriggerDetectorState(1000, "");
    const { triggers } = evaluateTrigger(start, { text: filler, nowMs: 1100 }, CONFIG);
    expect(triggers).not.toContain("idle-pause");
  });

  test("does not fire when token floor is unmet", () => {
    const start = createTriggerDetectorState(1000, "short");
    const { triggers } = evaluateTrigger(
      start,
      { text: "short", nowMs: 1100 + CONFIG.idlePauseMs + 50 },
      CONFIG,
    );
    expect(triggers).not.toContain("idle-pause");
  });

  test("does not refire on repeated ticks while still idle", () => {
    const filler = makeFiller(45);
    const start = createTriggerDetectorState(1000, "");
    const afterType = evaluateTrigger(start, { text: filler, nowMs: 1100 }, CONFIG);
    const firstIdle = evaluateTrigger(
      afterType.nextState,
      { text: filler, nowMs: 1100 + CONFIG.idlePauseMs + 50 },
      CONFIG,
    );
    expect(firstIdle.triggers).toContain("idle-pause");

    const secondIdle = evaluateTrigger(
      firstIdle.nextState,
      { text: filler, nowMs: 1100 + CONFIG.idlePauseMs + 1000 },
      CONFIG,
    );
    expect(secondIdle.triggers).not.toContain("idle-pause");
  });
});

describe("word-volume", () => {
  test("fires when tokens since last trigger cross the threshold", () => {
    const start = createTriggerDetectorState(1000, "");
    const longText = makeFiller(CONFIG.wordVolumeThreshold + 20);
    const { triggers } = evaluateTrigger(start, { text: longText, nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("word-volume");
  });

  test("resets after firing", () => {
    const start = createTriggerDetectorState(1000, "");
    const longText = makeFiller(CONFIG.wordVolumeThreshold + 20);
    const first = evaluateTrigger(start, { text: longText, nowMs: 1100 }, CONFIG);
    expect(first.triggers).toContain("word-volume");

    const slightlyLonger = `${longText} ${makeFiller(10)}`;
    const second = evaluateTrigger(first.nextState, { text: slightlyLonger, nowMs: 1200 }, CONFIG);
    expect(second.triggers).not.toContain("word-volume");
  });
});

describe("evaluateTrigger composition", () => {
  test("emits multiple triggers in one evaluation when overlapping", () => {
    const start = createTriggerDetectorState(1000, "");
    const text = `${makeFiller(CONFIG.wordVolumeThreshold + 20)}\n\n`;
    const { triggers } = evaluateTrigger(start, { text, nowMs: 1100 }, CONFIG);
    expect(triggers).toContain("paragraph-ended");
    expect(triggers).toContain("word-volume");
  });

  test("nextState always reflects the latest text", () => {
    const start = createTriggerDetectorState(1000, "");
    const { nextState } = evaluateTrigger(start, { text: "hello", nowMs: 1100 }, CONFIG);
    expect(nextState.lastText).toBe("hello");
    expect(nextState.lastEditAtMs).toBe(1100);
  });

  test("lastTriggerTokenCount only advances when a trigger fires", () => {
    const start = createTriggerDetectorState(1000, "");
    const noTrigger = evaluateTrigger(start, { text: "short", nowMs: 1100 }, CONFIG);
    expect(noTrigger.triggers).toEqual([]);
    expect(noTrigger.nextState.lastTriggerTokenCount).toBe(start.lastTriggerTokenCount);

    const yesTrigger = evaluateTrigger(
      noTrigger.nextState,
      { text: "Is this short? ", nowMs: 1200 },
      CONFIG,
    );
    expect(yesTrigger.triggers).toContain("question-posed");
    expect(yesTrigger.nextState.lastTriggerTokenCount).toBeGreaterThan(0);
  });

  test("text shrinking does not produce a negative token baseline", () => {
    const start = createTriggerDetectorState(1000, makeFiller(200));
    const { triggers, nextState } = evaluateTrigger(
      start,
      { text: "tiny", nowMs: 1100 },
      CONFIG,
    );
    expect(triggers).not.toContain("word-volume");
    expect(nextState.lastTriggerTokenCount).toBe(start.lastTriggerTokenCount);
  });
});
