"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ConstellationExplorationNode } from "../../../domain/gadfly/constellation-types";
import { useConstellationCallbacks } from "./constellation-callbacks-context";

type ThemeNode = Node<{ theme: ConstellationExplorationNode; index: number }, "theme">;

function islandClass(
  themeId: string,
  selectedThemeId: string | null,
): string {
  const base = "gaddr-constellation-island";

  if (selectedThemeId === null) {
    return base;
  }

  if (themeId === selectedThemeId) {
    return `${base} gaddr-constellation-island--focused`;
  }

  return `${base} gaddr-constellation-island--dimmed`;
}

function formatConfidence(score: number): string {
  return `${String(Math.round(Math.max(0, Math.min(1, score)) * 100))}% confidence`;
}

function formatSurfacedByLabel(source: ConstellationExplorationNode["provenance"]["surfacedBy"]): string {
  switch (source) {
    case "annotation":
      return "Draft anchors";
    case "draft":
      return "Freewrite";
    case "research":
      return "Research";
    case "mock":
      return "Mock AI";
  }
}

function ConstellationThemeNode({ data }: NodeProps<ThemeNode>) {
  const { onSelectTheme, onClearSelection, selectedThemeId } = useConstellationCallbacks();

  const { theme, index } = data;
  const isSelected = selectedThemeId === theme.id;

  const handleClick = useCallback(() => {
    if (isSelected) {
      onClearSelection();
    } else {
      onSelectTheme(theme.id);
    }
  }, [isSelected, onClearSelection, onSelectTheme, theme.id]);

  return (
    <div
      className={`${islandClass(theme.id, selectedThemeId)} gaddr-constellation-island-enter`}
      style={{ animationDelay: `${String(1000 + index * 120)}ms` }}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <button
        type="button"
        aria-pressed={isSelected}
        data-testid={`constellation-theme-${theme.id}`}
        className="nodrag w-56 rounded-[inherit] p-4 text-left"
        onClick={handleClick}
      >
        <div
          className="font-semibold uppercase tracking-[0.12em]"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          Theme
        </div>
        <h3
          className="mt-2 font-semibold leading-tight"
          style={{ fontSize: "var(--constellation-text-lg)", color: "var(--app-fg)" }}
        >
          {theme.title}
        </h3>
        <p
          className="mt-1 leading-snug line-clamp-3"
          style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
        >
          {theme.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="gaddr-constellation-pill">{formatConfidence(theme.confidenceScore)}</span>
          <span className="gaddr-constellation-pill">
            {formatSurfacedByLabel(theme.provenance.surfacedBy)}
          </span>
        </div>
      </button>
    </div>
  );
}

export default memo(ConstellationThemeNode);
