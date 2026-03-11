"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type {
  ConstellationLaneKind,
  ConstellationTheme,
} from "../../../domain/gadfly/constellation-types";
import { CONSTELLATION_LANE_KINDS } from "../../../domain/gadfly/constellation-types";
import { useConstellationCallbacks } from "./constellation-callbacks-context";

const LANE_LABELS: Record<ConstellationLaneKind, string> = {
  supports: "Supports",
  challenges: "Challenges",
  questions: "Questions",
  sources: "Sources",
};

type ThemeNode = Node<{ theme: ConstellationTheme; index: number }, "theme">;

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
    <div className="gaddr-constellation-leverage-bar w-full mt-2">
      <div
        className="gaddr-constellation-leverage-fill"
        style={{ width: `${String(percent)}%` }}
      />
    </div>
  );
}

function islandClass(
  theme: ConstellationTheme,
  focusedThemeId: string | null,
  isHighestLeverage: boolean,
): string {
  const base = "gaddr-constellation-island";

  if (focusedThemeId === null) {
    return isHighestLeverage ? `${base} gaddr-constellation-island--primary` : base;
  }

  if (theme.id === focusedThemeId) {
    return `${base} gaddr-constellation-island--focused`;
  }

  return `${base} gaddr-constellation-island--dimmed`;
}

function ConstellationThemeNode({ data }: NodeProps<ThemeNode>) {
  const { onFocusTheme, onBackToOverview, focusedThemeId, highestLeverageThemeId } =
    useConstellationCallbacks();

  const { theme, index } = data;
  const isHighestLeverage = theme.id === highestLeverageThemeId;

  const handleClick = useCallback(() => {
    if (focusedThemeId === theme.id) {
      onBackToOverview();
    } else {
      onFocusTheme(theme.id);
    }
  }, [focusedThemeId, theme.id, onBackToOverview, onFocusTheme]);

  return (
    <div
      className={`${islandClass(theme, focusedThemeId, isHighestLeverage)} gaddr-constellation-island-enter w-52 p-4`}
      style={{ animationDelay: `${String(600 + index * 120)}ms` }}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <div className="text-left">
        <h3
          className="font-semibold leading-tight"
          style={{ fontSize: "var(--constellation-text-lg)", color: "var(--app-fg)" }}
        >
          {theme.title}
        </h3>
        <p
          className="mt-1 leading-snug line-clamp-2"
          style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
        >
          {theme.summary}
        </p>
        <div className="mt-2">
          <LaneChips theme={theme} />
        </div>
        <LeverageBar score={theme.leverageScore} />
      </div>
    </div>
  );
}

export default memo(ConstellationThemeNode);
