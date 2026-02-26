"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { GlyphInputRules } from "./glyph-input-rules-extension";
import { StandardHotkeys } from "./standard-hotkeys-extension";

const STORAGE_KEY = "gaddr:minimal-editor";
const IDLE_SAVE_TIMEOUT_MS = 1200;
const MODIFIER_EXIT_ANIMATION_MS = 180;

type IdleRequestCallbackLike = (deadline: { readonly didTimeout: boolean; timeRemaining: () => number }) => void;
type IdleSchedulerWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallbackLike, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
type SaveHandle =
  | {
      kind: "idle";
      id: number;
    }
  | {
      kind: "timeout";
      id: number;
    };

type ModifierBadge = {
  key: string;
  label: string;
};

type DisplayModifierBadge = ModifierBadge & {
  exiting: boolean;
};

const MODIFIER_BADGES: Array<{
  key: string;
  label: string;
  isActive: (editor: TiptapEditor) => boolean;
}> = [
  { key: "bold", label: "B", isActive: (editor) => editor.isActive("bold") },
  { key: "italic", label: "I", isActive: (editor) => editor.isActive("italic") },
  { key: "underline", label: "U", isActive: (editor) => editor.isActive("underline") },
  { key: "strike", label: "S", isActive: (editor) => editor.isActive("strike") },
  { key: "code", label: "</>", isActive: (editor) => editor.isActive("code") },
  { key: "codeBlock", label: "{ }", isActive: (editor) => editor.isActive("codeBlock") },
  { key: "blockquote", label: "Q", isActive: (editor) => editor.isActive("blockquote") },
];

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
  const [activeModifiers, setActiveModifiers] = useState<ModifierBadge[]>([]);
  const [displayModifiers, setDisplayModifiers] = useState<DisplayModifierBadge[]>([]);
  const activeModifiersSignatureRef = useRef("");
  const modifierActivationOrderRef = useRef<Record<string, number>>({});
  const modifierActivationCounterRef = useRef(0);
  const modifierExitTimersRef = useRef<Map<string, number>>(new Map());
  const pendingPersistRef = useRef(false);
  const saveHandleRef = useRef<SaveHandle | null>(null);
  const latestEditorRef = useRef<{ getJSON: () => JSONContent } | null>(null);

  const persistNow = useCallback((current: { getJSON: () => JSONContent }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.getJSON()));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const clearScheduledPersist = useCallback(() => {
    if (!saveHandleRef.current) {
      return;
    }

    if (saveHandleRef.current.kind === "idle") {
      const idleWindow = window as IdleSchedulerWindow;
      idleWindow.cancelIdleCallback(saveHandleRef.current.id);
    } else {
      window.clearTimeout(saveHandleRef.current.id);
    }

    saveHandleRef.current = null;
  }, []);

  const flushPersist = useCallback(() => {
    const current = latestEditorRef.current;
    if (!current) {
      return;
    }

    clearScheduledPersist();
    pendingPersistRef.current = false;
    persistNow(current);
  }, [clearScheduledPersist, persistNow]);

  const schedulePersist = useCallback((current: { getJSON: () => JSONContent }) => {
    latestEditorRef.current = current;
    pendingPersistRef.current = true;

    if (saveHandleRef.current) {
      return;
    }

    const runPersist = () => {
      saveHandleRef.current = null;

      if (!pendingPersistRef.current) {
        return;
      }

      pendingPersistRef.current = false;

      if (latestEditorRef.current) {
        persistNow(latestEditorRef.current);
      }
    };

    const idleWindow = window as IdleSchedulerWindow;

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(runPersist, { timeout: IDLE_SAVE_TIMEOUT_MS });
      saveHandleRef.current = { kind: "idle", id };
      return;
    }

    const id = window.setTimeout(runPersist, IDLE_SAVE_TIMEOUT_MS);
    saveHandleRef.current = { kind: "timeout", id };
  }, [persistNow]);

  const syncActiveModifiers = useCallback((current: TiptapEditor) => {
    const next = current.isFocused ? MODIFIER_BADGES.filter((badge) => badge.isActive(current)) : [];
    const activeKeys = new Set(next.map((badge) => badge.key));

    for (const badge of next) {
      if (modifierActivationOrderRef.current[badge.key] !== undefined) {
        continue;
      }

      modifierActivationCounterRef.current += 1;
      modifierActivationOrderRef.current[badge.key] = modifierActivationCounterRef.current;
    }

    modifierActivationOrderRef.current = Object.fromEntries(
      Object.entries(modifierActivationOrderRef.current).filter(([key]) => activeKeys.has(key)),
    );

    if (next.length === 0) {
      modifierActivationCounterRef.current = 0;
    }

    const ordered = [...next].sort((left, right) => {
      const leftOrder = modifierActivationOrderRef.current[left.key] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = modifierActivationOrderRef.current[right.key] ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    const signature = ordered.map((badge) => badge.key).join("|");

    if (signature === activeModifiersSignatureRef.current) {
      return;
    }

    activeModifiersSignatureRef.current = signature;
    setActiveModifiers(ordered.map((badge) => ({ key: badge.key, label: badge.label })));
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [StarterKit, Underline, GlyphInputRules, StandardHotkeys],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap h-full min-h-[calc(100vh-8.5rem)] w-full bg-transparent text-lg leading-8 text-[#3b2f1f] focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      schedulePersist(current);
    },
    onBlur: () => {
      flushPersist();
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateModifiers = () => {
      syncActiveModifiers(editor);
    };

    updateModifiers();
    editor.on("selectionUpdate", updateModifiers);
    editor.on("transaction", updateModifiers);
    editor.on("focus", updateModifiers);
    editor.on("blur", updateModifiers);

    return () => {
      editor.off("selectionUpdate", updateModifiers);
      editor.off("transaction", updateModifiers);
      editor.off("focus", updateModifiers);
      editor.off("blur", updateModifiers);
    };
  }, [editor, syncActiveModifiers]);

  useEffect(() => {
    setDisplayModifiers((previous) => {
      const activeByKey = new Map(activeModifiers.map((modifier) => [modifier.key, modifier] as const));
      const seen = new Set<string>();
      const next: DisplayModifierBadge[] = [];

      for (const modifier of previous) {
        const active = activeByKey.get(modifier.key);
        if (active) {
          next.push({ ...active, exiting: false });
          seen.add(modifier.key);
          continue;
        }

        next.push({ ...modifier, exiting: true });
      }

      for (const modifier of activeModifiers) {
        if (seen.has(modifier.key)) {
          continue;
        }

        next.push({ ...modifier, exiting: false });
      }

      return next;
    });
  }, [activeModifiers]);

  useEffect(() => {
    const exitingKeys = new Set(displayModifiers.filter((modifier) => modifier.exiting).map((modifier) => modifier.key));

    for (const key of exitingKeys) {
      if (modifierExitTimersRef.current.has(key)) {
        continue;
      }

      const timeoutId = window.setTimeout(() => {
        modifierExitTimersRef.current.delete(key);
        setDisplayModifiers((previous) => previous.filter((modifier) => modifier.key !== key));
      }, MODIFIER_EXIT_ANIMATION_MS);

      modifierExitTimersRef.current.set(key, timeoutId);
    }

    for (const [key, timeoutId] of modifierExitTimersRef.current.entries()) {
      if (exitingKeys.has(key)) {
        continue;
      }

      window.clearTimeout(timeoutId);
      modifierExitTimersRef.current.delete(key);
    }
  }, [displayModifiers]);

  useEffect(() => {
    const modifierExitTimers = modifierExitTimersRef.current;

    return () => {
      for (const timeoutId of modifierExitTimers.values()) {
        window.clearTimeout(timeoutId);
      }
      modifierExitTimers.clear();
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      flushPersist();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      flushPersist();
      editor?.destroy();
    };
  }, [editor, flushPersist]);

  if (!editor) {
    return <div className="min-h-[calc(100vh-8.5rem)]" />;
  }

  return (
    <div className="relative h-full">
      {displayModifiers.length > 0 ? (
        <div className="gaddr-modifier-stack pointer-events-none fixed left-4 top-4 z-50 flex flex-col gap-1.5">
          {displayModifiers.map((modifier, index) => (
            <div
              key={modifier.key}
              className={`gaddr-modifier-chip inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[#c8a877]/70 bg-[#f3e4cf]/86 px-1.5 text-[0.62rem] font-semibold leading-none tracking-[0.14em] text-[#6a4a27] shadow-[0_6px_20px_rgba(65,42,18,0.12)] backdrop-blur-[3px] ${
                modifier.exiting ? "gaddr-modifier-chip--exit" : ""
              }`}
              style={
                modifier.exiting
                  ? undefined
                  : ({
                      animationDelay: `${String(index * 36)}ms`,
                    } satisfies CSSProperties)
              }
            >
              {modifier.label}
            </div>
          ))}
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
