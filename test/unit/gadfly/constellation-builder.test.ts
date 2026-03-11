import { describe, expect, test } from "bun:test";
import {
  buildConstellationBoard,
  computeLeverageScore,
  type ConstellationBuildInput,
} from "../../../src/domain/gadfly/constellation-builder";
import type { GadflyAnnotation } from "../../../src/domain/gadfly/types";
import { CONSTELLATION_NODE_ROLE_ORDER } from "../../../src/domain/gadfly/constellation-types";

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
      quote: overrides?.anchor?.quote ?? "Some text.",
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

function defaultInput(overrides?: Partial<ConstellationBuildInput>): ConstellationBuildInput {
  return {
    noteId: "note-1",
    docVersion: 1,
    title: "Test Essay",
    plainText: overrides?.plainText ?? "This is a test essay with enough words to form a meaningful draft for review purposes.",
    annotations: overrides?.annotations ?? [],
    generatedAt: "2026-03-11T00:00:00.000Z",
    boardId: "board-1",
    ...overrides,
  };
}

describe("buildConstellationBoard", () => {
  test("builds board with 5 themes when no annotations exist", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.themes).toHaveLength(5);
    expect(result.value.nodes.length).toBeGreaterThan(0);
    expect(result.value.edges.length).toBeGreaterThan(0);
    expect(result.value.id).toBe("board-1");
    expect(result.value.noteId).toBe("note-1");
    expect(result.value.generatedAt).toBe("2026-03-11T00:00:00.000Z");
  });

  test("builds draft card with correct word count and excerpt", () => {
    const result = buildConstellationBoard(defaultInput({
      plainText: "one two three four five",
      title: "My Title",
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.draft.wordCount).toBe(5);
    expect(result.value.draft.excerpt).toBe("one two three four five");
    expect(result.value.draft.title).toBe("My Title");
    expect(result.value.draft.noteId).toBe("note-1");
    expect(result.value.draft.docVersion).toBe(1);
  });

  test("truncates excerpt for long text", () => {
    const longText = "word ".repeat(100).trim();
    const result = buildConstellationBoard(defaultInput({ plainText: longText }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.draft.excerpt.length).toBeLessThanOrEqual(200);
    expect(result.value.draft.excerpt).toEndWith("\u2026");
  });

  test("returns error for empty plainText", () => {
    const result = buildConstellationBoard(defaultInput({ plainText: "" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("ValidationError");
    expect(result.error.field).toBe("plainText");
  });

  test("returns error for whitespace-only plainText", () => {
    const result = buildConstellationBoard(defaultInput({ plainText: "   \n  " }));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("ValidationError");
  });

  test("maps annotations into first theme nodes", () => {
    const annotations = [
      annotation("ann-1", 0, 10, { category: "logic", explanation: "Weak logical link between premise and conclusion" }),
      annotation("ann-2", 15, 30, {
        category: "evidence",
        explanation: "Claim needs supporting evidence",
        research: {
          needsFactCheck: true,
          factCheckNote: "Check stat",
          tasks: [],
        },
      }),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Annotations should map into the first theme
    const firstTheme = result.value.themes[0];
    expect(firstTheme).toBeDefined();
    if (!firstTheme) return;

    const annotationNodes = result.value.nodes.filter(
      (node) => node.themeId === firstTheme.id && node.id.includes("ann-"),
    );
    expect(annotationNodes.length).toBe(2);

    // ann-1 has category "logic" → should be "challenge"
    const logicNode = annotationNodes.find((node) => node.id.includes("ann-1"));
    expect(logicNode?.kind).toBe("challenge");

    // ann-2 has needsFactCheck → should be "gap"
    const gapNode = annotationNodes.find((node) => node.id.includes("ann-2"));
    expect(gapNode?.kind).toBe("gap");
  });

  test("maps annotation with followup_question prompt to question kind", () => {
    const annotations = [
      annotation("ann-q", 0, 10, {
        prompts: [{ kind: "followup_question", text: "Why?" }],
      }),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstTheme = result.value.themes[0];
    if (!firstTheme) return;

    const questionNode = result.value.nodes.find(
      (node) => node.themeId === firstTheme.id && node.id.includes("ann-q"),
    );
    expect(questionNode?.kind).toBe("question");
  });

  test("themes are sorted by leverage score descending", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (let index = 1; index < result.value.themes.length; index += 1) {
      const current = result.value.themes[index];
      const previous = result.value.themes[index - 1];
      if (!current || !previous) continue;
      expect(previous.leverageScore).toBeGreaterThanOrEqual(current.leverageScore);
    }
  });

  test("nodes within each theme are sorted by role order then severity", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const theme of result.value.themes) {
      const themeNodes = result.value.nodes.filter((node) => node.themeId === theme.id);

      for (let index = 1; index < themeNodes.length; index += 1) {
        const current = themeNodes[index];
        const previous = themeNodes[index - 1];
        if (!current || !previous) continue;

        const prevRole = CONSTELLATION_NODE_ROLE_ORDER[previous.kind];
        const currRole = CONSTELLATION_NODE_ROLE_ORDER[current.kind];

        // Role order should be non-decreasing
        expect(prevRole).toBeLessThanOrEqual(currRole);
      }
    }
  });

  test("every theme has accurate lane counts", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const theme of result.value.themes) {
      const themeNodes = result.value.nodes.filter((node) => node.themeId === theme.id);

      const counted = { supports: 0, challenges: 0, questions: 0, sources: 0 };
      for (const node of themeNodes) {
        counted[node.lane] += 1;
      }

      expect(theme.counts).toEqual(counted);
    }
  });

  test("edges include draft-to-theme connections", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const draftEdges = result.value.edges.filter((edge) => edge.fromNodeId === "draft");
    expect(draftEdges).toHaveLength(result.value.themes.length);

    for (const edge of draftEdges) {
      expect(edge.kind).toBe("anchors_to_text");
    }
  });

  test("default filters include all lanes and severities", () => {
    const result = buildConstellationBoard(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.filters.lanes).toEqual(["supports", "challenges", "questions", "sources"]);
    expect(result.value.filters.severity).toEqual(["low", "medium", "high"]);
    expect(result.value.filters.unresolvedOnly).toBe(false);
    expect(result.value.filters.showDismissed).toBe(false);
  });

  test("maps annotation with research sources into sourceRefs", () => {
    const annotations = [
      annotation("ann-src", 0, 10, {
        category: "evidence",
        research: {
          needsFactCheck: false,
          factCheckNote: null,
          tasks: [
            {
              id: "task-1",
              kind: "fact_check",
              question: "Is this true?",
              status: "completed",
              result: {
                verdict: "supported",
                findings: ["Confirmed"],
                sources: [
                  {
                    title: "Source A",
                    url: "https://example.com/a",
                    domain: "example.com",
                    pageAge: "2025-01",
                  },
                ],
              },
            },
          ],
        },
      }),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstTheme = result.value.themes[0];
    if (!firstTheme) return;

    const annNode = result.value.nodes.find(
      (node) => node.themeId === firstTheme.id && node.id.includes("ann-src"),
    );
    expect(annNode).toBeDefined();
    if (!annNode) return;

    expect(annNode.sourceRefs).toHaveLength(1);
    expect(annNode.sourceRefs[0]?.title).toBe("Source A");
    expect(annNode.sourceRefs[0]?.verdict).toBe("supported");
    expect(annNode.sourceRefs[0]?.researchTaskId).toBe("task-1");
  });

  test("caps annotation-derived nodes at 3 per theme", () => {
    const annotations = [
      annotation("a1", 0, 5),
      annotation("a2", 6, 10),
      annotation("a3", 11, 15),
      annotation("a4", 16, 20),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstTheme = result.value.themes[0];
    if (!firstTheme) return;

    const annotationNodes = result.value.nodes.filter(
      (node) => node.themeId === firstTheme.id && node.id.includes("ann-"),
    );
    expect(annotationNodes).toHaveLength(3);
  });

  test("needsFactCheck takes priority over followup_question prompt", () => {
    const annotations = [
      annotation("ann-both", 0, 10, {
        research: {
          needsFactCheck: true,
          factCheckNote: "Check this",
          tasks: [],
        },
        prompts: [{ kind: "followup_question", text: "Why?" }],
      }),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstTheme = result.value.themes[0];
    if (!firstTheme) return;

    const node = result.value.nodes.find(
      (n) => n.themeId === firstTheme.id && n.id.includes("ann-both"),
    );
    expect(node?.kind).toBe("gap");
  });

  test("null title is passed through without coercion", () => {
    const result = buildConstellationBoard(defaultInput({ title: null }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.draft.title).toBeNull();
  });

  test("draft card collects anchor refs from annotations", () => {
    const annotations = [
      annotation("ann-1", 5, 15),
      annotation("ann-2", 20, 30),
    ];

    const result = buildConstellationBoard(defaultInput({ annotations }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.draft.anchorRefs).toHaveLength(2);
    expect(result.value.draft.anchorRefs[0]?.annotationId).toBe("ann-1");
    expect(result.value.draft.anchorRefs[1]?.annotationId).toBe("ann-2");
  });
});

describe("computeLeverageScore", () => {
  test("applies weighted formula correctly", () => {
    const score = computeLeverageScore({
      draftCentrality: 1.0,
      conflictScore: 1.0,
      evidenceGapScore: 1.0,
      repetitionScore: 1.0,
      freshnessScore: 1.0,
    });

    expect(score).toBeCloseTo(1.0, 5);
  });

  test("all zeros produces zero", () => {
    const score = computeLeverageScore({
      draftCentrality: 0,
      conflictScore: 0,
      evidenceGapScore: 0,
      repetitionScore: 0,
      freshnessScore: 0,
    });

    expect(score).toBe(0);
  });

  test("weights are correct individually", () => {
    const dc = computeLeverageScore({ draftCentrality: 1, conflictScore: 0, evidenceGapScore: 0, repetitionScore: 0, freshnessScore: 0 });
    const cs = computeLeverageScore({ draftCentrality: 0, conflictScore: 1, evidenceGapScore: 0, repetitionScore: 0, freshnessScore: 0 });
    const eg = computeLeverageScore({ draftCentrality: 0, conflictScore: 0, evidenceGapScore: 1, repetitionScore: 0, freshnessScore: 0 });
    const rs = computeLeverageScore({ draftCentrality: 0, conflictScore: 0, evidenceGapScore: 0, repetitionScore: 1, freshnessScore: 0 });
    const fs = computeLeverageScore({ draftCentrality: 0, conflictScore: 0, evidenceGapScore: 0, repetitionScore: 0, freshnessScore: 1 });

    expect(dc).toBeCloseTo(0.35, 5);
    expect(cs).toBeCloseTo(0.25, 5);
    expect(eg).toBeCloseTo(0.20, 5);
    expect(rs).toBeCloseTo(0.10, 5);
    expect(fs).toBeCloseTo(0.10, 5);
  });
});
