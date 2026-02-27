import { describe, expect, test } from "bun:test";
import { mergeGadflyActions } from "../../../src/domain/gadfly/annotations";
import type { GadflyAnnotation } from "../../../src/domain/gadfly/types";

function annotation(id: string, from: number, to: number): GadflyAnnotation {
  return {
    id,
    anchor: {
      from,
      to,
      quote: `quote-${id}`,
    },
    category: "clarity",
    severity: "low",
    explanation: `explain-${id}`,
    rule: `rule-${id}`,
    question: `question-${id}`,
  };
}

describe("mergeGadflyActions", () => {
  test("adds and updates annotations by id", () => {
    const current = [annotation("a", 2, 7)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotate",
        annotation: annotation("a", 4, 9),
      },
      {
        type: "annotate",
        annotation: annotation("b", 12, 16),
      },
    ]);

    expect(next).toEqual([annotation("a", 4, 9), annotation("b", 12, 16)]);
  });

  test("clears annotations when clear action is received", () => {
    const current = [annotation("a", 2, 7), annotation("b", 12, 16)];

    const next = mergeGadflyActions(current, [
      {
        type: "clear",
        annotationId: "a",
      },
    ]);

    expect(next).toEqual([annotation("b", 12, 16)]);
  });
});
