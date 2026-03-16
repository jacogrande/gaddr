"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { XIcon } from "@phosphor-icons/react";
import type {
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";
import {
  CONSTELLATION_CANVAS_HEIGHT,
  CONSTELLATION_CANVAS_WIDTH,
  DRAFT_NODE_HALF_HEIGHT,
  DRAFT_NODE_HALF_WIDTH,
} from "./constellation-layout-utils";
import {
  ConstellationCallbacksProvider,
} from "./constellation-callbacks-context";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedThemeChildren,
  selectConstellationNodeById,
  selectConstellationOverviewEdges,
} from "./constellation-exploration-selectors";
import ConstellationThemeNode from "./constellation-theme-node";
import ConstellationDraftNode from "./constellation-draft-node";
import type { ConstellationBoardMode } from "./constellation-board-types";

type ConstellationBoardProps = {
  graph: ConstellationExplorationGraph;
  mode: Exclude<ConstellationBoardMode, "hidden">;
  selectedThemeId: string | null;
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
  onClearSelection: () => void;
};

type ThemeCanvasPosition = {
  id: string;
  x: number;
  y: number;
};

const ATLAS_RADIUS_X = 0.36;
const ATLAS_RADIUS_Y = 0.32;
const ACTION_PREVIEW_LABELS = [
  "Find strongest objection",
  "Find stronger evidence",
  "Ask a deeper question",
] as const;

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
} as const;

function formatConfidenceSummary(score: number): string {
  const percentage = Math.round(Math.max(0, Math.min(1, score)) * 100);

  if (score >= 0.78) {
    return `High confidence · ${String(percentage)}%`;
  }

  if (score >= 0.52) {
    return `Moderate confidence · ${String(percentage)}%`;
  }

  return `Emerging confidence · ${String(percentage)}%`;
}

function formatProvenanceSummary(node: ConstellationExplorationNode): string {
  const parts: string[] = [];

  switch (node.provenance.surfacedBy) {
    case "annotation":
      parts.push("Surfaced from anchored draft text");
      break;
    case "draft":
      parts.push("Built directly from the freewrite seed");
      break;
    case "research":
      parts.push("Surfaced from research-backed findings");
      break;
    case "mock":
      parts.push("Scaffolded from the current AI prototype output");
      break;
  }

  if (node.provenance.anchorRefs.length > 0) {
    parts.push(
      `${String(node.provenance.anchorRefs.length)} anchored span${
        node.provenance.anchorRefs.length === 1 ? "" : "s"
      }`,
    );
  }

  if (node.provenance.sourceRefs.length > 0) {
    parts.push(
      `${String(node.provenance.sourceRefs.length)} source${
        node.provenance.sourceRefs.length === 1 ? "" : "s"
      }`,
    );
  }

  if (node.provenance.researchTaskIds.length > 0) {
    parts.push(
      `${String(node.provenance.researchTaskIds.length)} research task${
        node.provenance.researchTaskIds.length === 1 ? "" : "s"
      }`,
    );
  }

  return parts.join(" · ");
}

function computeThemePositions(themeNodes: readonly ConstellationExplorationNode[]): ThemeCanvasPosition[] {
  if (themeNodes.length === 0) {
    return [];
  }

  return themeNodes.map((theme, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / themeNodes.length;

    return {
      id: theme.id,
      x: CONSTELLATION_CANVAS_WIDTH * (0.5 + ATLAS_RADIUS_X * Math.cos(angle)),
      y: CONSTELLATION_CANVAS_HEIGHT * (0.5 + ATLAS_RADIUS_Y * Math.sin(angle)),
    };
  });
}

