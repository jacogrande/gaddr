"use client";

import { BugBeetleIcon, ClockIcon } from "@phosphor-icons/react";
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
import type {
  GadflyAction,
  GadflyAnnotation,
  GadflyCategory,
  GadflyDroppedArtifact,
  GadflyResearchTask,
} from "../../../domain/gadfly/types";
import {
  groupGadflyAnnotations,
  type GadflyAnnotationGroup,
} from "../../../domain/gadfly/presentation";

const STORAGE_KEY = "gaddr:minimal-editor";
const GADFLY_NOTE_ID = "gaddr:editor:phase1";
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
const DEV_DEBUG_ENABLED = process.env.NODE_ENV !== "production";
const GADFLY_RESEARCH_TASK_ORDER: Record<GadflyResearchTask["kind"], number> = {
  fact_check: 0,
  supporting_evidence: 1,
  counterpoint: 2,
  context: 3,
};
const GADFLY_RESEARCH_TASK_LABELS: Record<GadflyResearchTask["kind"], string> = {
  fact_check: "Fact Check",
  supporting_evidence: "Evidence",
  counterpoint: "Counterpoint",
  context: "Context",
};
const GADFLY_RESEARCH_VERDICT_LABELS: Record<NonNullable<GadflyResearchTask["result"]>["verdict"], string> = {
  unverified: "Unverified",
  supported: "Supported",
  mixed: "Mixed",
  contradicted: "Contradicted",
};

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
  group: GadflyAnnotationGroup;
  x: number;
  y: number;
};

type DebugProviderTraceItem = {
  label: string;
  detail: string;
};

type DebugProviderBlock = {
  kind: "client_tool" | "server_tool" | "search_result" | "search_error" | "model_text";
  title: string;
  subtitle: string;
  payload?: unknown;
};

type SprintOption = (typeof SPRINT_OPTIONS)[number];
type SprintOptionId = SprintOption["id"];
type SprintPhase = "idle" | "running" | "paused" | "completed";

function formatDebugJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function formatRangeLabel(from: number, to: number): string {
  return `${String(from)}-${String(to)}`;
}

function formatActionLabel(action: GadflyAction): string {
  return `${action.type} · ${action.action}`.replaceAll("_", " ");
}

function formatDroppedArtifactLabel(artifact: GadflyDroppedArtifact): string {
  return `${artifact.reason} · ${truncateText(artifact.artifactSnippet, 44)}`;
}

function formatProviderBlockKindLabel(kind: DebugProviderBlock["kind"]): string {
  switch (kind) {
    case "client_tool":
      return "client tool";
    case "server_tool":
      return "server tool";
    case "search_result":
      return "search result";
    case "search_error":
      return "search error";
    case "model_text":
      return "model text";
  }
}

function summarizeProviderTrace(responseBody: unknown): DebugProviderTraceItem[] {
  if (!isObject(responseBody)) {
    return [];
  }

  const rawResponse = responseBody["rawResponse"];
  if (!isObject(rawResponse)) {
    return [];
  }

  const content = rawResponse["content"];
  if (!Array.isArray(content)) {
    return [];
  }

  const items: DebugProviderTraceItem[] = [];

  for (const block of content) {
    if (!isObject(block)) {
      continue;
    }

    const type = block["type"];
    if (type === "tool_use") {
      const name = typeof block["name"] === "string" ? block["name"] : "tool";
      const input = block["input"];
      const detail =
        isObject(input) && typeof input["action"] === "string"
          ? input["action"].replaceAll("_", " ")
          : "tool call";
      items.push({
        label: name,
        detail,
      });
      continue;
    }

    if (type === "server_tool_use") {
      const name = typeof block["name"] === "string" ? block["name"] : "server tool";
      const input = block["input"];
      const detail =
        isObject(input) && typeof input["query"] === "string"
          ? truncateText(input["query"], 80)
          : "server tool call";
      items.push({
        label: name,
        detail,
      });
      continue;
    }

    if (type === "web_search_tool_result") {
      const resultContent = block["content"];
      if (Array.isArray(resultContent)) {
        const domains: string[] = [];
        for (const item of resultContent) {
          if (!isObject(item) || typeof item["url"] !== "string") {
            continue;
          }

          try {
            domains.push(new URL(item["url"]).hostname);
          } catch {
            continue;
          }
        }

        items.push({
          label: "search results",
          detail:
            domains.length > 0
              ? `${String(resultContent.length)} results · ${domains.slice(0, 3).join(" · ")}`
              : `${String(resultContent.length)} results`,
        });
      } else if (isObject(resultContent) && typeof resultContent["error_code"] === "string") {
        items.push({
          label: "search error",
          detail: resultContent["error_code"],
        });
      }
      continue;
    }

    if (type === "text" && typeof block["text"] === "string") {
      items.push({
        label: "model",
        detail: truncateText(block["text"], 88),
      });
    }
  }

  return items;
}

