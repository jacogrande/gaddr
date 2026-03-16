"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowsOutCardinalIcon, CompassToolIcon, XIcon } from "@phosphor-icons/react";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
import type {
  ConstellationBranchActionKind,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";
import {
  CONSTELLATION_CANVAS_HEIGHT,
  CONSTELLATION_CANVAS_WIDTH,
  DRAFT_NODE_HALF_HEIGHT,
  DRAFT_NODE_HALF_WIDTH,
  EXPLORATION_NODE_HALF_HEIGHT,
  EXPLORATION_NODE_HALF_WIDTH,
  THEME_NODE_HALF_HEIGHT,
  THEME_NODE_HALF_WIDTH,
  computeConstellationBranchPositions,
  scaleConstellationPositions,
} from "./constellation-layout-utils";
import { ConstellationCallbacksProvider } from "./constellation-callbacks-context";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedNodeChildren,
  selectConstellationNodeById,
  selectConstellationNodeChildren,
  selectConstellationNodeLineage,
  selectConstellationVisibleCanvasEdges,
  selectConstellationVisibleCanvasNodes,
} from "./constellation-exploration-selectors";
import {
  formatConstellationConfidenceSummary,
  formatConstellationNodeFamilyLabel,
  formatConstellationProvenanceSummary,
} from "./constellation-formatters";
import type { ConstellationBoardMode } from "./constellation-board-types";
import ConstellationDraftNode from "./constellation-draft-node";
import ConstellationExplorationNodeCard from "./constellation-exploration-node";
import ConstellationThemeNode from "./constellation-theme-node";

type PendingBranchActionState = {
  nodeId: string;
  kind: ConstellationBranchActionKind;
} | null;

type ConstellationBoardProps = {
  graph: ConstellationExplorationGraph;
  mode: Exclude<ConstellationBoardMode, "hidden">;
  selectedNodeId: string | null;
  expandedThemeId: string | null;
  showOnlyCurrentBranch: boolean;
  pendingBranchAction: PendingBranchActionState;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onResetExploration: () => void;
  onToggleShowOnlyCurrentBranch: () => void;
  onRunBranchAction: (nodeId: string, actionKind: ConstellationBranchActionKind) => void;
};

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
  exploration: ConstellationExplorationNodeCard,
} as const;

function buildPanelTitle(node: ConstellationExplorationNode): string {
  if (node.family === "theme") {
    return "Theme exploration";
  }

  return `${formatConstellationNodeFamilyLabel(node.family)} branch`;
}

