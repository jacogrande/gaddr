import { describe, expect, test } from "bun:test";
import { groupGadflyAnnotations } from "../../../src/domain/gadfly/presentation";
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
      quote: overrides?.anchor?.quote ?? "Shared sentence.",
    },
    category: overrides?.category ?? "clarity",
    severity: overrides?.severity ?? "low",
    status: overrides?.status ?? "active",
    explanation: overrides?.explanation ?? `explain-${id}`,
    rule: overrides?.rule ?? `rule-${id}`,
    question: overrides?.question ?? `question-${id}`,
    prompts: overrides?.prompts ?? [],
    research: overrides?.research ?? {
      needsFactCheck: false,
      factCheckNote: null,
      tasks: [],
    },
    snoozedUntil: overrides?.snoozedUntil ?? null,
    isPinned: overrides?.isPinned ?? false,
    linkedAnnotationIds: overrides?.linkedAnnotationIds ?? [],
  };
}

describe("groupGadflyAnnotations", () => {
  test("groups multiple annotations on the same quoted span and assigns reference numbers", () => {
    const groups = groupGadflyAnnotations([
      annotation("a", 1, 18, {
        category: "clarity",
        anchor: { from: 1, to: 18, quote: "Shared sentence." },
      }),
      annotation("b", 1, 18, {
        category: "evidence",
        severity: "medium",
        anchor: { from: 1, to: 18, quote: "Shared sentence." },
      }),
      annotation("c", 25, 33, {
        category: "logic",
        anchor: { from: 25, to: 33, quote: "Other text." },
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.annotations.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups[0]?.references.map((item) => item.index)).toEqual([1, 2]);
    expect(groups[0]?.severity).toBe("medium");
    expect(groups[1]?.annotations.map((item) => item.id)).toEqual(["c"]);
    expect(groups[1]?.references.map((item) => item.index)).toEqual([3]);
  });

  test("ignores dismissed, resolved, and snoozed annotations", () => {
    const groups = groupGadflyAnnotations([
      annotation("a", 1, 12, { status: "dismissed" }),
      annotation("b", 1, 12, { status: "resolved" }),
      annotation("c", 1, 12, { status: "snoozed" }),
      annotation("d", 1, 12, { status: "acknowledged" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.annotations.map((item) => item.id)).toEqual(["d"]);
  });
});
