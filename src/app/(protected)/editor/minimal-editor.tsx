"use client";

import { ClockIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { SignOutButton } from "../sign-out-button";
import { EDITOR_MODIFIER_COMMANDS, type EditorCommand } from "./editor-commands";
import { GlyphInputRules } from "./glyph-input-rules-extension";
import { StandardHotkeys } from "./standard-hotkeys-extension";
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
const STORAGE_KEY = "gaddr:minimal-editor";
const IDLE_SAVE_TIMEOUT_MS = 1200;
const MODIFIER_EXIT_ANIMATION_MS = 180;
const SLASH_MENU_WIDTH_PX = 360;
const SLASH_MENU_VIEWPORT_MARGIN_PX = 12;
const SLASH_MENU_VERTICAL_OFFSET_PX = 10;
const SLASH_MENU_BOTTOM_SAFE_AREA_PX = 230;
const DEFAULT_SPRINT_OPTION = "10m";
const SPRINT_EXTENSION_MINUTES = 5;
const SPRINT_RECENT_ACTIVITY_MS = 2600;
const SPRINT_OPTIONS = [
  {
    id: "5s",
    durationMs: 5_000,
    label: "5 sec",
    hint: "Transition test",
  },
  {
    id: "5m",
    durationMs: 5 * 60_000,
    label: "5 min",
    hint: "Quick reset",
  },
  {
    id: "10m",
    durationMs: 10 * 60_000,
    label: "10 min",
    hint: "Default",
  },
  {
    id: "15m",
    durationMs: 15 * 60_000,
    label: "15 min",
    hint: "Longer pass",
  },
  {
    id: "20m",
    durationMs: 20 * 60_000,
    label: "20 min",
    hint: "Deep focus",
  },
] as const;

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

type SprintOption = (typeof SPRINT_OPTIONS)[number];
type SprintOptionId = SprintOption["id"];
type SprintPhase = "idle" | "running" | "paused" | "completed";



function formatClockDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function getSprintOption(optionId: SprintOptionId): SprintOption {
  return SPRINT_OPTIONS.find((option) => option.id === optionId) ?? SPRINT_OPTIONS[0];
}

function formatSprintRemainingLabel(ms: number): string {
  if (ms <= 6 * 60_000) {
    return formatClockDuration(ms);
  }

  return `${String(Math.max(1, Math.ceil(ms / 60_000)))} min left`;
}

function formatOvertimeLabel(ms: number): string {
  return `+${formatClockDuration(ms)} overtime`;
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

/** Post-sprint board modes: editor zooms out, node grid animates in. */
type BoardMode = "hidden" | "transition_in" | "visible" | "transition_out";

export function MinimalEditor() {
  const [activeModifiers, setActiveModifiers] = useState<ModifierBadge[]>([]);
  const [displayModifiers, setDisplayModifiers] = useState<DisplayModifierBadge[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(null);
  const [slashMenuActiveIndex, setSlashMenuActiveIndex] = useState(0);
  const [isMacLike, setIsMacLike] = useState(false);
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const [sprintOption, setSprintOption] = useState<SprintOptionId>(DEFAULT_SPRINT_OPTION);
  const [sprintPhase, setSprintPhase] = useState<SprintPhase>("idle");
  const [sprintEndsAtMs, setSprintEndsAtMs] = useState<number | null>(null);
  const [pausedSprintRemainingMs, setPausedSprintRemainingMs] = useState<number | null>(null);
  const [sprintCompletedAtMs, setSprintCompletedAtMs] = useState<number | null>(null);
  const [sprintNowMs, setSprintNowMs] = useState(() => Date.now());
  const activeModifiersSignatureRef = useRef("");
  const modifierOrderingStateRef = useRef(createModifierOrderingState());
  const modifierExitTimersRef = useRef<Map<string, number>>(new Map());
  const slashMenuSignatureRef = useRef("");
  const slashMenuQueryRef = useRef("");
  const dismissedSlashRangeRef = useRef<string | null>(null);
  const pendingPersistRef = useRef(false);
  const saveHandleRef = useRef<SaveHandle | null>(null);
  const latestEditorRef = useRef<{ getJSON: () => JSONContent } | null>(null);
  const sprintMenuRef = useRef<HTMLDivElement | null>(null);
  const sprintPhaseRef = useRef<SprintPhase>("idle");
  const lastEditAtMsRef = useRef(Date.now());
  const [boardMode, setBoardMode] = useState<BoardMode>("hidden");
  const boardModeRef = useRef<BoardMode>("hidden");
  const hasShownBoardForSprintRef = useRef(false);

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

  const startSprint = useCallback((optionId: SprintOptionId) => {
    const now = Date.now();
    const option = getSprintOption(optionId);

    setBoardMode("hidden");
    hasShownBoardForSprintRef.current = false;
    setSprintNowMs(now);
    setSprintOption(option.id);
    setSprintPhase("running");
    setSprintEndsAtMs(now + option.durationMs);
    setPausedSprintRemainingMs(null);
    setSprintCompletedAtMs(null);
    setIsSprintMenuOpen(false);
  }, []);

  const pauseSprint = useCallback(() => {
    if (sprintPhase !== "running" || sprintEndsAtMs === null) {
      return;
    }

    const now = Date.now();
    const remainingMs = Math.max(sprintEndsAtMs - now, 0);
    setSprintNowMs(now);

    if (remainingMs === 0) {
      setSprintPhase("completed");
      setSprintEndsAtMs(null);
      setPausedSprintRemainingMs(null);
      setSprintCompletedAtMs(now);
      return;
    }

    setSprintPhase("paused");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(remainingMs);
  }, [sprintEndsAtMs, sprintPhase]);

  const resumeSprint = useCallback(() => {
    if (sprintPhase !== "paused" || pausedSprintRemainingMs === null) {
      return;
    }

    const now = Date.now();
    setSprintNowMs(now);
    setSprintPhase("running");
    setSprintEndsAtMs(now + pausedSprintRemainingMs);
    setPausedSprintRemainingMs(null);
    setSprintCompletedAtMs(null);
    setIsSprintMenuOpen(false);
  }, [pausedSprintRemainingMs, sprintPhase]);

  const endSprint = useCallback(() => {
    setBoardMode("hidden");
    setSprintPhase("idle");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(null);
    setSprintCompletedAtMs(null);
    setIsSprintMenuOpen(false);
  }, []);

  const addSprintTime = useCallback(() => {
    const now = Date.now();
    const extensionMs = SPRINT_EXTENSION_MINUTES * 60_000;

    setSprintNowMs(now);

    if (sprintPhase === "running" && sprintEndsAtMs !== null) {
      setSprintEndsAtMs(sprintEndsAtMs + extensionMs);
      setIsSprintMenuOpen(false);
      return;
    }

    if (sprintPhase === "paused" && pausedSprintRemainingMs !== null) {
      setPausedSprintRemainingMs(pausedSprintRemainingMs + extensionMs);
      setIsSprintMenuOpen(false);
      return;
    }

    if (sprintPhase === "completed") {
      setSprintPhase("running");
      setSprintEndsAtMs(now + extensionMs);
      setPausedSprintRemainingMs(null);
      setSprintCompletedAtMs(null);
      setIsSprintMenuOpen(false);
    }
  }, [pausedSprintRemainingMs, sprintEndsAtMs, sprintPhase]);

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
    extensions: [StarterKit, Underline, GlyphInputRules, StandardHotkeys],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap h-full min-h-[calc(100vh-8.5rem)] w-full bg-transparent text-lg leading-8 text-[var(--app-fg)] focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      const now = Date.now();
      lastEditAtMsRef.current = now;
      if (sprintPhaseRef.current === "completed") {
        setSprintNowMs(now);
      }
      // Exit board when user starts typing
      if (boardModeRef.current === "visible") {
        setBoardMode("transition_out");
      }
      schedulePersist(current);
    },
    onBlur: () => {
      flushPersist();
    },
  });

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
    const isSlashMenuOpen = slashMenuState !== null;

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

  const sprintRemainingMs = useMemo(() => {
    if (sprintPhase === "running" && sprintEndsAtMs !== null) {
      return Math.max(sprintEndsAtMs - sprintNowMs, 0);
    }

    if (sprintPhase === "paused") {
      return pausedSprintRemainingMs ?? 0;
    }

    return 0;
  }, [pausedSprintRemainingMs, sprintEndsAtMs, sprintNowMs, sprintPhase]);

  const sprintWriterActive = sprintNowMs - lastEditAtMsRef.current < SPRINT_RECENT_ACTIVITY_MS;

  const shouldTickSprintClock =
    sprintPhase === "running" || (sprintPhase === "completed" && sprintWriterActive);

  const sprintChipLabel = useMemo(() => {
    switch (sprintPhase) {
      case "running":
        return formatSprintRemainingLabel(sprintRemainingMs);
      case "paused":
        return `Paused ${formatSprintRemainingLabel(sprintRemainingMs)}`;
      case "completed":
        if (sprintCompletedAtMs === null || !sprintWriterActive) {
          return "Done";
        }

        return formatOvertimeLabel(Math.max(0, sprintNowMs - sprintCompletedAtMs));
      case "idle":
        return "Timer";
    }
  }, [sprintCompletedAtMs, sprintNowMs, sprintPhase, sprintRemainingMs, sprintWriterActive]);

  const sprintMenuNote = useMemo(() => {
    switch (sprintPhase) {
      case "running":
        return "The timer stays quiet while you write.";
      case "paused":
        return "Resume when you want more protected drafting time.";
      case "completed":
        return "Sprint complete. Your node grid is ready.";
      case "idle":
        return "Pick a length to start freewriting.";
    }
  }, [sprintPhase]);

  useEffect(() => {
    sprintPhaseRef.current = sprintPhase;
  }, [sprintPhase]);

  useEffect(() => {
    boardModeRef.current = boardMode;
  }, [boardMode]);



  // Board entry trigger: sprint completed + user idle
  useEffect(() => {
    if (sprintPhase !== "completed") return;
    if (sprintWriterActive) return;
    if (boardMode !== "hidden") return;
    if (hasShownBoardForSprintRef.current) return;
    if (!editor) return;

    hasShownBoardForSprintRef.current = true;
    setBoardMode("transition_in");
  }, [boardMode, editor, sprintPhase, sprintWriterActive]);

  // Board transition_in → visible after zoom-out completes
  useEffect(() => {
    if (boardMode !== "transition_in") return;

    const timer = window.setTimeout(() => {
      setBoardMode("visible");
    }, 1500);

    return () => { window.clearTimeout(timer); };
  }, [boardMode]);

  // Board transition_out → hidden after zoom-in completes
  useEffect(() => {
    if (boardMode !== "transition_out") return;

    const timer = window.setTimeout(() => {
      setBoardMode("hidden");
    }, 1100);

    return () => { window.clearTimeout(timer); };
  }, [boardMode]);

  useEffect(() => {
    if (!shouldTickSprintClock) {
      return;
    }

    const tick = () => {
      setSprintNowMs(Date.now());
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [shouldTickSprintClock]);

  useEffect(() => {
    if (sprintPhase !== "running" || sprintEndsAtMs === null || sprintNowMs < sprintEndsAtMs) {
      return;
    }

    setSprintPhase("completed");
    setSprintEndsAtMs(null);
    setPausedSprintRemainingMs(null);
    setSprintCompletedAtMs(sprintEndsAtMs);
    setIsSprintMenuOpen(false);
  }, [sprintEndsAtMs, sprintNowMs, sprintPhase]);

  useEffect(() => {
    if (!isSprintMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || sprintMenuRef.current?.contains(target)) {
        return;
      }

      setIsSprintMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSprintMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleEscape, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, [isSprintMenuOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen && !slashMenuState) {
      return;
    }

    setIsSprintMenuOpen(false);
  }, [isCommandPaletteOpen, slashMenuState]);

  if (!editor) {
    return <div className="min-h-[calc(100vh-8.5rem)]" />;
  }

  const showBoardReopen =
    sprintPhase === "completed" &&
    boardMode === "hidden" &&
    hasShownBoardForSprintRef.current;

  return (
    <div
      className="gaddr-editor-shell relative h-full"
      data-testid="editor-shell"
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
      <div className={`pointer-events-none fixed right-4 top-4 z-[68] flex justify-end ${boardMode !== "hidden" ? "hidden" : ""}`}>
        <div className="pointer-events-auto flex items-start gap-2">
          {showBoardReopen ? (
            <button
              type="button"
              data-testid="board-reopen-button"
              className="gaddr-sprint-chip gaddr-sprint-chip--complete rounded-full border px-2.5 py-1.5 text-left transition-all"
              onClick={() => {
                setIsSprintMenuOpen(false);
                setBoardMode("transition_in");
              }}
            >
              <span className="whitespace-nowrap text-[0.72rem] font-semibold leading-4 text-[var(--app-fg)]">
                Explore
              </span>
            </button>
          ) : null}
          <div
            ref={sprintMenuRef}
            className="relative"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !sprintMenuRef.current?.contains(nextTarget)) {
                setIsSprintMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-expanded={isSprintMenuOpen}
              aria-haspopup="dialog"
              data-testid="sprint-chip"
              className={`gaddr-sprint-chip rounded-full border px-2.5 py-1.5 text-left transition-all ${
                sprintPhase === "completed"
                  ? "gaddr-sprint-chip--complete"
                  : sprintPhase === "running"
                    ? "gaddr-sprint-chip--running"
                    : sprintPhase === "paused"
                      ? "gaddr-sprint-chip--paused"
                      : ""
              }`}
              onClick={() => {
                setIsSprintMenuOpen((current) => !current);
              }}
            >
              <span className="flex items-center gap-2">
                <ClockIcon size={14} weight="regular" aria-hidden="true" className="text-[color:var(--app-muted)]" />
                <span className="whitespace-nowrap text-[0.72rem] font-semibold leading-4 text-[var(--app-fg)]">
                  {sprintChipLabel}
                </span>
              </span>
            </button>
            {isSprintMenuOpen ? (
              <div
                role="dialog"
                aria-label="Freewrite timer"
                data-testid="sprint-menu"
                className="gaddr-sprint-menu absolute right-0 top-full z-[58] mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border p-2"
              >
                <div className="gaddr-menu-label border-b px-3 pb-2 pt-1 text-[0.62rem] tracking-[0.12em]">
                  TIMER
                </div>
                <div className="px-1 pb-1 pt-2">
                  {sprintPhase === "idle" ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {SPRINT_OPTIONS.map((option) => {
                        const isSelected = option.id === sprintOption;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`gaddr-sprint-option rounded-xl border px-3 py-2 text-left ${
                              isSelected ? "gaddr-sprint-option--selected" : ""
                            }`}
                            onClick={() => {
                              startSprint(option.id);
                            }}
                          >
                            <div className="text-[0.73rem] font-semibold leading-4 text-[var(--app-fg)]">
                              {option.label}
                            </div>
                            <div className="mt-1 text-[0.6rem] leading-4 text-[color:var(--app-muted)]">
                              {option.hint}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      <button
                        type="button"
                        className="gaddr-sprint-action rounded-xl border px-3 py-2 text-left"
                        onClick={() => {
                          if (sprintPhase === "paused") {
                            resumeSprint();
                            return;
                          }

                          pauseSprint();
                        }}
                      >
                        <div className="text-[0.73rem] font-semibold leading-4 text-[var(--app-fg)]">
                          {sprintPhase === "paused" ? "Resume timer" : "Pause timer"}
                        </div>
                        <div className="mt-1 text-[0.6rem] leading-4 text-[color:var(--app-muted)]">
                          {sprintPhase === "paused" ? "Return to the countdown quietly." : "Freeze the timer without changing the draft."}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="gaddr-sprint-action rounded-xl border px-3 py-2 text-left"
                        onClick={addSprintTime}
                      >
                        <div className="text-[0.73rem] font-semibold leading-4 text-[var(--app-fg)]">
                          +{String(SPRINT_EXTENSION_MINUTES)} min
                        </div>
                        <div className="mt-1 text-[0.6rem] leading-4 text-[color:var(--app-muted)]">
                          Extend the protected writing window without changing focus.
                        </div>
                      </button>
                      <button
                        type="button"
                        className="gaddr-sprint-action rounded-xl border px-3 py-2 text-left"
                        onClick={endSprint}
                      >
                        <div className="text-[0.73rem] font-semibold leading-4 text-[var(--app-fg)]">End timer</div>
                        <div className="mt-1 text-[0.6rem] leading-4 text-[color:var(--app-muted)]">
                          Return to the idle timer without interrupting the note.
                        </div>
                      </button>
                    </div>
                  )}
                  <p className="mt-2 px-2 text-[0.62rem] leading-4 text-[color:var(--app-muted)]">{sprintMenuNote}</p>
                  <div className="mt-2 border-t pt-2 px-2">
                    <SignOutButton />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
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
      <div
        className={`gaddr-constellation-stage ${boardMode !== "hidden" ? "gaddr-constellation-stage--active" : ""}`}
      >
        {boardMode === "visible" ? (
          <div
            className="gaddr-constellation-flow-container flex items-center justify-center"
            data-testid="node-grid"
          >
            {/* Node grid placeholder — constellation rework goes here */}
          </div>
        ) : null}
        <div
          data-testid="editor-content"
          className={`gaddr-constellation-editor-pane${
            boardMode === "transition_in"
              ? " gaddr-constellation-editor-pane--zooming-out"
              : boardMode === "visible"
                ? " gaddr-constellation-editor-pane--hidden"
                : boardMode === "transition_out"
                  ? " gaddr-constellation-editor-pane--zooming-in"
                  : ""
          }`}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
