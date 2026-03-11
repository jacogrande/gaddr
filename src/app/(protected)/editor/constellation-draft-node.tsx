"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ConstellationDraftCard } from "../../../domain/gadfly/constellation-types";

type DraftNode = Node<{ draft: ConstellationDraftCard }, "draft">;

function ConstellationDraftNode({ data }: NodeProps<DraftNode>) {
  const { draft } = data;
  const title = draft.title ?? "Untitled";
  const excerpt =
    draft.excerpt.length > 200
      ? `${draft.excerpt.slice(0, 200)}...`
      : draft.excerpt;

  return (
    <div className="gaddr-constellation-draft p-4 w-52">
      <h3
        className="font-semibold leading-tight"
        style={{ fontSize: "var(--constellation-text-xl)", color: "var(--app-fg)" }}
      >
        {title}
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
      >
        {String(draft.wordCount)} words
      </p>
      <p
        className="mt-1.5 leading-snug line-clamp-4"
        style={{ fontSize: "var(--constellation-text-sm)", color: "var(--app-muted)" }}
      >
        {excerpt}
      </p>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

export default memo(ConstellationDraftNode);
