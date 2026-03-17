import { describe, expect, test } from "bun:test";
import {
  removeConstellationNodeFromWorkingSet,
  setConstellationWorkingSetDisposition,
  swapConstellationUseInDraftItemOrder,
} from "../../../src/domain/gadfly/constellation-working-set";
import type {
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../src/domain/gadfly/constellation-types";

function node(
  id: string,
  family: ConstellationExplorationNode["family"],
): ConstellationExplorationNode {
  return {
    id,
    family,
    title: id,
    summary: `Summary for ${id}`,
    status: "active",
    confidenceScore: 0.72,
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
      node("evidence-1", "evidence"),
      node("counter-1", "counterargument"),
      node("question-1", "question"),
    ],
    edges: [],
    workingSet: [],
    suggestedActions: [],
  };
}

describe("constellation working set", () => {
  test("saving, pinning, and using in draft update node flags and working set entries", () => {
    const savedGraph = setConstellationWorkingSetDisposition({
      graph: graph(),
      nodeId: "evidence-1",
      disposition: "saved",
      enabled: true,
      addedAt: "2026-03-16T00:00:01.000Z",
    });
    const pinnedGraph = setConstellationWorkingSetDisposition({
      graph: savedGraph,
      nodeId: "evidence-1",
      disposition: "pinned",
      enabled: true,
      addedAt: "2026-03-16T00:00:02.000Z",
    });
    const draftGraph = setConstellationWorkingSetDisposition({
      graph: pinnedGraph,
      nodeId: "question-1",
      disposition: "use_in_draft",
      enabled: true,
      addedAt: "2026-03-16T00:00:03.000Z",
    });
    const fullyUpdatedGraph = setConstellationWorkingSetDisposition({
      graph: draftGraph,
      nodeId: "counter-1",
      disposition: "pinned",
      enabled: true,
      addedAt: "2026-03-16T00:00:04.000Z",
    });

    const savedNode = fullyUpdatedGraph.nodes.find((item) => item.id === "evidence-1");
    const draftNode = fullyUpdatedGraph.nodes.find((item) => item.id === "question-1");
    const pinnedNode = fullyUpdatedGraph.nodes.find((item) => item.id === "counter-1");

    expect(savedNode?.isSavedToWorkingSet).toBe(true);
    expect(savedNode?.isPinned).toBe(true);
    expect(savedNode?.isUsedInDraft).toBe(false);
    expect(draftNode?.isSavedToWorkingSet).toBe(false);
    expect(draftNode?.isUsedInDraft).toBe(true);
    expect(pinnedNode?.isPinned).toBe(true);
    expect(pinnedNode?.isSavedToWorkingSet).toBe(false);
    expect(fullyUpdatedGraph.workingSet.map((item) => item.disposition)).toEqual([
      "saved",
      "pinned",
      "use_in_draft",
      "pinned",
    ]);
    expect(fullyUpdatedGraph.workingSet.find((item) => item.nodeId === "question-1")?.order).toBe(0);
  });

  test("removing a node clears all of its working set dispositions and normalizes draft order", () => {
    const withDraftNodes = setConstellationWorkingSetDisposition({
      graph: setConstellationWorkingSetDisposition({
        graph: graph(),
        nodeId: "evidence-1",
        disposition: "use_in_draft",
        enabled: true,
        addedAt: "2026-03-16T00:00:01.000Z",
      }),
      nodeId: "question-1",
      disposition: "use_in_draft",
      enabled: true,
      addedAt: "2026-03-16T00:00:02.000Z",
    });

    const removedGraph = removeConstellationNodeFromWorkingSet(withDraftNodes, "evidence-1");

    expect(removedGraph.workingSet.map((item) => item.nodeId)).toEqual(["question-1"]);
    expect(removedGraph.workingSet[0]?.order).toBe(0);
    expect(removedGraph.nodes.find((item) => item.id === "evidence-1")?.isSavedToWorkingSet).toBe(false);
  });

  test("swapping draft item order exchanges their use-in-draft ordering", () => {
    const withDraftNodes = setConstellationWorkingSetDisposition({
      graph: setConstellationWorkingSetDisposition({
        graph: graph(),
        nodeId: "evidence-1",
        disposition: "use_in_draft",
        enabled: true,
        addedAt: "2026-03-16T00:00:01.000Z",
      }),
      nodeId: "question-1",
      disposition: "use_in_draft",
      enabled: true,
      addedAt: "2026-03-16T00:00:02.000Z",
    });

    const reorderedGraph = swapConstellationUseInDraftItemOrder(
      withDraftNodes,
      "question-1",
      "evidence-1",
    );
    const orderedDraftNodes = reorderedGraph.workingSet
      .filter((item) => item.disposition === "use_in_draft")
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map((item) => item.nodeId);

    expect(orderedDraftNodes).toEqual(["question-1", "evidence-1"]);
  });
});
