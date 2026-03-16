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
};

type GraphIndices = {
  nodeLookup: Map<string, ConstellationExplorationNode>;
  outgoingEdges: Map<string, ConstellationExplorationEdge[]>;
  incomingEdges: Map<string, ConstellationExplorationEdge[]>;
  structuralOutgoingEdges: Map<string, ConstellationExplorationEdge[]>;
  structuralIncomingEdges: Map<string, ConstellationExplorationEdge[]>;
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
    outgoingEdges,
    incomingEdges,
    structuralOutgoingEdges,
    structuralIncomingEdges,
  };
  GRAPH_INDEX_CACHE.set(graph, nextIndices);
  return nextIndices;
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
    addNodes(selectConstellationThemeChildren(graph, options.expandedThemeId));
    addNodes(lineage);
  }

  addNodes(
    selectConstellationNodeChildren(graph, activeBranchRootId, {
      structuralOnly: true,
      includeFamilies: CONSTELLATION_CHILD_GROUP_ORDER,
    }),
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
  return graph.nodes.filter(
    (node) => node.id === graph.seedNodeId || node.family === "theme",
  );
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

export function selectConstellationNodeChildren(
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

export function selectConstellationVisibleCanvasNodeIds(
  graph: ConstellationExplorationGraph,
  options: ConstellationCanvasSelectionOptions,
): string[] {
  const visibleIds = createVisibleNodeIdSet(graph, options);

  return graph.nodes
    .filter((node) => visibleIds.has(node.id))
    .map((node) => node.id);
}

export function selectConstellationVisibleCanvasNodes(
  graph: ConstellationExplorationGraph,
  options: ConstellationCanvasSelectionOptions,
): ConstellationExplorationNode[] {
  const visibleIds = createVisibleNodeIdSet(graph, options);

  return graph.nodes.filter((node) => visibleIds.has(node.id));
}

export function selectConstellationVisibleCanvasEdges(
  graph: ConstellationExplorationGraph,
  options: ConstellationCanvasSelectionOptions,
): ConstellationExplorationEdge[] {
  const visibleIds = createVisibleNodeIdSet(graph, options);

  return graph.edges.filter((edge) => {
    if (!edge.isStructural) {
      return false;
    }

    return visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId);
  });
}
