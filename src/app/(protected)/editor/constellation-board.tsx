"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { XIcon } from "@phosphor-icons/react";
import type {
  ConstellationBoard as ConstellationBoardData,
  ConstellationLaneKind,
  ConstellationNode,
  ConstellationTheme,
} from "../../../domain/gadfly/constellation-types";
import { CONSTELLATION_LANE_KINDS } from "../../../domain/gadfly/constellation-types";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
import {
  scaleConstellationPositions,
  CONSTELLATION_CANVAS_WIDTH,
  CONSTELLATION_CANVAS_HEIGHT,
  DRAFT_NODE_HALF_WIDTH,
  DRAFT_NODE_HALF_HEIGHT,
} from "./constellation-layout-utils";
import { ConstellationCallbacksProvider } from "./constellation-callbacks-context";
import ConstellationThemeNode from "./constellation-theme-node";
import ConstellationDraftNode from "./constellation-draft-node";
import type { ConstellationBoardMode } from "./constellation-board-types";

type ConstellationBoardProps = {
  board: ConstellationBoardData;
  mode: Exclude<ConstellationBoardMode, "hidden">;
  focusedThemeId: string | null;
  onClose: () => void;
  onFocusTheme: (themeId: string) => void;
  onBackToOverview: () => void;
};

const LANE_LABELS: Record<ConstellationLaneKind, string> = {
  supports: "Supports",
  challenges: "Challenges",
  questions: "Questions",
  sources: "Sources",
};

const NODE_KIND_LABELS: Record<ConstellationNode["kind"], string> = {
  claim: "Claim",
  support: "Support",
  challenge: "Challenge",
  question: "Question",
  gap: "Gap",
  source: "Source",
};

const nodeTypes = {
  theme: ConstellationThemeNode,
  draft: ConstellationDraftNode,
} as const;

function LeverageBar({ score }: { score: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <div className="gaddr-constellation-leverage-bar w-full mt-2">
      <div
        className="gaddr-constellation-leverage-fill"
        style={{ width: `${String(percent)}%` }}
      />
    </div>
  );
}

