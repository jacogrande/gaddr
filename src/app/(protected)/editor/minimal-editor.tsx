"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BrandedCaret } from "./branded-caret-extension";
import { GlyphInputRules } from "./glyph-input-rules-extension";

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
  const persistTimerRef = useRef<number | null>(null);

  const persistNow = (current: { getJSON: () => JSONContent }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.getJSON()));
    } catch {
      // Ignore storage errors.
    }
  };

  const queuePersist = (current: { getJSON: () => JSONContent }) => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      persistNow(current);
      persistTimerRef.current = null;
    }, 250);
  };

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [StarterKit, BrandedCaret, GlyphInputRules],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap h-full min-h-[calc(100vh-8.5rem)] w-full bg-transparent text-lg leading-8 text-[#3b2f1f] focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      queuePersist(current);
    },
    onBlur: ({ editor: current }) => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      persistNow(current);
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[calc(100vh-8.5rem)]" />;
  }

  return <EditorContent editor={editor} />;
}
