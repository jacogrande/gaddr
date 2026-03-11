"use client";

import { useMemo } from "react";
import { XIcon } from "@phosphor-icons/react";
import type {
  ConstellationBoard as ConstellationBoardData,
  ConstellationLaneKind,
  ConstellationNode,
  ConstellationTheme,
} from "../../../domain/gadfly/constellation-types";
import { CONSTELLATION_LANE_KINDS } from "../../../domain/gadfly/constellation-types";
import { computeConstellationLayout } from "../../../domain/gadfly/constellation-layout";
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

function overlayAnimationClass(mode: ConstellationBoardProps["mode"]): string {
  switch (mode) {
    case "transition_in":
      return "gaddr-constellation-overlay--in";
    case "overview":
    case "focus_theme":
      return "";
    case "transition_out":
      return "gaddr-constellation-overlay--out";
  }
}

function islandClass(
  theme: ConstellationTheme,
  focusedThemeId: string | null,
): string {
  const base = "gaddr-constellation-island";

  if (focusedThemeId === null) {
    return base;
  }

  if (theme.id === focusedThemeId) {
    return `${base} gaddr-constellation-island--focused`;
  }

  return `${base} gaddr-constellation-island--dimmed`;
}

function LaneChips({ theme }: { theme: ConstellationTheme }) {
  return (
    <div className="flex flex-wrap gap-1">
      {CONSTELLATION_LANE_KINDS.map((lane) => {
        const count = theme.counts[lane];
        if (count === 0) return null;
        return (
          <span
            key={lane}
            className={`gaddr-constellation-lane-chip gaddr-constellation-lane-chip--${lane}`}
          >
            {String(count)} {LANE_LABELS[lane].toLowerCase()}
          </span>
        );
      })}
    </div>
  );
}

function LeverageBar({ score }: { score: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <div className="gaddr-constellation-leverage-bar w-full mt-1.5">
      <div
        className="gaddr-constellation-leverage-fill"
        style={{ width: `${String(percent)}%` }}
      />
    </div>
  );
}

