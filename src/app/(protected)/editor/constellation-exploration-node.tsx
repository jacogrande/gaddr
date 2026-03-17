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

type ExplorationNode = Node<
  {
    node: ConstellationExplorationNode;
    index: number;
    isSelected: boolean;
    isDimmed: boolean;
  },
  "exploration"
>;

function buildNodeClassName(
  node: ConstellationExplorationNode,
  isSelected: boolean,
  isDimmed: boolean,
  isFocused: boolean,
): string {
  const classes = [
    "gaddr-constellation-branch-node",
    `gaddr-constellation-branch-node--${node.family.replaceAll("_", "-")}`,
  ];

  if (isSelected) {
    classes.push("gaddr-constellation-branch-node--selected");
  }

  if (isDimmed) {
    classes.push("gaddr-constellation-branch-node--dimmed");
  }

  if (isFocused) {
    classes.push("gaddr-constellation-branch-node--focused-item");
  }

  if (node.isPinned) {
    classes.push("gaddr-constellation-branch-node--pinned");
  }

  if (node.isUsedInDraft) {
    classes.push("gaddr-constellation-branch-node--draft-ready");
  }

  return classes.join(" ");
}

function ConstellationExplorationNodeCard({ data }: NodeProps<ExplorationNode>) {
  const { focusedCanvasItemId, onFocusCanvasItem, onSelectNode } = useConstellationCallbacks();
  const { node, index, isSelected, isDimmed } = data;
  const isFocused = focusedCanvasItemId === node.id;

  const handleClick = useCallback(() => {
    if (isSelected) {
      return;
    }

    onSelectNode(node.id);
  }, [isSelected, node.id, onSelectNode]);

  return (
    <div
      className={`${buildNodeClassName(node, isSelected, isDimmed, isFocused)} gaddr-constellation-island-enter`}
      style={{ animationDelay: `${String(820 + index * 70)}ms` }}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <button
        type="button"
        className="nodrag nopan w-56 rounded-[inherit] p-4 text-left"
        aria-pressed={isSelected}
        onClick={handleClick}
        onFocus={() => {
          onFocusCanvasItem(node.id);
        }}
        data-testid={`constellation-node-${node.id}`}
        data-constellation-focus-id={node.id}
        tabIndex={isFocused ? 0 : -1}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-semibold uppercase tracking-[0.12em]"
            style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
          >
            {formatConstellationSignalLabel(node.family)}
          </span>
          <span className="gaddr-constellation-pill shrink-0">
            {formatConstellationConfidencePercent(node.confidenceScore)}
          </span>
        </div>
        <h3
          className="mt-2 font-semibold leading-tight"
          style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
        >
          {node.title}
        </h3>
        <p
          className="mt-1 line-clamp-3 leading-snug"
          style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
        >
          {node.summary}
        </p>
        <p
          className="mt-2 leading-snug"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          {formatConstellationCompactTrustSummary(node)}
        </p>
        <p
          className="mt-1 line-clamp-2 leading-snug"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          {node.whySurfaced.label}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.isUsedInDraft ? <span className="gaddr-constellation-pill">In draft</span> : null}
          {node.isPinned ? <span className="gaddr-constellation-pill">Pinned</span> : null}
          {node.isSavedToWorkingSet ? <span className="gaddr-constellation-pill">Saved</span> : null}
          {node.generatedFromAction ? (
            <span className="gaddr-constellation-pill">
              {node.generatedFromAction.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
      </button>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

export default memo(ConstellationExplorationNodeCard);
