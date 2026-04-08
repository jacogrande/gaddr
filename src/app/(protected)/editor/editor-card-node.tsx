import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { EditorContent } from "@tiptap/react";
import { useEditorCardContext } from "./editor-card-context";

function EditorCardNodeInner() {
  const { editor, boardActive } = useEditorCardContext();

  return (
    <div className={`nodrag nopan ${boardActive ? "nowheel gaddr-canvas-node--card" : ""}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div className={boardActive ? "pointer-events-none" : "gaddr-editor-scroll"}>
        <EditorContent editor={editor} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

export const EditorCardNode = memo(EditorCardNodeInner);
