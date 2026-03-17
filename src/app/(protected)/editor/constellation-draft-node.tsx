"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConstellationDraftFlowNode } from "./constellation-flow-nodes";

function ConstellationDraftNode({ data }: NodeProps<ConstellationDraftFlowNode>) {
  const { seed } = data;
  const excerpt =
    seed.summary.length > 220
      ? `${seed.summary.slice(0, 220)}...`
      : seed.summary;

  return (
    <div className="gaddr-constellation-draft w-52 p-4" data-testid="constellation-seed-node">
      <div
        className="font-semibold uppercase tracking-[0.12em]"
        style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
      >
        Freewrite Seed
      </div>
      <h3
        className="mt-2 font-semibold leading-tight"
        style={{ fontSize: "var(--constellation-text-xl)", color: "var(--app-fg)" }}
      >
        {seed.title}
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
      >
        {seed.whySurfaced.label}
      </p>
      <p
        className="mt-1.5 leading-snug line-clamp-5"
        style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
      >
        {excerpt}
      </p>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

export default memo(ConstellationDraftNode);
