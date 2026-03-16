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

const CONSTELLATION_CHILD_GROUP_LABELS: Record<ConstellationChildGroupFamily, string> = {
  counterargument: "Counterarguments",
  evidence: "Evidence",
  question: "Questions",
  source: "Sources",
  response: "Responses",
  research_task: "Research Tasks",
};

const NODE_LOOKUP_CACHE = new WeakMap<
  ConstellationExplorationGraph,
  Map<string, ConstellationExplorationNode>
>();

function createNodeLookup(
  graph: ConstellationExplorationGraph,
): Map<string, ConstellationExplorationNode> {
  const cachedLookup = NODE_LOOKUP_CACHE.get(graph);
  if (cachedLookup) {
    return cachedLookup;
  }

  const nextLookup = new Map(graph.nodes.map((node) => [node.id, node]));
  NODE_LOOKUP_CACHE.set(graph, nextLookup);
  return nextLookup;
}

export function selectConstellationNodeById(
  graph: ConstellationExplorationGraph,
  nodeId: string | null,
): ConstellationExplorationNode | null {
  if (!nodeId) {
    return null;
  }

  return createNodeLookup(graph).get(nodeId) ?? null;
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
  const nodeLookup = createNodeLookup(graph);

  return graph.edges.filter((edge) => {
    if (edge.fromNodeId !== graph.seedNodeId) {
      return false;
    }

    return nodeLookup.get(edge.toNodeId)?.family === "theme";
  });
}

export function selectConstellationThemeChildren(
  graph: ConstellationExplorationGraph,
  themeId: string | null,
): ConstellationExplorationNode[] {
  if (!themeId) {
    return [];
  }

  const nodeLookup = createNodeLookup(graph);
  const seenNodeIds = new Set<string>();
  const children: ConstellationExplorationNode[] = [];

  for (const edge of graph.edges) {
    if (edge.fromNodeId !== themeId) {
      continue;
    }

    const node = nodeLookup.get(edge.toNodeId);
    if (!node || node.family === "seed" || node.family === "theme") {
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

export function selectConstellationGroupedThemeChildren(
  graph: ConstellationExplorationGraph,
  themeId: string | null,
): ConstellationChildNodeGroup[] {
  const children = selectConstellationThemeChildren(graph, themeId);

  return CONSTELLATION_CHILD_GROUP_ORDER.map((family) => ({
    family,
    label: CONSTELLATION_CHILD_GROUP_LABELS[family],
    nodes: children.filter((node) => node.family === family),
  })).filter((group) => group.nodes.length > 0);
}