function ExplorationPanel({
  selectedNode,
  selectedNodeId,
  pendingBranchAction,
  groupedChildren,
  onResetExploration,
  onRunBranchAction,
  onSelectNode,
}: {
  selectedNode: ConstellationExplorationNode;
  selectedNodeId: string | null;
  pendingBranchAction: PendingBranchActionState;
  groupedChildren: ReturnType<typeof selectConstellationGroupedNodeChildren>;
  onResetExploration: () => void;
  onRunBranchAction: (nodeId: string, actionKind: ConstellationBranchActionKind) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <aside
      data-testid="constellation-panel"
      className="gaddr-constellation-panel overflow-y-auto p-5"
      style={{
        width: "min(29rem, 90vw)",
        maxHeight: "72vh",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="font-semibold uppercase tracking-[0.12em]"
            style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
          >
            {buildPanelTitle(selectedNode)}
          </div>
          <h2
            className="mt-2 font-semibold leading-tight"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            {selectedNode.title}
          </h2>
          <p
            className="mt-1 leading-snug"
            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-muted)" }}
          >
            {selectedNode.summary}
          </p>
        </div>
        <button
          type="button"
          className="gaddr-constellation-close p-1.5 shrink-0"
          onClick={onResetExploration}
          aria-label="Return to atlas overview"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <section>
          <h3 className="gaddr-constellation-panel-heading">Why this surfaced</h3>
          <p className="gaddr-constellation-panel-copy">{selectedNode.whySurfaced.label}</p>
          {selectedNode.whySurfaced.detail ? (
            <p className="gaddr-constellation-panel-copy mt-1 text-[color:var(--app-muted)]">
              {selectedNode.whySurfaced.detail}
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Confidence</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationConfidenceSummary(selectedNode.confidenceScore)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Provenance</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationProvenanceSummary(selectedNode)}
          </p>
        </section>

        {selectedNode.suggestedBranchActions.length > 0 ? (
          <section>
            <h3 className="gaddr-constellation-panel-heading">Suggested next actions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedNode.suggestedBranchActions.map((action) => {
                const isPending =
                  pendingBranchAction?.nodeId === selectedNode.id &&
                  pendingBranchAction.kind === action.kind;

                return (
                  <button
                    key={action.kind}
                    type="button"
                    className="gaddr-constellation-action-chip"
                    data-testid={`constellation-action-${action.kind}`}
                    onClick={() => {
                      onRunBranchAction(selectedNode.id, action.kind);
                    }}
                    disabled={pendingBranchAction !== null}
                    aria-busy={isPending}
                  >
                    {isPending ? "Generating..." : action.label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {groupedChildren.map((group) => (
          <section key={group.family}>
            <h3 className="gaddr-constellation-panel-heading">{group.label}</h3>
            <div className="mt-2 space-y-2">
              {group.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`gaddr-constellation-panel-card gaddr-constellation-panel-card-button ${
                    selectedNodeId === node.id ? "gaddr-constellation-panel-card--selected" : ""
                  }`}
                  onClick={() => {
                    onSelectNode(node.id);
                  }}
                  data-testid={`constellation-panel-child-${node.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <h4
                        className="font-semibold leading-tight"
                        style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                      >
                        {node.title}
                      </h4>
                      <p className="gaddr-constellation-panel-copy mt-1">{node.summary}</p>
                    </div>
                    <span className="gaddr-constellation-pill shrink-0">
                      {formatConstellationConfidenceSummary(node.confidenceScore)}
                    </span>
                  </div>
                  <p className="gaddr-constellation-panel-meta mt-2 text-left">
                    {formatConstellationProvenanceSummary(node)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function ConstellationBoardInner({
  graph,
  mode,
  selectedNodeId,
  expandedThemeId,
  showOnlyCurrentBranch,
  pendingBranchAction,
  onClose,
  onSelectNode,
  onResetExploration,
  onToggleShowOnlyCurrentBranch,
  onRunBranchAction,
}: ConstellationBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow();
  const selectedNode = useMemo(
    () => selectConstellationNodeById(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const groupedChildren = useMemo(
    () => selectConstellationGroupedNodeChildren(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const visibleCanvasNodes = useMemo(
    () =>
      selectConstellationVisibleCanvasNodes(graph, {
        expandedThemeId,
        selectedNodeId,
        showOnlyCurrentBranch,
      }),
    [expandedThemeId, graph, selectedNodeId, showOnlyCurrentBranch],
  );
  const visibleCanvasEdges = useMemo(
    () =>
      selectConstellationVisibleCanvasEdges(graph, {
        expandedThemeId,
        selectedNodeId,
        showOnlyCurrentBranch,
      }),
    [expandedThemeId, graph, selectedNodeId, showOnlyCurrentBranch],
  );
  const selectedLineage = useMemo(
    () => selectConstellationNodeLineage(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleCanvasNodes.map((node) => node.id)),
    [visibleCanvasNodes],
  );
  const selectedLineageIds = useMemo(
    () => new Set(selectedLineage.map((node) => node.id)),
    [selectedLineage],
  );
  const activeBranchRootId = selectedNodeId ?? expandedThemeId;
  const activeBranchChildIds = useMemo(
    () =>
      new Set(
        selectConstellationNodeChildren(graph, activeBranchRootId, {
          structuralOnly: true,
        }).map((node) => node.id),
      ),
    [activeBranchRootId, graph],
  );

  const nodes = useMemo((): Node[] => {
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
    const flowNodes: Node[] = [];
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
    const lineage = selectConstellationNodeLineage(graph, selectedNodeId ?? expandedThemeId);

    const addBranchNodes = (
      rootId: string,
      childNodes: readonly ConstellationExplorationNode[],
      parentId: string | null,
      depth: number,
    ) => {
      const rootPosition = centerPositions.get(rootId);
      if (!rootPosition || childNodes.length === 0) {
        return;
      }

      const parentPosition = parentId ? centerPositions.get(parentId) ?? null : null;
      const outwardAngle = parentPosition
        ? Math.atan2(rootPosition.y - parentPosition.y, rootPosition.x - parentPosition.x)
        : Math.atan2(
            rootPosition.y - CONSTELLATION_CANVAS_HEIGHT / 2,
            rootPosition.x - CONSTELLATION_CANVAS_WIDTH / 2,
          );

      const positions = computeConstellationBranchPositions(childNodes, {
        rootX: rootPosition.x,
        rootY: rootPosition.y,
        outwardAngle,
        distance: 206 + depth * 30,
        spread: Math.min(Math.PI * 0.92, Math.max(Math.PI * 0.34, childNodes.length * 0.38)),
      });

      for (const [index, position] of positions.entries()) {
        const childNode = explorationNodeLookup.get(position.nodeId);
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

    const themeChildren = selectConstellationNodeChildren(graph, expandedThemeId, {
      structuralOnly: true,
    }).filter((node) => visibleNodeIds.has(node.id));
    addBranchNodes(expandedThemeId, themeChildren, graph.seedNodeId, 1);

    for (let index = 3; index < lineage.length; index += 1) {
      const node = lineage[index];
      const parentNode = lineage[index - 1];
      const grandparentNode = lineage[index - 2] ?? null;
      if (!node || !parentNode || !visibleNodeIds.has(node.id)) {
        continue;
      }

      addBranchNodes(
        parentNode.id,
        [node],
        grandparentNode?.id ?? graph.seedNodeId,
        index - 1,
      );
    }

    if (activeBranchRootId && activeBranchRootId !== expandedThemeId) {
      const activeLineage = selectConstellationNodeLineage(graph, activeBranchRootId);
      const activeRootIndex = activeLineage.findIndex((node) => node.id === activeBranchRootId);
      const activeRootParentId =
        activeRootIndex > 0 ? activeLineage[activeRootIndex - 1]?.id ?? null : expandedThemeId;

      addBranchNodes(
        activeBranchRootId,
        selectConstellationNodeChildren(graph, activeBranchRootId, {
          structuralOnly: true,
        }).filter((node) => visibleNodeIds.has(node.id)),
        activeRootParentId,
        Math.max(activeLineage.length, 2),
      );
    }

    return flowNodes;
  }, [
    activeBranchChildIds,
    activeBranchRootId,
    expandedThemeId,
    graph,
    selectedLineageIds,
    selectedNodeId,
    showOnlyCurrentBranch,
    visibleNodeIds,
  ]);

  const edges = useMemo((): Edge[] => {
    return visibleCanvasEdges.map((edge) => {
      const isActivePath =
        selectedLineageIds.has(edge.fromNodeId) && selectedLineageIds.has(edge.toNodeId);
      const touchesActiveBranch = activeBranchRootId
        ? edge.fromNodeId === activeBranchRootId || edge.toNodeId === activeBranchRootId
        : false;

      return {
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        type: "default",
        animated: false,
        selectable: false,
        style: {
          stroke:
            isActivePath || touchesActiveBranch
              ? "color-mix(in srgb, var(--accent) 48%, var(--border-strong))"
              : "color-mix(in srgb, var(--accent) 18%, var(--border-soft))",
          strokeWidth: isActivePath || touchesActiveBranch ? 1.8 : 1.2,
          opacity: showOnlyCurrentBranch || isActivePath || touchesActiveBranch ? 0.92 : 0.66,
        },
      };
    });
  }, [activeBranchRootId, selectedLineageIds, showOnlyCurrentBranch, visibleCanvasEdges]);

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void reactFlow.fitView({
        duration: 0,
        padding: expandedThemeId ? 0.18 : 0.22,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [edges, expandedThemeId, nodes, reactFlow]);

  const isExiting = mode === "transition_out";
  const callbacksValue = useMemo(
    () => ({
      onSelectNode,
      onResetExploration,
      selectedNodeId,
      expandedThemeId,
    }),
    [expandedThemeId, onResetExploration, onSelectNode, selectedNodeId],
  );

  return (
    <ConstellationCallbacksProvider value={callbacksValue}>
      <div
        ref={boardRef}
        tabIndex={-1}
        data-testid="constellation-board"
        className={`gaddr-constellation-flow-container ${
          isExiting ? "gaddr-constellation-flow-container--exit" : ""
        }`}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          if (selectedNodeId || expandedThemeId) {
            onResetExploration();
            return;
          }

          onClose();
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.38}
          maxZoom={1.8}
        >
          <Panel position="top-right">
            <div className="flex flex-col items-end gap-2">
              <div className="flex max-w-[34rem] flex-wrap justify-end gap-2">
                {expandedThemeId ? (
                  <>
                    <button
                      type="button"
                      className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
                      data-testid="constellation-branch-toggle"
                      aria-pressed={showOnlyCurrentBranch}
                      onClick={onToggleShowOnlyCurrentBranch}
                    >
                      <ArrowsOutCardinalIcon size={15} />
                      <span>
                        {showOnlyCurrentBranch ? "Show atlas context" : "Show only current branch"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
                      data-testid="constellation-reset-button"
                      onClick={onResetExploration}
                    >
                      <CompassToolIcon size={15} />
                      <span>Reset to atlas overview</span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  data-testid="constellation-close-button"
                  className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
                  style={{ fontSize: "var(--constellation-text-base)" }}
                  onClick={onClose}
                  aria-label="Close constellation exploration"
                >
                  <XIcon size={16} />
                  <span>Return to freewrite</span>
                </button>
              </div>
              {selectedNode ? (
                <ExplorationPanel
                  selectedNode={selectedNode}
                  selectedNodeId={selectedNodeId}
                  pendingBranchAction={pendingBranchAction}
                  groupedChildren={groupedChildren}
                  onResetExploration={onResetExploration}
                  onRunBranchAction={onRunBranchAction}
                  onSelectNode={onSelectNode}
                />
              ) : null}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </ConstellationCallbacksProvider>
  );
}

export default function ConstellationBoard(props: ConstellationBoardProps) {
  return (
    <ReactFlowProvider>
      <ConstellationBoardInner {...props} />
    </ReactFlowProvider>
  );
}