function FocusedThemeDetail({
  theme,
  nodes,
  onBack,
}: {
  theme: ConstellationTheme;
  nodes: ConstellationNode[];
  onBack: () => void;
}) {
  const laneGroups = useMemo(() => {
    const groups: Record<ConstellationLaneKind, ConstellationNode[]> = {
      supports: [],
      challenges: [],
      questions: [],
      sources: [],
    };
    for (const node of nodes) {
      groups[node.lane].push(node);
    }
    return groups;
  }, [nodes]);

  return (
    <div
      className="gaddr-constellation-focus-detail p-5 overflow-y-auto"
      style={{
        width: "min(28rem, 90vw)",
        maxHeight: "70vh",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="font-semibold leading-tight"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            {theme.title}
          </h2>
          <p
            className="mt-1 leading-snug"
            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-muted)" }}
          >
            {theme.summary}
          </p>
        </div>
        <button
          type="button"
          className="gaddr-constellation-close p-1.5 shrink-0"
          onClick={onBack}
          aria-label="Back to overview"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-2">
        <LeverageBar score={theme.leverageScore} />
      </div>

      <div className="mt-4 space-y-4">
        {CONSTELLATION_LANE_KINDS.map((lane) => {
          const laneNodes = laneGroups[lane];
          if (laneNodes.length === 0) return null;

          return (
            <div key={lane}>
              <h3
                className="font-medium mb-1.5"
                style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)", letterSpacing: "0.04em" }}
              >
                {LANE_LABELS[lane].toUpperCase()}
              </h3>
              <div className="space-y-1">
                {laneNodes.map((node) => (
                  <div key={node.id} className="gaddr-constellation-node-row">
                    <div className="flex items-center gap-2">
                      <span
                        className={`gaddr-constellation-lane-chip gaddr-constellation-lane-chip--${lane}`}
                      >
                        {NODE_KIND_LABELS[node.kind]}
                      </span>
                      <span
                        className="font-medium"
                        style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                      >
                        {node.title}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 leading-snug"
                      style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
                    >
                      {node.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div
      className="flex flex-wrap gap-4 items-center justify-center"
      style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="gaddr-constellation-legend-dot"
          style={{ background: "var(--accent)" }}
        />
        Supports
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="gaddr-constellation-legend-dot"
          style={{ background: "var(--highlight-high)" }}
        />
        Challenges
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="gaddr-constellation-legend-dot"
          style={{ background: "var(--app-muted)" }}
        />
        Questions
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="gaddr-constellation-legend-dot"
          style={{ background: "var(--border-soft)" }}
        />
        Sources
      </span>
    </div>
  );
}

function ConstellationBoardInner({
  board,
  mode,
  focusedThemeId,
  onClose,
  onFocusTheme,
  onBackToOverview,
}: ConstellationBoardProps) {
  const reactFlowInstance = useReactFlow();
  const prevFocusedRef = useRef<string | null>(null);

  const highestLeverageThemeId = board.themes[0]?.id ?? null;

  const initialNodes = useMemo((): Node[] => {
    const normalized = computeConstellationLayout(board.themes);
    const positions = scaleConstellationPositions(normalized);

    const themeNodes: Node[] = board.themes.map((theme, i) => ({
      id: theme.id,
      type: "theme" as const,
      position: { x: positions[i]?.x ?? 0, y: positions[i]?.y ?? 0 },
      data: { theme, index: i },
      draggable: true,
    }));

    const draftNode: Node = {
      id: "draft",
      type: "draft" as const,
      position: {
        x: CONSTELLATION_CANVAS_WIDTH / 2 - DRAFT_NODE_HALF_WIDTH,
        y: CONSTELLATION_CANVAS_HEIGHT / 2 - DRAFT_NODE_HALF_HEIGHT,
      },
      data: { draft: board.draft },
      draggable: true,
    };

    return [draftNode, ...themeNodes];
  }, [board]);

  const initialEdges = useMemo((): Edge[] => {
    return board.edges
      .filter((edge) => edge.kind === "anchors_to_text" && edge.fromNodeId === "draft")
      .map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        type: "default",
        animated: false,
        style: {
          stroke: "var(--border-soft)",
          strokeWidth: 1,
          opacity: 0.4,
        },
      }));
  }, [board.edges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);

  const focusedTheme = useMemo(
    () =>
      focusedThemeId
        ? board.themes.find((theme) => theme.id === focusedThemeId) ?? null
        : null,
    [board.themes, focusedThemeId],
  );

  const focusedNodes = useMemo(() => {
    if (!focusedThemeId) return [];
    return board.nodes.filter((node) => node.themeId === focusedThemeId);
  }, [board.nodes, focusedThemeId]);

  // Keyboard navigation: Escape to close/back
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (focusedThemeId) {
          event.preventDefault();
          onBackToOverview();
        } else {
          event.preventDefault();
          onClose();
        }
      }
    },
    [focusedThemeId, onBackToOverview, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Animate viewport on focus/unfocus
  useEffect(() => {
    if (focusedThemeId && focusedThemeId !== prevFocusedRef.current) {
      void reactFlowInstance.fitView({
        nodes: [{ id: focusedThemeId }],
        duration: 600,
        padding: 1.5,
      });
    } else if (!focusedThemeId && prevFocusedRef.current) {
      void reactFlowInstance.fitView({
        duration: 600,
        padding: 0.2,
      });
    }
    prevFocusedRef.current = focusedThemeId;
  }, [focusedThemeId, reactFlowInstance]);

  const isExiting = mode === "transition_out";

  const callbacksValue = useMemo(
    () => ({ onFocusTheme, onBackToOverview, focusedThemeId, highestLeverageThemeId }),
    [onFocusTheme, onBackToOverview, focusedThemeId, highestLeverageThemeId],
  );

  return (
    <ConstellationCallbacksProvider value={callbacksValue}>
      <div className={`gaddr-constellation-flow-container ${isExiting ? "gaddr-constellation-flow-container--exit" : ""}`}>
        <ReactFlow
          nodes={nodes}
          edges={initialEdges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.3}
          maxZoom={2}
        >
          <MiniMap position="bottom-right" />
          <Controls position="bottom-left" showInteractive={false} />
          <Panel position="bottom-center">
            <Legend />
          </Panel>
          <Panel position="top-right">
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                className="gaddr-constellation-close p-2 flex items-center gap-1.5"
                style={{ fontSize: "var(--constellation-text-base)" }}
                onClick={onClose}
                aria-label="Close constellation review"
              >
                <XIcon size={16} />
                <span>Return to draft</span>
              </button>
              {focusedTheme ? (
                <FocusedThemeDetail
                  theme={focusedTheme}
                  nodes={focusedNodes}
                  onBack={onBackToOverview}
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
