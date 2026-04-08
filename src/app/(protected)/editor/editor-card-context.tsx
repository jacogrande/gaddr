"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";

type EditorCardContextValue = {
  editor: TiptapEditor;
  boardActive: boolean;
};

const EditorCardContext = createContext<EditorCardContextValue | null>(null);

export function useEditorCardContext(): EditorCardContextValue {
  const ctx = useContext(EditorCardContext);
  if (!ctx) {
    throw new Error("useEditorCardContext must be used within an EditorCardProvider");
  }
  return ctx;
}

export function EditorCardProvider({
  editor,
  boardActive,
  children,
}: EditorCardContextValue & { children: ReactNode }) {
  return (
    <EditorCardContext value={{ editor, boardActive }}>
      {children}
    </EditorCardContext>
  );
}
