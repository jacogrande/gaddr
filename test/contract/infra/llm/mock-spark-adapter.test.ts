/**
 * Contract tests for the deterministic mock Spark adapter (plan §7, §8 step 3).
 *
 * The CRITICAL requirement is proven here: the mock's candidates pass the REAL
 * domain validator, for the draft they were generated against. Plus determinism
 * (same input → same output) and lens rotation respecting servedLenses.
 */

import { describe, expect, test } from "bun:test";
import { sprintId as makeSprintId } from "../../../../src/domain/types/branded";
import type { SprintId } from "../../../../src/domain/types/branded";
import { validateSparkCandidateSet } from "../../../../src/domain/spark/validate-spark";
import type {
  SparkCandidate,
  SparkLens,
} from "../../../../src/domain/spark/types";
import { createMockSparkGenerationPort } from "../../../../src/infra/llm/mock-spark-adapter";

const DRAFT =
  "Mass production reshaped how ordinary people bought goods. " +
  "Handmade objects became a luxury few could afford.";

function sid(raw: string): SprintId {
  const result = makeSprintId(raw);
  if (!result.ok) throw new Error("bad test sprint id");
  return result.value;
}

const SID = sid("22222222-2222-2222-2222-222222222222");

function toWire(candidate: SparkCandidate) {
  return {
    lens: candidate.lens,
    question: candidate.question,
    grounding: candidate.grounding,
  };
}

describe("createMockSparkGenerationPort", () => {
  test("every candidate passes the real domain validator against the draft", async () => {
    const port = createMockSparkGenerationPort();
    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThan(0);

    const validated = validateSparkCandidateSet(
      result.value.candidates.map(toWire),
      DRAFT,
    );
    expect(validated.every((r) => r.ok)).toBe(true);
  });

  test("is deterministic: same draft + servedLenses → identical output", async () => {
    const port = createMockSparkGenerationPort();
    const a = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });
    const b = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });
    expect(a).toEqual(b);
  });

  test("candidates use distinct lenses", async () => {
    const port = createMockSparkGenerationPort();
    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lenses = result.value.candidates.map((c) => c.lens);
    expect(new Set(lenses).size).toBe(lenses.length);
  });

  test("rotates away from servedLenses", async () => {
    const served: readonly SparkLens[] = ["economic", "historical"];
    const port = createMockSparkGenerationPort();
    const result = await port.generate({
      draft: DRAFT,
      sprintId: SID,
      servedLenses: served,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const servedSet = new Set<SparkLens>(served);
    for (const candidate of result.value.candidates) {
      expect(servedSet.has(candidate.lens)).toBe(false);
    }
    // And they still pass the validator.
    const validated = validateSparkCandidateSet(
      result.value.candidates.map(toWire),
      DRAFT,
    );
    expect(validated.every((r) => r.ok)).toBe(true);
  });
});
