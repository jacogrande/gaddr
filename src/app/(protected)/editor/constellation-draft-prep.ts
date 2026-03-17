import type { JSONContent } from "@tiptap/core";
import type { ConstellationExplorationGraph, ConstellationExplorationNode } from "../../../domain/gadfly/constellation-types";
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

function createNodeLookup(
  graph: ConstellationExplorationGraph,
): Map<string, ConstellationExplorationNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function createWorkingSetState(graph: ConstellationExplorationGraph): {
  savedNodeIds: Set<string>;
  pinnedNodeIds: Set<string>;
  useInDraftNodeIds: Set<string>;
  draftOrderByNodeId: Map<string, number>;
} {
  const savedNodeIds = new Set<string>();
  const pinnedNodeIds = new Set<string>();
  const useInDraftNodeIds = new Set<string>();
  const draftOrderByNodeId = new Map<string, number>();

  for (const item of graph.workingSet) {
    if (item.disposition === "saved") {
      savedNodeIds.add(item.nodeId);
    }

    if (item.disposition === "pinned") {
      pinnedNodeIds.add(item.nodeId);
    }

    if (item.disposition === "use_in_draft") {
      useInDraftNodeIds.add(item.nodeId);
      if (typeof item.order === "number") {
        draftOrderByNodeId.set(item.nodeId, item.order);
      }
    }
  }

  return {
    savedNodeIds,
    pinnedNodeIds,
    useInDraftNodeIds,
    draftOrderByNodeId,
  };
}

export function selectConstellationDraftPrepGroups(
  graph: ConstellationExplorationGraph,
): ConstellationDraftPrepGroup[] {
  const nodeLookup = createNodeLookup(graph);
  const themeNodes = graph.nodes.filter((node) => node.family === "theme");
  const themeNodeOrder = new Map(themeNodes.map((node, index) => [node.id, index]));
  const graphNodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const workingSetState = createWorkingSetState(graph);
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
      isSaved: workingSetState.savedNodeIds.has(node.id),
      isPinned: workingSetState.pinnedNodeIds.has(node.id),
      isUsedInDraft: workingSetState.useInDraftNodeIds.has(node.id),
      draftOrder: workingSetState.draftOrderByNodeId.get(node.id) ?? null,
    });
    groups.set(groupKey, existingGroup);
  }

  return [...groups.values()]
    .sort((left, right) => {
      const leftOrder = left.theme ? (themeNodeOrder.get(left.theme.id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const rightOrder = right.theme ? (themeNodeOrder.get(right.theme.id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
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

        return (graphNodeOrder.get(left.node.id) ?? Number.MAX_SAFE_INTEGER) - (graphNodeOrder.get(right.node.id) ?? Number.MAX_SAFE_INTEGER);
      }),
    }));
}

export function buildConstellationTalkingPointsContent(
  groups: readonly ConstellationDraftPrepGroup[],
): JSONContent[] {
  const useInDraftGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.isUsedInDraft),
    }))
    .filter((group) => group.items.length > 0);

  if (useInDraftGroups.length === 0) {
    return [];
  }

  const content: JSONContent[] = [
    { type: "paragraph" },
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "First Draft Prep" }],
    },
  ];

  for (const group of useInDraftGroups) {
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: group.theme?.title ?? "Collected talking points" }],
    });

    content.push({
      type: "bulletList",
      content: group.items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `${item.node.title}: ${item.node.summary}`,
              },
            ],
          },
        ],
      })),
    });
  }

  return content;
}
