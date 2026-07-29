"use client";

import { ClockIcon, PauseIcon, PlayIcon, StopIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CanvasFlow } from "./canvas-flow";
import { EditorCardProvider } from "./editor-card-context";
import { EDITOR_MODIFIER_COMMANDS, type EditorCommand } from "./editor-commands";
import { GlyphInputRules } from "./glyph-input-rules-extension";
import { StandardHotkeys } from "./standard-hotkeys-extension";
import { SparkHotkey } from "./spark-hotkey-extension";
import { FreewriteWizard } from "./freewrite-wizard";
import { SparkAffordance } from "./spark-affordance";
import { SparkCard } from "./spark-card";
import { useBoardEntry, type BoardMode } from "./use-board-entry";
import { useSprintSession } from "./use-sprint-session";
import { useTimerHoverControls } from "./use-timer-hover-controls";
import { useTriggerDetector, type TriggerObserver } from "./use-trigger-detector";
import { useBackgroundInference } from "./use-background-inference";
import { useSpark } from "./use-spark";
import { useConstellationRun } from "./use-constellation-run";
import { rankFindings } from "../../../domain/constellation/substrate";
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
const DEBUG_INFERENCE_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_TRIGGERS === "true";
const IDLE_SAVE_TIMEOUT_MS = 1200;
const MODIFIER_EXIT_ANIMATION_MS = 180;
const MODIFIER_CHIP_ROW_PX = 34;
const SLASH_MENU_WIDTH_PX = 360;
const SLASH_MENU_VIEWPORT_MARGIN_PX = 12;
const SLASH_MENU_VERTICAL_OFFSET_PX = 10;
const SLASH_MENU_BOTTOM_SAFE_AREA_PX = 230;
const DEFAULT_SPRINT_OPTION = "10m";

const SPRINT_OPTIONS = [
  { id: "5s", durationMs: 5_000, label: "5 sec", hint: "Transition test" },
  { id: "5m", durationMs: 5 * 60_000, label: "5 min", hint: "Quick reset" },
  { id: "10m", durationMs: 10 * 60_000, label: "10 min", hint: "Default" },
  { id: "15m", durationMs: 15 * 60_000, label: "15 min", hint: "Longer pass" },
  { id: "20m", durationMs: 20 * 60_000, label: "20 min", hint: "Deep focus" },
] as const;

type IdleRequestCallbackLike = (deadline: { readonly didTimeout: boolean; timeRemaining: () => number }) => void;
type IdleSchedulerWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallbackLike, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
type SaveHandle =
  | { kind: "idle"; id: number }
  | { kind: "timeout"; id: number };

type SlashMenuState = {
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

function formatClockDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function formatSprintRemainingLabel(ms: number): string {
  if (ms <= 6 * 60_000) {
    return formatClockDuration(ms);
  }
  return `${String(Math.max(1, Math.ceil(ms / 60_000)))} min left`;
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
    if (!raw) return emptyDoc();
    const parsed = JSON.parse(raw) as JSONContent;
    if (parsed.type !== "doc") return emptyDoc();
    return parsed;
  } catch {
    return emptyDoc();
  }
}

type BoardEntryActions = {
  markBoardShown: () => void;
  setBoardMode: (mode: BoardMode) => void;
  resetForNewSprint: () => void;
};

