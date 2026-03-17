"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ConstellationExplorationNode } from "../../../domain/gadfly/constellation-types";
import { useConstellationCallbacks } from "./constellation-callbacks-context";
import {
  formatConstellationCompactTrustSummary,
  formatConstellationConfidencePercent,
  formatConstellationSignalLabel,
} from "./constellation-formatters";

type ThemeNode = Node<{ theme: ConstellationExplorationNode; index: number }, "theme">;

function islandClass(
  theme: ConstellationExplorationNode,
  expandedThemeId: string | null,
  focusedCanvasItemId: string | null,
): string {
  const base = "gaddr-constellation-island";
  const classes = [base];

  if (theme.id === expandedThemeId) {
    classes.push("gaddr-constellation-island--selected");
  } else if (expandedThemeId !== null) {
    classes.push("gaddr-constellation-island--dimmed");
  }

  if (theme.id === focusedCanvasItemId) {
    classes.push("gaddr-constellation-island--focused-item");
  }

  if (theme.isPinned) {
    classes.push("gaddr-constellation-island--pinned");
  }

  if (theme.isUsedInDraft) {
    classes.push("gaddr-constellation-island--draft-ready");
  }

  return classes.join(" ");
}

function ConstellationThemeNode({ data }: NodeProps<ThemeNode>) {
  const {
    expandedThemeId,
    focusedCanvasItemId,
    onFocusCanvasItem,
    onResetExploration,
    onSelectNode,
  } = useConstellationCallbacks();

  const { theme, index } = data;
  const isExpanded = expandedThemeId === theme.id;

  const handleClick = useCallback(() => {
    if (isExpanded) {
      onResetExploration();
    } else {
      onSelectNode(theme.id);
    }
  }, [isExpanded, onResetExploration, onSelectNode, theme.id]);

  return (
    <div
      className={`${islandClass(theme, expandedThemeId, focusedCanvasItemId)} gaddr-constellation-island-enter`}
      style={{ animationDelay: `${String(1000 + index * 120)}ms` }}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <button
        type="button"
        aria-pressed={isExpanded}
        data-testid={`constellation-theme-${theme.id}`}
        data-constellation-focus-id={theme.id}
        className="nodrag nopan w-56 rounded-[inherit] p-4 text-left"
        autoFocus={focusedCanvasItemId === theme.id}
        onClick={handleClick}
        onFocus={() => {
          onFocusCanvasItem(theme.id);
        }}
        tabIndex={focusedCanvasItemId === theme.id ? 0 : -1}
      >
        <div
          className="font-semibold uppercase tracking-[0.12em]"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          {formatConstellationSignalLabel(theme.family)}
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
        <p
          className="mt-2 leading-snug"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          {formatConstellationCompactTrustSummary(theme)}
        </p>
        <p
          className="mt-1 line-clamp-2 leading-snug"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          {theme.whySurfaced.label}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="gaddr-constellation-pill">
            {formatConstellationConfidencePercent(theme.confidenceScore)} confidence
          </span>
          {theme.isUsedInDraft ? (
            <span className="gaddr-constellation-pill">In draft</span>
          ) : null}
          {theme.isPinned ? <span className="gaddr-constellation-pill">Pinned</span> : null}
          {theme.isSavedToWorkingSet ? (
            <span className="gaddr-constellation-pill">Saved</span>
          ) : null}
        </div>
      </button>
    </div>
  );
}

export default memo(ConstellationThemeNode);
