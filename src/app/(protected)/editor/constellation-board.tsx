"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { getConstellationNodeDispositions } from "../../../domain/gadfly/constellation-working-set";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
import type {
  ConstellationBranchActionKind,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
  ConstellationWorkingSetDisposition,
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
import { buildConstellationTalkingPointsContent, selectConstellationDraftPrepGroups } from "./constellation-draft-prep";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedNodeChildren,
  selectConstellationNodeById,
  selectConstellationNodeLineage,
  selectConstellationVisibleStructuralChildren,
  selectConstellationVisibleCanvasEdges,
  selectConstellationVisibleCanvasNodes,
} from "./constellation-exploration-selectors";
import {
  formatConstellationCompactTrustSummary,
  formatConstellationConfidenceSummary,
  formatConstellationProvenanceSummary,
  formatConstellationSignalLabel,
} from "./constellation-formatters";
import { selectNextConstellationFocusableItemId } from "./constellation-keyboard";
import type { ConstellationBoardMode } from "./constellation-board-types";
import ConstellationDraftNode from "./constellation-draft-node";
import ConstellationExplorationNodeCard from "./constellation-exploration-node";
import ConstellationSummaryNode from "./constellation-summary-node";
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

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
  exploration: ConstellationExplorationNodeCard,
  summary: ConstellationSummaryNode,
} as const;

function buildPanelTitle(node: ConstellationExplorationNode): string {
  if (node.family === "theme") {
    return "Theme exploration";
  }

  return `${formatConstellationSignalLabel(node.family)} branch`;
}

function DraftPrepDispositionBadge({
  label,
}: {
  label: string;
}) {
  return <span className="gaddr-constellation-pill">{label}</span>;
}

