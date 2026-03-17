import type {
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";

const CONSTELLATION_CHILD_GROUP_ORDER = [
  "counterargument",
  "evidence",
  "question",
  "source",
  "response",
  "research_task",
] as const;

const CONSTELLATION_MAX_VISIBLE_GENERATED_CHILDREN = 3;

type ConstellationChildGroupFamily = (typeof CONSTELLATION_CHILD_GROUP_ORDER)[number];

type ConstellationChildNodeGroup = {
  family: ConstellationChildGroupFamily;
  label: string;
  nodes: ConstellationExplorationNode[];
};

type ConstellationCanvasSelectionOptions = {
  expandedThemeId: string | null;
  selectedNodeId: string | null;
  showOnlyCurrentBranch: boolean;
  revealedSummaryParentNodeIds?: ReadonlySet<string>;
};

type GraphIndices = {
  nodeLookup: Map<string, ConstellationExplorationNode>;
  graphNodeOrder: Map<string, number>;
  outgoingEdges: Map<string, ConstellationExplorationEdge[]>;
  incomingEdges: Map<string, ConstellationExplorationEdge[]>;
  structuralOutgoingEdges: Map<string, ConstellationExplorationEdge[]>;
  structuralIncomingEdges: Map<string, ConstellationExplorationEdge[]>;
};

type VisibleStructuralChildrenOptions = {
  parentNodeId: string | null;
  includeFamilies?: readonly ConstellationExplorationNode["family"][];
  maxVisibleGeneratedChildren?: number;
  revealedSummaryParentNodeIds?: ReadonlySet<string>;
};

type ConstellationVisibleStructuralChildren = {
  parentNodeId: string | null;
  visibleNodes: ConstellationExplorationNode[];
  hiddenNodes: ConstellationExplorationNode[];
};

const CONSTELLATION_CHILD_GROUP_LABELS: Record<ConstellationChildGroupFamily, string> = {
  counterargument: "Counterarguments",
  evidence: "Evidence",
  question: "Questions",
  source: "Sources",
  response: "Responses",
  research_task: "Research Tasks",
};

const GRAPH_INDEX_CACHE = new WeakMap<ConstellationExplorationGraph, GraphIndices>();

function createGraphIndices(graph: ConstellationExplorationGraph): GraphIndices {
  const cachedIndices = GRAPH_INDEX_CACHE.get(graph);
  if (cachedIndices) {
    return cachedIndices;
  }

  const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]));
  const graphNodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const outgoingEdges = new Map<string, ConstellationExplorationEdge[]>();
  const incomingEdges = new Map<string, ConstellationExplorationEdge[]>();
  const structuralOutgoingEdges = new Map<string, ConstellationExplorationEdge[]>();
  const structuralIncomingEdges = new Map<string, ConstellationExplorationEdge[]>();

  for (const edge of graph.edges) {
    const outgoing = outgoingEdges.get(edge.fromNodeId) ?? [];
    outgoing.push(edge);
    outgoingEdges.set(edge.fromNodeId, outgoing);

    const incoming = incomingEdges.get(edge.toNodeId) ?? [];
    incoming.push(edge);
    incomingEdges.set(edge.toNodeId, incoming);

    if (!edge.isStructural) {
      continue;
    }

    const structuralOutgoing = structuralOutgoingEdges.get(edge.fromNodeId) ?? [];
    structuralOutgoing.push(edge);
    structuralOutgoingEdges.set(edge.fromNodeId, structuralOutgoing);

    const structuralIncoming = structuralIncomingEdges.get(edge.toNodeId) ?? [];
    structuralIncoming.push(edge);
    structuralIncomingEdges.set(edge.toNodeId, structuralIncoming);
  }

  const nextIndices = {
    nodeLookup,
    graphNodeOrder,
    outgoingEdges,
    incomingEdges,
    structuralOutgoingEdges,
    structuralIncomingEdges,
  };
  GRAPH_INDEX_CACHE.set(graph, nextIndices);
  return nextIndices;
}

