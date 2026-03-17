import type {
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
  ConstellationWorkingSetItem,
} from "../../../src/domain/gadfly/constellation-types";

export function createConstellationNode(
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

export function createConstellationEdge(
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

export function createConstellationWorkingSetItem(
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

export function createConstellationGraph(
  overrides?: Partial<ConstellationExplorationGraph>,
): ConstellationExplorationGraph {
  return {
    id: "graph-1",
    noteId: "note-1",
    generatedAt: "2026-03-16T00:00:00.000Z",
    seedNodeId: "seed-1",
    nodes: overrides?.nodes ?? [createConstellationNode("seed-1", "seed")],
    edges: overrides?.edges ?? [],
    workingSet: overrides?.workingSet ?? [],
    suggestedActions: overrides?.suggestedActions ?? [],
  };
}
