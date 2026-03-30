"use client";

import { memo, useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { useConstellationCallbacks } from "./constellation-callbacks-context";
import type { ConstellationSummaryFlowNode } from "./constellation-flow-nodes";
import { ConstellationNodeHandles } from "./constellation-node-handles";

function ConstellationSummaryNode({ data }: NodeProps<ConstellationSummaryFlowNode>) {
  const { focusedCanvasItemId, onFocusCanvasItem, onRevealSummaryNode } = useConstellationCallbacks();
  const { hiddenCount, index, parentNodeId, summaryNodeId } = data;
  const isFocused = focusedCanvasItemId === summaryNodeId;

  const handleActivate = useCallback(() => {
    onRevealSummaryNode(parentNodeId);
  }, [onRevealSummaryNode, parentNodeId]);

  return (
    <div
      className={`gaddr-constellation-summary-node gaddr-constellation-island-enter ${
        isFocused ? "gaddr-constellation-summary-node--focused-item" : ""
      }`}
      style={{ animationDelay: `${String(880 + index * 70)}ms` }}
    >
      <ConstellationNodeHandles />
      <button
        type="button"
        className="nodrag nopan w-52 rounded-[inherit] p-4 text-left"
        data-testid={`constellation-summary-${parentNodeId}`}
        data-constellation-focus-id={summaryNodeId}
        aria-label={`Reveal ${String(hiddenCount)} lower-confidence leads`}
        onFocus={() => {
          onFocusCanvasItem(summaryNodeId);
        }}
        onClick={handleActivate}
        tabIndex={isFocused ? 0 : -1}
      >
        <div
          className="font-semibold uppercase tracking-[0.12em]"
          style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
        >
          Hidden leads
        </div>
        <h3
          className="mt-2 font-semibold leading-tight"
          style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
        >
          {hiddenCount} lower-confidence lead{hiddenCount === 1 ? "" : "s"} hidden
        </h3>
        <p
          className="mt-1 leading-snug"
          style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
        >
          Reveal these branches to inspect weaker but still available directions.
        </p>
      </button>
    </div>
  );
}

export default memo(ConstellationSummaryNode);