function orderNodesByGraphPosition(
  graph: ConstellationExplorationGraph,
  nodes: readonly ConstellationExplorationNode[],
): ConstellationExplorationNode[] {
  const { graphNodeOrder } = createGraphIndices(graph);

  return [...nodes].sort(
    (left, right) =>
      (graphNodeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (graphNodeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function rankNodesBySignal(
  graph: ConstellationExplorationGraph,
  nodes: readonly ConstellationExplorationNode[],
): ConstellationExplorationNode[] {
  const { graphNodeOrder } = createGraphIndices(graph);

  return [...nodes].sort((left, right) => {
    if (left.confidenceScore !== right.confidenceScore) {
      return right.confidenceScore - left.confidenceScore;
    }

    return (
      (graphNodeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (graphNodeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function createVisibleNodeIdSet(
  graph: ConstellationExplorationGraph,
  options: ConstellationCanvasSelectionOptions,
): Set<string> {
  const visibleIds = new Set<string>();

  if (!options.expandedThemeId) {
    for (const node of selectConstellationCanvasNodes(graph)) {
      visibleIds.add(node.id);
    }

    return visibleIds;
  }

  const addNodes = (nodes: readonly ConstellationExplorationNode[]) => {
    for (const node of nodes) {
      visibleIds.add(node.id);
    }
  };

  const selectedOrThemeId = options.selectedNodeId ?? options.expandedThemeId;
  const lineage = selectConstellationNodeLineage(graph, selectedOrThemeId);
  const activeBranchRootId = selectedOrThemeId;

  if (options.showOnlyCurrentBranch) {
    addNodes(lineage);
  } else {
    addNodes(selectConstellationCanvasNodes(graph));
    addNodes(
      selectConstellationVisibleStructuralChildren(graph, {
        parentNodeId: options.expandedThemeId,
        includeFamilies: CONSTELLATION_CHILD_GROUP_ORDER,
        revealedSummaryParentNodeIds: options.revealedSummaryParentNodeIds,
      }).visibleNodes,
    );
    addNodes(lineage);
  }

  addNodes(
    selectConstellationVisibleStructuralChildren(graph, {
      parentNodeId: activeBranchRootId,
      includeFamilies: CONSTELLATION_CHILD_GROUP_ORDER,
      revealedSummaryParentNodeIds: options.revealedSummaryParentNodeIds,
    }).visibleNodes,
  );

  return visibleIds;
}

export function selectConstellationNodeById(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
): ConstellationExplorationNode | null {
  if (!nodeId) {
    return null;
  }

  return createGraphIndices(graph).nodeLookup.get(nodeId) ?? null;
}

export function selectConstellationCanvasNodes(
  graph: ConstellationExplorationGraph,
): ConstellationExplorationNode[] {
  return graph.nodes.filter((node) => node.id === graph.seedNodeId || node.family === "theme");
}

export function selectConstellationOverviewEdges(
  graph: ConstellationExplorationGraph,
): ConstellationExplorationEdge[] {
  const { nodeLookup } = createGraphIndices(graph);

  return graph.edges.filter((edge) => {
    if (!edge.isStructural || edge.fromNodeId !== graph.seedNodeId) {
      return false;
    }

    return nodeLookup.get(edge.toNodeId)?.family === "theme";
  });
}

function selectConstellationNodeChildren(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
  options?: {
    structuralOnly?: boolean;
    includeFamilies?: readonly ConstellationExplorationNode["family"][];
  },
): ConstellationExplorationNode[] {
  if (!nodeId) {
    return [];
  }

  const indices = createGraphIndices(graph);
  const edgeSource = options?.structuralOnly ? indices.structuralOutgoingEdges : indices.outgoingEdges;
  const includeFamilies = options?.includeFamilies ?? null;
  const seenNodeIds = new Set<string>();
  const children: ConstellationExplorationNode[] = [];

  for (const edge of edgeSource.get(nodeId) ?? []) {
    const node = indices.nodeLookup.get(edge.toNodeId);
    if (!node) {
      continue;
    }

    if (includeFamilies && !includeFamilies.includes(node.family)) {
      continue;
    }

    if (seenNodeIds.has(node.id)) {
      continue;
    }

    seenNodeIds.add(node.id);
    children.push(node);
  }

  return children;
}

export function selectConstellationVisibleStructuralChildren(
  graph: ConstellationExplorationGraph,
  options: VisibleStructuralChildrenOptions,
): ConstellationVisibleStructuralChildren {
  const { parentNodeId } = options;

  if (!parentNodeId) {
    return {
      parentNodeId,
      visibleNodes: [],
      hiddenNodes: [],
    };
  }

  const allChildren = selectConstellationNodeChildren(graph, parentNodeId, {
    structuralOnly: true,
    includeFamilies: options.includeFamilies,
  });
  const maxVisibleGeneratedChildren =
    options.maxVisibleGeneratedChildren ?? CONSTELLATION_MAX_VISIBLE_GENERATED_CHILDREN;
  const isRevealed = options.revealedSummaryParentNodeIds?.has(parentNodeId) ?? false;

  if (isRevealed) {
    return {
      parentNodeId,
      visibleNodes: allChildren,
      hiddenNodes: [],
    };
  }

  const stableChildren = orderNodesByGraphPosition(graph, allChildren);
  const generatedChildren = stableChildren.filter((node) => node.generatedFromAction !== null);
  if (generatedChildren.length <= maxVisibleGeneratedChildren) {
    return {
      parentNodeId,
      visibleNodes: stableChildren,
      hiddenNodes: [],
    };
  }

  const visibleGeneratedIds = new Set(
    rankNodesBySignal(graph, generatedChildren)
      .slice(0, maxVisibleGeneratedChildren)
      .map((node) => node.id),
  );

  const visibleNodes = stableChildren.filter(
    (node) => node.generatedFromAction === null || visibleGeneratedIds.has(node.id),
  );
  const hiddenNodes = stableChildren.filter(
    (node) => node.generatedFromAction !== null && !visibleGeneratedIds.has(node.id),
  );

  return {
    parentNodeId,
    visibleNodes,
    hiddenNodes,
  };
}

export function selectConstellationThemeChildren(
  graph: ConstellationExplorationGraph,
  themeId: string | null,
): ConstellationExplorationNode[] {
  return selectConstellationNodeChildren(graph, themeId, {
    structuralOnly: true,
    includeFamilies: CONSTELLATION_CHILD_GROUP_ORDER,
  });
}

export function selectConstellationGroupedNodeChildren(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
): ConstellationChildNodeGroup[] {
  const children = selectConstellationNodeChildren(graph, nodeId, {
    structuralOnly: true,
    includeFamilies: CONSTELLATION_CHILD_GROUP_ORDER,
  });

  return CONSTELLATION_CHILD_GROUP_ORDER.map((family) => ({
    family,
    label: CONSTELLATION_CHILD_GROUP_LABELS[family],
    nodes: children.filter((node) => node.family === family),
  })).filter((group) => group.nodes.length > 0);
}

export function selectConstellationNodeLineage(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
): ConstellationExplorationNode[] {
  if (!nodeId) {
    return [];
  }

  const indices = createGraphIndices(graph);
  const lineage: ConstellationExplorationNode[] = [];
  const visitedNodeIds = new Set<string>();
  let currentNodeId: string | null = nodeId;

  while (currentNodeId && !visitedNodeIds.has(currentNodeId)) {
    visitedNodeIds.add(currentNodeId);
    const currentNode = indices.nodeLookup.get(currentNodeId);
    if (!currentNode) {
      break;
    }

    lineage.push(currentNode);
    const parentEdges: ConstellationExplorationEdge[] =
      indices.structuralIncomingEdges.get(currentNodeId) ?? [];
    const parentEdge: ConstellationExplorationEdge | null = parentEdges[0] ?? null;
    currentNodeId = parentEdge?.fromNodeId ?? null;
  }

  return lineage.reverse();
}

export function selectConstellationOwningThemeId(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
): string | null {
  const lineage = selectConstellationNodeLineage(graph, nodeId);

  for (let index = lineage.length - 1; index >= 0; index -= 1) {
    if (lineage[index]?.family === "theme") {
      return lineage[index]?.id ?? null;
    }
  }

  return null;
}

export function selectConstellationVisibleCanvas(
  graph: ConstellationExplorationGraph,
  options: ConstellationCanvasSelectionOptions,
): {
  nodes: ConstellationExplorationNode[];
  edges: ConstellationExplorationEdge[];
} {
  const visibleIds = createVisibleNodeIdSet(graph, options);

  return {
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => {
      if (!edge.isStructural) {
        return false;
      }

      return visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId);
    }),
  };
}
