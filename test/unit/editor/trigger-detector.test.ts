import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_TRIGGER_CONFIG,
  classifyBoundary,
  computeAdaptiveThreshold,
  createTriggerDetectorState,
  effectivePauseThreshold,
  estimateTokens,
  evaluateTrigger,
  type TriggerConfig,
  type TriggerEmission,
} from "../../../src/domain/editor/trigger-detector";

const CONFIG = DEFAULT_TRIGGER_CONFIG;

function makeFiller(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `word${String(i)}`).join(" ");
}

function reasons(triggers: readonly TriggerEmission[]): string[] {
  return triggers.map((t) => t.reason);
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

describe("classifyBoundary", () => {
  test("paragraph-break for text ending in \\n\\n", () => {
    expect(classifyBoundary("hello.\n\n")).toBe("paragraph-break");
    expect(classifyBoundary("hello.\n\n  ")).toBe("paragraph-break");
  });

  test("sentence-boundary for text ending in . ? ! followed by whitespace", () => {
    expect(classifyBoundary("Hello world. ")).toBe("sentence-boundary");
    expect(classifyBoundary("Is it? ")).toBe("sentence-boundary");
    expect(classifyBoundary("Yes! ")).toBe("sentence-boundary");
    expect(classifyBoundary("Yes!\n")).toBe("sentence-boundary");
  });

  test("clause-boundary for text ending in , ; : followed by whitespace", () => {
    expect(classifyBoundary("Hello world, ")).toBe("clause-boundary");
    expect(classifyBoundary("X; ")).toBe("clause-boundary");
    expect(classifyBoundary("Note: ")).toBe("clause-boundary");
  });

  test("between-words for whitespace-trailing text without sentence/clause punctuation", () => {
    expect(classifyBoundary("hello world ")).toBe("between-words");
    expect(classifyBoundary("")).toBe("between-words");
    expect(classifyBoundary("   ")).toBe("between-words");
  });

  test("mid-word when last character is alphanumeric with no trailing whitespace", () => {
    expect(classifyBoundary("hello worl")).toBe("mid-word");
    expect(classifyBoundary("123")).toBe("mid-word");
  });

  test("treats trailing punctuation without space as between-words (mid-typing punctuation)", () => {
    expect(classifyBoundary('he said "hi"')).toBe("between-words");
  });
});

describe("computeAdaptiveThreshold", () => {
  test("returns null below the minimum sample size", () => {
    expect(computeAdaptiveThreshold([1000, 2000, 3000], DEFAULT_ADAPTIVE_CONFIG)).toBeNull();
  });

  test("returns the percentile of observed pauses once enough samples exist", () => {
    const pauses = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700];
    const result = computeAdaptiveThreshold(pauses, DEFAULT_ADAPTIVE_CONFIG);
    // 40th percentile index in length 10 = floor(10 * 0.4) = 4 → sorted[4] = 1200
    expect(result).toBe(1200);
  });

  test("clamps to minThresholdMs", () => {
    const pauses = Array.from({ length: 20 }, () => 300);
    const result = computeAdaptiveThreshold(pauses, DEFAULT_ADAPTIVE_CONFIG);
    expect(result).toBe(DEFAULT_ADAPTIVE_CONFIG.minThresholdMs);
  });

  test("clamps to maxThresholdMs", () => {
    const pauses = Array.from({ length: 20 }, () => 20_000);
    const result = computeAdaptiveThreshold(pauses, DEFAULT_ADAPTIVE_CONFIG);
    expect(result).toBe(DEFAULT_ADAPTIVE_CONFIG.maxThresholdMs);
  });
});

describe("effectivePauseThreshold", () => {
  test("falls back to basePauseMs without enough samples", () => {
    expect(effectivePauseThreshold([], CONFIG)).toBe(CONFIG.basePauseMs);
  });

  test("uses adaptive value once samples accumulate", () => {
    const pauses = Array.from({ length: 12 }, (_, i) => 1500 + i * 100);
    expect(effectivePauseThreshold(pauses, CONFIG)).toBeLessThanOrEqual(CONFIG.adaptive.maxThresholdMs);
    expect(effectivePauseThreshold(pauses, CONFIG)).toBeGreaterThanOrEqual(CONFIG.adaptive.minThresholdMs);
  });
});

