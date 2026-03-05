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
import type {
  GadflyAction,
  GadflyAnnotation,
  GadflyCategory,
  GadflyDroppedArtifact,
  GadflyPrompt,
  GadflyResearchTask,
} from "../../../domain/gadfly/types";
import {
  groupGadflyAnnotations,
  type GadflyAnnotationGroup,
  type GadflyAnnotationReference,
} from "../../../domain/gadfly/presentation";

const STORAGE_KEY = "gaddr:minimal-editor";
const GADFLY_NOTE_ID = "gaddr:editor:phase1";
const IDLE_SAVE_TIMEOUT_MS = 1200;
const MODIFIER_EXIT_ANIMATION_MS = 180;
const SLASH_MENU_WIDTH_PX = 360;
const SLASH_MENU_VIEWPORT_MARGIN_PX = 12;
const SLASH_MENU_VERTICAL_OFFSET_PX = 10;
const SLASH_MENU_BOTTOM_SAFE_AREA_PX = 230;
const DEV_DEBUG_ENABLED = process.env.NODE_ENV !== "production";
const GADFLY_PROMPT_ORDER: Record<GadflyPrompt["kind"], number> = {
  followup_question: 0,
  clarity: 1,
  structure: 2,
  evidence: 3,
  counterpoint: 4,
  tone_consistency: 5,
};
const GADFLY_PROMPT_LABELS: Record<GadflyPrompt["kind"], string> = {
  followup_question: "Follow-up",
  clarity: "Clarity",
  structure: "Structure",
  evidence: "Evidence",
  counterpoint: "Counterpoint",
  tone_consistency: "Tone",
};
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

function findReference(
  references: readonly GadflyAnnotationReference[],
  annotationId: string,
): GadflyAnnotationReference | null {
  return references.find((reference) => reference.annotationId === annotationId) ?? null;
}

