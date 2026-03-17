import { describe, expect, test } from "bun:test";
import {
  buildConstellationTalkingPointsContent,
  selectConstellationDraftPrepGroups,
} from "../../../src/app/(protected)/editor/constellation-draft-prep";
import type {
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
  ConstellationWorkingSetItem,
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
): ConstellationExplorationEdge {
  return {
    id,
    fromNodeId,
    toNodeId,
    relation,
    strength: 0.7,
    isStructural: true,
  };
}

function workingSetItem(
  nodeId: string,
  disposition: ConstellationWorkingSetItem["disposition"],
  order: number | null,
): ConstellationWorkingSetItem {
  return {
    nodeId,
    disposition,
    addedAt: "2026-03-16T00:00:00.000Z",
    order,
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
      node("theme-1", "theme", { title: "Theme One" }),
      node("theme-2", "theme", { title: "Theme Two" }),
      node("evidence-1", "evidence", { title: "Evidence One" }),
      node("counter-1", "counterargument", { title: "Counter One" }),
      node("source-1", "source", { title: "Source One" }),
    ],
    edges: [
      edge("seed-theme-1", "seed-1", "theme-1", "branches_into"),
      edge("seed-theme-2", "seed-1", "theme-2", "branches_into"),
      edge("theme-1-evidence", "theme-1", "evidence-1", "supports"),
      edge("theme-1-counter", "theme-1", "counter-1", "contradicts"),
      edge("theme-2-source", "theme-2", "source-1", "derived_from"),
    ],
    workingSet: [
      workingSetItem("evidence-1", "use_in_draft", 1),
      workingSetItem("counter-1", "saved", null),
      workingSetItem("source-1", "use_in_draft", 0),
      workingSetItem("source-1", "pinned", null),
    ],
    suggestedActions: [],
  };
}

describe("constellation draft prep", () => {
  test("groups working set items by owning theme and sorts draft items first", () => {
    const groups = selectConstellationDraftPrepGroups(graph());

    expect(groups.map((group) => group.theme?.id)).toEqual(["theme-1", "theme-2"]);
    expect(groups[0]?.items.map((item) => item.node.id)).toEqual(["evidence-1", "counter-1"]);
    expect(groups[1]?.items.map((item) => item.node.id)).toEqual(["source-1"]);
    expect(groups[0]?.items[1]?.isSaved).toBe(true);
    expect(groups[1]?.items[0]?.isPinned).toBe(true);
    expect(groups[1]?.items[0]?.isSaved).toBe(false);
    expect(groups[1]?.items[0]?.isUsedInDraft).toBe(true);
  });

  test("builds grouped talking-points content from use-in-draft items only", () => {
    const groups = selectConstellationDraftPrepGroups(graph());
    const content = buildConstellationTalkingPointsContent(groups);

    expect(content[1]?.type).toBe("heading");
    expect(content[2]?.type).toBe("heading");
    expect(content[3]?.type).toBe("bulletList");
    expect(content[4]?.type).toBe("heading");
    expect(content[5]?.type).toBe("bulletList");
    expect(JSON.stringify(content)).toContain("Evidence One: Summary for evidence-1");
    expect(JSON.stringify(content)).toContain("Source One: Summary for source-1");
    expect(JSON.stringify(content)).not.toContain("Counter One");
  });
});
