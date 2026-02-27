"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { EDITOR_MODIFIER_COMMANDS, type EditorCommand } from "./editor-commands";
import { GlyphInputRules } from "./glyph-input-rules-extension";
import { StandardHotkeys } from "./standard-hotkeys-extension";
import { GadflyHighlights } from "./gadfly-highlights-extension";
import { useGadfly } from "./use-gadfly";
import {
  collectExitingModifierKeys,
  createModifierOrderingState,
  eventMatchesHotkey,
  filterCommandsByQuery,
  getSlashQueryContext,
  listCommandHotkeyEntries,
  mergeDisplayModifiers,
  orderModifierBadges,
  type DisplayModifierBadge,
  type ModifierBadge,
} from "../../../domain/editor/interaction-core";
import type { GadflyAnnotation } from "../../../domain/gadfly/types";

const STORAGE_KEY = "gaddr:minimal-editor";
const GADFLY_NOTE_ID = "gaddr:editor:phase1";
const IDLE_SAVE_TIMEOUT_MS = 1200;
const MODIFIER_EXIT_ANIMATION_MS = 180;
const SLASH_MENU_WIDTH_PX = 360;
const SLASH_MENU_VIEWPORT_MARGIN_PX = 12;
const SLASH_MENU_VERTICAL_OFFSET_PX = 10;
const SLASH_MENU_BOTTOM_SAFE_AREA_PX = 230;
const DEV_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

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

