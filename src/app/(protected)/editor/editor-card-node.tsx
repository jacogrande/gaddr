import { memo, type MouseEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import { EditorContent } from "@tiptap/react";
import { useEditorCardContext } from "./editor-card-context";

function EditorCardNodeInner() {
  const { editor, boardActive } = useEditorCardContext();

  // Clicks on the card padding or empty area below the text don't land on
  // ProseMirror, so forward them to the editor manually while writing.
  const handleScrollMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (boardActive) return;
    if (event.target === event.currentTarget) {
      event.preventDefault();
      editor.commands.focus("end");
    }
  };

  return (
    <div className={`nodrag nopan ${boardActive ? "nowheel gaddr-canvas-node--card" : ""}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div
        className={boardActive ? "pointer-events-none" : "gaddr-editor-scroll"}
        onMouseDown={handleScrollMouseDown}
      >
        <EditorContent editor={editor} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

export const EditorCardNode = memo(EditorCardNodeInner);
