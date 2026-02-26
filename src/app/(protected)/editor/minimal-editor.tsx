"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const STORAGE_KEY = "gaddr:minimal-editor";

function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function loadDoc(): JSONContent {
  if (typeof window === "undefined") {
    return emptyDoc();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyDoc();
    }
    const parsed = JSON.parse(raw) as JSONContent;
    if (parsed.type !== "doc") {
      return emptyDoc();
    }
    return parsed;
  } catch {
    return emptyDoc();
  }
}

export function MinimalEditor() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap rounded border border-gray-300 bg-white px-4 py-3 text-base leading-7 text-gray-900 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.getJSON()));
      } catch {
        // Ignore storage errors.
      }
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div className="rounded border border-gray-300 bg-white px-4 py-3 text-sm text-gray-500">Loading editor...</div>;
  }

  return <EditorContent editor={editor} />;
}