function extractProviderBlocks(responseBody: unknown): DebugProviderBlock[] {
  if (!isObject(responseBody)) {
    return [];
  }

  const rawResponse = responseBody["rawResponse"];
  if (!isObject(rawResponse)) {
    return [];
  }

  const content = rawResponse["content"];
  if (!Array.isArray(content)) {
    return [];
  }

  const blocks: DebugProviderBlock[] = [];

  for (const block of content) {
    if (!isObject(block)) {
      continue;
    }

    const type = block["type"];
    if (type === "tool_use") {
      const title = typeof block["name"] === "string" ? block["name"] : "tool";
      const input = block["input"];
      const subtitle =
        isObject(input) && typeof input["action"] === "string"
          ? `action: ${input["action"]}`
          : "tool call";
      blocks.push({
        kind: "client_tool",
        title,
        subtitle,
        payload: input,
      });
      continue;
    }

    if (type === "server_tool_use") {
      const title = typeof block["name"] === "string" ? block["name"] : "server tool";
      const input = block["input"];
      const subtitle =
        isObject(input) && typeof input["query"] === "string"
          ? input["query"]
          : "server tool call";
      blocks.push({
        kind: "server_tool",
        title,
        subtitle,
        payload: input,
      });
      continue;
    }

    if (type === "web_search_tool_result") {
      const resultContent = block["content"];
      if (Array.isArray(resultContent)) {
        const domains: string[] = [];
        for (const item of resultContent) {
          if (!isObject(item) || typeof item["url"] !== "string") {
            continue;
          }

          try {
            domains.push(new URL(item["url"]).hostname);
          } catch {
            continue;
          }
        }

        blocks.push({
          kind: "search_result",
          title: "web_search results",
          subtitle:
            domains.length > 0
              ? `${String(resultContent.length)} results · ${domains.slice(0, 4).join(" · ")}`
              : `${String(resultContent.length)} results`,
          payload: resultContent,
        });
      } else if (isObject(resultContent) && typeof resultContent["error_code"] === "string") {
        blocks.push({
          kind: "search_error",
          title: "web_search error",
          subtitle: resultContent["error_code"],
          payload: resultContent,
        });
      }
      continue;
    }

    if (type === "text" && typeof block["text"] === "string") {
      blocks.push({
        kind: "model_text",
        title: "model text",
        subtitle: truncateText(block["text"], 160),
        payload: block["text"],
      });
    }
  }

  return blocks;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

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

function hasResearchData(annotation: GadflyAnnotation): boolean {
  return annotation.research.needsFactCheck || annotation.research.tasks.length > 0;
}

function selectPrimaryResearchTask(annotation: GadflyAnnotation): GadflyResearchTask | null {
  if (annotation.research.tasks.length === 0) {
    return null;
  }

  const orderedTasks = [...annotation.research.tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "completed" ? -1 : 1;
    }

    return GADFLY_RESEARCH_TASK_ORDER[left.kind] - GADFLY_RESEARCH_TASK_ORDER[right.kind];
  });

  return orderedTasks[0] ?? null;
}

function selectResearchAnnotation(group: GadflyAnnotationGroup): GadflyAnnotation | null {
  const researchAnnotations = group.annotations.filter((annotation) => hasResearchData(annotation));
  if (researchAnnotations.length > 0) {
    return researchAnnotations[0] ?? null;
  }

  return group.annotations[0] ?? null;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    "clipboard" in navigator &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function DebugJsonDetails({
  label,
  value,
  copyLabel,
  onCopy,
}: {
  label: string;
  value: unknown;
  copyLabel: string;
  onCopy: (label: string, value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="mt-2"
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="gaddr-debug-details-summary cursor-pointer select-none text-[0.63rem] font-semibold tracking-[0.08em] uppercase text-[color:var(--app-muted)]">
        <span>{label}</span>
        <button
          type="button"
          className="gaddr-debug-inline-button rounded border px-2 py-1 text-[0.56rem] font-semibold tracking-[0.08em]"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCopy(copyLabel, formatDebugJson(value));
          }}
        >
          COPY
        </button>
      </summary>
      {isOpen ? (
        <pre className="gaddr-debug-code mt-1 max-h-80 overflow-auto rounded border p-2 text-[0.62rem] leading-4">
          {formatDebugJson(value)}
        </pre>
      ) : null}
    </details>
  );
}

