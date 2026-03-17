import { describe, expect, test } from "bun:test";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedNodeChildren,
  selectConstellationNodeLineage,
  selectConstellationOverviewEdges,
  selectConstellationThemeChildren,
  selectConstellationVisibleCanvasEdges,
  selectConstellationVisibleCanvasNodeIds,
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
    isUsedInDraft: false,
    generatedFromAction: null,
    suggestedBranchActions: [],
    ...overrides,
  };
}

function edge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  relation: ConstellationExplorationEdge["relation"],
  isStructural = true,
): ConstellationExplorationEdge {
  return {
    id,
    fromNodeId,
    toNodeId,
    relation,
    strength: 0.7,
    isStructural,
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
      node("nested-1", "evidence", {
        generatedFromAction: "find_stronger_evidence",
      }),
      node("nested-2", "question", {
        generatedFromAction: "ask_deeper_question",
      }),
    ],
    edges: [
      edge("seed-theme-1", "seed-1", "theme-1", "branches_into"),
      edge("seed-theme-2", "seed-1", "theme-2", "branches_into"),
      edge("theme-counter", "theme-1", "counter-1", "contradicts"),
      edge("theme-evidence", "theme-1", "evidence-1", "supports"),
      edge("theme-question", "theme-1", "question-1", "questions"),
      edge("theme-source", "theme-1", "source-1", "derived_from"),
      edge("theme-response", "theme-1", "response-1", "responds_to"),
      edge("theme-task", "theme-1", "task-1", "expands"),
      edge("evidence-nested", "evidence-1", "nested-1", "supports"),
      edge("nested-question", "nested-1", "nested-2", "questions"),
      edge("legacy-cross-link", "question-1", "response-1", "supports", false),
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

  test("filters overview edges down to structural seed-to-theme relationships", () => {
    const overviewEdges = selectConstellationOverviewEdges(graph());

    expect(overviewEdges.map((item) => item.id)).toEqual(["seed-theme-1", "seed-theme-2"]);
  });

  test("groups a selected node's immediate structural children in panel order", () => {
    const groupedChildren = selectConstellationGroupedNodeChildren(graph(), "theme-1");

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

  test("returns a structural lineage from the seed through the selected branch", () => {
    const lineage = selectConstellationNodeLineage(graph(), "nested-2");

    expect(lineage.map((item) => item.id)).toEqual([
      "seed-1",
      "theme-1",
      "evidence-1",
      "nested-1",
      "nested-2",
    ]);
  });

  test("shows atlas context plus the active local branch during exploration", () => {
    const visibleNodeIds = selectConstellationVisibleCanvasNodeIds(graph(), {
      expandedThemeId: "theme-1",
      selectedNodeId: "nested-1",
      showOnlyCurrentBranch: false,
    });

    expect(visibleNodeIds).toEqual([
      "seed-1",
      "theme-1",
      "theme-2",
      "counter-1",
      "evidence-1",
      "question-1",
      "source-1",
      "response-1",
      "task-1",
      "nested-1",
      "nested-2",
    ]);
  });

  test("show-only-current-branch collapses atlas siblings and non-branch nodes", () => {
    const visibleNodeIds = selectConstellationVisibleCanvasNodeIds(graph(), {
      expandedThemeId: "theme-1",
      selectedNodeId: "nested-1",
      showOnlyCurrentBranch: true,
    });
    const visibleEdges = selectConstellationVisibleCanvasEdges(graph(), {
      expandedThemeId: "theme-1",
      selectedNodeId: "nested-1",
      showOnlyCurrentBranch: true,
    });

    expect(visibleNodeIds).toEqual(["seed-1", "theme-1", "evidence-1", "nested-1", "nested-2"]);
    expect(visibleEdges.map((edge) => edge.id)).toEqual([
      "seed-theme-1",
      "theme-evidence",
      "evidence-nested",
      "nested-question",
    ]);
  });

  test("theme children ignore non-structural cross-links", () => {
    const themeChildren = selectConstellationThemeChildren(graph(), "theme-1");

    expect(themeChildren.map((item) => item.id)).toEqual([
      "counter-1",
      "evidence-1",
      "question-1",
      "source-1",
      "response-1",
      "task-1",
    ]);
  });
});
