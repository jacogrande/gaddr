"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { reduceGadflyState } from "../../../domain/gadfly/annotations";
import { parseGadflyAction } from "../../../domain/gadfly/guards";
import type {
  GadflyAction,
  GadflyAnalyzeDiagnostics,
  GadflyAnalyzeRequest,
  GadflyAnnotation,
  GadflyDebugEvent,
  GadflyDroppedArtifact,
  GadflyPreferences,
  GadflyRange,
  GadflyState,
  GadflyUsage,
} from "../../../domain/gadfly/types";

type GadflyDebugEntryStatus = "pending" | "success" | "superseded" | "error" | "aborted";

export type GadflyDebugEntry = {
  id: string;
  startedAtIso: string;
  status: GadflyDebugEntryStatus;
  request: GadflyAnalyzeRequest;
  responseStatus?: number;
  responseBody?: unknown;
  usage?: GadflyUsage;
  latencyMs?: number;
  error?: string;
  diagnostics?: GadflyAnalyzeDiagnostics;
  parsedActions?: GadflyAction[];
  appliedActions?: GadflyAction[];
  droppedArtifacts?: GadflyDroppedArtifact[];
  filteredActionCount?: number;
  providerRequestId?: string;
  model?: string;
  stopReason?: string | null;
};

export type GadflyDebugRuntime = {
  activeRequestId: string | null;
  pendingRanges: GadflyRange[];
  pendingDocVersion: number;
  debounceScheduled: boolean;
  currentDocVersion: number;
};

type UseGadflyOptions = {
  noteId: string;
  debounceMs?: number;
  maxDebugEntries?: number;
};

type UseGadflyResult = {
  annotations: GadflyAnnotation[];
  preferences: GadflyPreferences;
  debugEvents: GadflyDebugEvent[];
  isAnalyzing: boolean;
  analyzeError: string | null;
  debugEntries: GadflyDebugEntry[];
  debugRuntime: GadflyDebugRuntime;
  handleTransaction: (transaction: Transaction) => void;
  clearDebugEntries: () => void;
};

const DEFAULT_DEBOUNCE_MS = 600;
const DEFAULT_DEBUG_ENTRY_LIMIT = 100;
const CONTEXT_PADDING = 90;

type DocRange = {
  from: number;
  to: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function rangesOverlap(left: DocRange, right: DocRange): boolean {
  return left.from < right.to && right.from < left.to;
}

function parseActions(value: unknown): GadflyAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const actions: GadflyAction[] = [];
  for (const item of value) {
    const parsed = parseGadflyAction(item);
    if (!parsed.ok) {
      continue;
    }

    actions.push(parsed.value);
  }

  return actions;
}

function parseUsage(value: unknown): GadflyUsage | null {
  if (!isObject(value)) {
    return null;
  }

  const inputTokens = value["inputTokens"];
  const outputTokens = value["outputTokens"];
  const totalTokens = value["totalTokens"];
  const webSearchRequests = value["webSearchRequests"];

  if (
    typeof inputTokens !== "number" ||
    typeof outputTokens !== "number" ||
    typeof totalTokens !== "number"
  ) {
    return null;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    webSearchRequests: typeof webSearchRequests === "number" ? webSearchRequests : undefined,
  };
}

function parseAnalyzeErrorMessage(value: unknown): string | null {
  if (!isObject(value)) {
    return null;
  }

  const error = value["error"];
  if (!isObject(error)) {
    return null;
  }

  const message = error["message"];
  if (typeof message !== "string") {
    return null;
  }

  return message;
}

function parseAnalyzeSuccess(value: unknown): {
  requestId: string | null;
  model: string | null;
  stopReason: string | null;
  actions: GadflyAction[];
  droppedArtifacts: GadflyDroppedArtifact[];
  usage: GadflyUsage | null;
  latencyMs: number | null;
  diagnostics: GadflyAnalyzeDiagnostics | null;
} {
  if (!isObject(value)) {
    return {
      requestId: null,
      model: null,
      stopReason: null,
      actions: [],
      droppedArtifacts: [],
      usage: null,
      latencyMs: null,
      diagnostics: null,
    };
  }

  const requestId = typeof value["requestId"] === "string" ? value["requestId"] : null;
  const model = typeof value["model"] === "string" ? value["model"] : null;
  const actions = parseActions(value["actions"]);
  const droppedArtifacts = parseDroppedArtifacts(value["droppedArtifacts"]);
  const usage = parseUsage(value["usage"]);
  const latencyMs = typeof value["latencyMs"] === "number" ? value["latencyMs"] : null;
  const diagnostics = parseDiagnostics(value["diagnostics"]);
  let stopReason: string | null = null;

  const rawResponse = value["rawResponse"];
  if (isObject(rawResponse) && typeof rawResponse["stopReason"] === "string") {
    stopReason = rawResponse["stopReason"];
  }

  return {
    requestId,
    model,
    stopReason,
    actions,
    droppedArtifacts,
    usage,
    latencyMs,
    diagnostics,
  };
}