function DebugTextDetails({
  label,
  text,
  copyLabel,
  onCopy,
}: {
  label: string;
  text: string;
  copyLabel: string;
  onCopy: (label: string, value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="mt-2"
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="gaddr-debug-details-summary cursor-pointer select-none text-[0.63rem] font-semibold tracking-[0.08em] uppercase text-[color:var(--app-muted)]">
        <span>{label}</span>
        <button
          type="button"
          className="gaddr-debug-inline-button rounded border px-2 py-1 text-[0.56rem] font-semibold tracking-[0.08em]"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCopy(copyLabel, text);
          }}
        >
          COPY
        </button>
      </summary>
      {isOpen ? (
        <pre className="gaddr-debug-code mt-1 max-h-80 overflow-auto rounded border p-2 text-[0.62rem] leading-4">
          {text}
        </pre>
      ) : null}
    </details>
  );
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
  const [isDebugPaneOpen, setIsDebugPaneOpen] = useState(false);
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const [copiedDebugLabel, setCopiedDebugLabel] = useState<string | null>(null);
  const [hoveredGadfly, setHoveredGadfly] = useState<HoveredGadflyState | null>(null);
  const [hoverLockGroupId, setHoverLockGroupId] = useState<string | null>(null);
  const [researchPaneGroupId, setResearchPaneGroupId] = useState<string | null>(null);
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
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
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
    extensions: [StarterKit, Underline, GlyphInputRules, StandardHotkeys, GadflyHighlights],
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

  const {
    annotations: gadflyAnnotations,
    analyzeError,
    clearDebugEntries,
    debugEvents,
    debugEntries,
    debugRuntime,
    handleTransaction,
    isAnalyzing,
    preferences,
  } = useGadfly(editor, {
    noteId: GADFLY_NOTE_ID,
  });

  const debugExportPayload = useMemo(() => {
    return {
      runtime: debugRuntime,
      preferences,
      debugEvents,
      annotations: gadflyAnnotations,
      annotationGroups: groupGadflyAnnotations(gadflyAnnotations),
      entries: debugEntries,
    };
  }, [debugEvents, debugEntries, debugRuntime, gadflyAnnotations, preferences]);

  const handleCopyDebugValue = useCallback(async (label: string, value: string) => {
    const copied = await copyTextToClipboard(value);
    const nextLabel = copied ? `${label} copied` : `could not copy ${label.toLowerCase()}`;

    setCopiedDebugLabel(nextLabel);
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopiedDebugLabel(null);
      copyFeedbackTimeoutRef.current = null;
    }, 1800);
  }, []);

  const gadflyAnnotationGroups = useMemo(() => {
    return groupGadflyAnnotations(gadflyAnnotations);
  }, [gadflyAnnotations]);

  const gadflyGroupLookup = useMemo(() => {
    const entries: Array<[string, GadflyAnnotationGroup]> = [];
    for (const group of gadflyAnnotationGroups) {
      entries.push([group.id, group]);
    }
    return new Map(entries);
  }, [gadflyAnnotationGroups]);

  const researchPaneGroup = useMemo(() => {
    if (!researchPaneGroupId) {
      return null;
    }

    return gadflyGroupLookup.get(researchPaneGroupId) ?? null;
  }, [gadflyGroupLookup, researchPaneGroupId]);

  const openResearchPane = useCallback((group: GadflyAnnotationGroup) => {
    setResearchPaneGroupId(group.id);
    setIsDebugPaneOpen(false);
  }, []);

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

    if (gadflyGroupLookup.has(hoveredGadfly.group.id)) {
      return;
    }

    setHoveredGadfly(null);
  }, [gadflyGroupLookup, hoveredGadfly]);

  useEffect(() => {
    if (!hoverLockGroupId) {
      return;
    }

    if (!gadflyGroupLookup.has(hoverLockGroupId)) {
      setHoverLockGroupId(null);
    }
  }, [gadflyGroupLookup, hoverLockGroupId]);

  useEffect(() => {
    if (!researchPaneGroupId) {
      return;
    }

    if (!gadflyGroupLookup.has(researchPaneGroupId)) {
      setResearchPaneGroupId(null);
    }
  }, [gadflyGroupLookup, researchPaneGroupId]);

  useEffect(() => {
    const isSlashMenuOpen = slashMenuState !== null;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (DEV_DEBUG_ENABLED && (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setIsDebugPaneOpen((current) => {
          const next = !current;
          if (next) {
            setResearchPaneGroupId(null);
          }
          return next;
        });
        return;
      }

      if (
        hoveredGadfly &&
        !isCommandPaletteOpen &&
        !isSlashMenuOpen &&
        event.code === "Space" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        openResearchPane(hoveredGadfly.group);
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

    const handleGlobalKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") {
        return;
      }

      setHoverLockGroupId(null);
      setHoveredGadfly((previous) => {
        if (!previous) {
          return previous;
        }

        const activeElement = document.elementFromPoint(previous.x, previous.y);
        if (!(activeElement instanceof Element)) {
          return null;
        }

        if (
          activeElement.closest("[data-gadfly-group-id]") ||
          activeElement.closest("[data-gadfly-popover='true']")
        ) {
          return previous;
        }

        return null;
      });
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    window.addEventListener("keyup", handleGlobalKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
      window.removeEventListener("keyup", handleGlobalKeyUp, true);
    };
  }, [
    commandHotkeyEntries,
    closeCommandPalette,
    dismissSlashMenu,
    filteredPaletteCommands,
    filteredSlashCommands,
    hoveredGadfly,
    isCommandPaletteOpen,
    openResearchPane,
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
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
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

      if (target.closest("[data-gadfly-popover='true']")) {
        if (event.shiftKey && hoveredGadfly) {
          setHoverLockGroupId((current) => (current === hoveredGadfly.group.id ? current : hoveredGadfly.group.id));
        }
        setHoveredGadfly((previous) =>
          previous
            ? {
                ...previous,
                x: event.clientX,
                y: event.clientY,
              }
            : previous,
        );
        return;
      }

      const elementWithGroupId = target.closest("[data-gadfly-group-id]");
      if (!elementWithGroupId) {
        if (hoverLockGroupId !== null) {
          return;
        }
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const groupId = elementWithGroupId.getAttribute("data-gadfly-group-id");
      if (!groupId) {
        if (hoverLockGroupId !== null) {
          return;
        }
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const group = gadflyGroupLookup.get(groupId);
      if (!group) {
        if (hoverLockGroupId !== null) {
          return;
        }
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      if (event.shiftKey) {
        setHoverLockGroupId((current) => (current === group.id ? current : group.id));
      }

      setHoveredGadfly((previous) => {
        if (
          previous &&
          previous.group.id === group.id &&
          Math.abs(previous.x - event.clientX) < 3 &&
          Math.abs(previous.y - event.clientY) < 3
        ) {
          return previous;
        }

        return {
          group,
          x: event.clientX,
          y: event.clientY,
        };
      });
    },
    [gadflyGroupLookup, hoverLockGroupId, hoveredGadfly],
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

  const hoveredResearchAnnotation = useMemo(() => {
    if (!hoveredGadfly) {
      return null;
    }

    return selectResearchAnnotation(hoveredGadfly.group);
  }, [hoveredGadfly]);

  const hoveredResearchTask = useMemo(() => {
    if (!hoveredResearchAnnotation) {
      return null;
    }

    return selectPrimaryResearchTask(hoveredResearchAnnotation);
  }, [hoveredResearchAnnotation]);

  const hoveredResearchFindings = useMemo(() => {
    if (!hoveredResearchTask?.result) {
      return [];
    }

    return hoveredResearchTask.result.findings.slice(0, 2);
  }, [hoveredResearchTask]);

  const hoveredResearchSources = useMemo(() => {
    if (!hoveredResearchTask?.result) {
      return [];
    }

    return hoveredResearchTask.result.sources.slice(0, 3);
  }, [hoveredResearchTask]);

  const isHoverLocked = hoveredGadfly ? hoverLockGroupId === hoveredGadfly.group.id : false;

  const debugEntriesView = useMemo(() => {
    return [...debugEntries].reverse().map((entry) => {
      const providerBlocks = extractProviderBlocks(entry.responseBody);

      return {
        ...entry,
        timeLabel: new Date(entry.startedAtIso).toLocaleTimeString(),
        changedRangeLabels: entry.request.changedRanges.map((range) =>
          formatRangeLabel(range.from, range.to),
        ),
        contextRangeLabels: entry.request.contextWindow.map((range) =>
          formatRangeLabel(range.from, range.to),
        ),
        plainTextChars: entry.request.plainText.length,
        contextChars: entry.request.contextWindow.reduce((sum, item) => sum + item.text.length, 0),
        draftText: entry.request.plainText,
        contextText: entry.request.contextWindow
          .map((range, index) => {
            return `Window ${String(index + 1)} · ${formatRangeLabel(range.from, range.to)}\n${range.text}`;
          })
          .join("\n\n"),
        parsedActionLabels: (entry.parsedActions ?? []).map((action) => formatActionLabel(action)),
        appliedActionLabels: (entry.appliedActions ?? []).map((action) => formatActionLabel(action)),
        droppedArtifactLabels: (entry.droppedArtifacts ?? []).map((artifact) =>
          formatDroppedArtifactLabel(artifact),
        ),
        providerTrace: summarizeProviderTrace(entry.responseBody),
        providerBlocks,
        providerToolLabels: providerBlocks
          .filter((block) => block.kind === "client_tool" || block.kind === "server_tool")
          .map((block) => {
            return block.subtitle ? `${block.title} · ${block.subtitle}` : block.title;
          }),
      };
    });
  }, [debugEntries]);

  const debugOverview = useMemo(() => {
    const latestEntry = debugEntriesView[0] ?? null;
    const totalSearchRequests = debugEntries.reduce((sum, entry) => {
      return sum + (entry.usage?.webSearchRequests ?? 0);
    }, 0);

    return {
      latestEntry,
      totalSearchRequests,
      pendingRangeLabels: debugRuntime.pendingRanges.map((range) =>
        formatRangeLabel(range.from, range.to),
      ),
    };
  }, [debugEntries, debugEntriesView, debugRuntime.pendingRanges]);

  const researchPaneAnnotation = useMemo(() => {
    if (!researchPaneGroup) {
      return null;
    }

    return selectResearchAnnotation(researchPaneGroup);
  }, [researchPaneGroup]);

  const researchPaneTask = useMemo(() => {
    if (!researchPaneAnnotation) {
      return null;
    }

    return selectPrimaryResearchTask(researchPaneAnnotation);
  }, [researchPaneAnnotation]);

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
        return "The timer stays quiet while Gadfly works in the background.";
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
      onMouseMove={handleEditorMouseMove}
      onMouseLeave={() => {
        if (hoverLockGroupId === null) {
          setHoveredGadfly(null);
        }
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
      {analyzeError ? (
        <div className="gaddr-gadfly-error pointer-events-none fixed bottom-4 left-1/2 z-[59] w-[min(90vw,36rem)] -translate-x-1/2 rounded-lg border px-3 py-2 text-xs">
          Gadfly unavailable: {analyzeError}
        </div>
      ) : null}
      {hoveredGadfly ? (
        <aside
          data-gadfly-popover="true"
          data-gadfly-group-id={hoveredGadfly.group.id}
          className="gaddr-gadfly-card fixed z-[57] w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border p-3 backdrop-blur-[1px]"
          style={hoveredGadflyStyle}
          onMouseMove={(event) => {
            if (event.shiftKey) {
              setHoverLockGroupId((current) => (current === hoveredGadfly.group.id ? current : hoveredGadfly.group.id));
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[0.64rem] font-semibold tracking-[0.12em] text-[color:var(--app-muted)]">
              {hoveredGadfly.group.annotations.length > 1 ? "RESEARCH STACK" : "RESEARCH NOTE"}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {hoveredGadfly.group.references.map((reference) => (
                <div
                  key={`${hoveredGadfly.group.id}-${String(reference.index)}`}
                  className="gaddr-gadfly-reference inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[0.58rem] font-semibold leading-none"
                >
                  {String(reference.index)}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 text-[0.68rem] leading-4 text-[color:var(--app-muted)]">
            {hoveredGadfly.group.anchor.quote}
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--app-fg)]">
            {hoveredResearchFindings[0] ??
              hoveredResearchAnnotation?.explanation ??
              "Search-backed context is available for this question."}
          </p>
          {hoveredResearchSources.length > 0 ? (
            <div className="mt-2 text-[0.62rem] leading-4 text-[color:var(--app-muted)]">
              {hoveredResearchSources.map((source) => source.domain).join(" · ")}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="gaddr-gadfly-card-button rounded border px-2 py-1 text-[0.62rem] font-semibold tracking-[0.08em]"
              onClick={() => {
                openResearchPane(hoveredGadfly.group);
              }}
            >
              OPEN RESEARCH
            </button>
            <div className="text-[0.56rem] uppercase tracking-[0.09em] text-[color:var(--app-muted)]">
              {isHoverLocked ? "Shift lock enabled" : "Hold Shift to lock"}
            </div>
          </div>
        </aside>
      ) : null}
      <aside
        aria-label="Gadfly research pane"
        data-testid="gadfly-research-pane"
        className={`gaddr-research-pane fixed bottom-4 right-4 top-4 z-[82] flex w-[min(42rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border backdrop-blur-[2px] transition-all duration-200 ${
          researchPaneGroup ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[105%] opacity-0"
        }`}
      >
        <header className="border-b px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[0.68rem] font-semibold tracking-[0.12em]">GADFLY RESEARCH</div>
              {researchPaneAnnotation ? (
                <div className="mt-1 text-[0.58rem] uppercase tracking-[0.09em] text-[color:var(--app-muted)]">
                  {researchPaneAnnotation.category} · {researchPaneAnnotation.severity}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded border px-2 py-1 text-[0.63rem] font-semibold tracking-[0.08em]"
              onClick={() => {
                setResearchPaneGroupId(null);
              }}
            >
              CLOSE
            </button>
          </div>
        </header>
        {researchPaneGroup && researchPaneAnnotation ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="gaddr-debug-section rounded-lg border p-3">
              <div className="text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
                Annotated Question
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[var(--app-fg)]">{researchPaneGroup.anchor.quote}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--app-fg)]">{researchPaneAnnotation.explanation}</p>
              {researchPaneTask ? (
                <div className="mt-3">
                  <div className="text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
                    {GADFLY_RESEARCH_TASK_LABELS[researchPaneTask.kind]} ·{" "}
                    {researchPaneTask.result
                      ? GADFLY_RESEARCH_VERDICT_LABELS[researchPaneTask.result.verdict]
                      : researchPaneTask.status}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--app-fg)]">{researchPaneTask.question}</p>
                  {researchPaneTask.result ? (
                    <>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--app-fg)]">
                        {researchPaneTask.result.findings.map((finding) => (
                          <li key={finding} className="list-inside list-disc">
                            {finding}
                          </li>
                        ))}
                      </ul>
                      {researchPaneTask.result.sources.length > 0 ? (
                        <div className="mt-3">
                          <div className="text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
                            Sources
                          </div>
                          <div className="mt-1.5 space-y-1.5">
                            {researchPaneTask.result.sources.map((source) => (
                              <a
                                key={`${source.url}:${source.title}`}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="gaddr-research-source block rounded border px-2 py-1.5 text-[0.68rem] leading-4"
                              >
                                <div className="font-semibold">{source.title}</div>
                                <div className="mt-0.5 text-[0.6rem] text-[color:var(--app-muted)]">
                                  {source.domain}
                                  {source.pageAge ? ` · ${source.pageAge}` : ""}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
            Hover a research annotation and open it to inspect results.
          </div>
        )}
      </aside>
      {DEV_DEBUG_ENABLED ? (
        <aside
          aria-label="Gadfly debug pane"
          data-testid="gadfly-debug-pane"
          className={`gaddr-debug-pane fixed bottom-4 right-4 top-4 z-[82] flex w-[min(42rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border backdrop-blur-[2px] transition-all duration-200 ${
            isDebugPaneOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[105%] opacity-0"
          }`}
        >
          <header className="border-b px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[0.68rem] font-semibold tracking-[0.12em]">GADFLY DEBUG</div>
                {copiedDebugLabel ? (
                  <div className="mt-1 text-[0.58rem] uppercase tracking-[0.09em] text-[color:var(--app-muted)]">
                    {copiedDebugLabel}
                  </div>
                ) : null}
              </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="rounded border px-2 py-1 text-[0.63rem] font-semibold tracking-[0.08em]"
                onClick={() => {
                  void handleCopyDebugValue("debugger", formatDebugJson(debugExportPayload));
                }}
              >
                COPY ALL
              </button>
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
            </div>
          </header>
          <div className="border-b px-3 py-2">
            <div className="flex flex-wrap gap-1.5 text-[0.63rem]">
              <span className={`gaddr-debug-status-badge gaddr-debug-status-badge--${isAnalyzing ? "pending" : "success"}`}>
                {isAnalyzing ? "analyzing" : "idle"}
              </span>
              <span className="gaddr-debug-chip">{debugEntries.length} entries</span>
              <span className="gaddr-debug-chip">{gadflyAnnotations.length} annotations</span>
              <span className="gaddr-debug-chip">doc v{String(debugRuntime.currentDocVersion)}</span>
              <span className="gaddr-debug-chip">
                {debugRuntime.activeRequestId ? `active ${debugRuntime.activeRequestId}` : "no active request"}
              </span>
              <span className="gaddr-debug-chip">
                {debugRuntime.debounceScheduled ? "debounce armed" : "debounce clear"}
              </span>
              <span className="gaddr-debug-chip">{String(debugRuntime.pendingRanges.length)} queued ranges</span>
              <span className="gaddr-debug-chip">{String(debugOverview.totalSearchRequests)} searches used</span>
              <span className="gaddr-debug-chip">
                {preferences.learningGoal ? "goal active" : "no goal"}
              </span>
              <span className="gaddr-debug-chip">
                {String(preferences.mutedCategories.length)} muted categories
              </span>
              <span className="gaddr-debug-chip">{String(debugEvents.length)} debug events</span>
            </div>
            {debugOverview.pendingRangeLabels.length > 0 ? (
              <div className="mt-2">
                <div className="text-[0.56rem] font-semibold tracking-[0.1em] uppercase text-[color:var(--app-muted)]">
                  Queued Ranges
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {debugOverview.pendingRangeLabels.map((label) => (
                    <span key={label} className="gaddr-debug-chip">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {debugOverview.latestEntry ? (
              <div className="mt-2 text-[0.62rem] text-[color:var(--app-muted)]">
                Latest: {debugOverview.latestEntry.id} · {statusLabel(debugOverview.latestEntry.status)} ·{" "}
                {debugOverview.latestEntry.appliedActionLabels.length} applied
              </div>
            ) : null}
            {preferences.learningGoal || preferences.mutedCategories.length > 0 ? (
              <div className="mt-2">
                <div className="text-[0.56rem] font-semibold tracking-[0.1em] uppercase text-[color:var(--app-muted)]">
                  Preferences
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preferences.learningGoal ? (
                    <span className="gaddr-debug-chip">goal: {preferences.learningGoal}</span>
                  ) : null}
                  {preferences.mutedCategories.map((category: GadflyCategory) => (
                    <span key={category} className="gaddr-debug-chip">
                      muted {category}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {debugEvents.length > 0 ? (
              <div className="mt-2">
                <div className="text-[0.56rem] font-semibold tracking-[0.1em] uppercase text-[color:var(--app-muted)]">
                  Debug Events
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {[...debugEvents].slice(-4).reverse().map((event, index) => (
                    <div key={`${event.eventName}-${String(index)}`} className="gaddr-debug-trace rounded border px-2 py-1">
                      <span className="font-semibold uppercase tracking-[0.08em]">{event.eventName}</span>
                      <span className="ml-2 text-[color:var(--app-muted)]">{event.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2">
            {debugEntriesView.length === 0 ? (
              <div className="rounded border border-dashed px-3 py-4 text-xs">
                No requests yet. Toggle with Cmd/Ctrl+Shift+D.
              </div>
            ) : (
              debugEntriesView.map((entry) => (
                <article key={entry.id} className="gaddr-debug-entry mb-2 rounded-lg border p-2 text-[0.67rem]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`gaddr-debug-status-badge gaddr-debug-status-badge--${entry.status}`}>
                          {statusLabel(entry.status)}
                        </span>
                        <span className="font-semibold tracking-[0.08em] uppercase">{entry.id}</span>
                      </div>
                      <div className="mt-1 text-[0.62rem] text-[color:var(--app-muted)]">{entry.timeLabel}</div>
                    </div>
                    <button
                      type="button"
                      className="gaddr-debug-inline-button rounded border px-2 py-1 text-[0.56rem] font-semibold tracking-[0.08em]"
                      onClick={() => {
                        void handleCopyDebugValue(entry.id, formatDebugJson(entry));
                      }}
                    >
                      COPY ENTRY
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[0.61rem] sm:grid-cols-4">
                    <div className="gaddr-debug-metric rounded border px-2 py-1.5">
                      <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">HTTP</div>
                      <div className="mt-1 font-semibold">{entry.responseStatus ?? "-"}</div>
                    </div>
                    <div className="gaddr-debug-metric rounded border px-2 py-1.5">
                      <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Latency</div>
                      <div className="mt-1 font-semibold">{entry.latencyMs !== undefined ? `${String(entry.latencyMs)}ms` : "-"}</div>
                    </div>
                    <div className="gaddr-debug-metric rounded border px-2 py-1.5">
                      <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Tokens</div>
                      <div className="mt-1 font-semibold">{entry.usage ? String(entry.usage.totalTokens) : "0"}</div>
                    </div>
                    <div className="gaddr-debug-metric rounded border px-2 py-1.5">
                      <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Search</div>
                      <div className="mt-1 font-semibold">{entry.usage?.webSearchRequests ?? 0}</div>
                    </div>
                  </div>
                  {entry.error ? <div className="mt-2 text-[#c7694a]">{entry.error}</div> : null}

                  <section className="gaddr-debug-section mt-2 rounded border px-2 py-1.5">
                    <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Request</div>
                    <div className="mt-1 text-[0.62rem]">
                      doc v{String(entry.request.docVersion)} · {String(entry.changedRangeLabels.length)} changed ranges ·{" "}
                      {String(entry.request.contextWindow.length)} context windows · {String(entry.plainTextChars)} chars
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.changedRangeLabels.map((label) => (
                        <span key={`${entry.id}-changed-${label}`} className="gaddr-debug-chip">
                          {label}
                        </span>
                      ))}
                    </div>
                    <DebugTextDetails
                      label="Draft Text"
                      text={entry.draftText}
                      copyLabel={`${entry.id} draft`}
                      onCopy={(label, value) => {
                        void handleCopyDebugValue(label, value);
                      }}
                    />
                    {entry.contextText ? (
                      <DebugTextDetails
                        label="Context Windows"
                        text={entry.contextText}
                        copyLabel={`${entry.id} context`}
                        onCopy={(label, value) => {
                          void handleCopyDebugValue(label, value);
                        }}
                      />
                    ) : null}
                  </section>

                  <section className="gaddr-debug-section mt-2 rounded border px-2 py-1.5">
                    <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Provider</div>
                    <div className="mt-1 text-[0.62rem]">
                      {entry.model ?? "unknown model"} · {entry.providerRequestId ?? "no request id"} ·{" "}
                      {entry.stopReason ?? "no stop reason"}
                    </div>
                    {entry.providerToolLabels.length > 0 ? (
                      <div className="mt-2">
                        <div className="text-[0.56rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
                          Tools Used
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.providerToolLabels.map((label, index) => (
                            <span key={`${entry.id}-tool-${String(index)}`} className="gaddr-debug-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.providerBlocks.length > 0 ? (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {entry.providerBlocks.map((item, index) => (
                          <div key={`${entry.id}-provider-${String(index)}`} className="gaddr-debug-trace rounded border px-2 py-1.5">
                            <div className="text-[0.52rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">
                              {formatProviderBlockKindLabel(item.kind)}
                            </div>
                            <div className="mt-0.5 break-words font-semibold">{item.title}</div>
                            {item.subtitle ? (
                              <div className="mt-1 whitespace-pre-wrap break-words text-[0.62rem] text-[color:var(--app-muted)]">
                                {item.subtitle}
                              </div>
                            ) : null}
                            {typeof item.payload === "string" ? (
                              <DebugTextDetails
                                label="Payload"
                                text={item.payload}
                                copyLabel={`${entry.id} ${item.title} payload`}
                                onCopy={(label, value) => {
                                  void handleCopyDebugValue(label, value);
                                }}
                              />
                            ) : item.payload !== undefined ? (
                              <DebugJsonDetails
                                label="Payload"
                                value={item.payload}
                                copyLabel={`${entry.id} ${item.title} payload`}
                                onCopy={(label, value) => {
                                  void handleCopyDebugValue(label, value);
                                }}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  {entry.diagnostics ? (
                    <section className="gaddr-debug-section mt-2 rounded border px-2 py-1.5">
                      <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Search</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="gaddr-debug-chip">
                          eligible {entry.diagnostics.webSearchEligible ? "yes" : "no"}
                        </span>
                        <span className="gaddr-debug-chip">
                          included {entry.diagnostics.webSearchIncluded ? "yes" : "no"}
                        </span>
                        <span className="gaddr-debug-chip">
                          fallback {entry.diagnostics.webSearchFallbackUsed ? "yes" : "no"}
                        </span>
                      </div>
                    </section>
                  ) : null}

                  <section className="gaddr-debug-section mt-2 rounded border px-2 py-1.5">
                    <div className="text-[0.54rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Output</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="gaddr-debug-chip">
                        parsed {String(entry.parsedActionLabels.length)}
                      </span>
                      <span className="gaddr-debug-chip">
                        applied {String(entry.appliedActionLabels.length)}
                      </span>
                      <span className="gaddr-debug-chip">
                        dropped {String(entry.droppedArtifactLabels.length)}
                      </span>
                      {entry.filteredActionCount ? (
                        <span className="gaddr-debug-chip">
                          filtered {String(entry.filteredActionCount)}
                        </span>
                      ) : null}
                    </div>
                    {entry.parsedActionLabels.length > 0 ? (
                      <div className="mt-1.5">
                        <div className="text-[0.56rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Parsed Actions</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.parsedActionLabels.map((label, index) => (
                            <span key={`${entry.id}-parsed-${String(index)}`} className="gaddr-debug-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.appliedActionLabels.length > 0 ? (
                      <div className="mt-1.5">
                        <div className="text-[0.56rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Applied Actions</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.appliedActionLabels.map((label, index) => (
                            <span key={`${entry.id}-applied-${String(index)}`} className="gaddr-debug-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.droppedArtifactLabels.length > 0 ? (
                      <div className="mt-1.5">
                        <div className="text-[0.56rem] uppercase tracking-[0.1em] text-[color:var(--app-muted)]">Dropped Artifacts</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.droppedArtifactLabels.map((label, index) => (
                            <span key={`${entry.id}-dropped-${String(index)}`} className="gaddr-debug-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <DebugJsonDetails
                    label="Request JSON"
                    value={entry.request}
                    copyLabel={`${entry.id} request json`}
                    onCopy={(label, value) => {
                      void handleCopyDebugValue(label, value);
                    }}
                  />
                  <DebugJsonDetails
                    label="Response JSON"
                    value={entry.responseBody}
                    copyLabel={`${entry.id} response json`}
                    onCopy={(label, value) => {
                      void handleCopyDebugValue(label, value);
                    }}
                  />
                </article>
              ))
            )}
          </div>
        </aside>
      ) : null}
      {DEV_DEBUG_ENABLED && !isDebugPaneOpen ? (
        <button
          type="button"
          aria-label="Open Gadfly debug pane"
          title="Open Gadfly debug pane"
          className="gaddr-debug-toggle-button fixed bottom-4 right-[4.25rem] z-[61] inline-flex h-10 w-10 items-center justify-center rounded-full border text-[0.82rem] font-semibold"
          onClick={() => {
            setIsDebugPaneOpen(true);
          }}
        >
          <span
            aria-hidden="true"
            className={`gaddr-debug-toggle-indicator ${isAnalyzing ? "gaddr-debug-toggle-indicator--active" : ""}`}
          />
          <BugBeetleIcon size={17} weight="regular" aria-hidden="true" />
        </button>
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
