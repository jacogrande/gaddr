import type {
  ConstellationExplorationGraph,
  ConstellationWorkingSetDisposition,
  ConstellationWorkingSetItem,
} from "./constellation-types";

type SetConstellationWorkingSetDispositionInput = {
  graph: ConstellationExplorationGraph;
  nodeId: string;
  disposition: ConstellationWorkingSetDisposition;
  enabled: boolean;
  addedAt?: string;
};

function sortWorkingSetItems(items: readonly ConstellationWorkingSetItem[]): ConstellationWorkingSetItem[] {
  return [...items].sort((left, right) => {
    if (left.disposition === "use_in_draft" && right.disposition === "use_in_draft") {
      return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
    }

    return left.addedAt.localeCompare(right.addedAt);
  });
}

function normalizeUseInDraftOrder(
  items: readonly ConstellationWorkingSetItem[],
): ConstellationWorkingSetItem[] {
  const orderedItems = sortWorkingSetItems(items);
  let nextUseInDraftOrder = 0;

  return orderedItems.map((item) => {
    if (item.disposition !== "use_in_draft") {
      return {
        ...item,
        order: null,
      };
    }

    const normalizedItem = {
      ...item,
      order: nextUseInDraftOrder,
    };
    nextUseInDraftOrder += 1;
    return normalizedItem;
  });
}

function syncGraphNodesWithWorkingSet(
  graph: ConstellationExplorationGraph,
  workingSet: readonly ConstellationWorkingSetItem[],
): ConstellationExplorationGraph {
  const dispositionsByNode = new Map<string, Set<ConstellationWorkingSetDisposition>>();

  for (const item of workingSet) {
    const dispositions = dispositionsByNode.get(item.nodeId) ?? new Set<ConstellationWorkingSetDisposition>();
    dispositions.add(item.disposition);
    dispositionsByNode.set(item.nodeId, dispositions);
  }

  return {
    ...graph,
    workingSet: [...workingSet],
    nodes: graph.nodes.map((node) => {
      const dispositions = dispositionsByNode.get(node.id) ?? new Set<ConstellationWorkingSetDisposition>();

      return {
        ...node,
        isPinned: node.status === "pinned" || dispositions.has("pinned"),
        isSavedToWorkingSet: dispositions.has("saved"),
        isUsedInDraft: dispositions.has("use_in_draft"),
      };
    }),
  };
}

export function getConstellationNodeDispositions(
  graph: ConstellationExplorationGraph,
  nodeId: string,
): ConstellationWorkingSetDisposition[] {
  return graph.workingSet
    .filter((item) => item.nodeId === nodeId)
    .map((item) => item.disposition);
}

export function setConstellationWorkingSetDisposition({
  graph,
  nodeId,
  disposition,
  enabled,
  addedAt,
}: SetConstellationWorkingSetDispositionInput): ConstellationExplorationGraph {
  const timestamp = addedAt ?? graph.generatedAt;
  const existingItems = normalizeUseInDraftOrder(graph.workingSet);
  const nextItems = existingItems.filter(
    (item) => !(item.nodeId === nodeId && item.disposition === disposition),
  );

  if (enabled) {
    const nextUseInDraftOrder =
      disposition === "use_in_draft"
        ? nextItems.filter((item) => item.disposition === "use_in_draft").length
        : null;

    nextItems.push({
      nodeId,
      disposition,
      addedAt: timestamp,
      order: nextUseInDraftOrder,
    });
  }

  return syncGraphNodesWithWorkingSet(graph, normalizeUseInDraftOrder(nextItems));
}

export function removeConstellationNodeFromWorkingSet(
  graph: ConstellationExplorationGraph,
  nodeId: string,
): ConstellationExplorationGraph {
  const nextItems = graph.workingSet.filter((item) => item.nodeId !== nodeId);
  return syncGraphNodesWithWorkingSet(graph, normalizeUseInDraftOrder(nextItems));
}

export function swapConstellationUseInDraftItemOrder(
  graph: ConstellationExplorationGraph,
  leftNodeId: string,
  rightNodeId: string,
): ConstellationExplorationGraph {
  if (leftNodeId === rightNodeId) {
    return graph;
  }

  const orderedUseInDraftItems = normalizeUseInDraftOrder(
    graph.workingSet.filter((item) => item.disposition === "use_in_draft"),
  );
  const leftItem = orderedUseInDraftItems.find((item) => item.nodeId === leftNodeId) ?? null;
  const rightItem = orderedUseInDraftItems.find((item) => item.nodeId === rightNodeId) ?? null;
  if (!leftItem || !rightItem) {
    return graph;
  }

  const swappedItems = orderedUseInDraftItems.map((item) => {
    if (item.nodeId === leftNodeId) {
      return {
        ...item,
        order: rightItem.order,
      };
    }

    if (item.nodeId === rightNodeId) {
      return {
        ...item,
        order: leftItem.order,
      };
    }

    return item;
  });

  const otherItems = graph.workingSet.filter((item) => item.disposition !== "use_in_draft");

  return syncGraphNodesWithWorkingSet(
    graph,
    normalizeUseInDraftOrder([...otherItems, ...swappedItems]),
  );
}