function parseDroppedArtifacts(value: unknown): GadflyDroppedArtifact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const artifacts: GadflyDroppedArtifact[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      continue;
    }

    const reason = item["reason"];
    const artifactSnippet = item["artifactSnippet"];
    if (typeof reason !== "string" || typeof artifactSnippet !== "string") {
      continue;
    }

    artifacts.push({ reason, artifactSnippet });
  }

  return artifacts;
}

function parseDiagnostics(value: unknown): GadflyAnalyzeDiagnostics | null {
  if (!isObject(value)) {
    return null;
  }

  const webSearchEligible = value["webSearchEligible"];
  const webSearchIncluded = value["webSearchIncluded"];
  const webSearchFallbackUsed = value["webSearchFallbackUsed"];
  if (
    typeof webSearchEligible !== "boolean" ||
    typeof webSearchIncluded !== "boolean" ||
    typeof webSearchFallbackUsed !== "boolean"
  ) {
    return null;
  }

  return {
    webSearchEligible,
    webSearchIncluded,
    webSearchFallbackUsed,
  };
}

function mergeRanges(ranges: readonly GadflyRange[]): GadflyRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort((left, right) => {
    if (left.from !== right.from) {
      return left.from - right.from;
    }

    return left.to - right.to;
  });

  const merged: GadflyRange[] = [];

  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ from: range.from, to: range.to });
      continue;
    }

    if (range.from <= previous.to + 1) {
      previous.to = Math.max(previous.to, range.to);
      continue;
    }

    merged.push({ from: range.from, to: range.to });
  }

  return merged;
}

function resolveActionAnchors(actions: readonly GadflyAction[]): GadflyAction[] {
  return [...actions];
}

function filterActionsForPendingRanges(actions: readonly GadflyAction[]): GadflyAction[] {
  return [...actions];
}

function extractChangedRanges(transaction: Transaction): GadflyRange[] {
  if (!transaction.docChanged) {
    return [];
  }

  const ranges: GadflyRange[] = [];

  for (const map of transaction.mapping.maps) {
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      const from = Math.min(newStart, newEnd);
      const to = Math.max(newStart, newEnd);
      ranges.push({ from, to });
    });
  }

  if (ranges.length === 0) {
    ranges.push({
      from: transaction.selection.from,
      to: transaction.selection.to,
    });
  }

  return mergeRanges(ranges);
}