describe("production-pause", () => {
  test("does not fire on the initial pause before the first edit", () => {
    // At creation lastEditAtMs == lastTriggerAtMs == nowMs; we shouldn't
    // fire just because time passed since the editor mounted with stored text.
    const start = createTriggerDetectorState(1000, "Hello world. ");
    const tick = evaluateTrigger(
      start,
      { text: "Hello world. ", nowMs: 1000 + CONFIG.basePauseMs + 500 },
      CONFIG,
    );
    expect(reasons(tick.triggers)).not.toContain("production-pause");
  });

  test("fires at a sentence boundary after the base threshold", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "Hello world. ", nowMs: 1500 }, CONFIG);
    const afterPause = evaluateTrigger(
      afterEdit.nextState,
      { text: "Hello world. ", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    expect(reasons(afterPause.triggers)).toContain("production-pause");
    const emission = afterPause.triggers.find((t) => t.reason === "production-pause");
    expect(emission?.boundary).toBe("sentence-boundary");
    expect(emission?.pauseDurationMs ?? 0).toBeGreaterThanOrEqual(CONFIG.basePauseMs);
    expect(emission?.thresholdMs).toBe(CONFIG.basePauseMs);
  });

  test("fires at a paragraph break", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "Para one.\n\n", nowMs: 1500 }, CONFIG);
    const tick = evaluateTrigger(
      afterEdit.nextState,
      { text: "Para one.\n\n", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    const emission = tick.triggers.find((t) => t.reason === "production-pause");
    expect(emission?.boundary).toBe("paragraph-break");
  });

  test("fires at a clause boundary", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "Hello, ", nowMs: 1500 }, CONFIG);
    const tick = evaluateTrigger(
      afterEdit.nextState,
      { text: "Hello, ", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    const emission = tick.triggers.find((t) => t.reason === "production-pause");
    expect(emission?.boundary).toBe("clause-boundary");
  });

  test("does not fire mid-word", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "Hello worl", nowMs: 1500 }, CONFIG);
    const tick = evaluateTrigger(
      afterEdit.nextState,
      { text: "Hello worl", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    expect(reasons(tick.triggers)).not.toContain("production-pause");
  });

  test("does not refire while the writer remains idle on the same content", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "Hello. ", nowMs: 1500 }, CONFIG);
    const first = evaluateTrigger(
      afterEdit.nextState,
      { text: "Hello. ", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    expect(reasons(first.triggers)).toContain("production-pause");
    const second = evaluateTrigger(
      first.nextState,
      { text: "Hello. ", nowMs: 1500 + CONFIG.basePauseMs + 500 },
      CONFIG,
    );
    expect(reasons(second.triggers)).not.toContain("production-pause");
  });

  test("fires again after a new edit ends the prior idle period", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit1 = evaluateTrigger(start, { text: "Hello. ", nowMs: 1500 }, CONFIG);
    const firstPause = evaluateTrigger(
      afterEdit1.nextState,
      { text: "Hello. ", nowMs: 1500 + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    expect(reasons(firstPause.triggers)).toContain("production-pause");
    const afterEdit2 = evaluateTrigger(
      firstPause.nextState,
      { text: "Hello. There. ", nowMs: 1500 + CONFIG.basePauseMs + 1000 },
      CONFIG,
    );
    const secondPause = evaluateTrigger(
      afterEdit2.nextState,
      { text: "Hello. There. ", nowMs: 1500 + CONFIG.basePauseMs * 2 + 1100 },
      CONFIG,
    );
    expect(reasons(secondPause.triggers)).toContain("production-pause");
  });

  test("does not fire on a text-shrink edit", () => {
    const start = createTriggerDetectorState(1000, "Long text here.");
    const after = evaluateTrigger(start, { text: "Long", nowMs: 1100 }, CONFIG);
    expect(reasons(after.triggers)).toEqual([]);
  });
});

describe("question-posed", () => {
  test("fires when '? ' is just appended", () => {
    const start = createTriggerDetectorState(1000, "Is this true?");
    const after = evaluateTrigger(start, { text: "Is this true? ", nowMs: 1050 }, CONFIG);
    expect(reasons(after.triggers)).toContain("question-posed");
  });

  test("does not refire once '? ' is no longer the tail", () => {
    const start = createTriggerDetectorState(1000, "Is this true? ");
    const after = evaluateTrigger(start, { text: "Is this true? Maybe", nowMs: 1100 }, CONFIG);
    expect(reasons(after.triggers)).not.toContain("question-posed");
  });

  test("fires again for a second question", () => {
    const start = createTriggerDetectorState(1000, "First? Then continued.");
    const after = evaluateTrigger(
      start,
      { text: "First? Then continued. Why? ", nowMs: 1500 },
      CONFIG,
    );
    expect(reasons(after.triggers)).toContain("question-posed");
  });

  test("fires regardless of pause (structural)", () => {
    const start = createTriggerDetectorState(1000, "Why?");
    const after = evaluateTrigger(start, { text: "Why? ", nowMs: 1050 }, CONFIG);
    expect(reasons(after.triggers)).toContain("question-posed");
  });
});