function GadflyAnnotationCardSection({
  annotation,
  reference,
}: {
  annotation: GadflyAnnotation;
  reference: GadflyAnnotationReference | null;
}) {
  return (
    <section className="gaddr-gadfly-annotation-section">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {reference ? (
              <div className="gaddr-gadfly-reference inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[0.58rem] font-semibold leading-none">
                {String(reference.index)}
              </div>
            ) : null}
            <div className="text-[0.64rem] font-semibold tracking-[0.12em] text-[color:var(--app-muted)]">
              {annotation.category.toUpperCase()} · {annotation.severity.toUpperCase()}
            </div>
          </div>
          {annotation.isPinned || annotation.linkedAnnotationIds.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {annotation.isPinned ? (
                <div className="gaddr-gadfly-status-chip inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.11em]">
                  PINNED
                </div>
              ) : null}
              {annotation.linkedAnnotationIds.length > 0 ? (
                <div className="gaddr-gadfly-status-chip inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.11em]">
                  LINKED {String(annotation.linkedAnnotationIds.length)}
                </div>
              ) : null}
            </div>
          ) : null}
          {annotation.status !== "active" ? (
            <div className="gaddr-gadfly-status-chip mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.11em]">
              {annotation.status.toUpperCase()}
              {annotation.snoozedUntil ? ` · UNTIL ${annotation.snoozedUntil}` : ""}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[var(--app-fg)]">{annotation.explanation}</p>
      <p className="mt-1.5 text-[0.7rem] leading-4 text-[color:var(--app-muted)]">Rule: {annotation.rule}</p>
      <p className="mt-2 text-xs italic leading-5 text-[color:var(--app-fg)]">{annotation.question}</p>
      {annotation.prompts.length > 0 ? (
        <div className="gaddr-gadfly-prompts mt-2.5 border-t pt-2">
          {[...annotation.prompts]
            .sort((left, right) => {
              return GADFLY_PROMPT_ORDER[left.kind] - GADFLY_PROMPT_ORDER[right.kind];
            })
            .map((prompt) => (
              <div key={prompt.kind} className="gaddr-gadfly-prompt-row mt-1.5 rounded-md border px-2 py-1.5">
                <div className="gaddr-gadfly-prompt-label text-[0.56rem] font-semibold tracking-[0.1em] uppercase">
                  {GADFLY_PROMPT_LABELS[prompt.kind]}
                </div>
                <p className="mt-1 text-[0.69rem] leading-4">{prompt.text}</p>
              </div>
            ))}
        </div>
      ) : null}
      {annotation.research.needsFactCheck || annotation.research.tasks.length > 0 ? (
        <div className="gaddr-gadfly-research mt-2.5 border-t pt-2">
          {annotation.research.needsFactCheck ? (
            <div className="gaddr-gadfly-fact-check rounded-md border px-2 py-1.5">
              <div className="gaddr-gadfly-research-label text-[0.56rem] font-semibold tracking-[0.1em] uppercase">
                Fact Check
              </div>
              <p className="mt-1 text-[0.69rem] leading-4">
                {annotation.research.factCheckNote ?? "This claim should be verified against external sources."}
              </p>
            </div>
          ) : null}
          {[...annotation.research.tasks]
            .sort((left, right) => GADFLY_RESEARCH_TASK_ORDER[left.kind] - GADFLY_RESEARCH_TASK_ORDER[right.kind])
            .map((task) => (
              <div key={task.id} className="gaddr-gadfly-research-task mt-1.5 rounded-md border px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="gaddr-gadfly-research-label text-[0.56rem] font-semibold tracking-[0.1em] uppercase">
                    {GADFLY_RESEARCH_TASK_LABELS[task.kind]}
                  </div>
                  <div className="text-[0.56rem] tracking-[0.08em] uppercase text-[color:var(--app-muted)]">
                    {task.result ? GADFLY_RESEARCH_VERDICT_LABELS[task.result.verdict] : task.status}
                  </div>
                </div>
                <p className="mt-1 text-[0.69rem] leading-4">{task.question}</p>
                {task.result ? (
                  <>
                    <ul className="mt-1.5 space-y-1 text-[0.67rem] leading-4 text-[color:var(--app-fg)]">
                      {task.result.findings.map((finding) => (
                        <li key={finding} className="list-inside list-disc">
                          {finding}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 text-[0.6rem] leading-4 text-[color:var(--app-muted)]">
                      {task.result.sources.map((source) => source.domain).join(" · ")}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}
    </section>
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
  const [copiedDebugLabel, setCopiedDebugLabel] = useState<string | null>(null);
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
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

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

      const elementWithGroupId = target.closest("[data-gadfly-group-id]");
      if (!elementWithGroupId) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const groupId = elementWithGroupId.getAttribute("data-gadfly-group-id");
      if (!groupId) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
      }

      const group = gadflyGroupLookup.get(groupId);
      if (!group) {
        setHoveredGadfly((previous) => (previous ? null : previous));
        return;
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
    [gadflyGroupLookup],
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
          className="gaddr-gadfly-card pointer-events-none fixed z-[57] w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border p-3 backdrop-blur-[1px]"
          style={hoveredGadflyStyle}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[0.64rem] font-semibold tracking-[0.12em] text-[color:var(--app-muted)]">
              {hoveredGadfly.group.annotations.length > 1 ? "ANNOTATION STACK" : "ANNOTATION"}
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
          <div className="gaddr-gadfly-stack mt-2.5">
            {hoveredGadfly.group.annotations.map((annotation, index) => (
              <div key={annotation.id} className={index > 0 ? "gaddr-gadfly-stack-item mt-3 border-t pt-3" : "gaddr-gadfly-stack-item"}>
                <GadflyAnnotationCardSection
                  annotation={annotation}
                  reference={findReference(hoveredGadfly.group.references, annotation.id)}
                />
              </div>
            ))}
          </div>
        </aside>
      ) : null}
      {DEV_DEBUG_ENABLED ? (
        <aside
          aria-label="Gadfly debug pane"
          data-testid="gadfly-debug-pane"
          className={`gaddr-debug-pane fixed bottom-4 right-4 top-4 z-[62] flex w-[min(42rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border backdrop-blur-[2px] transition-all duration-200 ${
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