export function useGadfly(editor: TiptapEditor | null, options: UseGadflyOptions): UseGadflyResult {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxDebugEntries = options.maxDebugEntries ?? DEFAULT_DEBUG_ENTRY_LIMIT;

  const [gadflyState, setGadflyState] = useState<GadflyState>({
    annotations: [],
    preferences: {
      mutedCategories: [],
      learningGoal: null,
    },
    debugEvents: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [debugEntries, setDebugEntries] = useState<GadflyDebugEntry[]>([]);
  const [debugRuntime, setDebugRuntime] = useState<GadflyDebugRuntime>({
    activeRequestId: null,
    pendingRanges: [],
    pendingDocVersion: 0,
    debounceScheduled: false,
    currentDocVersion: 0,
  });

  const pendingRangesRef = useRef<GadflyRange[]>([]);
  const pendingDocVersionRef = useRef(0);
  const debounceHandleRef = useRef<number | null>(null);
  const inflightAbortRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const requestSequenceRef = useRef(0);
  const docRevisionRef = useRef(0);
  const editorRef = useRef<TiptapEditor | null>(editor);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const pushDebugEntry = useCallback(
    (entry: GadflyDebugEntry) => {
      setDebugEntries((previous) => {
        const next = [...previous, entry];
        return next.length > maxDebugEntries ? next.slice(next.length - maxDebugEntries) : next;
      });
    },
    [maxDebugEntries],
  );

  const patchDebugEntry = useCallback((id: string, patch: Partial<GadflyDebugEntry>) => {
    setDebugEntries((previous) =>
      previous.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const syncDebugRuntime = useCallback(() => {
    setDebugRuntime({
      activeRequestId: activeRequestIdRef.current,
      pendingRanges: [...pendingRangesRef.current],
      pendingDocVersion: pendingDocVersionRef.current,
      debounceScheduled: debounceHandleRef.current !== null,
      currentDocVersion: docRevisionRef.current,
    });
  }, []);

  const applyGadflyState = useCallback((actions: readonly GadflyAction[]) => {
    setGadflyState((currentState) => reduceGadflyState(currentState, actions));
  }, []);

  const buildRequestPayload = useCallback(
    (currentEditor: TiptapEditor, changedRanges: readonly GadflyRange[], docVersion: number): GadflyAnalyzeRequest => {
      const doc = currentEditor.state.doc;
      const docMax = doc.content.size;
      const plainText = doc.textBetween(0, docMax, "\n", "\n");

      const contextWindow = changedRanges.map((range) => {
        const paddedFrom = Math.max(0, range.from - CONTEXT_PADDING);
        const paddedTo = Math.min(docMax, Math.max(range.to, range.from + 1) + CONTEXT_PADDING);
        return {
          from: paddedFrom,
          to: paddedTo,
          text: doc.textBetween(paddedFrom, paddedTo, "\n", "\n"),
        };
      });

      return {
        noteId: options.noteId,
        docVersion,
        changedRanges: [...changedRanges],
        plainText,
        contextWindow,
      };
    },
    [options.noteId],
  );

  const analyzeNow = useCallback(async () => {
    const currentEditor = editorRef.current;
    if (!currentEditor) {
      pendingRangesRef.current = [];
      syncDebugRuntime();
      return;
    }

    if (activeRequestIdRef.current !== null) {
      syncDebugRuntime();
      return;
    }

    const changedRanges = pendingRangesRef.current;
    pendingRangesRef.current = [];
    const requestDocVersion = pendingDocVersionRef.current;
    pendingDocVersionRef.current = 0;
    syncDebugRuntime();

    if (changedRanges.length === 0) {
      return;
    }

    const payload = buildRequestPayload(currentEditor, changedRanges, requestDocVersion);

    if (payload.plainText.trim().length === 0) {
      activeRequestIdRef.current = null;
      setIsAnalyzing(false);
      setGadflyState((currentState) => ({
        ...currentState,
        annotations: [],
      }));
      setAnalyzeError(null);
      syncDebugRuntime();
      return;
    }

    requestSequenceRef.current += 1;
    const debugId = `gadfly-${String(requestSequenceRef.current)}`;
    const requestStartedAt = Date.now();

    const controller = new AbortController();
    inflightAbortRef.current = controller;
    activeRequestIdRef.current = debugId;
    syncDebugRuntime();

    pushDebugEntry({
      id: debugId,
      startedAtIso: new Date(requestStartedAt).toISOString(),
      status: "pending",
      request: payload,
    });

    setAnalyzeError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/gadfly/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let parsedBody: unknown = null;

      try {
        parsedBody = rawText.length > 0 ? JSON.parse(rawText) : null;
      } catch {
        parsedBody = { rawText };
      }

      const staleByRequest = activeRequestIdRef.current !== debugId;
      if (staleByRequest) {
        const parsed = parseAnalyzeSuccess(parsedBody);
        patchDebugEntry(debugId, {
          status: "superseded",
          responseStatus: response.status,
          responseBody: parsedBody,
          error: "Superseded by newer request; response ignored",
          latencyMs: Date.now() - requestStartedAt,
          usage: parsed.usage ?? undefined,
          diagnostics: parsed.diagnostics ?? undefined,
          parsedActions: parsed.actions,
          appliedActions: [],
          droppedArtifacts: parsed.droppedArtifacts,
          filteredActionCount: 0,
          providerRequestId: parsed.requestId ?? undefined,
          model: parsed.model ?? undefined,
          stopReason: parsed.stopReason,
        });
        return;
      }

      if (!response.ok) {
        const message = parseAnalyzeErrorMessage(parsedBody) ?? `Analyze request failed (${String(response.status)})`;

        patchDebugEntry(debugId, {
          status: "error",
          responseStatus: response.status,
          responseBody: parsedBody,
          error: message,
          latencyMs: Date.now() - requestStartedAt,
        });

        setAnalyzeError(message);
        return;
      }

      const parsed = parseAnalyzeSuccess(parsedBody);
      const anchoredActions = resolveActionAnchors(parsed.actions);
      const safeActions = filterActionsForPendingRanges(anchoredActions);
      applyGadflyState(safeActions);

      patchDebugEntry(debugId, {
        status: "success",
        responseStatus: response.status,
        responseBody: parsedBody,
        usage: parsed.usage ?? undefined,
        latencyMs: parsed.latencyMs ?? Date.now() - requestStartedAt,
        diagnostics: parsed.diagnostics ?? undefined,
        parsedActions: anchoredActions,
        appliedActions: safeActions,
        droppedArtifacts: parsed.droppedArtifacts,
        filteredActionCount: anchoredActions.length - safeActions.length,
        providerRequestId: parsed.requestId ?? undefined,
        model: parsed.model ?? undefined,
        stopReason: parsed.stopReason,
      });
    } catch (cause: unknown) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      const staleRequest = activeRequestIdRef.current !== debugId;
      const message =
        cause instanceof Error
          ? cause.message
          : aborted
            ? "Analyze request aborted"
            : "Analyze request failed";

      patchDebugEntry(debugId, {
        status: staleRequest ? "superseded" : aborted ? "aborted" : "error",
        error: staleRequest ? "Superseded by newer edits" : message,
        latencyMs: Date.now() - requestStartedAt,
      });

      if (!aborted && !staleRequest) {
        setAnalyzeError(message);
      }
    } finally {
      const isActiveRequest = activeRequestIdRef.current === debugId;
      if (isActiveRequest) {
        activeRequestIdRef.current = null;
        if (inflightAbortRef.current === controller) {
          inflightAbortRef.current = null;
        }
        syncDebugRuntime();

        if (pendingRangesRef.current.length > 0) {
          void analyzeNow();
        } else {
          setIsAnalyzing(false);
        }
      }
    }
  }, [buildRequestPayload, patchDebugEntry, pushDebugEntry]);

  const scheduleAnalyze = useMemo(
    () =>
      (nextRanges: readonly GadflyRange[], docVersion: number) => {
        pendingRangesRef.current = mergeRanges([...pendingRangesRef.current, ...nextRanges]);
        pendingDocVersionRef.current = Math.max(pendingDocVersionRef.current, docVersion);

        if (debounceHandleRef.current !== null) {
          window.clearTimeout(debounceHandleRef.current);
        }

        debounceHandleRef.current = window.setTimeout(() => {
          debounceHandleRef.current = null;
          syncDebugRuntime();
          void analyzeNow();
        }, debounceMs);
        syncDebugRuntime();
      },
    [analyzeNow, debounceMs, syncDebugRuntime],
  );

  const handleTransaction = useCallback(
    (transaction: Transaction) => {
      const changedRanges = extractChangedRanges(transaction);
      if (changedRanges.length === 0) {
        return;
      }

      docRevisionRef.current += 1;
      const docVersion = docRevisionRef.current;
      scheduleAnalyze(changedRanges, docVersion);
      syncDebugRuntime();

      setGadflyState((previous) => {
        const next = previous.annotations.filter((annotation) => {
          const anchorRange = {
            from: annotation.anchor.from,
            to: annotation.anchor.to,
          };

          return !changedRanges.some((changedRange) => rangesOverlap(anchorRange, changedRange));
        });

        if (next.length === previous.annotations.length) {
          return previous;
        }

        return {
          ...previous,
          annotations: next,
        };
      });
    },
    [scheduleAnalyze, syncDebugRuntime],
  );

  const clearDebugEntries = useCallback(() => {
    setDebugEntries([]);
  }, []);

  const visibleAnnotations = useMemo(() => {
    const annotations = gadflyState.annotations;
    const mutedCategories = gadflyState.preferences.mutedCategories;

    if (mutedCategories.length === 0) {
      return annotations;
    }

    return annotations.filter((annotation) => !mutedCategories.includes(annotation.category));
  }, [gadflyState.annotations, gadflyState.preferences.mutedCategories]);

  useEffect(() => {
    return () => {
      if (debounceHandleRef.current !== null) {
        window.clearTimeout(debounceHandleRef.current);
      }

      if (inflightAbortRef.current) {
        inflightAbortRef.current.abort();
        inflightAbortRef.current = null;
      }
    };
  }, []);

  return {
    annotations: visibleAnnotations,
    preferences: gadflyState.preferences,
    debugEvents: gadflyState.debugEvents,
    isAnalyzing,
    analyzeError,
    debugEntries,
    debugRuntime,
    handleTransaction,
    clearDebugEntries,
  };
}
