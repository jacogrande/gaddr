"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { mergeGadflyActions } from "../../../domain/gadfly/annotations";
import { parseGadflyAction } from "../../../domain/gadfly/guards";
import type {
  GadflyAction,
  GadflyAnalyzeRequest,
  GadflyAnnotation,
  GadflyRange,
  GadflyUsage,
} from "../../../domain/gadfly/types";

type GadflyDebugEntryStatus = "pending" | "success" | "error" | "aborted";

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
};

type UseGadflyOptions = {
  noteId: string;
  debounceMs?: number;
  maxDebugEntries?: number;
};

type UseGadflyResult = {
  annotations: GadflyAnnotation[];
  isAnalyzing: boolean;
  analyzeError: string | null;
  debugEntries: GadflyDebugEntry[];
  handleTransaction: (transaction: Transaction) => void;
  clearDebugEntries: () => void;
};

const DEFAULT_DEBOUNCE_MS = 600;
const DEFAULT_DEBUG_ENTRY_LIMIT = 100;
const CONTEXT_PADDING = 90;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  actions: GadflyAction[];
  usage: GadflyUsage | null;
  latencyMs: number | null;
} {
  if (!isObject(value)) {
    return {
      actions: [],
      usage: null,
      latencyMs: null,
    };
  }

  const actions = parseActions(value["actions"]);
  const usage = parseUsage(value["usage"]);
  const latencyMs = typeof value["latencyMs"] === "number" ? value["latencyMs"] : null;

  return {
    actions,
    usage,
    latencyMs,
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

  const [annotations, setAnnotations] = useState<GadflyAnnotation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [debugEntries, setDebugEntries] = useState<GadflyDebugEntry[]>([]);

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
      return;
    }

    const changedRanges = pendingRangesRef.current;
    pendingRangesRef.current = [];
    const requestDocVersion = pendingDocVersionRef.current;
    pendingDocVersionRef.current = 0;

    if (changedRanges.length === 0) {
      return;
    }

    const payload = buildRequestPayload(currentEditor, changedRanges, requestDocVersion);

    if (payload.plainText.trim().length === 0) {
      if (inflightAbortRef.current) {
        inflightAbortRef.current.abort();
        inflightAbortRef.current = null;
      }

      activeRequestIdRef.current = null;
      setIsAnalyzing(false);
      setAnnotations([]);
      setAnalyzeError(null);
      return;
    }

    if (inflightAbortRef.current) {
      inflightAbortRef.current.abort();
      inflightAbortRef.current = null;
    }

    requestSequenceRef.current += 1;
    const debugId = `gadfly-${String(requestSequenceRef.current)}`;
    const requestStartedAt = Date.now();

    const controller = new AbortController();
    inflightAbortRef.current = controller;
    activeRequestIdRef.current = debugId;

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
      const staleByDocVersion = payload.docVersion !== docRevisionRef.current;
      if (staleByRequest || staleByDocVersion) {
        patchDebugEntry(debugId, {
          status: "aborted",
          responseStatus: response.status,
          responseBody: parsedBody,
          error: "Stale response discarded",
          latencyMs: Date.now() - requestStartedAt,
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
      setAnnotations((previous) => mergeGadflyActions(previous, parsed.actions));

      patchDebugEntry(debugId, {
        status: "success",
        responseStatus: response.status,
        responseBody: parsedBody,
        usage: parsed.usage ?? undefined,
        latencyMs: parsed.latencyMs ?? Date.now() - requestStartedAt,
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
        status: aborted || staleRequest ? "aborted" : "error",
        error: staleRequest ? "Stale request aborted" : message,
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
        setIsAnalyzing(false);
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
          void analyzeNow();
        }, debounceMs);
      },
    [analyzeNow, debounceMs],
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
    },
    [scheduleAnalyze],
  );

  const clearDebugEntries = useCallback(() => {
    setDebugEntries([]);
  }, []);

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
    annotations,
    isAnalyzing,
    analyzeError,
    debugEntries,
    handleTransaction,
    clearDebugEntries,
  };
}
