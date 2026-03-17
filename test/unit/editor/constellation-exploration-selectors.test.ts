import { describe, expect, test } from "bun:test";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedNodeChildren,
  selectConstellationNodeLineage,
  selectConstellationOverviewEdges,
  selectConstellationThemeChildren,
  selectConstellationVisibleCanvas,
  selectConstellationVisibleStructuralChildren,
} from "../../../src/app/(protected)/editor/constellation-exploration-selectors";
import type { ConstellationExplorationGraph } from "../../../src/domain/gadfly/constellation-types";
import {
  createConstellationEdge,
  createConstellationGraph,
  createConstellationNode,
} from "../fixtures/constellation-fixtures";

function graph(): ConstellationExplorationGraph {
  return createConstellationGraph({
    nodes: [
      createConstellationNode("seed-1", "seed"),
      createConstellationNode("theme-1", "theme"),
      createConstellationNode("theme-2", "theme"),
      createConstellationNode("counter-1", "counterargument"),
      createConstellationNode("evidence-1", "evidence"),
      createConstellationNode("question-1", "question"),
      createConstellationNode("source-1", "source"),
      createConstellationNode("response-1", "response"),
      createConstellationNode("task-1", "research_task"),
      createConstellationNode("nested-1", "evidence", {
        generatedFromAction: "find_stronger_evidence",
      }),
      createConstellationNode("nested-2", "question", {
        generatedFromAction: "ask_deeper_question",
      }),
    ],
    edges: [
      createConstellationEdge("seed-theme-1", "seed-1", "theme-1", "branches_into"),
      createConstellationEdge("seed-theme-2", "seed-1", "theme-2", "branches_into"),
      createConstellationEdge("theme-counter", "theme-1", "counter-1", "contradicts"),
      createConstellationEdge("theme-evidence", "theme-1", "evidence-1", "supports"),
      createConstellationEdge("theme-question", "theme-1", "question-1", "questions"),
      createConstellationEdge("theme-source", "theme-1", "source-1", "derived_from"),
      createConstellationEdge("theme-response", "theme-1", "response-1", "responds_to"),
      createConstellationEdge("theme-task", "theme-1", "task-1", "expands"),
      createConstellationEdge("evidence-nested", "evidence-1", "nested-1", "supports"),
      createConstellationEdge("nested-question", "nested-1", "nested-2", "questions"),
      createConstellationEdge("legacy-cross-link", "question-1", "response-1", "supports", false),
    ],
  });
}

function graphWithHiddenGeneratedBranch(): ConstellationExplorationGraph {
  const baseGraph = graph();

  return {
    ...baseGraph,
    nodes: [
      ...baseGraph.nodes,
      createConstellationNode("nested-3", "evidence", {
        confidenceScore: 0.42,
        generatedFromAction: "find_stronger_evidence",
      }),
      createConstellationNode("nested-4", "source", {
        confidenceScore: 0.41,
        generatedFromAction: "follow_source",
      }),
      createConstellationNode("nested-5", "counterargument", {
        confidenceScore: 0.39,
        generatedFromAction: "find_strongest_objection",
      }),
    ],
    edges: [
      ...baseGraph.edges,
      createConstellationEdge("nested-extra-3", "nested-1", "nested-3", "supports"),
      createConstellationEdge("nested-extra-4", "nested-1", "nested-4", "derived_from"),
      createConstellationEdge("nested-extra-5", "nested-1", "nested-5", "contradicts"),
    ],
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
    const { nodes: visibleNodes } = selectConstellationVisibleCanvas(graph(), {
      expandedThemeId: "theme-1",
      selectedNodeId: "nested-1",
      showOnlyCurrentBranch: false,
    });

    expect(visibleNodes.map((node) => node.id)).toEqual([
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
    const { nodes: visibleNodes, edges: visibleEdges } = selectConstellationVisibleCanvas(graph(), {
      expandedThemeId: "theme-1",
      selectedNodeId: "nested-1",
      showOnlyCurrentBranch: true,
    });

    expect(visibleNodes.map((node) => node.id)).toEqual(["seed-1", "theme-1", "evidence-1", "nested-1", "nested-2"]);
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

  test("summarizes low-signal generated children until a branch is revealed", () => {
    const collapsedChildren = selectConstellationVisibleStructuralChildren(
      graphWithHiddenGeneratedBranch(),
      {
        parentNodeId: "nested-1",
      },
    );
    const revealedChildren = selectConstellationVisibleStructuralChildren(
      graphWithHiddenGeneratedBranch(),
      {
        parentNodeId: "nested-1",
        revealedSummaryParentNodeIds: new Set(["nested-1"]),
      },
    );

    expect(collapsedChildren.visibleNodes.map((node) => node.id)).toEqual([
      "nested-2",
      "nested-3",
      "nested-4",
    ]);
    expect(collapsedChildren.hiddenNodes.map((node) => node.id)).toEqual(["nested-5"]);
    expect(revealedChildren.hiddenNodes).toEqual([]);
    expect(revealedChildren.visibleNodes.map((node) => node.id)).toEqual([
      "nested-2",
      "nested-3",
      "nested-4",
      "nested-5",
    ]);
  });
});
