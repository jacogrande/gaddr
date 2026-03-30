import { describe, expect, test } from "bun:test";
import {
  computeConstellationFlowNodesFromGraph,
  getConstellationEdgeHandles,
} from "../../../src/app/(protected)/editor/constellation-flow-nodes";
import {
  selectConstellationNodeLineage,
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
      createConstellationNode("evidence-1", "evidence"),
      createConstellationNode("nested-1", "evidence", {
        generatedFromAction: "find_stronger_evidence",
      }),
      createConstellationNode("nested-2", "source", {
        generatedFromAction: "follow_source",
      }),
      createConstellationNode("nested-3", "counterargument", {
        confidenceScore: 0.38,
        generatedFromAction: "find_strongest_objection",
      }),
      createConstellationNode("nested-4", "question", {
        confidenceScore: 0.34,
        generatedFromAction: "ask_deeper_question",
      }),
    ],
    edges: [
      createConstellationEdge("seed-theme-1", "seed-1", "theme-1", "branches_into"),
      createConstellationEdge("seed-theme-2", "seed-1", "theme-2", "branches_into"),
      createConstellationEdge("theme-evidence", "theme-1", "evidence-1", "supports"),
      createConstellationEdge("evidence-nested-1", "evidence-1", "nested-1", "supports"),
      createConstellationEdge("evidence-nested-2", "evidence-1", "nested-2", "derived_from"),
      createConstellationEdge("evidence-nested-3", "evidence-1", "nested-3", "contradicts"),
      createConstellationEdge("evidence-nested-4", "evidence-1", "nested-4", "questions"),
    ],
  });
}

describe("computeConstellationFlowNodesFromGraph", () => {
  test("returns seed and top-level themes in atlas overview", () => {
    const graphData = graph();
    const visibleCanvas = selectConstellationVisibleCanvas(graphData, {
      expandedThemeId: null,
      selectedNodeId: null,
      showOnlyCurrentBranch: false,
    });

    const nodes = computeConstellationFlowNodesFromGraph({
      graph: graphData,
      visibleNodeIds: new Set(visibleCanvas.nodes.map((node) => node.id)),
      expandedThemeId: null,
      selectedNodeId: null,
      showOnlyCurrentBranch: false,
      selectedLineage: [],
      selectedLineageIds: new Set(),
      activeBranchRootId: null,
      activeBranchChildIds: new Set(),
      themeBranchChildren: [],
      themeBranchHiddenCount: 0,
      activeBranchChildren: [],
      activeBranchHiddenCount: 0,
    });

    expect(nodes.map((node) => node.id)).toEqual(["seed-1", "theme-1", "theme-2"]);
  });

  test("adds visible branch nodes and a summary card for hidden leads", () => {
    const graphData = graph();
    const selectedNodeId = "evidence-1";
    const expandedThemeId = "theme-1";
    const visibleCanvas = selectConstellationVisibleCanvas(graphData, {
      expandedThemeId,
      selectedNodeId,
      showOnlyCurrentBranch: false,
    });
    const selectedLineage = selectConstellationNodeLineage(graphData, selectedNodeId);
    const themeBranchVisibility = selectConstellationVisibleStructuralChildren(graphData, {
      parentNodeId: expandedThemeId,
    });
    const activeBranchVisibility = selectConstellationVisibleStructuralChildren(graphData, {
      parentNodeId: selectedNodeId,
    });

    const nodes = computeConstellationFlowNodesFromGraph({
      graph: graphData,
      visibleNodeIds: new Set(visibleCanvas.nodes.map((node) => node.id)),
      expandedThemeId,
      selectedNodeId,
      showOnlyCurrentBranch: false,
      selectedLineage,
      selectedLineageIds: new Set(selectedLineage.map((node) => node.id)),
      activeBranchRootId: selectedNodeId,
      activeBranchChildIds: new Set(activeBranchVisibility.visibleNodes.map((node) => node.id)),
      themeBranchChildren: themeBranchVisibility.visibleNodes,
      themeBranchHiddenCount: themeBranchVisibility.hiddenNodes.length,
      activeBranchChildren: activeBranchVisibility.visibleNodes,
      activeBranchHiddenCount: activeBranchVisibility.hiddenNodes.length,
    });

    expect(nodes.some((node) => node.id === "nested-1")).toBe(true);
    expect(nodes.some((node) => node.id === "nested-2")).toBe(true);
    expect(nodes.some((node) => node.id === "evidence-1:summary")).toBe(true);
  });

  test("routes atlas edges from the nearest card side", () => {
    const graphData = graph();
    const visibleCanvas = selectConstellationVisibleCanvas(graphData, {
      expandedThemeId: null,
      selectedNodeId: null,
      showOnlyCurrentBranch: false,
    });

    const nodes = computeConstellationFlowNodesFromGraph({
      graph: graphData,
      visibleNodeIds: new Set(visibleCanvas.nodes.map((node) => node.id)),
      expandedThemeId: null,
      selectedNodeId: null,
      showOnlyCurrentBranch: false,
      selectedLineage: [],
      selectedLineageIds: new Set(),
      activeBranchRootId: null,
      activeBranchChildIds: new Set(),
      themeBranchChildren: [],
      themeBranchHiddenCount: 0,
      activeBranchChildren: [],
      activeBranchHiddenCount: 0,
    });
    const seedNode = nodes.find((node) => node.id === "seed-1");
    const topThemeNode = nodes.find((node) => node.id === "theme-1");

    expect(seedNode).toBeDefined();
    expect(topThemeNode).toBeDefined();
    if (!seedNode || !topThemeNode) {
      return;
    }

    expect(getConstellationEdgeHandles(seedNode, topThemeNode)).toEqual({
      sourceSide: "top",
      targetSide: "bottom",
    });
  });
});