function ExplorationPanel({
  selectedTheme,
  onClearSelection,
  groupedChildren,
}: {
  selectedTheme: ConstellationExplorationNode;
  onClearSelection: () => void;
  groupedChildren: ReturnType<typeof selectConstellationGroupedThemeChildren>;
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
            Theme Exploration
          </div>
          <h2
            className="mt-2 font-semibold leading-tight"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            {selectedTheme.title}
          </h2>
          <p
            className="mt-1 leading-snug"
            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-muted)" }}
          >
            {selectedTheme.summary}
          </p>
        </div>
        <button
          type="button"
          className="gaddr-constellation-close p-1.5 shrink-0"
          onClick={onClearSelection}
          aria-label="Close theme details"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <section>
          <h3 className="gaddr-constellation-panel-heading">Why this surfaced</h3>
          <p className="gaddr-constellation-panel-copy">{selectedTheme.whySurfaced.label}</p>
          {selectedTheme.whySurfaced.detail ? (
            <p className="gaddr-constellation-panel-copy mt-1 text-[color:var(--app-muted)]">
              {selectedTheme.whySurfaced.detail}
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Confidence</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConfidenceSummary(selectedTheme.confidenceScore)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Provenance</h3>
          <p className="gaddr-constellation-panel-copy">{formatProvenanceSummary(selectedTheme)}</p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Suggested next actions</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTION_PREVIEW_LABELS.map((label) => (
              <span key={label} className="gaddr-constellation-action-chip">
                {label}
              </span>
            ))}
          </div>
        </section>

        {groupedChildren.map((group) => (
          <section key={group.family}>
            <h3 className="gaddr-constellation-panel-heading">{group.label}</h3>
            <div className="mt-2 space-y-2">
              {group.nodes.map((node) => (
                <article key={node.id} className="gaddr-constellation-panel-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4
                        className="font-semibold leading-tight"
                        style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                      >
                        {node.title}
                      </h4>
                      <p className="gaddr-constellation-panel-copy mt-1">{node.summary}</p>
                    </div>
                    <span className="gaddr-constellation-pill shrink-0">
                      {formatConfidenceSummary(node.confidenceScore)}
                    </span>
                  </div>
                  <p className="gaddr-constellation-panel-meta mt-2">
                    {formatProvenanceSummary(node)}
                  </p>
                </article>
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
  selectedThemeId,
  onClose,
  onSelectTheme,
  onClearSelection,
}: ConstellationBoardProps) {
  const canvasNodes = useMemo(() => selectConstellationCanvasNodes(graph), [graph]);
  const overviewEdges = useMemo(() => selectConstellationOverviewEdges(graph), [graph]);
  const selectedTheme = useMemo(
    () => selectConstellationNodeById(graph, selectedThemeId),
    [graph, selectedThemeId],
  );
  const groupedChildren = useMemo(
    () => selectConstellationGroupedThemeChildren(graph, selectedThemeId),
    [graph, selectedThemeId],
  );

  const nodes = useMemo((): Node[] => {
    const seedNode = canvasNodes.find((node) => node.id === graph.seedNodeId) ?? null;
    const themeNodes = canvasNodes.filter((node) => node.family === "theme");
    const themePositions = computeThemePositions(themeNodes);

    const flowNodes: Node[] = [];

    if (seedNode) {
      flowNodes.push({
        id: seedNode.id,
        type: "draft",
        position: {
          x: CONSTELLATION_CANVAS_WIDTH / 2 - DRAFT_NODE_HALF_WIDTH,
          y: CONSTELLATION_CANVAS_HEIGHT / 2 - DRAFT_NODE_HALF_HEIGHT,
        },
        data: { seed: seedNode },
        draggable: false,
      });
    }

    flowNodes.push(
      ...themeNodes.map((theme, index) => ({
        id: theme.id,
        type: "theme" as const,
        position: {
          x: themePositions[index]?.x ?? 0,
          y: themePositions[index]?.y ?? 0,
        },
        data: { theme, index },
        draggable: false,
      })),
    );

    return flowNodes;
  }, [canvasNodes, graph.seedNodeId]);

  const edges = useMemo((): Edge[] => {
    return overviewEdges.map((edge) => ({
      id: edge.id,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      type: "default",
      animated: false,
      selectable: false,
      style: {
        stroke: "color-mix(in srgb, var(--accent) 18%, var(--border-soft))",
        strokeWidth: 1.2,
        opacity: 0.72,
      },
    }));
  }, [overviewEdges]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      if (selectedThemeId) {
        onClearSelection();
        return;
      }

      onClose();
    },
    [onClearSelection, onClose, selectedThemeId],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const isExiting = mode === "transition_out";
  const callbacksValue = useMemo(
    () => ({ onSelectTheme, onClearSelection, selectedThemeId }),
    [onClearSelection, onSelectTheme, selectedThemeId],
  );

  return (
    <ConstellationCallbacksProvider value={callbacksValue}>
      <div
        data-testid="constellation-board"
        className={`gaddr-constellation-flow-container ${
          isExiting ? "gaddr-constellation-flow-container--exit" : ""
        }`}
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
          minZoom={0.45}
          maxZoom={1.8}
        >
          <Panel position="top-right">
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                data-testid="constellation-close-button"
                className="gaddr-constellation-close p-2 flex items-center gap-1.5"
                style={{ fontSize: "var(--constellation-text-base)" }}
                onClick={onClose}
                aria-label="Close constellation exploration"
              >
                <XIcon size={16} />
                <span>Return to freewrite</span>
              </button>
              {selectedTheme?.family === "theme" ? (
                <ExplorationPanel
                  selectedTheme={selectedTheme}
                  groupedChildren={groupedChildren}
                  onClearSelection={onClearSelection}
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
