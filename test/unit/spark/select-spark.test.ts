import { describe, expect, test } from "bun:test";
import { sprintId as makeSprintId } from "../../../src/domain/types/branded";
import type { SprintId } from "../../../src/domain/types/branded";
import {
  CACHE_MAX_GROWTH_WORDS,
  CACHE_MAX_SHRINK_WORDS,
  MINIMUM_GROUND_WORDS,
  SPARK_SET_MAX_CANDIDATES,
  assembleSparkSet,
  countWords,
  hasMinimumGround,
  hashSprintId,
  isCacheServable,
  selectSpark,
} from "../../../src/domain/spark/select-spark";
import type {
  SparkCandidate,
  SparkCandidateSet,
  SparkLens,
} from "../../../src/domain/spark/types";

function sid(raw: string): SprintId {
  const result = makeSprintId(raw);
  if (!result.ok) throw new Error("test sprint id");
  return result.value;
}

const SID = sid("11111111-2222-3333-4444-555555555555");

function candidate(lens: SparkLens): SparkCandidate {
  return { lens, question: `What about ${lens}?`, grounding: "the draft" };
}

function setOf(lenses: readonly SparkLens[], draftWordCount = 100): SparkCandidateSet {
  return {
    sprintId: SID,
    candidates: lenses.map(candidate),
    draftWordCount,
    promptVersion: "spark-test",
  };
}

describe("countWords", () => {
  test("counts whitespace-delimited words", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("one two three four")).toBe(4);
  });

  test("is 0 for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("\n\t  \n")).toBe(0);
  });

  test("collapses runs of mixed whitespace and ignores leading/trailing space", () => {
    expect(countWords("  hello   world\n\tagain  ")).toBe(3);
  });

  test("counts a single word", () => {
    expect(countWords("word")).toBe(1);
  });
});

describe("hasMinimumGround", () => {
  test("is false just below the threshold and true at or above it", () => {
    expect(hasMinimumGround(MINIMUM_GROUND_WORDS - 1)).toBe(false);
    expect(hasMinimumGround(MINIMUM_GROUND_WORDS)).toBe(true);
    expect(hasMinimumGround(MINIMUM_GROUND_WORDS + 1)).toBe(true);
  });

  test("a barely-started draft has no ground", () => {
    expect(hasMinimumGround(0)).toBe(false);
    expect(hasMinimumGround(14)).toBe(false);
    expect(hasMinimumGround(15)).toBe(true);
  });
});

describe("isCacheServable — growth boundary", () => {
  const set = setOf(["economic"], 100);

  test("no change is servable", () => {
    expect(isCacheServable(set, 100)).toBe(true);
  });

  test("servable at one below the growth cap (59 words)", () => {
    expect(isCacheServable(set, 100 + (CACHE_MAX_GROWTH_WORDS - 1))).toBe(true);
  });

  test("stale exactly at the growth cap (60 words)", () => {
    expect(isCacheServable(set, 100 + CACHE_MAX_GROWTH_WORDS)).toBe(false);
  });

  test("stale past the growth cap (61 words)", () => {
    expect(isCacheServable(set, 100 + CACHE_MAX_GROWTH_WORDS + 1)).toBe(false);
  });
});

describe("isCacheServable — shrink boundary", () => {
  const set = setOf(["economic"], 100);

  test("servable at one below the shrink cap (14 words deleted)", () => {
    expect(isCacheServable(set, 100 - (CACHE_MAX_SHRINK_WORDS - 1))).toBe(true);
  });

  test("stale exactly at the shrink cap (15 words deleted)", () => {
    expect(isCacheServable(set, 100 - CACHE_MAX_SHRINK_WORDS)).toBe(false);
  });

  test("stale past the shrink cap (16 words deleted)", () => {
    expect(isCacheServable(set, 100 - CACHE_MAX_SHRINK_WORDS - 1)).toBe(false);
  });

  test("small edits like a typo fix stay servable", () => {
    expect(isCacheServable(set, 98)).toBe(true);
  });
});