export function MinimalEditor() {
  // === Editor chrome state ===
  const [activeModifiers, setActiveModifiers] = useState<ModifierBadge[]>([]);
  const [displayModifiers, setDisplayModifiers] = useState<DisplayModifierBadge[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(null);
  const [slashMenuActiveIndex, setSlashMenuActiveIndex] = useState(0);
  const [isMacLike, setIsMacLike] = useState(false);

  const activeModifiersSignatureRef = useRef("");
  const modifierOrderingStateRef = useRef(createModifierOrderingState());
  const modifierExitTimersRef = useRef<Map<string, number>>(new Map());
  const slashMenuSignatureRef = useRef("");
  const slashMenuQueryRef = useRef("");
  const dismissedSlashRangeRef = useRef<string | null>(null);

  // === Doc persistence state ===
  const pendingPersistRef = useRef(false);
  const saveHandleRef = useRef<SaveHandle | null>(null);
  const latestEditorRef = useRef<{ getJSON: () => JSONContent } | null>(null);

  // === Lifecycle refs hoisted so onUpdate can use them via ref ===
  const lastEditAtMsRef = useRef(Date.now());
  const boardModeRef = useRef<BoardMode>("hidden");
  const setBoardModeRef = useRef<(mode: BoardMode) => void>(() => undefined);
  const boardEntryActionsRef = useRef<BoardEntryActions | null>(null);
  /** True while the board has a focused star or an opened card. Escape then means
   * "close that", not "leave the board" — without this, pressing Escape to close
   * a card ejected the writer out of review entirely. */
  const boardHasFocusRef = useRef(false);
  // Spark wiring, hoisted so the editor config can reference them via ref (the
  // editor is built once; these read the latest handler at event time):
  //  - onUpdate composes in the spark `edit` signal (re-arm / card-end) rather
  //    than adding a second editor listener (plan §5.1).
  //  - the ⌘. accelerator reads the current summon-or-noop gate.
  const sparkNotifyEditRef = useRef<(() => void) | null>(null);
  const sparkSummonHotkeyRef = useRef<() => boolean>(() => false);

  // === Doc persistence callbacks (used by useEditor) ===
  const persistNow = useCallback((current: { getJSON: () => JSONContent }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.getJSON()));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const clearScheduledPersist = useCallback(() => {
    if (!saveHandleRef.current) return;
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
    if (!current) return;
    clearScheduledPersist();
    pendingPersistRef.current = false;
    persistNow(current);
  }, [clearScheduledPersist, persistNow]);

  const schedulePersist = useCallback((current: { getJSON: () => JSONContent }) => {
    latestEditorRef.current = current;
    pendingPersistRef.current = true;
    if (saveHandleRef.current) return;

    const runPersist = () => {
      saveHandleRef.current = null;
      if (!pendingPersistRef.current) return;
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

  // === TipTap editor ===
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [
      StarterKit,
      GlyphInputRules,
      StandardHotkeys,
      SparkHotkey.configure({ onSummon: () => sparkSummonHotkeyRef.current() }),
    ],
    content: loadDoc(),
    editorProps: {
      attributes: {
        class:
          "tiptap h-full w-full bg-transparent text-lg leading-8 text-[var(--app-fg)] focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      lastEditAtMsRef.current = Date.now();
      if (boardModeRef.current === "visible" || boardModeRef.current === "transition_in") {
        setBoardModeRef.current("transition_out");
      }
      // Feed the spark reducer its `edit` signal off the SINGLE existing update
      // handler (plan §5.1). It is an O(1) reducer dispatch that returns the same
      // state object on the common no-op path, so React bails the re-render —
      // nothing added to the keystroke path (typing latency is P0).
      sparkNotifyEditRef.current?.();
      schedulePersist(current);
    },
    onBlur: () => {
      flushPersist();
    },
  });

  // === Sprint lifecycle (state + persistence + wizard + resume) ===
  const session = useSprintSession({
    options: SPRINT_OPTIONS,
    defaultOptionId: DEFAULT_SPRINT_OPTION,
    onRestoredCompleted: () => {
      const actions = boardEntryActionsRef.current;
      if (!actions) return;
      actions.markBoardShown();
      actions.setBoardMode("visible");
    },
    onSprintReset: () => {
      boardEntryActionsRef.current?.resetForNewSprint();
    },
  });

  // === Board overlay lifecycle ===
  const boardEntry = useBoardEntry({
    sprintPhase: session.sprintPhase,
    editorReady: editor !== null,
    lastEditAtMsRef,
  });

  // Wire refs the editor uses through ref so order-of-declaration doesn't matter.
  boardEntryActionsRef.current = {
    markBoardShown: boardEntry.markBoardShown,
    setBoardMode: boardEntry.setBoardMode,
    resetForNewSprint: boardEntry.resetForNewSprint,
  };
  boardModeRef.current = boardEntry.boardMode;
  setBoardModeRef.current = boardEntry.setBoardMode;

  // === Timer chrome hover ===
  const hoverControls = useTimerHoverControls(session.sprintPhase);

  // === Background intelligence (trigger detector -> tiered inference + spark) ===
  // Gated on a running sprint; nothing does work off the keystroke path except
  // when a trigger fires.
  const sprintRunning = session.sprintPhase === "running";
  const inference = useBackgroundInference({ sprintId: session.sprintId });
  const spark = useSpark({
    editor,
    sprintId: session.sprintId,
    sprintPhase: session.sprintPhase,
  });

  // === Sprint-end constellation run (plan §6) ===
  // Fires on the completed-phase TRANSITION (observed on the value, so all four
  // completion sites are covered — D3), then polls the two-beat reveal. Reading
  // the draft + substrate is deferred to a callback so nothing runs off the
  // keystroke path.
  const editorRef = useRef<TiptapEditor | null>(editor);
  editorRef.current = editor;
  const substrateRef = useRef(inference.substrate);
  substrateRef.current = inference.substrate;
  const getConstellationInput = useCallback(() => {
    const current = editorRef.current;
    if (current === null) return null;
    return {
      draft: current.getText({ blockSeparator: "\n\n" }),
      substrateSnapshot: JSON.stringify(substrateRef.current),
    };
  }, []);
  const constellation = useConstellationRun({
    sprintId: session.sprintId,
    sprintPhase: session.sprintPhase,
    getRunInput: getConstellationInput,
  });

  // ONE detector, ONE combined observer fanning out to both consumers. A second
  // `useTriggerDetector` is forbidden (plan §5.1): it would double-run the idle
  // tick and fork the burst anchor, so we compose the observers here instead.
  const observeTriggers = useCallback<TriggerObserver>(
    (observation) => {
      inference.observe(observation);
      spark.observe(observation);
    },
    [inference, spark],
  );
  useTriggerDetector(editor, {
    enabled: sprintRunning,
    observer: observeTriggers,
  });

  // Wire the spark refs the editor config / accelerator read (assigned during
  // render, matching the file's ref idiom). The ⌘. accelerator returns false —
  // letting the key pass through — whenever a sprint is not running (plan §5.2).
  sparkNotifyEditRef.current = spark.notifyEdit;
  sparkSummonHotkeyRef.current = () => {
    if (session.sprintPhase !== "running") {
      return false;
    }
    spark.summon();
    return true;
  };

  // === Timer toggle (pause/resume) ===
  const handleTimerToggle = useCallback(() => {
    if (session.sprintPhase === "running") {
      session.pauseSprint();
    } else if (session.sprintPhase === "paused") {
      session.resumeSprint();
    }
  }, [session]);

  // Two named entry points share resetToWizard so call sites read clearly.
  const stopSprint = session.resetToWizard;
  const startNewFreewrite = session.resetToWizard;

  // === Slash menu / command palette callbacks ===
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
      if (isCommandPaletteOpen || !current.isFocused) return null;
      const { from, empty, $from: resolvedFrom } = current.state.selection;
      if (!empty) return null;

      const textBeforeCursor = resolvedFrom.parent.textBetween(0, resolvedFrom.parentOffset, "\0", "\0");
      const slashContext = getSlashQueryContext(textBeforeCursor, from);
      if (!slashContext) return null;

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
      if (signature === slashMenuSignatureRef.current) return;

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

  // === Derived ===
  const filteredPaletteCommands = useMemo(
    () => filterCommandsByQuery(EDITOR_MODIFIER_COMMANDS, commandPaletteQuery),
    [commandPaletteQuery],
  );

  const filteredSlashCommands = useMemo(
    () => filterCommandsByQuery(EDITOR_MODIFIER_COMMANDS, slashMenuState?.query ?? ""),
    [slashMenuState?.query],
  );

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
    if (signature === activeModifiersSignatureRef.current) return;
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

  const runPaletteCommand = useCallback(
    (command: EditorCommand) => {
      if (!editor) return;
      command.run(editor);
      syncActiveModifiers(editor);
      closeCommandPalette();
    },
    [closeCommandPalette, editor, syncActiveModifiers],
  );

  const runSelectedPaletteCommand = useCallback(() => {
    const command = filteredPaletteCommands[commandPaletteActiveIndex] ?? filteredPaletteCommands[0];
    if (!command) return;
    runPaletteCommand(command);
  }, [commandPaletteActiveIndex, filteredPaletteCommands, runPaletteCommand]);

  const runSlashMenuCommand = useCallback(
    (command: EditorCommand) => {
      if (!editor || !slashMenuState) return;
      editor.chain().focus().deleteRange({ from: slashMenuState.from, to: slashMenuState.to }).run();
      command.run(editor);
      syncActiveModifiers(editor);
      closeSlashMenu();
    },
    [closeSlashMenu, editor, slashMenuState, syncActiveModifiers],
  );

  const runSelectedSlashMenuCommand = useCallback(() => {
    const command = filteredSlashCommands[slashMenuActiveIndex] ?? filteredSlashCommands[0];
    if (!command) return;
    runSlashMenuCommand(command);
  }, [filteredSlashCommands, runSlashMenuCommand, slashMenuActiveIndex]);

  // === Effects ===

  // Editor focus once the wizard isn't covering it.
  useEffect(() => {
    if (!editor || session.wizardMode !== "hidden" || editor.isFocused) return;
    editor.commands.focus("end");
  }, [editor, session.wizardMode]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMacLike(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  useEffect(() => {
    setCommandPaletteActiveIndex((previous) => {
      if (filteredPaletteCommands.length === 0) return 0;
      return previous >= filteredPaletteCommands.length ? filteredPaletteCommands.length - 1 : previous;
    });
  }, [filteredPaletteCommands.length]);

  useEffect(() => {
    setSlashMenuActiveIndex((previous) => {
      if (filteredSlashCommands.length === 0) return 0;
      return previous >= filteredSlashCommands.length ? filteredSlashCommands.length - 1 : previous;
    });
  }, [filteredSlashCommands.length]);

  useEffect(() => {
    const isSlashMenuOpen = slashMenuState !== null;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (boardModeRef.current === "visible" || boardModeRef.current === "transition_in")) {
        // The board owns Escape while it has something open (a focused star or an
        // opened card) — it closes that layer itself. Only an Escape with nothing
        // open means "leave the board".
        if (boardHasFocusRef.current) return;
        event.preventDefault();
        setBoardModeRef.current("transition_out");
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
            if (filteredPaletteCommands.length === 0) return 0;
            return (previous + 1) % filteredPaletteCommands.length;
          });
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setCommandPaletteActiveIndex((previous) => {
            if (filteredPaletteCommands.length === 0) return 0;
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
          if (!firstCommand) return;
          setCommandPaletteQuery(firstCommand.label);
          setCommandPaletteActiveIndex(0);
          return;
        }
        return;
      }

      if (!isSlashMenuOpen) return;

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
          if (filteredSlashCommands.length === 0) return 0;
          return (previous + 1) % filteredSlashCommands.length;
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashMenuActiveIndex((previous) => {
          if (filteredSlashCommands.length === 0) return 0;
          return previous <= 0 ? filteredSlashCommands.length - 1 : previous - 1;
        });
        return;
      }
      if (event.key === "Enter") {
        if (filteredSlashCommands.length === 0) return;
        event.preventDefault();
        runSelectedSlashMenuCommand();
        return;
      }
      if (event.key === "Tab") {
        const command = filteredSlashCommands[slashMenuActiveIndex] ?? filteredSlashCommands[0];
        if (!command) return;
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
    if (!editor) return;
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
    setDisplayModifiers((previous) => mergeDisplayModifiers(previous, activeModifiers));
  }, [activeModifiers]);

  const visibleModifierPositions = useMemo(() => {
    const positions = new Map<string, number>();
    let visibleIndex = 0;
    for (const modifier of displayModifiers) {
      if (!modifier.exiting) {
        positions.set(modifier.key, visibleIndex);
        visibleIndex += 1;
      }
    }
    return positions;
  }, [displayModifiers]);

  useEffect(() => {
    const exitingKeys = new Set(collectExitingModifierKeys(displayModifiers));
    for (const key of exitingKeys) {
      if (modifierExitTimersRef.current.has(key)) continue;
      const timeoutId = window.setTimeout(() => {
        modifierExitTimersRef.current.delete(key);
        setDisplayModifiers((previous) => previous.filter((modifier) => modifier.key !== key));
      }, MODIFIER_EXIT_ANIMATION_MS);
      modifierExitTimersRef.current.set(key, timeoutId);
    }
    for (const [key, timeoutId] of modifierExitTimersRef.current.entries()) {
      if (exitingKeys.has(key)) continue;
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

  // === Sprint chip label ===
  const sprintRemainingMs = useMemo(() => {
    if (session.sprintPhase === "running" && session.sprintEndsAtMs !== null) {
      return Math.max(session.sprintEndsAtMs - session.sprintNowMs, 0);
    }
    if (session.sprintPhase === "paused") {
      return session.pausedSprintRemainingMs ?? 0;
    }
    return 0;
  }, [session.pausedSprintRemainingMs, session.sprintEndsAtMs, session.sprintNowMs, session.sprintPhase]);

  const sprintChipLabel = useMemo(() => {
    switch (session.sprintPhase) {
      case "running":
        return formatSprintRemainingLabel(sprintRemainingMs);
      case "paused":
        return `Paused ${formatSprintRemainingLabel(sprintRemainingMs)}`;
      case "completed":
        return "Done";
      case "idle":
        return "Timer";
    }
  }, [session.sprintPhase, sprintRemainingMs]);

  // === Background-inference debug surface (dev only) ===
  const rankedFindings = useMemo(
    () => rankFindings(inference.substrate.findings),
    [inference.substrate.findings],
  );

  const exitBoardAndFocus = useCallback(() => {
    boardEntry.exitBoard();
    window.setTimeout(() => {
      const el = document.querySelector(".tiptap");
      if (el instanceof HTMLElement) el.focus();
    }, 100);
  }, [boardEntry]);

  const handleCanvasMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (boardEntry.boardMode !== "hidden" || !editor) return;
      const target = event.target;
      if (target instanceof Element && target.closest(".tiptap")) {
        return;
      }
      if (editor.isFocused) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      editor.commands.focus("end");
    },
    [boardEntry.boardMode, editor],
  );

  if (!editor) {
    return <div className="h-full" />;
  }

  return (
    <div
      className="gaddr-editor-shell relative flex h-full flex-col"
      data-testid="editor-shell"
      data-board-active={boardEntry.boardMode !== "hidden" ? "true" : undefined}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {boardEntry.boardMode === "transition_in" || boardEntry.boardMode === "visible"
          ? "Sprint complete. Entering review board."
          : boardEntry.boardMode === "transition_out"
            ? "Returning to editor."
            : null}
      </div>

      {displayModifiers.length > 0 && session.wizardMode === "hidden" ? (
        <div className="gaddr-modifier-stack pointer-events-none fixed left-4 top-4 z-50">
          {displayModifiers.map((modifier, index) => {
            const visiblePos = visibleModifierPositions.get(modifier.key);
            const yIndex = visiblePos ?? index;
            const chipStyle: CSSProperties = {
              top: `${String(yIndex * MODIFIER_CHIP_ROW_PX)}px`,
            };
            if (!modifier.exiting) {
              chipStyle.animationDelay = `${String(index * 36)}ms`;
            }
            return (
              <div
                key={modifier.key}
                className={`gaddr-modifier-chip absolute left-0 inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[0.62rem] font-semibold leading-none tracking-[0.14em] backdrop-blur-[3px] fill-mode-both motion-reduce:animate-none ${
                  modifier.exiting
                    ? "animate-out fade-out slide-out-to-left-2 zoom-out-95 duration-150 ease-in"
                    : "animate-in fade-in slide-in-from-left-2 zoom-in-95 duration-200 ease-out"
                }`}
                style={chipStyle}
              >
                {modifier.label}
              </div>
            );
          })}
        </div>
      ) : null}

      <div
        className={`pointer-events-none fixed right-4 top-4 z-[68] flex justify-end ${
          !session.hasRestored || boardEntry.boardMode !== "hidden" || session.wizardMode !== "hidden"
            ? "hidden"
            : ""
        }`}
      >
        <div className="pointer-events-auto flex items-start gap-2">
          {boardEntry.showBoardReopen ? (
            <button
              type="button"
              data-testid="board-reopen-button"
              className="gaddr-sprint-chip gaddr-sprint-chip--complete rounded-full border px-2.5 py-1.5 text-left transition-all"
              onClick={() => {
                boardEntry.setBoardMode("transition_in");
              }}
            >
              <span className="whitespace-nowrap text-[0.72rem] font-semibold leading-4 text-[var(--app-fg)]">
                Review board
              </span>
            </button>
          ) : null}
          <div
            className="flex flex-col items-end gap-1.5 p-1"
            onMouseEnter={hoverControls.onMouseEnter}
            onMouseLeave={hoverControls.onMouseLeave}
          >
            <div
              data-testid="sprint-chip"
              data-phase={session.sprintPhase}
              className={`gaddr-sprint-chip rounded-full border px-2.5 py-1.5 text-left transition-all ${
                session.sprintPhase === "completed"
                  ? "gaddr-sprint-chip--complete"
                  : session.sprintPhase === "running"
                    ? "gaddr-sprint-chip--running"
                    : session.sprintPhase === "paused"
                      ? "gaddr-sprint-chip--paused"
                      : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <ClockIcon size={14} weight="regular" aria-hidden="true" className="text-[color:var(--app-muted)]" />
                <span className="whitespace-nowrap text-[0.72rem] font-semibold leading-4 text-[var(--app-fg)]">
                  {sprintChipLabel}
                </span>
              </span>
            </div>
            {hoverControls.canShowTimerControls ? (
              <>
                <button
                  type="button"
                  data-testid="sprint-toggle"
                  aria-label={session.sprintPhase === "running" ? "Pause timer" : "Resume timer"}
                  onClick={handleTimerToggle}
                  className={`gaddr-sprint-chip flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ease-out ${
                    hoverControls.showTimerControls ? "[transition-delay:0ms]" : "[transition-delay:120ms]"
                  } ${
                    session.sprintPhase === "paused" ? "gaddr-sprint-chip--paused" : "gaddr-sprint-chip--running"
                  } ${
                    hoverControls.showTimerControls
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-2 opacity-0"
                  }`}
                >
                  {session.sprintPhase === "running" ? (
                    <PauseIcon size={12} weight="fill" aria-hidden="true" />
                  ) : (
                    <PlayIcon size={12} weight="fill" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  data-testid="sprint-add-minute"
                  aria-label="Add 1 minute"
                  onClick={session.addOneMinute}
                  className={`gaddr-sprint-chip flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ease-out [transition-delay:60ms] ${
                    session.sprintPhase === "paused" ? "gaddr-sprint-chip--paused" : "gaddr-sprint-chip--running"
                  } ${
                    hoverControls.showTimerControls
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-2 opacity-0"
                  }`}
                >
                  <span className="text-[0.56rem] font-semibold tabular-nums leading-none">+1m</span>
                </button>
                <button
                  type="button"
                  data-testid="sprint-stop"
                  aria-label="Stop timer"
                  onClick={stopSprint}
                  className={`gaddr-sprint-chip flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ease-out ${
                    hoverControls.showTimerControls ? "[transition-delay:120ms]" : "[transition-delay:0ms]"
                  } ${
                    session.sprintPhase === "paused" ? "gaddr-sprint-chip--paused" : "gaddr-sprint-chip--running"
                  } ${
                    hoverControls.showTimerControls
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none translate-x-2 opacity-0"
                  }`}
                >
                  <StopIcon size={12} weight="fill" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {slashMenuState && !isCommandPaletteOpen ? (
        <div
          aria-label="Editor slash menu"
          data-testid="slash-menu"
          className="gaddr-slash-menu fixed z-[58] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-xl border p-2 backdrop-blur-[2px] animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150 ease-out fill-mode-both motion-reduce:animate-none"
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
          <div className="gaddr-menu-label border-b px-3 pb-2 pt-1 text-xs tracking-[0.14em]">COMMANDS</div>
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
            className="gaddr-command-palette w-full max-w-xl rounded-xl border p-2 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 ease-out fill-mode-both motion-reduce:animate-none"
          >
            <div className="gaddr-menu-label border-b px-3 pb-2 pt-1 text-xs tracking-[0.14em]">MODIFIERS</div>
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

      {session.hasRestored && session.wizardMode !== "hidden" ? (
        <FreewriteWizard
          mode={session.wizardMode}
          options={SPRINT_OPTIONS}
          onSelect={session.handleWizardSelect}
          resumeRemainingMs={session.resumeOption?.remainingMs ?? null}
          onResume={session.resumeOption ? session.handleWizardResume : undefined}
        />
      ) : null}

      {/* Spark: the static affordance and the summoned card, both only while the
          sprint is running. Before a summon the affordance is the ONLY spark DOM
          (the §5.3 contract) — pre-warm and event logging render nothing. */}
      {sprintRunning ? (
        <>
          <SparkAffordance
            onSummon={spark.summon}
            shortcutHint={isMacLike ? "⌘ ." : "Ctrl ."}
          />
          <SparkCard state={spark.state} onReroll={spark.reroll} />
        </>
      ) : null}

      {DEBUG_INFERENCE_ENABLED ? (
        <div
          data-testid="substrate-debug"
          className="pointer-events-none fixed bottom-4 right-4 z-[70] w-72 rounded-lg border border-[var(--app-border,#3333)] bg-[var(--app-bg,#000)]/80 p-3 text-[0.7rem] leading-5 text-[var(--app-fg)] backdrop-blur-sm"
        >
          <div className="mb-1 font-semibold tracking-[0.12em] text-[color:var(--app-muted)]">
            SUBSTRATE
          </div>
          <div className="flex gap-3 tabular-nums">
            <span data-testid="substrate-themes">themes {inference.substrate.themes.length}</span>
            <span data-testid="substrate-positions">positions {inference.substrate.positions.length}</span>
            <span data-testid="substrate-tensions">tensions {inference.substrate.tensions.length}</span>
            <span data-testid="substrate-findings">findings {rankedFindings.length}</span>
          </div>
          {rankedFindings[0] ? (
            <div
              data-testid="substrate-latest-finding"
              className="mt-2 border-t border-[var(--app-border,#3333)] pt-2"
            >
              <span className="font-semibold">{rankedFindings[0].kind}</span>
              <span className="text-[color:var(--app-muted)]"> · {rankedFindings[0].tier}</span>
              <div className="mt-0.5 italic">{rankedFindings[0].note}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        data-testid="editor-content"
        className="gaddr-canvas-container"
        onMouseDown={handleCanvasMouseDown}
      >
        <EditorCardProvider editor={editor} boardActive={boardEntry.boardMode !== "hidden"}>
          <CanvasFlow
            boardMode={boardEntry.boardMode}
            onExitBoard={exitBoardAndFocus}
            onNewFreewrite={startNewFreewrite}
            onBoardFocusChange={(hasFocus) => {
              boardHasFocusRef.current = hasFocus;
            }}
            constellation={{
              status: constellation.status,
              stars: constellation.stars,
              nodes: constellation.nodes,
              cruxStarId: constellation.cruxStarId,
              confidence: constellation.confidence,
              resumable: constellation.resumable,
              onOpen: constellation.actions.open,
              onReact: constellation.actions.react,
              onDismiss: constellation.actions.dismiss,
              onSetAside: constellation.actions.setAside,
              onRetry: constellation.actions.retry,
            }}
          />
        </EditorCardProvider>
      </div>
    </div>
  );
}
