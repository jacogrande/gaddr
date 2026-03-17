import type { Node } from "@xyflow/react";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
import type {
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";
import {
  computeConstellationBranchDistance,
  computeConstellationBranchPositions,
  computeConstellationBranchSpread,
  CONSTELLATION_CANVAS_HEIGHT,
  CONSTELLATION_CANVAS_WIDTH,
  DRAFT_NODE_HALF_HEIGHT,
  DRAFT_NODE_HALF_WIDTH,
  EXPLORATION_NODE_HALF_HEIGHT,
  EXPLORATION_NODE_HALF_WIDTH,
  THEME_NODE_HALF_HEIGHT,
  THEME_NODE_HALF_WIDTH,
  scaleConstellationPositions,
} from "./constellation-layout-utils";
import { selectConstellationCanvasNodes } from "./constellation-exploration-selectors";

export type ConstellationDraftFlowNode = Node<{ seed: ConstellationExplorationNode }, "draft">;
export type ConstellationThemeFlowNode = Node<
  { theme: ConstellationExplorationNode; index: number },
  "theme"
>;
export type ConstellationExplorationFlowNode = Node<
  {
    node: ConstellationExplorationNode;
    index: number;
    isSelected: boolean;
    isDimmed: boolean;
  },
  "exploration"
>;
export type ConstellationSummaryFlowNode = Node<
  {
    summaryNodeId: string;
    parentNodeId: string;
    hiddenCount: number;
    index: number;
  },
  "summary"
>;

export type ConstellationFlowNode =
  | ConstellationDraftFlowNode
  | ConstellationThemeFlowNode
  | ConstellationExplorationFlowNode
  | ConstellationSummaryFlowNode;

type ComputeConstellationFlowNodesInput = {
  graph: ConstellationExplorationGraph;
  visibleNodeIds: ReadonlySet<string>;
  expandedThemeId: string | null;
  selectedNodeId: string | null;
  showOnlyCurrentBranch: boolean;
  selectedLineage: readonly ConstellationExplorationNode[];
  selectedLineageIds: ReadonlySet<string>;
  activeBranchRootId: string | null;
  activeBranchChildIds: ReadonlySet<string>;
  themeBranchChildren: readonly ConstellationExplorationNode[];
  themeBranchHiddenCount: number;
  activeBranchChildren: readonly ConstellationExplorationNode[];
  activeBranchHiddenCount: number;
};

type BranchLayoutItem =
  | {
      id: string;
      kind: "node";
    }
  | {
      id: string;
      kind: "summary";
    };

export function computeConstellationFlowNodesFromGraph({
  activeBranchChildIds,
  activeBranchChildren,
  activeBranchHiddenCount,
  activeBranchRootId,
  expandedThemeId,
  graph,
  selectedLineage,
  selectedLineageIds,
  selectedNodeId,
  showOnlyCurrentBranch,
  themeBranchChildren,
  themeBranchHiddenCount,
  visibleNodeIds,
}: ComputeConstellationFlowNodesInput): ConstellationFlowNode[] {
  const atlasNodes = selectConstellationCanvasNodes(graph);
  const seedNode = atlasNodes.find((node) => node.id === graph.seedNodeId) ?? null;
  const allThemeNodes = atlasNodes.filter((node) => node.family === "theme");
  const visibleThemeNodes = allThemeNodes.filter((node) => visibleNodeIds.has(node.id));
  const themePositions = new Map(
    scaleConstellationPositions(computeConstellationLayout(allThemeNodes)).map((position) => [
      position.themeId,
      position,
    ]),
  );
  const flowNodes: ConstellationFlowNode[] = [];
  const centerPositions = new Map<string, { x: number; y: number }>();

  if (seedNode && visibleNodeIds.has(seedNode.id)) {
    const centerX = CONSTELLATION_CANVAS_WIDTH / 2;
    const centerY = CONSTELLATION_CANVAS_HEIGHT / 2;
    centerPositions.set(seedNode.id, { x: centerX, y: centerY });
    flowNodes.push({
      id: seedNode.id,
      type: "draft",
      position: {
        x: centerX - DRAFT_NODE_HALF_WIDTH,
        y: centerY - DRAFT_NODE_HALF_HEIGHT,
      },
      data: { seed: seedNode },
      draggable: false,
    });
  }

  flowNodes.push(
    ...visibleThemeNodes.map((theme, index) => {
      const position = themePositions.get(theme.id) ?? {
        x: CONSTELLATION_CANVAS_WIDTH / 2,
        y: CONSTELLATION_CANVAS_HEIGHT / 2,
      };

      centerPositions.set(theme.id, position);
      return {
        id: theme.id,
        type: "theme" as const,
        position: {
          x: position.x - THEME_NODE_HALF_WIDTH,
          y: position.y - THEME_NODE_HALF_HEIGHT,
        },
        data: { theme, index },
        draggable: false,
      };
    }),
  );

  if (!expandedThemeId || !centerPositions.has(expandedThemeId)) {
    return flowNodes;
  }

  const explorationNodes = graph.nodes.filter(
    (node) =>
      visibleNodeIds.has(node.id) &&
      node.id !== graph.seedNodeId &&
      node.family !== "theme",
  );
  const explorationNodeLookup = new Map(explorationNodes.map((node) => [node.id, node]));

  const addBranchNodes = (
    rootId: string,
    childNodes: readonly ConstellationExplorationNode[],
    hiddenChildCount: number,
    parentId: string | null,
    depth: number,
  ) => {
    const rootPosition = centerPositions.get(rootId);
    if (!rootPosition || (childNodes.length === 0 && hiddenChildCount === 0)) {
      return;
    }

    const parentPosition = parentId ? centerPositions.get(parentId) ?? null : null;
    const outwardAngle = parentPosition
      ? Math.atan2(rootPosition.y - parentPosition.y, rootPosition.x - parentPosition.x)
      : Math.atan2(
          rootPosition.y - CONSTELLATION_CANVAS_HEIGHT / 2,
          rootPosition.x - CONSTELLATION_CANVAS_WIDTH / 2,
        );

    const layoutItems: BranchLayoutItem[] = [
      ...childNodes.map((childNode) => ({
        id: childNode.id,
        kind: "node" as const,
      })),
      ...(hiddenChildCount > 0
        ? [
            {
              id: `${rootId}:summary`,
              kind: "summary" as const,
            },
          ]
        : []),
    ];
    const positions = computeConstellationBranchPositions(layoutItems, {
      rootX: rootPosition.x,
      rootY: rootPosition.y,
      outwardAngle,
      distance: computeConstellationBranchDistance(depth),
      spread: computeConstellationBranchSpread(layoutItems.length),
    });

    for (const [index, position] of positions.entries()) {
      const layoutItem = layoutItems[index];
      if (!layoutItem) {
        continue;
      }

      if (layoutItem.kind === "summary") {
        centerPositions.set(layoutItem.id, { x: position.x, y: position.y });
        flowNodes.push({
          id: layoutItem.id,
          type: "summary",
          position: {
            x: position.x - EXPLORATION_NODE_HALF_WIDTH,
            y: position.y - EXPLORATION_NODE_HALF_HEIGHT,
          },
          data: {
            summaryNodeId: layoutItem.id,
            parentNodeId: rootId,
            hiddenCount: hiddenChildCount,
            index,
          },
          draggable: false,
        });
        continue;
      }

      const childNode = explorationNodeLookup.get(layoutItem.id);
      if (!childNode || centerPositions.has(childNode.id)) {
        continue;
      }

      centerPositions.set(childNode.id, { x: position.x, y: position.y });
      flowNodes.push({
        id: childNode.id,
        type: "exploration",
        position: {
          x: position.x - EXPLORATION_NODE_HALF_WIDTH,
          y: position.y - EXPLORATION_NODE_HALF_HEIGHT,
        },
        data: {
          node: childNode,
          index,
          isSelected: selectedNodeId === childNode.id,
          isDimmed:
            selectedNodeId !== null &&
            !showOnlyCurrentBranch &&
            !selectedLineageIds.has(childNode.id) &&
            !activeBranchChildIds.has(childNode.id),
        },
        draggable: false,
      });
    }
  };

  addBranchNodes(
    expandedThemeId,
    themeBranchChildren.filter((node) => visibleNodeIds.has(node.id)),
    themeBranchHiddenCount,
    graph.seedNodeId,
    1,
  );

  for (let index = 3; index < selectedLineage.length; index += 1) {
    const node = selectedLineage[index];
    const parentNode = selectedLineage[index - 1];
    const grandparentNode = selectedLineage[index - 2] ?? null;
    if (!node || !parentNode || !visibleNodeIds.has(node.id)) {
      continue;
    }

    addBranchNodes(
      parentNode.id,
      [node],
      0,
      grandparentNode?.id ?? graph.seedNodeId,
      index - 1,
    );
  }

  if (activeBranchRootId && activeBranchRootId !== expandedThemeId) {
    const activeRootIndex = selectedLineage.findIndex((node) => node.id === activeBranchRootId);
    const activeRootParentId =
      activeRootIndex > 0 ? selectedLineage[activeRootIndex - 1]?.id ?? null : expandedThemeId;

    addBranchNodes(
      activeBranchRootId,
      activeBranchChildren.filter((node) => visibleNodeIds.has(node.id)),
      activeBranchHiddenCount,
      activeRootParentId,
      Math.max(selectedLineage.length, 2),
    );
  }

  return flowNodes;
}