function ExplorationPanel({
  selectedNode,
  selectedNodeId,
  pendingBranchAction,
  groupedChildren,
  selectedDispositions,
  workingSetNodeCount,
  onResetExploration,
  onRunBranchAction,
  onSelectNode,
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onEnterDraftPrep,
}: {
  selectedNode: ConstellationExplorationNode;
  selectedNodeId: string | null;
  pendingBranchAction: PendingBranchActionState;
  groupedChildren: ReturnType<typeof selectConstellationGroupedNodeChildren>;
  selectedDispositions: Set<ConstellationWorkingSetDisposition>;
  workingSetNodeCount: number;
  onResetExploration: () => void;
  onRunBranchAction: (nodeId: string, actionKind: ConstellationBranchActionKind) => void;
  onSelectNode: (nodeId: string) => void;
  onSetWorkingSetDisposition: (
    nodeId: string,
    disposition: ConstellationWorkingSetDisposition,
    enabled: boolean,
  ) => void;
  onRemoveNodeFromWorkingSet: (nodeId: string) => void;
  onEnterDraftPrep: () => void;
}) {
  const isSaved = selectedDispositions.has("saved");
  const isPinned = selectedDispositions.has("pinned");
  const isUsedInDraft = selectedDispositions.has("use_in_draft");

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
          <p className="gaddr-constellation-panel-meta mt-1">
            {formatConstellationCompactTrustSummary(selectedNode)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Provenance</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationProvenanceSummary(selectedNode)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Working set</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isSaved}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "saved", !isSaved);
              }}
            >
              {isSaved ? "Saved" : "Save to working set"}
            </button>
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isPinned}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "pinned", !isPinned);
              }}
            >
              {isPinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isUsedInDraft}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "use_in_draft", !isUsedInDraft);
              }}
            >
              {isUsedInDraft ? "In draft" : "Use in draft"}
            </button>
            {selectedDispositions.size > 0 ? (
              <button
                type="button"
                className="gaddr-constellation-action-chip"
                onClick={() => {
                  onRemoveNodeFromWorkingSet(selectedNode.id);
                }}
              >
                Remove from working set
              </button>
            ) : null}
            {workingSetNodeCount > 0 ? (
              <button
                type="button"
                data-testid="constellation-open-draft-prep"
                className="gaddr-constellation-action-chip"
                onClick={onEnterDraftPrep}
              >
                Go to draft prep
              </button>
            ) : null}
          </div>
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
                      <p className="gaddr-constellation-panel-meta mt-1">
                        {formatConstellationSignalLabel(node.family)} · {formatConstellationCompactTrustSummary(node)}
                      </p>
                      <p className="gaddr-constellation-panel-copy mt-1">{node.summary}</p>
                    </div>
                    <span className="gaddr-constellation-pill shrink-0">
                      {formatConstellationConfidenceSummary(node.confidenceScore)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-left">
                    {node.isUsedInDraft ? <DraftPrepDispositionBadge label="In draft" /> : null}
                    {node.isPinned ? <DraftPrepDispositionBadge label="Pinned" /> : null}
                    {node.isSavedToWorkingSet ? <DraftPrepDispositionBadge label="Saved" /> : null}
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

function DraftPrepView({
  graph,
  onSelectNode,
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onSwapDraftPrepItemOrder,
}: {
  graph: ConstellationExplorationGraph;
  onSelectNode: (nodeId: string) => void;
  onSetWorkingSetDisposition: (
    nodeId: string,
    disposition: ConstellationWorkingSetDisposition,
    enabled: boolean,
  ) => void;
  onRemoveNodeFromWorkingSet: (nodeId: string) => void;
  onSwapDraftPrepItemOrder: (leftNodeId: string, rightNodeId: string) => void;
}) {
  const draftPrepGroups = useMemo(() => selectConstellationDraftPrepGroups(graph), [graph]);

  if (draftPrepGroups.length === 0) {
    return (
      <section
        data-testid="constellation-draft-prep"
        className="gaddr-constellation-panel gaddr-constellation-draft-prep flex h-full items-center justify-center p-8"
      >
        <div className="max-w-xl text-center">
          <div className="gaddr-constellation-panel-heading">Draft prep</div>
          <h2
            className="mt-2 font-semibold"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            Nothing collected yet
          </h2>
          <p className="gaddr-constellation-panel-copy mt-3">
            Save nodes or mark them as use in draft while exploring, then return here to shape the first draft.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="constellation-draft-prep"
      className="gaddr-constellation-draft-prep mx-auto flex h-full w-full max-w-6xl flex-col gap-5 p-5"
    >
      <header className="gaddr-constellation-panel p-5">
        <div className="gaddr-constellation-panel-heading">Draft prep</div>
        <h2
          className="mt-2 font-semibold"
          style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
        >
          Shape the first draft from collected branches
        </h2>
        <p className="gaddr-constellation-panel-copy mt-2">
          Review saved findings, promote the strongest ideas into draft-ready talking points, and trim anything that should stay exploratory.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {draftPrepGroups.map((group) => {
          const draftItemIds = group.items
            .filter((item) => item.isUsedInDraft)
            .map((item) => item.node.id);

          return (
            <section key={group.theme?.id ?? "ungrouped"} className="gaddr-constellation-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="gaddr-constellation-panel-heading">
                    {group.theme ? "Theme group" : "Collected group"}
                  </div>
                  <h3
                    className="mt-2 font-semibold"
                    style={{ fontSize: "var(--constellation-text-xl)", color: "var(--app-fg)" }}
                  >
                    {group.theme?.title ?? "Collected nodes"}
                  </h3>
                </div>
                <span className="gaddr-constellation-pill">{group.items.length} items</span>
              </div>

              <div className="mt-4 space-y-3">
                {group.items.map((item) => {
                  const draftIndex = draftItemIds.indexOf(item.node.id);
                  const previousDraftNodeId = draftIndex > 0 ? draftItemIds[draftIndex - 1] ?? null : null;
                  const nextDraftNodeId =
                    draftIndex >= 0 && draftIndex < draftItemIds.length - 1
                      ? draftItemIds[draftIndex + 1] ?? null
                      : null;

                  return (
                    <article
                      key={item.node.id}
                      className="gaddr-constellation-panel-card"
                      data-testid={`constellation-draft-item-${item.node.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="gaddr-constellation-panel-heading">
                            {formatConstellationSignalLabel(item.node.family)}
                          </div>
                          <h4
                            className="mt-1 font-semibold leading-tight"
                            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                          >
                            {item.node.title}
                          </h4>
                          <p className="gaddr-constellation-panel-copy mt-1">{item.node.summary}</p>
                          <p className="gaddr-constellation-panel-meta mt-2">
                            {item.node.whySurfaced.label}
                          </p>
                        </div>
                        <span className="gaddr-constellation-pill shrink-0">
                          {formatConstellationConfidenceSummary(item.node.confidenceScore)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.isUsedInDraft ? <DraftPrepDispositionBadge label="In draft" /> : null}
                        {item.isPinned ? <DraftPrepDispositionBadge label="Pinned" /> : null}
                        {item.isSaved ? <DraftPrepDispositionBadge label="Saved" /> : null}
                      </div>

                      <p className="gaddr-constellation-panel-meta mt-3">
                        {formatConstellationProvenanceSummary(item.node)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          aria-pressed={item.isUsedInDraft}
                          onClick={() => {
                            onSetWorkingSetDisposition(item.node.id, "use_in_draft", !item.isUsedInDraft);
                          }}
                        >
                          {item.isUsedInDraft ? "In draft" : "Use in draft"}
                        </button>
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          aria-pressed={item.isPinned}
                          onClick={() => {
                            onSetWorkingSetDisposition(item.node.id, "pinned", !item.isPinned);
                          }}
                        >
                          {item.isPinned ? "Pinned" : "Pin"}
                        </button>
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          onClick={() => {
                            onRemoveNodeFromWorkingSet(item.node.id);
                          }}
                        >
                          Remove
                        </button>
                        {item.isUsedInDraft ? (
                          <>
                            <button
                              type="button"
                              className="gaddr-constellation-action-chip"
                              disabled={previousDraftNodeId === null}
                              onClick={() => {
                                if (previousDraftNodeId) {
                                  onSwapDraftPrepItemOrder(item.node.id, previousDraftNodeId);
                                }
                              }}
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              className="gaddr-constellation-action-chip"
                              disabled={nextDraftNodeId === null}
                              onClick={() => {
                                if (nextDraftNodeId) {
                                  onSwapDraftPrepItemOrder(item.node.id, nextDraftNodeId);
                                }
                              }}
                            >
                              Move down
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          onClick={() => {
                            onSelectNode(item.node.id);
                          }}
                        >
                          Return to node
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ConstellationCanvas({
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
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onEnterDraftPrep,
}: Omit<
  ConstellationBoardProps,
  "onExitDraftPrep" | "onSwapDraftPrepItemOrder" | "onStartFirstDraft"
>) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow();
  const [revealedSummaryParentNodeIds, setRevealedSummaryParentNodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [focusedCanvasItemId, setFocusedCanvasItemId] = useState<string | null>(
    () => selectedNodeId ?? graph.nodes.find((node) => node.family === "theme")?.id ?? null,
  );
  const draftPrepGroups = useMemo(() => selectConstellationDraftPrepGroups(graph), [graph]);
  const workingSetNodeCount = useMemo(
    () =>
      draftPrepGroups.reduce((total, group) => total + group.items.length, 0),
    [draftPrepGroups],
  );
  const useInDraftCount = useMemo(
    () =>
      draftPrepGroups.reduce(
        (total, group) => total + group.items.filter((item) => item.isUsedInDraft).length,
        0,
      ),
    [draftPrepGroups],
  );
  const selectedNode = useMemo(
    () => selectConstellationNodeById(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const selectedDispositions = useMemo(
    () =>
      new Set(
        selectedNode ? getConstellationNodeDispositions(graph, selectedNode.id) : [],
      ),
    [graph, selectedNode],
  );
  const groupedChildren = useMemo(
    () => selectConstellationGroupedNodeChildren(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const visibleCanvasNodes = useMemo(
    () =>
      selectConstellationVisibleCanvasNodes(graph, {
        expandedThemeId,
        revealedSummaryParentNodeIds,
        selectedNodeId,
        showOnlyCurrentBranch,
      }),
    [expandedThemeId, graph, revealedSummaryParentNodeIds, selectedNodeId, showOnlyCurrentBranch],
  );
  const visibleCanvasEdges = useMemo(
    () =>
      selectConstellationVisibleCanvasEdges(graph, {
        expandedThemeId,
        revealedSummaryParentNodeIds,
        selectedNodeId,
        showOnlyCurrentBranch,
      }),
    [expandedThemeId, graph, revealedSummaryParentNodeIds, selectedNodeId, showOnlyCurrentBranch],
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

      const layoutItems = [
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
        distance: 206 + depth * 30,
        spread: Math.min(Math.PI * 0.92, Math.max(Math.PI * 0.34, layoutItems.length * 0.38)),
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

    const themeChildren = themeBranchVisibility.visibleNodes.filter((node) => visibleNodeIds.has(node.id));
    addBranchNodes(
      expandedThemeId,
      themeChildren,
      themeBranchVisibility.hiddenNodes.length,
      graph.seedNodeId,
      1,
    );

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
        0,
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
        activeBranchVisibility.visibleNodes.filter((node) => visibleNodeIds.has(node.id)),
        activeBranchVisibility.hiddenNodes.length,
        activeRootParentId,
        Math.max(activeLineage.length, 2),
      );
    }

    return flowNodes;
  }, [
    activeBranchChildIds,
    activeBranchVisibility.hiddenNodes.length,
    activeBranchVisibility.visibleNodes,
    activeBranchRootId,
    expandedThemeId,
    graph,
    selectedLineageIds,
    selectedNodeId,
    showOnlyCurrentBranch,
    themeBranchVisibility.hiddenNodes.length,
    themeBranchVisibility.visibleNodes,
    visibleNodeIds,
  ]);

  const focusableCanvasItemIds = useMemo(
    () => nodes.filter((node) => node.type !== "draft").map((node) => node.id),
    [nodes],
  );

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

  useEffect(() => {
    if (!focusedCanvasItemId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const element = boardRef.current?.querySelector<HTMLElement>(
        `[data-constellation-focus-id="${CSS.escape(focusedCanvasItemId)}"]`,
      );
      if (element && document.activeElement !== element) {
        element.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusedCanvasItemId, nodes.length]);

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
  graph,
  mode,
  onClose,
  onExitDraftPrep,
  onSelectNode,
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onSwapDraftPrepItemOrder,
  onStartFirstDraft,
}: Pick<
  ConstellationBoardProps,
  | "graph"
  | "mode"
  | "onClose"
  | "onExitDraftPrep"
  | "onSelectNode"
  | "onSetWorkingSetDisposition"
  | "onRemoveNodeFromWorkingSet"
  | "onSwapDraftPrepItemOrder"
  | "onStartFirstDraft"
>) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const draftPrepGroups = useMemo(() => selectConstellationDraftPrepGroups(graph), [graph]);
  const useInDraftCount = useMemo(
    () =>
      draftPrepGroups.reduce(
        (total, group) => total + group.items.filter((item) => item.isUsedInDraft).length,
        0,
      ),
    [draftPrepGroups],
  );
  const canStartFirstDraft =
    buildConstellationTalkingPointsContent(draftPrepGroups).length > 0;

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
          graph={graph}
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
  if (props.mode === "draft_prep") {
    return (
      <DraftPrepBoard
        graph={props.graph}
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

  return <ConstellationCanvas {...props} />;
}

export default function ConstellationBoard(props: ConstellationBoardProps) {
  return (
    <ReactFlowProvider>
      <ConstellationBoardInner {...props} />
    </ReactFlowProvider>
  );
}