function ThemeIsland({
  theme,
  position,
  focusedThemeId,
  index,
  onClick,
}: {
  theme: ConstellationTheme;
  position: { x: number; y: number };
  focusedThemeId: string | null;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${islandClass(theme, focusedThemeId)} gaddr-constellation-island-enter absolute w-44 p-3`}
      style={{
        left: `${String(position.x * 100)}%`,
        top: `${String(position.y * 100)}%`,
        transform: "translate(-50%, -50%)",
        animationDelay: `${String(80 + index * 60)}ms`,
      }}
      onClick={onClick}
    >
      <div className="text-left">
        <h3
          className="font-semibold leading-tight"
          style={{ fontSize: "0.78rem", color: "var(--app-fg)" }}
        >
          {theme.title}
        </h3>
        <p
          className="mt-1 leading-snug line-clamp-2"
          style={{ fontSize: "0.68rem", color: "var(--app-muted)" }}
        >
          {theme.summary}
        </p>
        <div className="mt-2">
          <LaneChips theme={theme} />
        </div>
        <LeverageBar score={theme.leverageScore} />
      </div>
    </button>
  );
}

function DraftCard({ board }: { board: ConstellationBoardData }) {
  return (
    <div
      className="gaddr-constellation-draft absolute p-5"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(18rem, 80vw)",
      }}
    >
      <h2
        className="font-semibold leading-tight"
        style={{ fontSize: "0.88rem", color: "var(--heading-2)" }}
      >
        {board.draft.title ?? "Untitled Freewrite"}
      </h2>
      <p
        className="mt-1"
        style={{ fontSize: "0.68rem", color: "var(--app-muted)" }}
      >
        {String(board.draft.wordCount)} words
      </p>
      <p
        className="mt-2 leading-relaxed line-clamp-4"
        style={{ fontSize: "0.72rem", color: "var(--app-muted-soft)" }}
      >
        {board.draft.excerpt}
      </p>
    </div>
  );
}

function EdgeLayer({
  board,
  positions,
}: {
  board: ConstellationBoardData;
  positions: Array<{ themeId: string; x: number; y: number }>;
}) {
  const positionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const pos of positions) {
      map.set(pos.themeId, pos);
    }
    return map;
  }, [positions]);

  const draftEdges = board.edges.filter((edge) => edge.fromNodeId === "draft");

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {draftEdges.map((edge) => {
        const themePos = positionMap.get(edge.toNodeId);
        if (!themePos) return null;

        return (
          <line
            key={edge.id}
            className="gaddr-constellation-edge-line gaddr-constellation-edge-enter"
            x1="50%"
            y1="50%"
            x2={`${String(themePos.x * 100)}%`}
            y2={`${String(themePos.y * 100)}%`}
            strokeDasharray="500"
          />
        );
      })}
    </svg>
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
      className="gaddr-constellation-focus-detail absolute p-5 overflow-y-auto"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(28rem, 90vw)",
        maxHeight: "80vh",
        zIndex: 3,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="font-semibold leading-tight"
            style={{ fontSize: "0.92rem", color: "var(--heading-2)" }}
          >
            {theme.title}
          </h2>
          <p
            className="mt-1 leading-snug"
            style={{ fontSize: "0.72rem", color: "var(--app-muted)" }}
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
          <XIcon size={14} />
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
                style={{ fontSize: "0.72rem", color: "var(--app-muted)", letterSpacing: "0.04em" }}
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
                        style={{ fontSize: "0.74rem", color: "var(--app-fg)" }}
                      >
                        {node.title}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 leading-snug"
                      style={{ fontSize: "0.68rem", color: "var(--app-muted)" }}
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
      className="absolute bottom-4 left-4 flex flex-wrap gap-3 items-center"
      style={{ fontSize: "0.62rem", color: "var(--app-muted-soft)", zIndex: 1 }}
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

export default function ConstellationBoard({
  board,
  mode,
  focusedThemeId,
  onClose,
  onFocusTheme,
  onBackToOverview,
}: ConstellationBoardProps) {
  const positions = useMemo(
    () => computeConstellationLayout(board.themes),
    [board.themes],
  );

  const focusedTheme = useMemo(
    () =>
      focusedThemeId
        ? board.themes.find((theme) => theme.id === focusedThemeId) ?? null
        : null,
    [board.themes, focusedThemeId],
  );

  const focusedNodes = useMemo(() => {
    if (!focusedThemeId) return [];
    // Nodes are already sorted by role order within each theme by the builder
    return board.nodes.filter((node) => node.themeId === focusedThemeId);
  }, [board.nodes, focusedThemeId]);

  return (
    <div
      className={`gaddr-constellation-overlay fixed inset-0 ${overlayAnimationClass(mode)}`}
      style={{ zIndex: 90 }}
    >
      {/* Close button */}
      <button
        type="button"
        className="gaddr-constellation-close absolute top-4 right-4 p-2 flex items-center gap-1.5"
        style={{ zIndex: 4, fontSize: "0.72rem" }}
        onClick={onClose}
        aria-label="Close constellation review"
      >
        <XIcon size={14} />
        <span>Return to draft</span>
      </button>

      {/* Edge layer */}
      <EdgeLayer board={board} positions={positions} />

      {/* Draft card */}
      <DraftCard board={board} />

      {/* Theme islands */}
      {board.themes.map((theme, index) => {
        const pos = positions[index];
        if (!pos) return null;

        return (
          <ThemeIsland
            key={theme.id}
            theme={theme}
            position={pos}
            focusedThemeId={focusedThemeId}
            index={index}
            onClick={() => {
              if (focusedThemeId === theme.id) {
                onBackToOverview();
              } else {
                onFocusTheme(theme.id);
              }
            }}
          />
        );
      })}

      {/* Focus mode detail panel */}
      {focusedTheme ? (
        <FocusedThemeDetail
          theme={focusedTheme}
          nodes={focusedNodes}
          onBack={onBackToOverview}
        />
      ) : null}

      {/* Legend */}
      <Legend />
    </div>
  );
}
