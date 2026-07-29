/**
 * Unit table for the seeded counterargument lens hints (D10 anti-homogenization).
 * The contract: deterministic per run (replayable, never persisted), well-spread
 * across runs (two writers on the same topic get different objections), and
 * always drawn from the fixed taxonomy (so the prompt never sees a stray string).
 */

import { describe, expect, test } from "bun:test";
import {
  COUNTERARGUMENT_LENSES,
  HINT_LENS_COUNT,
  hintLensesForRun,
} from "../../../src/domain/constellation/counterargument-lenses";
import { runId as makeRunId } from "../../../src/domain/types/branded";
import type { RunId } from "../../../src/domain/types/branded";

function rid(uuid: string): RunId {
  const r = makeRunId(uuid);
  if (!r.ok) throw new Error("bad run id");
  return r.value;
}

const RUN_A = rid("11111111-2222-4333-8444-555555555555");

describe("hintLensesForRun", () => {
  test("is deterministic — the same run always hints the same lenses", () => {
    expect(hintLensesForRun(RUN_A)).toEqual(hintLensesForRun(RUN_A));
  });

  test("returns HINT_LENS_COUNT distinct lenses from the taxonomy", () => {
    const hints = hintLensesForRun(RUN_A);
    expect(hints).toHaveLength(HINT_LENS_COUNT);
    expect(new Set(hints).size).toBe(hints.length); // distinct
    for (const hint of hints) {
      expect(COUNTERARGUMENT_LENSES).toContain(hint);
    }
  });

  test("spreads across runs — distinct ids do not all collapse to one pair", () => {
    // Sample many synthetic run ids; assert the generation side is not homogeneous
    // (the Doshi & Hauser defense). At least a handful of distinct pairs appear.
    const pairs = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const hex = i.toString(16).padStart(12, "0");
      pairs.add(hintLensesForRun(rid(`00000000-0000-4000-8000-${hex}`)).join("|"));
    }
    expect(pairs.size).toBeGreaterThan(3);
  });
});
