import { describe, expect, test } from "bun:test";
import { mergeGadflyActions } from "../../../src/domain/gadfly/annotations";
import type { GadflyAnnotation } from "../../../src/domain/gadfly/types";

function annotation(
  id: string,
  from: number,
  to: number,
  overrides?: Partial<GadflyAnnotation>,
): GadflyAnnotation {
  return {
    id,
    anchor: {
      from,
      to,
      quote: overrides?.anchor?.quote ?? `quote-${id}`,
    },
    category: overrides?.category ?? "clarity",
    severity: overrides?.severity ?? "low",
    explanation: overrides?.explanation ?? `explain-${id}`,
    rule: overrides?.rule ?? `rule-${id}`,
    question: overrides?.question ?? `question-${id}`,
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

  test("preserves unrelated annotations when a model id is reused", () => {
    const current = [
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotate",
        annotation: annotation("a", 24, 31, {
          anchor: { from: 24, to: 31, quote: "second bad sentence" },
          rule: "logic rule",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 31, {
        anchor: { from: 24, to: 31, quote: "second bad sentence" },
        explanation: "explain-a",
        rule: "logic rule",
        question: "question-a",
      }),
    ]);
  });

  test("updates a collided annotation family entry when a later action matches it", () => {
    const current = [
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 31, {
        anchor: { from: 24, to: 31, quote: "second bad sentence" },
        rule: "logic rule",
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotate",
        annotation: annotation("a", 24, 34, {
          anchor: { from: 24, to: 34, quote: "second bad sentence revised" },
          rule: "logic rule",
          question: "question-a#2",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 34, {
        anchor: { from: 24, to: 34, quote: "second bad sentence revised" },
        explanation: "explain-a",
        rule: "logic rule",
        question: "question-a#2",
      }),
    ]);
  });

  test("clear removes base id and collided siblings", () => {
    const current = [annotation("a", 2, 7), annotation("a#2", 24, 31), annotation("b", 40, 49)];

    const next = mergeGadflyActions(current, [
      {
        type: "clear",
        annotationId: "a",
      },
    ]);

    expect(next).toEqual([annotation("b", 40, 49)]);
  });
});
