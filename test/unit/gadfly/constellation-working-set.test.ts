import { describe, expect, test } from "bun:test";
import {
  removeConstellationNodeFromWorkingSet,
  setConstellationWorkingSetDisposition,
  swapConstellationUseInDraftItemOrder,
} from "../../../src/domain/gadfly/constellation-working-set";
import type { ConstellationExplorationGraph } from "../../../src/domain/gadfly/constellation-types";
import { createConstellationGraph, createConstellationNode } from "../fixtures/constellation-fixtures";

function graph(): ConstellationExplorationGraph {
  return createConstellationGraph({
    nodes: [
      createConstellationNode("seed-1", "seed", { confidenceScore: 0.72 }),
      createConstellationNode("theme-1", "theme", { confidenceScore: 0.72 }),
      createConstellationNode("evidence-1", "evidence", { confidenceScore: 0.72 }),
      createConstellationNode("counter-1", "counterargument", { confidenceScore: 0.72 }),
      createConstellationNode("question-1", "question", { confidenceScore: 0.72 }),
    ],
  });
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
