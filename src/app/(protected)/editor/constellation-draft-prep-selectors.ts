import type {
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";
import { selectConstellationOwningThemeId } from "./constellation-exploration-selectors";

export type ConstellationDraftPrepItem = {
  node: ConstellationExplorationNode;
  theme: ConstellationExplorationNode | null;
  isSaved: boolean;
  isPinned: boolean;
  isUsedInDraft: boolean;
  draftOrder: number | null;
};

export type ConstellationDraftPrepGroup = {
  theme: ConstellationExplorationNode | null;
  items: ConstellationDraftPrepItem[];
};

function createDraftOrderLookup(
  graph: ConstellationExplorationGraph,
): Map<string, number> {
  const draftOrderByNodeId = new Map<string, number>();

  for (const item of graph.workingSet) {
    if (item.disposition === "use_in_draft" && typeof item.order === "number") {
      draftOrderByNodeId.set(item.nodeId, item.order);
    }
  }

  return draftOrderByNodeId;
}

export function selectConstellationDraftPrepGroups(
  graph: ConstellationExplorationGraph,
): ConstellationDraftPrepGroup[] {
  const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]));
  const themeNodes = graph.nodes.filter((node) => node.family === "theme");
  const themeNodeOrder = new Map(themeNodes.map((node, index) => [node.id, index]));
  const graphNodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const draftOrderByNodeId = createDraftOrderLookup(graph);
  const workingSetNodeIds = new Set(graph.workingSet.map((item) => item.nodeId));
  const groups = new Map<string, ConstellationDraftPrepGroup>();

  for (const node of graph.nodes) {
    if (!workingSetNodeIds.has(node.id)) {
      continue;
    }

    const themeId =
      node.family === "theme" ? node.id : selectConstellationOwningThemeId(graph, node.id) ?? "__ungrouped__";
    const theme = themeId === "__ungrouped__" ? null : nodeLookup.get(themeId) ?? null;
    const groupKey = theme?.id ?? "__ungrouped__";
    const existingGroup = groups.get(groupKey) ?? {
      theme,
      items: [],
    };

    existingGroup.items.push({
      node,
      theme,
      isSaved: node.isSavedToWorkingSet,
      isPinned: node.isPinned,
      isUsedInDraft: node.isUsedInDraft,
      draftOrder: draftOrderByNodeId.get(node.id) ?? null,
    });
    groups.set(groupKey, existingGroup);
  }

  return [...groups.values()]
    .sort((left, right) => {
      const leftOrder = left.theme
        ? (themeNodeOrder.get(left.theme.id) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = right.theme
        ? (themeNodeOrder.get(right.theme.id) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    })
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        if (left.isUsedInDraft && right.isUsedInDraft) {
          return (left.draftOrder ?? Number.MAX_SAFE_INTEGER) - (right.draftOrder ?? Number.MAX_SAFE_INTEGER);
        }

        if (left.isUsedInDraft !== right.isUsedInDraft) {
          return left.isUsedInDraft ? -1 : 1;
        }

        if (left.isPinned !== right.isPinned) {
          return left.isPinned ? -1 : 1;
        }

        return (
          (graphNodeOrder.get(left.node.id) ?? Number.MAX_SAFE_INTEGER) -
          (graphNodeOrder.get(right.node.id) ?? Number.MAX_SAFE_INTEGER)
        );
      }),
    }));
}
