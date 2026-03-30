"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowsOutCardinalIcon, CompassToolIcon, XIcon } from "@phosphor-icons/react";
import { getConstellationNodeDispositions } from "../../../domain/gadfly/constellation-working-set";
import type {
  ConstellationBranchActionKind,
  ConstellationExplorationGraph,
  ConstellationWorkingSetDisposition,
} from "../../../domain/gadfly/constellation-types";
import type { ConstellationBoardMode } from "./constellation-board-types";
import { DraftPrepView } from "./constellation-draft-prep-view";
import {
  selectConstellationDraftPrepGroups,
  type ConstellationDraftPrepGroup,
} from "./constellation-draft-prep-selectors";
import ConstellationDraftNode from "./constellation-draft-node";
import ConstellationExplorationNodeCard from "./constellation-exploration-node";
import { selectConstellationVisibleStructuralChildren } from "./constellation-exploration-selectors";
import { ExplorationPanel } from "./constellation-exploration-panel";
import {
  computeConstellationFlowNodesFromGraph,
  getConstellationEdgeHandles,
  getConstellationHandleId,
  type ConstellationFlowNode,
} from "./constellation-flow-nodes";
import { selectNextConstellationFocusableItemId } from "./constellation-keyboard";
import ConstellationSummaryNode from "./constellation-summary-node";
import ConstellationThemeNode from "./constellation-theme-node";
import { ConstellationCallbacksProvider } from "./constellation-callbacks-context";
import {
  selectConstellationGroupedNodeChildren,
  selectConstellationNodeById,
  selectConstellationNodeLineage,
  selectConstellationVisibleCanvas,
} from "./constellation-exploration-selectors";

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
  onSetWorkingSetDisposition: (
    nodeId: string,
    disposition: ConstellationWorkingSetDisposition,
    enabled: boolean,
  ) => void;
  onRemoveNodeFromWorkingSet: (nodeId: string) => void;
  onEnterDraftPrep: () => void;
  onExitDraftPrep: () => void;
  onSwapDraftPrepItemOrder: (leftNodeId: string, rightNodeId: string) => void;
  onStartFirstDraft: () => void;
};

type ConstellationCanvasProps = Omit<
  ConstellationBoardProps,
  "onExitDraftPrep" | "onSwapDraftPrepItemOrder" | "onStartFirstDraft" | "mode"
> & {
  mode: Exclude<ConstellationBoardMode, "hidden" | "draft_prep">;
  workingSetNodeCount: number;
  useInDraftCount: number;
};

type DraftPrepBoardProps = Pick<
  ConstellationBoardProps,
  | "mode"
  | "onClose"
  | "onExitDraftPrep"
  | "onSelectNode"
  | "onSetWorkingSetDisposition"
  | "onRemoveNodeFromWorkingSet"
  | "onSwapDraftPrepItemOrder"
  | "onStartFirstDraft"
> & {
  draftPrepGroups: readonly ConstellationDraftPrepGroup[];
  useInDraftCount: number;
};

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
  exploration: ConstellationExplorationNodeCard,
  summary: ConstellationSummaryNode,
} as const;