type SlashMenuState = {
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

type HoveredGadflyState = {
  annotation: GadflyAnnotation;
  x: number;
  y: number;
};

function formatDebugJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(null);
  const [slashMenuActiveIndex, setSlashMenuActiveIndex] = useState(0);
  const [isMacLike, setIsMacLike] = useState(false);
  const [isDebugPaneOpen, setIsDebugPaneOpen] = useState(false);
  const [hoveredGadfly, setHoveredGadfly] = useState<HoveredGadflyState | null>(null);
  const activeModifiersSignatureRef = useRef("");
  const modifierOrderingStateRef = useRef(createModifierOrderingState());
  const modifierExitTimersRef = useRef<Map<string, number>>(new Map());
  const slashMenuSignatureRef = useRef("");
  const slashMenuQueryRef = useRef("");
  const dismissedSlashRangeRef = useRef<string | null>(null);
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
    return filterCommandsByQuery(EDITOR_MODIFIER_COMMANDS, commandPaletteQuery);
  }, [commandPaletteQuery]);

  const filteredSlashCommands = useMemo(() => {
    return filterCommandsByQuery(EDITOR_MODIFIER_COMMANDS, slashMenuState?.query ?? "");
  }, [slashMenuState?.query]);

  const commandHotkeyEntries = useMemo(
    () => listCommandHotkeyEntries(EDITOR_MODIFIER_COMMANDS),
    [],
  );

  const syncActiveModifiers = useCallback((current: TiptapEditor) => {
    const activeBadges = current.isFocused
      ? MODIFIER_BADGES.filter((badge) => badge.isActive(current)).map((badge) => ({
          key: badge.key,
          label: badge.label,
        }))
      : [];
    const { orderedBadges, signature, nextState } = orderModifierBadges(activeBadges, modifierOrderingStateRef.current);
    modifierOrderingStateRef.current = nextState;

    if (signature === activeModifiersSignatureRef.current) {
      return;
    }

    activeModifiersSignatureRef.current = signature;
    setActiveModifiers(orderedBadges);
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
    extensions: [StarterKit, Underline, GlyphInputRules, StandardHotkeys, GadflyHighlights],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap h-full min-h-[calc(100vh-8.5rem)] w-full bg-transparent text-lg leading-8 text-[var(--app-fg)] focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      schedulePersist(current);
    },
    onBlur: () => {
      flushPersist();
    },
  });

  const {
    annotations: gadflyAnnotations,
    analyzeError,
    clearDebugEntries,
    debugEntries,
    handleTransaction,
    isAnalyzing,
  } = useGadfly(editor, {
    noteId: GADFLY_NOTE_ID,
  });

  const gadflyAnnotationLookup = useMemo(() => {
    const entries: Array<[string, GadflyAnnotation]> = [];
    for (const annotation of gadflyAnnotations) {
      entries.push([annotation.id, annotation]);
    }
    return new Map(entries);
  }, [gadflyAnnotations]);

  const closeSlashMenu = useCallback(() => {
    slashMenuSignatureRef.current = "";
    slashMenuQueryRef.current = "";
    dismissedSlashRangeRef.current = null;
    setSlashMenuState(null);
    setSlashMenuActiveIndex(0);
  }, []);

  const dismissSlashMenu = useCallback(() => {
    if (slashMenuState) {
      dismissedSlashRangeRef.current = `${String(slashMenuState.from)}:${String(slashMenuState.to)}`;
    }

    slashMenuSignatureRef.current = "";
    slashMenuQueryRef.current = "";
    setSlashMenuState(null);
    setSlashMenuActiveIndex(0);
  }, [slashMenuState]);

  const buildSlashMenuState = useCallback(
    (current: TiptapEditor): SlashMenuState | null => {
      if (isCommandPaletteOpen || !current.isFocused) {
        return null;
      }

      const {
        from,
        empty,
        $from: resolvedFrom,
      } = current.state.selection;

      if (!empty) {
        return null;
      }

      const textBeforeCursor = resolvedFrom.parent.textBetween(0, resolvedFrom.parentOffset, "\0", "\0");
      const slashContext = getSlashQueryContext(textBeforeCursor, from);
      if (!slashContext) {
        return null;
      }

      const coords = current.view.coordsAtPos(from);
      const maxLeft = Math.max(
        SLASH_MENU_VIEWPORT_MARGIN_PX,
        window.innerWidth - SLASH_MENU_WIDTH_PX - SLASH_MENU_VIEWPORT_MARGIN_PX,
      );
      const maxTop = Math.max(
        SLASH_MENU_VIEWPORT_MARGIN_PX,
        window.innerHeight - SLASH_MENU_BOTTOM_SAFE_AREA_PX,
      );

      return {
        ...slashContext,
        left: Math.min(Math.max(coords.left, SLASH_MENU_VIEWPORT_MARGIN_PX), maxLeft),
        top: Math.min(
          Math.max(coords.bottom + SLASH_MENU_VERTICAL_OFFSET_PX, SLASH_MENU_VIEWPORT_MARGIN_PX),
          maxTop,
        ),
      };
    },
    [isCommandPaletteOpen],
  );

  const syncSlashMenu = useCallback(
    (current: TiptapEditor) => {
      const nextSlashState = buildSlashMenuState(current);
      if (!nextSlashState) {
        if (slashMenuSignatureRef.current !== "") {
          closeSlashMenu();
        }
        return;
      }

      const rangeKey = `${String(nextSlashState.from)}:${String(nextSlashState.to)}`;
      if (dismissedSlashRangeRef.current === rangeKey) {
        if (slashMenuSignatureRef.current !== "") {
          slashMenuSignatureRef.current = "";
          slashMenuQueryRef.current = "";
          setSlashMenuState(null);
          setSlashMenuActiveIndex(0);
        }
        return;
      }

      dismissedSlashRangeRef.current = null;
      const signature = `${rangeKey}:${nextSlashState.query}:${String(Math.round(nextSlashState.left))}:${String(
        Math.round(nextSlashState.top),
      )}`;
      if (signature === slashMenuSignatureRef.current) {
        return;
      }

      const queryChanged = slashMenuQueryRef.current !== nextSlashState.query;

      slashMenuSignatureRef.current = signature;
      slashMenuQueryRef.current = nextSlashState.query;
      setSlashMenuState(nextSlashState);
      if (queryChanged) {
        setSlashMenuActiveIndex(0);
      }
    },
    [buildSlashMenuState, closeSlashMenu],
  );

  const openCommandPalette = useCallback(() => {
    closeSlashMenu();
    setCommandPaletteQuery("");
    setCommandPaletteActiveIndex(0);
    setIsCommandPaletteOpen(true);
  }, [closeSlashMenu]);

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

  const runSlashMenuCommand = useCallback(
    (command: EditorCommand) => {
      if (!editor || !slashMenuState) {
        return;
      }

      editor.chain().focus().deleteRange({ from: slashMenuState.from, to: slashMenuState.to }).run();
      command.run(editor);
      syncActiveModifiers(editor);
      closeSlashMenu();
    },
    [closeSlashMenu, editor, slashMenuState, syncActiveModifiers],
  );

  const runSelectedSlashMenuCommand = useCallback(() => {
    const command = filteredSlashCommands[slashMenuActiveIndex] ?? filteredSlashCommands[0];
    if (!command) {
      return;
    }

    runSlashMenuCommand(command);
  }, [filteredSlashCommands, runSlashMenuCommand, slashMenuActiveIndex]);

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
    setSlashMenuActiveIndex((previous) => {
      if (filteredSlashCommands.length === 0) {
        return 0;
      }

      return previous >= filteredSlashCommands.length ? filteredSlashCommands.length - 1 : previous;
    });
  }, [filteredSlashCommands.length]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setGadflyAnnotations(gadflyAnnotations);
  }, [editor, gadflyAnnotations]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const onTransaction = ({ transaction }: { transaction: Parameters<typeof handleTransaction>[0] }) => {
      handleTransaction(transaction);
    };

    editor.on("transaction", onTransaction);

    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, handleTransaction]);

  useEffect(() => {
    if (!hoveredGadfly) {
      return;
    }

    if (gadflyAnnotationLookup.has(hoveredGadfly.annotation.id)) {
      return;
    }

    setHoveredGadfly(null);
  }, [gadflyAnnotationLookup, hoveredGadfly]);

  useEffect(() => {
    const isSlashMenuOpen = slashMenuState !== null;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (DEV_DEBUG_ENABLED && (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setIsDebugPaneOpen((current) => !current);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      if (isCommandPaletteOpen) {
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
          return;
        }

        return;
      }

      if (!isSlashMenuOpen) {
        return;
      }

      const matchedHotkeyEntry = commandHotkeyEntries.find((entry) => eventMatchesHotkey(event, entry.hotkey));
      if (matchedHotkeyEntry) {
        event.preventDefault();
        runSlashMenuCommand(matchedHotkeyEntry.command);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissSlashMenu();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashMenuActiveIndex((previous) => {
          if (filteredSlashCommands.length === 0) {
            return 0;
          }

          return (previous + 1) % filteredSlashCommands.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashMenuActiveIndex((previous) => {
          if (filteredSlashCommands.length === 0) {
            return 0;
          }

          return previous <= 0 ? filteredSlashCommands.length - 1 : previous - 1;
        });
        return;
      }

      if (event.key === "Enter") {
        const hasCommand = filteredSlashCommands.length > 0;
        if (!hasCommand) {
          return;
        }

        event.preventDefault();
        runSelectedSlashMenuCommand();
        return;
      }

      if (event.key === "Tab") {
        const command = filteredSlashCommands[slashMenuActiveIndex] ?? filteredSlashCommands[0];
        if (!command) {
          return;
        }

        event.preventDefault();
        runSlashMenuCommand(command);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [
    commandHotkeyEntries,
    closeCommandPalette,
    dismissSlashMenu,
    filteredPaletteCommands,
    filteredSlashCommands,
    isCommandPaletteOpen,
    openCommandPalette,
    runPaletteCommand,
    runSelectedPaletteCommand,
    runSelectedSlashMenuCommand,
    runSlashMenuCommand,
    slashMenuActiveIndex,
    slashMenuState,
  ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateEditorUi = () => {
      syncActiveModifiers(editor);
      syncSlashMenu(editor);
    };

    updateEditorUi();
    editor.on("selectionUpdate", updateEditorUi);
    editor.on("transaction", updateEditorUi);
    editor.on("focus", updateEditorUi);
    editor.on("blur", updateEditorUi);

    return () => {
      editor.off("selectionUpdate", updateEditorUi);
      editor.off("transaction", updateEditorUi);
      editor.off("focus", updateEditorUi);
      editor.off("blur", updateEditorUi);
    };
  }, [editor, syncActiveModifiers, syncSlashMenu]);

  useEffect(() => {
    setDisplayModifiers((previous) => {
      return mergeDisplayModifiers(previous, activeModifiers);
    });
  }, [activeModifiers]);

  useEffect(() => {
    const exitingKeys = new Set(collectExitingModifierKeys(displayModifiers));

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

  const handleEditorMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const elementWithId = target.closest("[data-gadfly-id]");
      if (!elementWithId) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const annotationId = elementWithId.getAttribute("data-gadfly-id");
      if (!annotationId) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const annotation = gadflyAnnotationLookup.get(annotationId);
      if (!annotation) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      setHoveredGadfly((previous) => {
        if (
          previous &&
          previous.annotation.id === annotation.id &&
          Math.abs(previous.x - event.clientX) < 3 &&
          Math.abs(previous.y - event.clientY) < 3
        ) {
          return previous;
        }

        return {
          annotation,
          x: event.clientX,
          y: event.clientY,
        };
      });
    },
    [gadflyAnnotationLookup],
  );

  const hoveredGadflyStyle = useMemo(() => {
    if (!hoveredGadfly) {
      return undefined;
    }

    const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
    const left = Math.min(hoveredGadfly.x + 14, Math.max(12, viewportWidth - 320));
    const top = Math.min(hoveredGadfly.y + 14, Math.max(12, viewportHeight - 240));

    return {
      left: `${String(left)}px`,
      top: `${String(top)}px`,
    } satisfies CSSProperties;
  }, [hoveredGadfly]);

  const debugEntriesView = useMemo(() => {
    return [...debugEntries].reverse().map((entry) => ({
      ...entry,
      timeLabel: new Date(entry.startedAtIso).toLocaleTimeString(),
      requestJson: formatDebugJson(entry.request),
      responseJson: formatDebugJson(entry.responseBody),
    }));
  }, [debugEntries]);

  if (!editor) {
    return <div className="min-h-[calc(100vh-8.5rem)]" />;
  }

  return (
    <div
      className="gaddr-editor-shell relative h-full"
      data-testid="editor-shell"
      onMouseMove={handleEditorMouseMove}
      onMouseLeave={() => {
        setHoveredGadfly(null);
      }}
    >
      {displayModifiers.length > 0 ? (
        <div className="gaddr-modifier-stack pointer-events-none fixed left-4 top-4 z-50 flex flex-col gap-1.5">
          {displayModifiers.map((modifier, index) => (
            <div
              key={modifier.key}
              className={`gaddr-modifier-chip inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[0.62rem] font-semibold leading-none tracking-[0.14em] backdrop-blur-[3px] ${
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
      <div className="gaddr-gadfly-status pointer-events-none fixed right-4 top-14 z-[48] hidden rounded-md border px-2.5 py-1 text-[0.64rem] font-semibold tracking-[0.09em] sm:block">
        {isAnalyzing ? "GADFLY ANALYZING" : "GADFLY IDLE"}
      </div>
      {slashMenuState && !isCommandPaletteOpen ? (
        <div
          aria-label="Editor slash menu"
          data-testid="slash-menu"
          className="gaddr-slash-menu fixed z-[58] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-xl border p-2 backdrop-blur-[2px]"
          style={
            {
              left: `${String(slashMenuState.left)}px`,
              top: `${String(slashMenuState.top)}px`,
            } satisfies CSSProperties
          }
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          <div className="gaddr-menu-label border-b px-3 pb-2 pt-1 text-xs tracking-[0.14em]">
            COMMANDS
          </div>
          <div className="max-h-[min(50vh,20rem)] overflow-y-auto py-1">
            {filteredSlashCommands.length > 0 ? (
              filteredSlashCommands.map((command, index) => {
                const commandIsActive = command.isActive?.(editor) ?? false;
                const commandIsSelected = index === slashMenuActiveIndex;

                return (
                  <button
                    key={command.id}
                    type="button"
                    data-testid={`slash-command-${command.id}`}
                    className={`gaddr-command-row ${
                      commandIsSelected ? "gaddr-command-row--selected" : commandIsActive ? "gaddr-command-row--active" : ""
                    } flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors`}
                    onMouseEnter={() => {
                      setSlashMenuActiveIndex(index);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      runSlashMenuCommand(command);
                    }}
                  >
                    <span className="text-sm font-medium tracking-[0.01em]">{command.label}</span>
                    <span className="ml-4 flex items-center gap-1.5">
                      {command.hotkeys.map((hotkey) => (
                        <kbd key={hotkey} className="gaddr-hotkey-chip rounded border px-1.5 py-0.5 text-[0.66rem] font-semibold tracking-[0.08em]">
                          {formatHotkey(hotkey)}
                        </kbd>
                      ))}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="gaddr-command-empty px-3 py-4 text-center text-sm">No matching commands</div>
            )}
          </div>
        </div>
      ) : null}
      {isCommandPaletteOpen ? (
        <div
          className="gaddr-command-overlay fixed inset-0 z-[60] flex items-start justify-center px-4 pt-14 backdrop-blur-[2px] sm:pt-20"
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
            data-testid="command-palette"
            className="gaddr-command-palette w-full max-w-xl rounded-xl border p-2"
          >
            <div className="gaddr-menu-label border-b px-3 pb-2 pt-1 text-xs tracking-[0.14em]">
              MODIFIERS
            </div>
            <div className="px-2 pb-1 pt-2">
              <input
                type="text"
                autoFocus
                value={commandPaletteQuery}
                placeholder="Search commands"
                data-testid="command-palette-input"
                className="gaddr-command-search w-full rounded-lg border px-3 py-2 text-sm outline-none"
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
                      data-testid={`command-${command.id}`}
                      className={`gaddr-command-row ${
                        commandIsSelected ? "gaddr-command-row--selected" : commandIsActive ? "gaddr-command-row--active" : ""
                      } flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors`}
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
                          <kbd key={hotkey} className="gaddr-hotkey-chip rounded border px-1.5 py-0.5 text-[0.66rem] font-semibold tracking-[0.08em]">
                            {formatHotkey(hotkey)}
                          </kbd>
                        ))}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="gaddr-command-empty px-3 py-6 text-center text-sm">No matching commands</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {analyzeError ? (
        <div className="gaddr-gadfly-error pointer-events-none fixed bottom-4 left-1/2 z-[59] w-[min(90vw,36rem)] -translate-x-1/2 rounded-lg border px-3 py-2 text-xs">
          Gadfly unavailable: {analyzeError}
        </div>
      ) : null}
      {hoveredGadfly ? (
        <aside
          className="gaddr-gadfly-card pointer-events-none fixed z-[57] w-[min(18.5rem,calc(100vw-1.5rem))] rounded-lg border p-3 backdrop-blur-[1px]"
          style={hoveredGadflyStyle}
        >
          <div className="text-[0.64rem] font-semibold tracking-[0.12em] text-[color:var(--app-muted)]">
            {hoveredGadfly.annotation.category.toUpperCase()} · {hoveredGadfly.annotation.severity.toUpperCase()}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[var(--app-fg)]">{hoveredGadfly.annotation.explanation}</p>
          <p className="mt-1.5 text-[0.7rem] leading-4 text-[color:var(--app-muted)]">Rule: {hoveredGadfly.annotation.rule}</p>
          <p className="mt-2 text-xs italic leading-5 text-[color:var(--app-fg)]">{hoveredGadfly.annotation.question}</p>
        </aside>
      ) : null}
      {DEV_DEBUG_ENABLED ? (
        <aside
          aria-label="Gadfly debug pane"
          data-testid="gadfly-debug-pane"
          className={`gaddr-debug-pane fixed bottom-4 right-4 top-4 z-[62] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border backdrop-blur-[2px] transition-all duration-200 ${
            isDebugPaneOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[105%] opacity-0"
          }`}
        >
          <header className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-[0.68rem] font-semibold tracking-[0.12em]">GADFLY DEBUG</div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="rounded border px-2 py-1 text-[0.63rem] font-semibold tracking-[0.08em]"
                onClick={clearDebugEntries}
              >
                CLEAR
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-[0.63rem] font-semibold tracking-[0.08em]"
                onClick={() => {
                  setIsDebugPaneOpen(false);
                }}
              >
                CLOSE
              </button>
            </div>
          </header>
          <div className="border-b px-3 py-2 text-[0.66rem] tracking-[0.09em]">
            {isAnalyzing ? "Status: analyzing" : "Status: idle"} · {debugEntries.length} entries
          </div>
          <div className="h-[calc(100%-5.2rem)] overflow-y-auto px-2 pb-2 pt-2">
            {debugEntriesView.length === 0 ? (
              <div className="rounded border border-dashed px-3 py-4 text-xs">
                No requests yet. Toggle with Cmd/Ctrl+Shift+D.
              </div>
            ) : (
              debugEntriesView.map((entry) => (
                <article key={entry.id} className="mb-2 rounded-lg border p-2 text-[0.67rem]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tracking-[0.08em] uppercase">
                      {entry.status} · {entry.id}
                    </span>
                    <span>{entry.timeLabel}</span>
                  </div>
                  <div className="mt-1 text-[0.62rem]">
                    HTTP {entry.responseStatus ?? "-"} · {entry.usage ? `${String(entry.usage.totalTokens)} tokens` : "0 tokens"} ·{" "}
                    {entry.latencyMs !== undefined ? `${String(entry.latencyMs)}ms` : "-"}
                  </div>
                  {entry.error ? <div className="mt-1 text-[#c7694a]">{entry.error}</div> : null}
                  <details className="mt-1">
                    <summary className="cursor-pointer select-none">Request JSON</summary>
                    <pre className="mt-1 max-h-36 overflow-auto rounded border p-2 text-[0.62rem] leading-4">
                      {entry.requestJson}
                    </pre>
                  </details>
                  <details className="mt-1">
                    <summary className="cursor-pointer select-none">Response JSON</summary>
                    <pre className="mt-1 max-h-36 overflow-auto rounded border p-2 text-[0.62rem] leading-4">
                      {entry.responseJson}
                    </pre>
                  </details>
                </article>
              ))
            )}
          </div>
        </aside>
      ) : null}
      {DEV_DEBUG_ENABLED && !isDebugPaneOpen ? (
        <button
          type="button"
          className="gaddr-debug-toggle-button fixed bottom-4 right-4 z-[61] rounded-md border px-2 py-1 text-[0.62rem] font-semibold tracking-[0.08em]"
          onClick={() => {
            setIsDebugPaneOpen(true);
          }}
        >
          GADFLY DEBUG
        </button>
      ) : null}
      <div data-testid="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
