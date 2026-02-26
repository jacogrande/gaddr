"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { EDITOR_MODIFIER_COMMANDS, type EditorCommand } from "./editor-commands";
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

function eventMatchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.split("-").map((part) => part.toLowerCase());
  const requiresMod = parts.includes("mod");
  const requiresShift = parts.includes("shift");
  const requiresAlt = parts.includes("alt");
  const baseKey = parts.find((part) => part !== "mod" && part !== "shift" && part !== "alt");

  if (!baseKey) {
    return false;
  }

  const hasMod = event.metaKey || event.ctrlKey;

  if (hasMod !== requiresMod) {
    return false;
  }

  if (event.shiftKey !== requiresShift) {
    return false;
  }

  if (event.altKey !== requiresAlt) {
    return false;
  }

  return event.key.toLowerCase() === baseKey;
}

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0);
  const [isMacLike, setIsMacLike] = useState(false);
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

  const filteredPaletteCommands = useMemo(() => {
    const query = commandPaletteQuery.trim().toLowerCase();

    if (!query) {
      return EDITOR_MODIFIER_COMMANDS;
    }

    return EDITOR_MODIFIER_COMMANDS.map((command) => {
      const label = command.label.toLowerCase();
      const id = command.id.toLowerCase();
      const hotkeys = command.hotkeys.join(" ").toLowerCase();

      if (label.startsWith(query)) {
        return { command, rank: 0 };
      }

      if (id.startsWith(query)) {
        return { command, rank: 1 };
      }

      const labelIndex = label.indexOf(query);
      if (labelIndex >= 0) {
        return { command, rank: 10 + labelIndex };
      }

      const idIndex = id.indexOf(query);
      if (idIndex >= 0) {
        return { command, rank: 30 + idIndex };
      }

      const hotkeyIndex = hotkeys.indexOf(query);
      if (hotkeyIndex >= 0) {
        return { command, rank: 50 + hotkeyIndex };
      }

      return null;
    })
      .filter((entry): entry is { command: EditorCommand; rank: number } => entry !== null)
      .sort((left, right) => {
        if (left.rank !== right.rank) {
          return left.rank - right.rank;
        }

        return left.command.label.localeCompare(right.command.label);
      })
      .map((entry) => entry.command);
  }, [commandPaletteQuery]);

  const commandHotkeyEntries = useMemo(
    () =>
      EDITOR_MODIFIER_COMMANDS.flatMap((command) =>
        command.hotkeys.map((hotkey) => ({
          command,
          hotkey,
        })),
      ),
    [],
  );

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

  const formatHotkey = useCallback(
    (hotkey: string) => {
      const chunks = hotkey.split("-").map((chunk) => {
        switch (chunk) {
          case "Mod":
            return isMacLike ? "⌘" : "Ctrl";
          case "Shift":
            return isMacLike ? "⇧" : "Shift";
          case "Alt":
            return isMacLike ? "⌥" : "Alt";
          default:
            return chunk.length === 1 ? chunk.toUpperCase() : chunk;
        }
      });

      return isMacLike ? chunks.join("") : chunks.join("+");
    },
    [isMacLike],
  );

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

  const openCommandPalette = useCallback(() => {
    setCommandPaletteQuery("");
    setCommandPaletteActiveIndex(0);
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery("");
    setCommandPaletteActiveIndex(0);
    window.setTimeout(() => {
      editor?.commands.focus();
    }, 0);
  }, [editor]);

  const runPaletteCommand = useCallback(
    (command: EditorCommand) => {
      if (!editor) {
        return;
      }

      command.run(editor);
      syncActiveModifiers(editor);
      closeCommandPalette();
    },
    [closeCommandPalette, editor, syncActiveModifiers],
  );

  const runSelectedPaletteCommand = useCallback(() => {
    const command = filteredPaletteCommands[commandPaletteActiveIndex] ?? filteredPaletteCommands[0];
    if (!command) {
      return;
    }

    runPaletteCommand(command);
  }, [commandPaletteActiveIndex, filteredPaletteCommands, runPaletteCommand]);

  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setIsMacLike(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  useEffect(() => {
    setCommandPaletteActiveIndex((previous) => {
      if (filteredPaletteCommands.length === 0) {
        return 0;
      }

      return previous >= filteredPaletteCommands.length ? filteredPaletteCommands.length - 1 : previous;
    });
  }, [filteredPaletteCommands.length]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      if (!isCommandPaletteOpen) {
        return;
      }

      const matchedHotkeyEntry = commandHotkeyEntries.find((entry) => eventMatchesHotkey(event, entry.hotkey));
      if (matchedHotkeyEntry) {
        event.preventDefault();
        runPaletteCommand(matchedHotkeyEntry.command);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeCommandPalette();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandPaletteActiveIndex((previous) => {
          if (filteredPaletteCommands.length === 0) {
            return 0;
          }

          return (previous + 1) % filteredPaletteCommands.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandPaletteActiveIndex((previous) => {
          if (filteredPaletteCommands.length === 0) {
            return 0;
          }

          return previous <= 0 ? filteredPaletteCommands.length - 1 : previous - 1;
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        runSelectedPaletteCommand();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const firstCommand = filteredPaletteCommands[0];
        if (!firstCommand) {
          return;
        }

        setCommandPaletteQuery(firstCommand.label);
        setCommandPaletteActiveIndex(0);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [
    commandHotkeyEntries,
    closeCommandPalette,
    filteredPaletteCommands,
    isCommandPaletteOpen,
    openCommandPalette,
    runPaletteCommand,
    runSelectedPaletteCommand,
  ]);

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
      {isCommandPaletteOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[#2f2218]/24 px-4 pt-14 backdrop-blur-[2px] sm:pt-20"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCommandPalette();
            }
          }}
        >
          <div
            aria-modal="true"
            role="dialog"
            aria-label="Editor command palette"
            className="gaddr-command-palette w-full max-w-xl rounded-xl border border-[#cfb187]/70 bg-[#f5e8d5]/95 p-2 shadow-[0_30px_70px_rgba(45,27,8,0.25)]"
          >
            <div className="border-b border-[#cfb187]/70 px-3 pb-2 pt-1 text-xs tracking-[0.14em] text-[#8d6b46]">
              MODIFIERS
            </div>
            <div className="px-2 pb-1 pt-2">
              <input
                type="text"
                autoFocus
                value={commandPaletteQuery}
                placeholder="Search commands"
                className="w-full rounded-lg border border-[#c9ab81]/80 bg-[#f7ebda] px-3 py-2 text-sm text-[#5b4327] outline-none placeholder:text-[#9d7d57] focus:border-[#b68d59] focus:ring-2 focus:ring-[#b68d59]/30"
                onChange={(event) => {
                  setCommandPaletteQuery(event.target.value);
                  setCommandPaletteActiveIndex(0);
                }}
              />
            </div>
            <div className="max-h-[min(70vh,34rem)] overflow-y-auto py-1">
              {filteredPaletteCommands.length > 0 ? (
                filteredPaletteCommands.map((command, index) => {
                  const commandIsActive = command.isActive?.(editor) ?? false;
                  const commandIsSelected = index === commandPaletteActiveIndex;

                  return (
                    <button
                      key={command.id}
                      type="button"
                      className={`gaddr-command-row flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                        commandIsSelected
                          ? "bg-[#e2c9a3]/95 text-[#452c14]"
                          : commandIsActive
                            ? "bg-[#ead7b8]/95 text-[#4a331a]"
                            : "text-[#5c4328] hover:bg-[#efdec3]/85 active:bg-[#e6cfab]"
                      }`}
                      onMouseEnter={() => {
                        setCommandPaletteActiveIndex(index);
                      }}
                      onClick={() => {
                        runPaletteCommand(command);
                      }}
                    >
                      <span className="text-sm font-medium tracking-[0.01em]">{command.label}</span>
                      <span className="ml-4 flex items-center gap-1.5">
                        {command.hotkeys.map((hotkey) => (
                          <kbd
                            key={hotkey}
                            className="rounded border border-[#c4a476]/75 bg-[#f2e4cf]/92 px-1.5 py-0.5 text-[0.66rem] font-semibold tracking-[0.08em] text-[#87623c]"
                          >
                            {formatHotkey(hotkey)}
                          </kbd>
                        ))}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-sm text-[#8f6d48]">No matching commands</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