function ConstellationCanvas({
  expandedThemeId,
  graph,
  mode,
  onClose,
  onEnterDraftPrep,
  onRemoveNodeFromWorkingSet,
  onResetExploration,
  onRunBranchAction,
  onSelectNode,
  onSetWorkingSetDisposition,
  onToggleShowOnlyCurrentBranch,
  pendingBranchAction,
  selectedNodeId,
  showOnlyCurrentBranch,
  useInDraftCount,
  workingSetNodeCount,
}: ConstellationCanvasProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow();
  const [revealedSummaryParentNodeIds, setRevealedSummaryParentNodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [focusedCanvasItemId, setFocusedCanvasItemId] = useState<string | null>(
    () => selectedNodeId ?? graph.nodes.find((node) => node.family === "theme")?.id ?? null,
  );
  const selectedNode = useMemo(
    () => selectConstellationNodeById(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const selectedDispositions = useMemo(
    () => new Set(selectedNode ? getConstellationNodeDispositions(graph, selectedNode.id) : []),
    [graph, selectedNode],
  );
  const groupedChildren = useMemo(
    () => selectConstellationGroupedNodeChildren(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const visibleCanvas = useMemo(
    () =>
      selectConstellationVisibleCanvas(graph, {
        expandedThemeId,
        revealedSummaryParentNodeIds,
        selectedNodeId,
        showOnlyCurrentBranch,
      }),
    [expandedThemeId, graph, revealedSummaryParentNodeIds, selectedNodeId, showOnlyCurrentBranch],
  );
  const visibleCanvasNodes = visibleCanvas.nodes;
  const visibleCanvasEdges = visibleCanvas.edges;
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
  const themeBranchVisibility = useMemo(
    () =>
      selectConstellationVisibleStructuralChildren(graph, {
        parentNodeId: expandedThemeId,
        revealedSummaryParentNodeIds,
      }),
    [expandedThemeId, graph, revealedSummaryParentNodeIds],
  );
  const activeBranchVisibility = useMemo(
    () =>
      selectConstellationVisibleStructuralChildren(graph, {
        parentNodeId: activeBranchRootId,
        revealedSummaryParentNodeIds,
      }),
    [activeBranchRootId, graph, revealedSummaryParentNodeIds],
  );
  const activeBranchChildIds = useMemo(
    () => new Set(activeBranchVisibility.visibleNodes.map((node) => node.id)),
    [activeBranchVisibility.visibleNodes],
  );
  const nodes = useMemo(
    (): ConstellationFlowNode[] =>
      computeConstellationFlowNodesFromGraph({
        activeBranchChildIds,
        activeBranchChildren: activeBranchVisibility.visibleNodes,
        activeBranchHiddenCount: activeBranchVisibility.hiddenNodes.length,
        activeBranchRootId,
        expandedThemeId,
        graph,
        selectedLineage,
        selectedLineageIds,
        selectedNodeId,
        showOnlyCurrentBranch,
        themeBranchChildren: themeBranchVisibility.visibleNodes,
        themeBranchHiddenCount: themeBranchVisibility.hiddenNodes.length,
        visibleNodeIds,
      }),
    [
      activeBranchChildIds,
      activeBranchRootId,
      activeBranchVisibility.hiddenNodes.length,
      activeBranchVisibility.visibleNodes,
      expandedThemeId,
      graph,
      selectedLineage,
      selectedLineageIds,
      selectedNodeId,
      showOnlyCurrentBranch,
      themeBranchVisibility.hiddenNodes.length,
      themeBranchVisibility.visibleNodes,
      visibleNodeIds,
    ],
  );
  const focusableCanvasItemIds = useMemo(
    () => nodes.filter((node) => node.type !== "draft").map((node) => node.id),
    [nodes],
  );
  const edges = useMemo((): Edge[] => {
    const flowNodeLookup = new Map(nodes.map((node) => [node.id, node]));

    return visibleCanvasEdges.map((edge) => {
      const isActivePath =
        selectedLineageIds.has(edge.fromNodeId) && selectedLineageIds.has(edge.toNodeId);
      const touchesActiveBranch = activeBranchRootId
        ? edge.fromNodeId === activeBranchRootId || edge.toNodeId === activeBranchRootId
        : false;
      const sourceNode = flowNodeLookup.get(edge.fromNodeId) ?? null;
      const targetNode = flowNodeLookup.get(edge.toNodeId) ?? null;
      const handles =
        sourceNode && targetNode ? getConstellationEdgeHandles(sourceNode, targetNode) : null;

      return {
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        type: "default",
        sourceHandle: handles ? getConstellationHandleId("source", handles.sourceSide) : undefined,
        targetHandle: handles ? getConstellationHandleId("target", handles.targetSide) : undefined,
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
  }, [activeBranchRootId, nodes, selectedLineageIds, showOnlyCurrentBranch, visibleCanvasEdges]);

  useEffect(() => {
    setRevealedSummaryParentNodeIds(new Set());
  }, [expandedThemeId]);

  useEffect(() => {
    setFocusedCanvasItemId((currentFocusedItemId) => {
      if (focusableCanvasItemIds.length === 0) {
        return null;
      }

      if (currentFocusedItemId && focusableCanvasItemIds.includes(currentFocusedItemId)) {
        return currentFocusedItemId;
      }

      if (selectedNodeId && focusableCanvasItemIds.includes(selectedNodeId)) {
        return selectedNodeId;
      }

      return focusableCanvasItemIds[0] ?? null;
    });
  }, [focusableCanvasItemIds, selectedNodeId]);

  const scheduleCanvasItemFocus = useCallback((itemId: string | null) => {
    let frameId = 0;
    let attemptsRemaining = 8;

    const focusCanvasItem = () => {
      if (!itemId) {
        boardRef.current?.focus();
        return;
      }

      // React Flow mounts and remounts node DOM after state/layout updates, so the intended
      // focus target can be absent for a few frames even though the next visible item is known.
      const element = boardRef.current?.querySelector<HTMLElement>(
        `[data-constellation-focus-id="${CSS.escape(itemId)}"]`,
      );
      if (element) {
        if (document.activeElement !== element) {
          element.focus();
        }
        return;
      }

      if (attemptsRemaining <= 0) {
        boardRef.current?.focus();
        return;
      }

      attemptsRemaining -= 1;
      frameId = window.requestAnimationFrame(focusCanvasItem);
    };

    frameId = window.requestAnimationFrame(focusCanvasItem);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!focusedCanvasItemId) {
      return;
    }

    return scheduleCanvasItemFocus(focusedCanvasItemId);
  }, [focusableCanvasItemIds, focusedCanvasItemId, mode, scheduleCanvasItemFocus]);

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
      focusedCanvasItemId,
      onFocusCanvasItem: setFocusedCanvasItemId,
      onRevealSummaryNode: (parentNodeId: string) => {
        setRevealedSummaryParentNodeIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.add(parentNodeId);
          return nextIds;
        });
      },
      onSelectNode,
      onResetExploration,
      selectedNodeId,
      expandedThemeId,
    }),
    [expandedThemeId, focusedCanvasItemId, onResetExploration, onSelectNode, selectedNodeId],
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
        onKeyDown={(event) => {
          if (event.key !== "Escape") {
            const target = event.target;
            const isCanvasItemTarget =
              target instanceof HTMLElement &&
              target.closest("[data-constellation-focus-id]") !== null;

            if (
              (event.key === "ArrowRight" ||
                event.key === "ArrowDown" ||
                event.key === "ArrowLeft" ||
                event.key === "ArrowUp") &&
              (isCanvasItemTarget || target === boardRef.current)
            ) {
              event.preventDefault();
              const nextItemId = selectNextConstellationFocusableItemId(
                focusableCanvasItemIds,
                focusedCanvasItemId,
                event.key === "ArrowRight" || event.key === "ArrowDown" ? "next" : "previous",
              );

              if (nextItemId) {
                setFocusedCanvasItemId(nextItemId);
              }
            }

            return;
          }

          event.preventDefault();
          event.stopPropagation();
          if (selectedNodeId || expandedThemeId) {
            const nextFocusItemId = expandedThemeId ?? focusableCanvasItemIds[0] ?? null;
            boardRef.current?.focus();
            setFocusedCanvasItemId(nextFocusItemId);
            onResetExploration();
            scheduleCanvasItemFocus(nextFocusItemId);
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
                {workingSetNodeCount > 0 ? (
                  <button
                    type="button"
                    className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
                    data-testid="constellation-draft-prep-button"
                    onClick={onEnterDraftPrep}
                  >
                    <span>Draft prep ({workingSetNodeCount})</span>
                  </button>
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
                  selectedDispositions={selectedDispositions}
                  workingSetNodeCount={workingSetNodeCount}
                  onResetExploration={onResetExploration}
                  onRunBranchAction={onRunBranchAction}
                  onSelectNode={onSelectNode}
                  onSetWorkingSetDisposition={onSetWorkingSetDisposition}
                  onRemoveNodeFromWorkingSet={onRemoveNodeFromWorkingSet}
                  onEnterDraftPrep={onEnterDraftPrep}
                />
              ) : useInDraftCount > 0 ? (
                <div className="gaddr-constellation-panel px-4 py-3 text-right">
                  <div className="gaddr-constellation-panel-heading">Draft prep ready</div>
                  <p className="gaddr-constellation-panel-copy mt-1">
                    {useInDraftCount} draft-ready point{useInDraftCount === 1 ? "" : "s"} collected so far.
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </ConstellationCallbacksProvider>
  );
}

function DraftPrepBoard({
  draftPrepGroups,
  useInDraftCount,
  mode,
  onClose,
  onExitDraftPrep,
  onRemoveNodeFromWorkingSet,
  onSelectNode,
  onSetWorkingSetDisposition,
  onStartFirstDraft,
  onSwapDraftPrepItemOrder,
}: DraftPrepBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const canStartFirstDraft = useInDraftCount > 0;

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  return (
    <div
      ref={boardRef}
      tabIndex={-1}
      data-testid="constellation-board"
      className={`gaddr-constellation-flow-container ${
        mode === "transition_out" ? "gaddr-constellation-flow-container--exit" : ""
      }`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onExitDraftPrep();
      }}
    >
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          data-testid="constellation-back-to-exploration"
          className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
          onClick={onExitDraftPrep}
        >
          <span>Back to exploration</span>
        </button>
        <button
          type="button"
          data-testid="constellation-start-first-draft"
          className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
          onClick={onStartFirstDraft}
          disabled={!canStartFirstDraft}
        >
          <span>Start first draft</span>
        </button>
        <button
          type="button"
          data-testid="constellation-close-button"
          className="gaddr-constellation-close gaddr-constellation-toolbar-button p-2"
          onClick={onClose}
        >
          <XIcon size={16} />
          <span>Return to freewrite</span>
        </button>
      </div>

      <div className="h-full overflow-y-auto pt-20">
        <DraftPrepView
          groups={draftPrepGroups}
          onSelectNode={(nodeId) => {
            onSelectNode(nodeId);
            onExitDraftPrep();
          }}
          onSetWorkingSetDisposition={onSetWorkingSetDisposition}
          onRemoveNodeFromWorkingSet={onRemoveNodeFromWorkingSet}
          onSwapDraftPrepItemOrder={onSwapDraftPrepItemOrder}
        />
        <div className="pointer-events-none fixed bottom-5 right-5 z-10">
          <div className="gaddr-constellation-panel px-4 py-3 text-right">
            <div className="gaddr-constellation-panel-heading">Draft-ready points</div>
            <p className="gaddr-constellation-panel-copy mt-1">
              {useInDraftCount} marked for the first draft.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstellationBoardInner(props: ConstellationBoardProps) {
  const draftPrepGroups = useMemo(() => selectConstellationDraftPrepGroups(props.graph), [props.graph]);
  const { workingSetNodeCount, useInDraftCount } = useMemo(() => {
    let total = 0;
    let draftCount = 0;
    for (const group of draftPrepGroups) {
      total += group.items.length;
      for (const item of group.items) {
        if (item.isUsedInDraft) {
          draftCount += 1;
        }
      }
    }
    return { workingSetNodeCount: total, useInDraftCount: draftCount };
  }, [draftPrepGroups]);

  if (props.mode === "draft_prep") {
    return (
      <DraftPrepBoard
        draftPrepGroups={draftPrepGroups}
        useInDraftCount={useInDraftCount}
        mode={props.mode}
        onClose={props.onClose}
        onExitDraftPrep={props.onExitDraftPrep}
        onSelectNode={props.onSelectNode}
        onSetWorkingSetDisposition={props.onSetWorkingSetDisposition}
        onRemoveNodeFromWorkingSet={props.onRemoveNodeFromWorkingSet}
        onSwapDraftPrepItemOrder={props.onSwapDraftPrepItemOrder}
        onStartFirstDraft={props.onStartFirstDraft}
      />
    );
  }

  return (
    <ConstellationCanvas
      graph={props.graph}
      mode={props.mode}
      selectedNodeId={props.selectedNodeId}
      expandedThemeId={props.expandedThemeId}
      showOnlyCurrentBranch={props.showOnlyCurrentBranch}
      pendingBranchAction={props.pendingBranchAction}
      onClose={props.onClose}
      onSelectNode={props.onSelectNode}
      onResetExploration={props.onResetExploration}
      onToggleShowOnlyCurrentBranch={props.onToggleShowOnlyCurrentBranch}
      onRunBranchAction={props.onRunBranchAction}
      onSetWorkingSetDisposition={props.onSetWorkingSetDisposition}
      onRemoveNodeFromWorkingSet={props.onRemoveNodeFromWorkingSet}
      onEnterDraftPrep={props.onEnterDraftPrep}
      workingSetNodeCount={workingSetNodeCount}
      useInDraftCount={useInDraftCount}
    />
  );
}

export default function ConstellationBoard(props: ConstellationBoardProps) {
  return (
    <ReactFlowProvider>
      <ConstellationBoardInner {...props} />
    </ReactFlowProvider>
  );
}
