import { describe, expect, test } from "bun:test";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedThemeChildren,
  selectConstellationOverviewEdges,
  selectConstellationThemeChildren,
} from "../../../src/app/(protected)/editor/constellation-exploration-selectors";
import type {
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../src/domain/gadfly/constellation-types";

function node(
  id: string,
  family: ConstellationExplorationNode["family"],
  overrides?: Partial<ConstellationExplorationNode>,
): ConstellationExplorationNode {
  return {
    id,
    family,
    title: id,
    summary: `Summary for ${id}`,
    status: "active",
    confidenceScore: 0.7,
    whySurfaced: {
      label: `Why ${id}`,
      detail: null,
    },
    provenance: {
      surfacedBy: "mock",
      anchorRefs: [],
      sourceRefs: [],
      annotationIds: [],
      researchTaskIds: [],
    },
    isPinned: false,
    isSavedToWorkingSet: false,
    suggestedBranchActions: [],
    ...overrides,
  };
}

function edge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  relation: ConstellationExplorationEdge["relation"],
): ConstellationExplorationEdge {
  return {
    id,
    fromNodeId,
    toNodeId,
    relation,
    strength: 0.7,
  };
}

function graph(): ConstellationExplorationGraph {
  return {
    id: "graph-1",
    noteId: "note-1",
    generatedAt: "2026-03-16T00:00:00.000Z",
    seedNodeId: "seed-1",
    nodes: [
      node("seed-1", "seed"),
      node("theme-1", "theme"),
      node("theme-2", "theme"),
      node("counter-1", "counterargument"),
      node("evidence-1", "evidence"),
      node("question-1", "question"),
      node("source-1", "source"),
      node("response-1", "response"),
      node("task-1", "research_task"),
      node("nested-1", "evidence"),
    ],
    edges: [
      edge("seed-theme-1", "seed-1", "theme-1", "emerges_from"),
      edge("seed-theme-2", "seed-1", "theme-2", "emerges_from"),
      edge("theme-counter", "theme-1", "counter-1", "contradicts"),
      edge("theme-evidence", "theme-1", "evidence-1", "supports"),
      edge("theme-question", "theme-1", "question-1", "questions"),
      edge("theme-source", "theme-1", "source-1", "derived_from"),
      edge("theme-response", "theme-1", "response-1", "responds_to"),
      edge("theme-task", "theme-1", "task-1", "expands"),
      edge("nested-child", "question-1", "nested-1", "supports"),
    ],
    workingSet: [],
    suggestedActions: [],
  };
}

describe("constellation exploration selectors", () => {
  test("extracts only the seed node and top-level themes for the atlas canvas", () => {
    const canvasNodes = selectConstellationCanvasNodes(graph());

    expect(canvasNodes.map((node) => node.id)).toEqual(["seed-1", "theme-1", "theme-2"]);
  });

  test("filters overview edges down to seed-to-theme relationships", () => {
    const overviewEdges = selectConstellationOverviewEdges(graph());

    expect(overviewEdges.map((item) => item.id)).toEqual(["seed-theme-1", "seed-theme-2"]);
  });

  test("groups a selected theme's immediate child nodes in panel order", () => {
    const selectedChildren = selectConstellationThemeChildren(graph(), "theme-1");
    const groupedChildren = selectConstellationGroupedThemeChildren(graph(), "theme-1");

    expect(selectedChildren.map((item) => item.id)).not.toContain("nested-1");
    expect(groupedChildren.map((group) => group.family)).toEqual([
      "counterargument",
      "evidence",
      "question",
      "source",
      "response",
      "research_task",
    ]);
    expect(groupedChildren.map((group) => group.nodes[0]?.id)).toEqual([
      "counter-1",
      "evidence-1",
      "question-1",
      "source-1",
      "response-1",
      "task-1",
    ]);
  });
});
