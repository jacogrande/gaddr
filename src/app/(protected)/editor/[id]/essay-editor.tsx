"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { wordCount, WORD_COUNT_TARGET, WORD_COUNT_LIMIT } from "../../../../domain/essay/operations";
import { updateDraftAction } from "../actions";
import type { TipTapDoc } from "../../../../domain/essay/essay";

type SaveStatus = "saved" | "saving" | "unsaved";

type Props = {
  id: string;
  initialTitle: string;
  initialContent: TipTapDoc;
};

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-[#B44C43] text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

export function EssayEditor({ id, initialTitle, initialContent }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [words, setWords] = useState(() => wordCount(initialContent));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title?: string; content?: TipTapDoc } | null>(null);
  const savingRef = useRef(false);

  const save = useCallback(
    async (data: { title?: string; content?: TipTapDoc }) => {
      savingRef.current = true;
      setSaveStatus("saving");
      const result = await updateDraftAction(id, data);
      savingRef.current = false;
      if ("error" in result) {
        setSaveStatus("unsaved");
        return;
      }
      setSaveStatus("saved");
      // Flush any changes that arrived while we were saving
      if (pendingRef.current) {
        const queued = pendingRef.current;
        pendingRef.current = null;
        void save(queued);
      }
    },
    [id],
  );

  const scheduleSave = useCallback(
    (data: { title?: string; content?: TipTapDoc }) => {
      pendingRef.current = {
        ...pendingRef.current,
        ...data,
      };
      setSaveStatus("unsaved");
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        if (pendingRef.current && !savingRef.current) {
          const toSave = pendingRef.current;
          pendingRef.current = null;
          void save(toSave);
        }
      }, 1500);
    },
    [save],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content: initialContent as JSONContent,
    onUpdate: ({ editor: e }) => {
      const doc = e.getJSON() as TipTapDoc;
      setWords(wordCount(doc));
      scheduleSave({ content: doc });
    },
    editorProps: {
      attributes: {
        class: "tiptap prose-editor outline-none",
      },
    },
  });

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (pendingRef.current) {
        void save(pendingRef.current);
      }
    };
  }, [save]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave({ title: e.target.value });
  };

  const wordColor =
    words > WORD_COUNT_LIMIT ? "text-red-600" : words >= WORD_COUNT_TARGET ? "text-amber-600" : "text-emerald-600";

  const statusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : "Unsaved changes";

  const statusColor =
    saveStatus === "saved"
      ? "text-emerald-600"
      : saveStatus === "saving"
        ? "text-zinc-400"
        : "text-amber-600";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled essay"
        className="w-full border-none bg-transparent font-serif text-3xl font-bold tracking-tight text-black placeholder:text-zinc-300 focus:outline-none"
        maxLength={200}
      />

      {/* Status bar */}
      <div className="mt-3 mb-4 flex items-center justify-between text-sm">
        <span className={wordColor}>
          {words} / {WORD_COUNT_LIMIT} words
        </span>
        <span className={statusColor}>{statusLabel}</span>
      </div>

      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap gap-1 border-b border-zinc-200 pb-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          Quote
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
        >
          Code
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="min-h-[400px] rounded-lg border-2 border-zinc-200 bg-white p-6 shadow-sm transition-colors focus-within:border-[#B44C43]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
