"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { XIcon } from "@phosphor-icons/react";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
import type {
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
} from "../../../domain/gadfly/constellation-types";
import {
  CONSTELLATION_CANVAS_HEIGHT,
  CONSTELLATION_CANVAS_WIDTH,
  DRAFT_NODE_HALF_HEIGHT,
  DRAFT_NODE_HALF_WIDTH,
  THEME_NODE_HALF_HEIGHT,
  THEME_NODE_HALF_WIDTH,
  scaleConstellationPositions,
} from "./constellation-layout-utils";
import { ConstellationCallbacksProvider } from "./constellation-callbacks-context";
import {
  selectConstellationCanvasNodes,
  selectConstellationGroupedThemeChildren,
  selectConstellationNodeById,
  selectConstellationOverviewEdges,
} from "./constellation-exploration-selectors";
import {
  formatConstellationConfidenceSummary,
  formatConstellationProvenanceSummary,
} from "./constellation-formatters";
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

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
} as const;

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
            {formatConstellationConfidenceSummary(selectedTheme.confidenceScore)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Provenance</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationProvenanceSummary(selectedTheme)}
          </p>
        </section>

        {selectedTheme.suggestedBranchActions.length > 0 ? (
          <section>
            <h3 className="gaddr-constellation-panel-heading">Suggested next actions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTheme.suggestedBranchActions.map((action) => (
                <span key={action.kind} className="gaddr-constellation-action-chip">
                  {action.label}
                </span>
              ))}
            </div>
          </section>
        ) : null}

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
                      {formatConstellationConfidenceSummary(node.confidenceScore)}
                    </span>
                  </div>
                  <p className="gaddr-constellation-panel-meta mt-2">
                    {formatConstellationProvenanceSummary(node)}
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
  const boardRef = useRef<HTMLDivElement | null>(null);
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
    const themePositions = new Map(
      scaleConstellationPositions(computeConstellationLayout(themeNodes)).map((position) => [
        position.themeId,
        position,
      ]),
    );

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
          x: (themePositions.get(theme.id)?.x ?? 0) - THEME_NODE_HALF_WIDTH,
          y: (themePositions.get(theme.id)?.y ?? 0) - THEME_NODE_HALF_HEIGHT,
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

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  const isExiting = mode === "transition_out";
  const callbacksValue = useMemo(
    () => ({ onSelectTheme, onClearSelection, selectedThemeId }),
    [onClearSelection, onSelectTheme, selectedThemeId],
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
          if (selectedThemeId) {
            onClearSelection();
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