describe("max-quiet-time", () => {
  test("fires when the safety-net interval elapses with new content", () => {
    const start = createTriggerDetectorState(1000, "");
    const afterEdit = evaluateTrigger(start, { text: "first words", nowMs: 1100 }, CONFIG);
    const tick = evaluateTrigger(
      afterEdit.nextState,
      { text: "first wordsmore continuing", nowMs: 1100 + CONFIG.maxQuietTimeMs + 10 },
      CONFIG,
    );
    // The tick is itself an edit (text differs); max-quiet-time still applies because content
    // changed since the last trigger and the elapsed window passed.
    expect(reasons(tick.triggers)).toContain("max-quiet-time");
  });

  test("does not fire when content has not changed since the last trigger", () => {
    const start = createTriggerDetectorState(1000, "");
    // Sit idle past the quiet-time window; lastEditAtMs equals lastTriggerAtMs at startup,
    // so the "content changed" gate is false.
    const tick = evaluateTrigger(
      start,
      { text: "", nowMs: 1000 + CONFIG.maxQuietTimeMs + 10 },
      CONFIG,
    );
    expect(reasons(tick.triggers)).not.toContain("max-quiet-time");
  });

  test("does not double-fire with production-pause in the same evaluation", () => {
    const start = createTriggerDetectorState(0, "");
    const afterEdit = evaluateTrigger(
      start,
      { text: "Hello. ", nowMs: 100 },
      CONFIG,
    );
    const tick = evaluateTrigger(
      afterEdit.nextState,
      { text: "Hello. ", nowMs: 100 + CONFIG.maxQuietTimeMs + CONFIG.basePauseMs + 10 },
      CONFIG,
    );
    expect(reasons(tick.triggers)).toContain("production-pause");
    expect(reasons(tick.triggers)).not.toContain("max-quiet-time");
  });
});

describe("adaptive threshold integration", () => {
  test("accumulates pause history when edits arrive after pauses", () => {
    let state = createTriggerDetectorState(0, "");
    // Simulate 5 edits each separated by 1500ms pauses.
    let now = 0;
    for (let i = 0; i < 5; i += 1) {
      now += 1500;
      const result = evaluateTrigger(state, { text: `text${String(i)}`, nowMs: now }, CONFIG);
      state = result.nextState;
    }
    expect(state.pauseHistoryMs.length).toBe(5);
  });

  test("ignores pauses outside the adaptive bounds (too short / too long)", () => {
    let state = createTriggerDetectorState(0, "");
    // 100ms pause — under minPauseMs, ignored.
    state = evaluateTrigger(state, { text: "a", nowMs: 100 }, CONFIG).nextState;
    // 60_000ms pause — over maxPauseMs, ignored.
    state = evaluateTrigger(state, { text: "ab", nowMs: 60_100 }, CONFIG).nextState;
    expect(state.pauseHistoryMs.length).toBe(0);
  });

  test("calibrates threshold to the 40th percentile once minSampleSize is reached", () => {
    let state = createTriggerDetectorState(0, "");
    let now = 0;
    // Generate 12 pauses with known distribution, smallest 800ms up to 3000ms.
    const pauses = [800, 1000, 1100, 1200, 1300, 1500, 1700, 1900, 2100, 2400, 2700, 3000];
    for (const pauseDur of pauses) {
      now += pauseDur;
      state = evaluateTrigger(state, { text: `t${String(now)}`, nowMs: now }, CONFIG).nextState;
    }
    expect(state.pauseHistoryMs.length).toBe(pauses.length);
    const adaptive = computeAdaptiveThreshold(state.pauseHistoryMs, CONFIG.adaptive);
    // sorted floor(12 * 0.4) = index 4 → 1300, within bounds.
    expect(adaptive).toBe(1300);
  });

  test("history is capped at adaptive.historyCap", () => {
    const tiny: TriggerConfig = {
      ...CONFIG,
      adaptive: { ...CONFIG.adaptive, historyCap: 5 },
    };
    let state = createTriggerDetectorState(0, "");
    let now = 0;
    for (let i = 0; i < 10; i += 1) {
      now += 1200;
      state = evaluateTrigger(state, { text: `t${String(i)}`, nowMs: now }, tiny).nextState;
    }
    expect(state.pauseHistoryMs.length).toBe(5);
  });
});

describe("evaluateTrigger composition", () => {
  test("nextState always reflects the latest text", () => {
    const start = createTriggerDetectorState(1000, "");
    const { nextState } = evaluateTrigger(start, { text: "hello", nowMs: 1100 }, CONFIG);
    expect(nextState.lastText).toBe("hello");
    expect(nextState.lastEditAtMs).toBe(1100);
  });

  test("lastTriggerAtMs advances only when a trigger fires", () => {
    const start = createTriggerDetectorState(1000, "");
    const noTrigger = evaluateTrigger(start, { text: "short", nowMs: 1100 }, CONFIG);
    expect(reasons(noTrigger.triggers)).toEqual([]);
    expect(noTrigger.nextState.lastTriggerAtMs).toBe(start.lastTriggerAtMs);

    const yesTrigger = evaluateTrigger(
      noTrigger.nextState,
      { text: "Is this short? ", nowMs: 1200 },
      CONFIG,
    );
    expect(reasons(yesTrigger.triggers)).toContain("question-posed");
    expect(yesTrigger.nextState.lastTriggerAtMs).toBe(1200);
  });
});
