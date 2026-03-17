import { describe, expect, test } from "bun:test";
import {
  buildConstellationExplorationGraph,
  expandConstellationExplorationGraph,
} from "../../../src/domain/gadfly/constellation-exploration-builder";
import type { GadflyAnnotation } from "../../../src/domain/gadfly/types";
import {
  CONSTELLATION_EDGE_RELATIONS,
  type ConstellationBuildInput,
} from "../../../src/domain/gadfly/constellation-types";

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
    plainText: overrides?.plainText ?? "This is a test essay with enough words to form a meaningful draft for exploration purposes.",
    annotations: overrides?.annotations ?? [],
    generatedAt: "2026-03-16T00:00:00.000Z",
    boardId: "board-1",
    ...overrides,
  };
}

describe("buildConstellationExplorationGraph", () => {
  test("rejects empty draft text", () => {
    const result = buildConstellationExplorationGraph(defaultInput({ plainText: "   \n  " }));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.field).toBe("plainText");
  });

  test("builds a graph with a seed node and global suggested actions", () => {
    const result = buildConstellationExplorationGraph(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.seedNodeId).toBe("board-1:seed");
    expect(result.value.suggestedActions).toHaveLength(5);

    const seedNode = result.value.nodes.find((node) => node.id === result.value.seedNodeId);
    expect(seedNode?.family).toBe("seed");
    expect(seedNode?.provenance.surfacedBy).toBe("draft");
    expect(seedNode?.whySurfaced.label).toBe("Seed created from the user freewrite");
  });

  test("mock exploratory nodes include confidence, why-surfaced, and provenance shape", () => {
    const result = buildConstellationExplorationGraph(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mockTheme = result.value.nodes.find((node) => node.family === "theme");
    expect(mockTheme).toBeDefined();
    if (!mockTheme) return;

    expect(mockTheme.confidenceScore).toBeGreaterThan(0);
    expect(mockTheme.whySurfaced.label.length).toBeGreaterThan(0);
    expect(mockTheme.provenance.surfacedBy).toBe("mock");
    expect(Array.isArray(mockTheme.provenance.anchorRefs)).toBe(true);
    expect(Array.isArray(mockTheme.provenance.sourceRefs)).toBe(true);
    expect(mockTheme.generatedFromAction).toBeNull();
    expect(Array.isArray(mockTheme.suggestedBranchActions)).toBe(true);
    expect(mockTheme.suggestedBranchActions.length).toBeGreaterThan(0);
  });

  test("annotation-backed nodes preserve provenance and why-surfaced details", () => {
    const result = buildConstellationExplorationGraph(defaultInput({
      annotations: [
        annotation("ann-1", 0, 10, {
          category: "evidence",
          explanation: "This claim needs external support",
          research: {
            needsFactCheck: false,
            factCheckNote: null,
            tasks: [
              {
                id: "task-1",
                kind: "supporting_evidence",
                question: "Find support",
                status: "completed",
                result: {
                  verdict: "supported",
                  findings: ["Confirmed"],
                  sources: [
                    {
                      title: "Source A",
                      url: "https://example.com/a",
                      domain: "example.com",
                      pageAge: "2026-03",
                    },
                  ],
                },
              },
            ],
          },
        }),
      ],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const annotationNode = result.value.nodes.find(
      (node) => node.id.includes("ann-1") && node.family !== "seed",
    );
    expect(annotationNode).toBeDefined();
    if (!annotationNode) return;

    expect(annotationNode.provenance.surfacedBy).toBe("research");
    expect(annotationNode.provenance.researchTaskIds).toContain("task-1");
    expect(annotationNode.whySurfaced.label).toBe("Surfaced from anchored draft text");
  });

  test("all exploratory edges use allowed relation values", () => {
    const result = buildConstellationExplorationGraph(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const edge of result.value.edges) {
      expect(CONSTELLATION_EDGE_RELATIONS).toContain(edge.relation);
    }
  });

  test("branch expansion appends structural mock nodes with provenance metadata", () => {
    const result = buildConstellationExplorationGraph(defaultInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const themeNode = result.value.nodes.find((node) => node.family === "theme");
    expect(themeNode).toBeDefined();
    if (!themeNode) return;

    const expandedGraph = expandConstellationExplorationGraph({
      graph: result.value,
      originNodeId: themeNode.id,
      actionKind: "find_stronger_evidence",
      generatedAt: "2026-03-16T00:04:00.000Z",
    });

    const newNodes = expandedGraph.nodes.filter((node) => node.generatedFromAction === "find_stronger_evidence");
    const newNodeIds = new Set(newNodes.map((node) => node.id));
    const newEdges = expandedGraph.edges.filter(
      (edge) => edge.fromNodeId === themeNode.id && edge.isStructural && newNodeIds.has(edge.toNodeId),
    );

    expect(expandedGraph.generatedAt).toBe("2026-03-16T00:04:00.000Z");
    expect(newNodes.length).toBeGreaterThan(0);
    expect(newNodes.every((node) => node.provenance.surfacedBy === "mock")).toBe(true);
    expect(newNodes.every((node) => node.whySurfaced.label.length > 0)).toBe(true);
    expect(newEdges.length).toBeGreaterThanOrEqual(newNodes.length);
  });
});