describe("hashSprintId", () => {
  test("is deterministic for the same id", () => {
    expect(hashSprintId(SID)).toBe(hashSprintId(SID));
  });

  test("is a non-negative 32-bit integer", () => {
    const hash = hashSprintId(SID);
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  test("different ids generally hash differently", () => {
    expect(
      hashSprintId(sid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")),
    ).not.toBe(hashSprintId(sid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")));
  });
});

describe("selectSpark", () => {
  const set = setOf(["economic", "historical", "personal"]);

  test("is deterministic for the same set, served lenses, and seed", () => {
    const a = selectSpark(set, [], 0);
    const b = selectSpark(set, [], 0);
    expect(a).toEqual(b);
  });

  test("the seed selects among the unserved candidates", () => {
    expect(selectSpark(set, [], 0)?.lens).toBe("economic");
    expect(selectSpark(set, [], 1)?.lens).toBe("historical");
    expect(selectSpark(set, [], 2)?.lens).toBe("personal");
  });

  test("the seed wraps around the candidate count", () => {
    expect(selectSpark(set, [], 3)?.lens).toBe("economic");
    expect(selectSpark(set, [], 4)?.lens).toBe("historical");
  });

  test("different seeds can yield different lenses (variety)", () => {
    const first = selectSpark(set, [], 0)?.lens;
    const second = selectSpark(set, [], 1)?.lens;
    expect(first).not.toBe(second);
  });

  test("never serves an already-served lens (rotation / no double-serving)", () => {
    for (let seed = 0; seed < 10; seed++) {
      const chosen = selectSpark(set, ["economic"], seed);
      expect(chosen?.lens).not.toBe("economic");
    }
  });

  test("re-roll: a second call excluding the served lens yields a different lens", () => {
    const first = selectSpark(set, [], 0);
    expect(first?.lens).toBe("economic");
    const second = selectSpark(set, ["economic"], 0);
    expect(second).not.toBeNull();
    expect(second?.lens).not.toBe("economic");
  });

  test("returns null when every lens has already been served", () => {
    expect(selectSpark(set, ["economic", "historical", "personal"], 0)).toBeNull();
  });

  test("returns null for an empty candidate set", () => {
    expect(selectSpark(setOf([]), [], 0)).toBeNull();
  });

  test("wiring the sprint-id hash as the seed is deterministic", () => {
    const seed = hashSprintId(set.sprintId);
    expect(selectSpark(set, [], seed)).toEqual(selectSpark(set, [], seed));
  });

  test("a negative seed still serves a candidate (normalized, deterministic)", () => {
    const chosen = selectSpark(set, [], -1);
    expect(chosen).not.toBeNull();
    expect(chosen?.lens).toBe("personal"); // ((-1 % 3) + 3) % 3 = 2
  });

  test("a fractional seed still serves a candidate (truncated)", () => {
    const chosen = selectSpark(set, [], 1.5);
    expect(chosen).not.toBeNull();
    expect(chosen?.lens).toBe("historical"); // trunc(1.5) = 1
  });

  test("a NaN seed still serves a candidate (falls back to the top pick)", () => {
    const chosen = selectSpark(set, [], Number.NaN);
    expect(chosen).not.toBeNull();
    expect(chosen?.lens).toBe("economic"); // non-finite → 0
  });
});

describe("assembleSparkSet", () => {
  test("preserves rank (input order = model emission order)", () => {
    const input = [
      candidate("economic"),
      candidate("historical"),
      candidate("personal"),
    ];
    expect(assembleSparkSet(input, []).map((c) => c.lens)).toEqual([
      "economic",
      "historical",
      "personal",
    ]);
  });

  test("excludes candidates whose lens was already served", () => {
    const input = [
      candidate("economic"),
      candidate("historical"),
      candidate("personal"),
    ];
    expect(
      assembleSparkSet(input, ["economic", "personal"]).map((c) => c.lens),
    ).toEqual(["historical"]);
  });

  test("dedupes by lens, keeping the first (highest-ranked) occurrence", () => {
    const first = { ...candidate("economic"), question: "What about price?" };
    const second = { ...candidate("economic"), question: "What about cost?" };
    const assembled = assembleSparkSet([first, second, candidate("scale")], []);
    expect(assembled.map((c) => c.question)).toEqual([
      "What about price?",
      "What about scale?",
    ]);
  });

  test("dedupes by question across different lenses, keeping the first", () => {
    const first = { ...candidate("economic"), question: "What about cost?" };
    const second = { ...candidate("ethical"), question: "What about cost?" };
    const assembled = assembleSparkSet([first, second], []);
    expect(assembled.map((c) => c.lens)).toEqual(["economic"]);
  });

  test("caps at SPARK_SET_MAX_CANDIDATES, dropping the lowest-ranked", () => {
    const input = [
      candidate("economic"),
      candidate("historical"),
      candidate("personal"),
      candidate("adversarial"),
      candidate("scale"),
    ];
    const assembled = assembleSparkSet(input, []);
    expect(assembled.length).toBe(SPARK_SET_MAX_CANDIDATES);
    expect(assembled.map((c) => c.lens)).toEqual([
      "economic",
      "historical",
      "personal",
    ]);
  });

  test("returns empty when every valid candidate is excluded (nothing-to-serve, not an error)", () => {
    const input = [candidate("economic"), candidate("historical")];
    expect(assembleSparkSet(input, ["economic", "historical"])).toEqual([]);
  });

  test("returns empty for empty input", () => {
    expect(assembleSparkSet([], [])).toEqual([]);
  });
});
