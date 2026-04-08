import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

type EditorCardData = Node<{
  label: string;
}>;

function EditorCardNodeInner({ data }: NodeProps<EditorCardData>) {
  return (
    <div className="nodrag nowheel nopan gaddr-canvas-node--card">
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <p className="gaddr-card-placeholder">{data.label}</p>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

export const EditorCardNode = memo(EditorCardNodeInner);
