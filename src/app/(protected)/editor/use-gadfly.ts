"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { parseGadflyAction } from "../../../domain/gadfly/guards";
import {
  extractResearchQuestionCandidates,
  isResearchQuestionCandidate,
} from "../../../domain/gadfly/research";
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

type ExtractedResearchSource = {
  title: string;
  url: string;
  domain: string;
  pageAge: string | null;
};

type ExtractedResearchData = {
  query: string | null;
  summary: string | null;
  sources: ExtractedResearchSource[];
  fetchedUrls: string[];
};

function stripXmlLikeTags(value: string): string {
  return value.replace(/<\/?[^>\n]+>/g, " ");
}

function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSummaryCandidate(value: string): string {
  return normalizeInlineWhitespace(stripXmlLikeTags(value));
}

function isPlanningSummaryText(value: string): boolean {
  const normalized = normalizeSummaryCandidate(value).toLowerCase();
  if (normalized.length === 0) {
    return true;
  }

  const alphanumericLength = normalized.replace(/[^a-z0-9]/gi, "").length;
  if (alphanumericLength < 6) {
    return true;
  }

  if (normalized === "synthesis") {
    return true;
  }

  if (
    normalized.startsWith("i'll ") ||
    normalized.startsWith("i will ") ||
    normalized.startsWith("let me ") ||
    normalized.startsWith("now i'll ") ||
    normalized.startsWith("now i will ")
  ) {
    return true;
  }

  return (
    normalized.includes("search for") ||
    normalized.includes("analyze this writing update") ||
    normalized.includes("create an annotation") ||
    normalized.includes("attach research") ||
    normalized.includes("i can help") ||
    normalized.includes("i will help")
  );
}

function extractSynthesisTag(text: string): string | null {
  const match = text.match(/<synthesis>([\s\S]*?)<\/synthesis>/i);
  if (!match) {
    return null;
  }

  const body = normalizeSummaryCandidate(match[1] ?? "");
  if (body.length === 0) {
    return null;
  }

  return body;
}

function extractResearchData(responseBody: unknown): ExtractedResearchData {
  if (!isObject(responseBody)) {
    return {
      query: null,
      summary: null,
      sources: [],
      fetchedUrls: [],
    };
  }

  const rawResponse = responseBody["rawResponse"];
  if (!isObject(rawResponse)) {
    return {
      query: null,
      summary: null,
      sources: [],
      fetchedUrls: [],
    };
  }

  const content = rawResponse["content"];
  if (!Array.isArray(content)) {
    return {
      query: null,
      summary: null,
      sources: [],
      fetchedUrls: [],
    };
  }

  const sources: ExtractedResearchSource[] = [];
  const modelSummaries: string[] = [];
  const taggedSummaries: string[] = [];
  const fetchedUrls = new Set<string>();
  let query: string | null = null;

  for (const block of content) {
    if (!isObject(block)) {
      continue;
    }

    const blockType = block["type"];

    if (blockType === "server_tool_use" && block["name"] === "web_search") {
      const input = block["input"];
      if (isObject(input) && typeof input["query"] === "string" && input["query"].trim().length > 0) {
        query = input["query"].trim();
      }
      continue;
    }

    if (blockType === "server_tool_use" && block["name"] === "web_fetch") {
      const input = block["input"];
      if (isObject(input) && typeof input["url"] === "string") {
        try {
          fetchedUrls.add(new URL(input["url"]).toString());
        } catch {
          // Ignore malformed tool payload URLs.
        }
      }
      continue;
    }

    if (blockType === "text" && typeof block["text"] === "string") {
      const text = block["text"].trim();
      if (text.length > 0) {
        const taggedSummary = extractSynthesisTag(text);
        if (taggedSummary) {
          taggedSummaries.push(taggedSummary);
        }
        modelSummaries.push(text);
      }
      continue;
    }

    if (blockType !== "web_search_tool_result") {
      if (blockType === "web_fetch_tool_result") {
        const resultContent = block["content"];
        if (isObject(resultContent) && typeof resultContent["url"] === "string") {
          try {
            fetchedUrls.add(new URL(resultContent["url"]).toString());
          } catch {
            // Ignore malformed result URLs.
          }
        }
      }
      continue;
    }

    const resultContent = block["content"];
    if (!Array.isArray(resultContent)) {
      continue;
    }

    for (const item of resultContent) {
      if (!isObject(item) || typeof item["title"] !== "string" || typeof item["url"] !== "string") {
        continue;
      }

      try {
        const parsedUrl = new URL(item["url"]);
        const domain = parsedUrl.hostname;
        if (domain.length === 0) {
          continue;
        }

        sources.push({
          title: item["title"].trim(),
          url: parsedUrl.toString(),
          domain,
          pageAge: typeof item["page_age"] === "string" ? item["page_age"].trim() : null,
        });
      } catch {
        continue;
      }
    }
  }

  const combinedModelText = modelSummaries.join("\n");
  const combinedTaggedSummary = extractSynthesisTag(combinedModelText);
  const rawSummaryCandidates = [
    combinedTaggedSummary,
    ...[...taggedSummaries].reverse(),
    ...[...modelSummaries].reverse(),
  ].filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);

  const seenCandidates = new Set<string>();
  const summaryCandidatePool: string[] = [];
  for (const candidate of rawSummaryCandidates) {
    const normalized = normalizeSummaryCandidate(candidate);
    if (normalized.length === 0) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seenCandidates.has(key)) {
      continue;
    }
    seenCandidates.add(key);
    summaryCandidatePool.push(normalized);
  }

  return {
    query,
    summary: summaryCandidatePool.find((summary) => !isPlanningSummaryText(summary)) ?? null,
    sources,
    fetchedUrls: [...fetchedUrls],
  };
}

function splitSummaryIntoFindings(summary: string | null): string[] {
  if (!summary) {
    return [];
  }

  const summaryWithoutTags = stripXmlLikeTags(summary).replace(/\r/g, "");

  const bulletLines = summaryWithoutTags
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter((line) => line.replace(/[^a-z0-9]/gi, "").length >= 8);

  if (bulletLines.length > 0) {
    return bulletLines.slice(0, 4);
  }

  const normalizedSummary = normalizeInlineWhitespace(summaryWithoutTags);
  if (normalizedSummary.length === 0) {
    return [];
  }

  const findings = normalizedSummary
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (part.length === 0) {
        return false;
      }

      const alphanumericLength = part.replace(/[^a-z0-9]/gi, "").length;
      return alphanumericLength >= 8;
    });

  return findings.slice(0, 3);
}

function normalizeSourceTitle(title: string): string {
  const withoutPublisherSuffix = title.replace(/\s+\|\s+[^|]+$/, "");
  const withoutDashSuffix = withoutPublisherSuffix.replace(/\s+[-–—]\s+[^-–—]+$/, "");
  return withoutDashSuffix.trim();
}

function buildFindingsFromSources(sources: readonly ExtractedResearchSource[]): string[] {
  const findings: string[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const normalizedTitle = normalizeSourceTitle(source.title);
    if (normalizedTitle.length < 12) {
      continue;
    }

    const key = normalizedTitle.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    findings.push(normalizedTitle.endsWith(".") ? normalizedTitle : `${normalizedTitle}.`);
    if (findings.length >= 3) {
      break;
    }
  }

  return findings;
}

function buildResearchExplanation(
  findings: readonly string[],
  query: string | null,
  sourceCount: number,
): string {
  if (findings.length === 0) {
    if (query) {
      return `Web search found ${String(sourceCount)} sources relevant to “${query}”.`;
    }

    return `Web search found ${String(sourceCount)} relevant sources for this question.`;
  }

  const first = findings[0]?.replace(/[.!?]+$/, "").trim() ?? "";
  const second = findings[1]?.replace(/[.!?]+$/, "").trim() ?? "";

  if (!first) {
    if (query) {
      return `Web search found ${String(sourceCount)} sources relevant to “${query}”.`;
    }

    return `Web search found ${String(sourceCount)} relevant sources for this question.`;
  }

  if (!second) {
    return first.endsWith(".") ? first : `${first}.`;
  }

  return `Across ${String(sourceCount)} sources, recurring themes include: ${first}; ${second}.`;
}

function pickResearchQuestionCandidate(plainText: string): string | null {
  const candidates = extractResearchQuestionCandidates(plainText).filter((candidate) =>
    isResearchQuestionCandidate(candidate),
  );

  return candidates[0] ?? null;
}

function findTextRangeInBlock(
  blockNode: ProseMirrorNode,
  blockPos: number,
  text: string,
  referenceFrom: number,
): DocRange | null {
  let blockText = "";
  const blockPositionByTextIndex: number[] = [];

  blockNode.descendants((child, childPos) => {
    if (!child.isText || !child.text) {
      return true;
    }

    const absoluteTextStart = blockPos + childPos + 1;
    for (let index = 0; index < child.text.length; index += 1) {
      blockText += child.text[index] ?? "";
      blockPositionByTextIndex.push(absoluteTextStart + index);
    }

    return true;
  });

  if (blockText.length === 0) {
    return null;
  }

  let bestRange: DocRange | null = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  let cursor = 0;

  while (cursor <= blockText.length) {
    const foundAt = blockText.indexOf(text, cursor);
    if (foundAt < 0) {
      break;
    }

    const from = blockPositionByTextIndex[foundAt];
    const to = blockPositionByTextIndex[foundAt + text.length - 1];
    if (from !== undefined && to !== undefined) {
      const candidateFrom = from;
      const candidateTo = to + 1;
      const distance = Math.abs(candidateFrom - referenceFrom);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestRange = { from: candidateFrom, to: candidateTo };
      }
    }

    cursor = foundAt + 1;
  }

  return bestRange;
}

function resolveResearchAnchor(
  doc: ProseMirrorNode,
  request: GadflyAnalyzeRequest,
  question: string | null,
): { from: number; to: number; quote: string } {
  const docMax = doc.content.size;
  const referenceFrom = request.changedRanges[0]?.from ?? 0;
  const fallbackRange = request.changedRanges[0] ?? { from: 0, to: Math.min(1, docMax) };
  const fallbackFrom = Math.max(0, Math.min(fallbackRange.from, docMax));
  const fallbackTo = Math.max(fallbackFrom + 1, Math.min(fallbackRange.to, docMax));

  if (!question || question.trim().length < 8) {
    const fallbackQuote = doc.textBetween(fallbackFrom, fallbackTo, "\n", "\n").trim();
    return {
      from: fallbackFrom,
      to: fallbackTo,
      quote: fallbackQuote.length > 0 ? fallbackQuote : request.plainText.trim().slice(0, 120),
    };
  }

  const candidates = [question.trim()];
  const withoutTrailingPunctuation = question.trim().replace(/[.!?]+$/, "");
  if (withoutTrailingPunctuation.length >= 8 && withoutTrailingPunctuation !== question.trim()) {
    candidates.push(withoutTrailingPunctuation);
  }

  for (const candidate of candidates) {
    const candidateRanges: DocRange[] = [];
    doc.descendants((node, pos) => {
      if (!node.isTextblock) {
        return true;
      }

      const foundRange = findTextRangeInBlock(node, pos, candidate, referenceFrom);
      if (foundRange) {
        candidateRanges.push(foundRange);
      }

      return false;
    });

    if (candidateRanges.length === 0) {
      continue;
    }

    const firstRange = candidateRanges[0];
    if (!firstRange) {
      continue;
    }

    let selectedRange = firstRange;
    let selectedDistance = Math.abs(selectedRange.from - referenceFrom);
    for (let index = 1; index < candidateRanges.length; index += 1) {
      const nextRange = candidateRanges[index];
      if (!nextRange) {
        continue;
      }

      const distance = Math.abs(nextRange.from - referenceFrom);
      if (distance < selectedDistance) {
        selectedRange = nextRange;
        selectedDistance = distance;
      }
    }

    return {
      from: selectedRange.from,
      to: selectedRange.to,
      quote: candidate,
    };
  }

  const fallbackQuote = doc.textBetween(fallbackFrom, fallbackTo, "\n", "\n").trim();
  return {
    from: fallbackFrom,
    to: fallbackTo,
    quote: fallbackQuote.length > 0 ? fallbackQuote : question.trim(),
  };
}

function buildResearchAnnotations(
  doc: ProseMirrorNode,
  request: GadflyAnalyzeRequest,
  responseBody: unknown,
  debugId: string,
): GadflyAnnotation[] {
  const extracted = extractResearchData(responseBody);
  if (extracted.sources.length === 0) {
    return [];
  }

  const question = pickResearchQuestionCandidate(request.plainText);
  if (!question) {
    return [];
  }

  const anchor = resolveResearchAnchor(doc, request, question);
  const summaryFindings = splitSummaryIntoFindings(extracted.summary).filter(
    (finding) => !isPlanningSummaryText(finding),
  );
  const matchedFetchedSources =
    extracted.fetchedUrls.length > 0
      ? extracted.sources.filter((source) => extracted.fetchedUrls.includes(source.url))
      : [];
  const preferredSources = matchedFetchedSources.length > 0 ? matchedFetchedSources : extracted.sources;
  const sourceFindings = buildFindingsFromSources(preferredSources);
  const findings = summaryFindings.length > 0 ? summaryFindings : sourceFindings;
  const explanation = buildResearchExplanation(findings, extracted.query, preferredSources.length);

  return [
    {
      id: `research-${debugId}`,
      anchor,
      category: "evidence",
      severity: "medium",
      status: "active",
      explanation,
      rule: "Questions about real-world claims are stronger when grounded in external sources.",
      question,
      prompts: [],
      research: {
        needsFactCheck: false,
        factCheckNote: null,
        tasks: [
          {
            id: `research-task-${debugId}`,
            kind: "supporting_evidence",
            question,
            status: "completed",
            result: {
              verdict: "supported",
              findings: findings.length > 0 ? findings : preferredSources.slice(0, 3).map((source) => source.title),
              sources: preferredSources.slice(0, 8),
            },
          },
        ],
      },
      snoozedUntil: null,
      isPinned: false,
      linkedAnnotationIds: [],
    },
  ];
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

  const setAnnotations = useCallback((annotations: readonly GadflyAnnotation[]) => {
    setGadflyState((currentState) => ({
      ...currentState,
      annotations: [...annotations],
    }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, [setAnnotations]);

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
      filterActionsForPendingRanges(anchoredActions);
      const researchAnnotations = buildResearchAnnotations(
        currentEditor.state.doc,
        payload,
        parsedBody,
        debugId,
      );

      if (researchAnnotations.length > 0) {
        setAnnotations(researchAnnotations);
      } else {
        clearAnnotations();
      }

      patchDebugEntry(debugId, {
        status: "success",
        responseStatus: response.status,
        responseBody: parsedBody,
        usage: parsed.usage ?? undefined,
        latencyMs: parsed.latencyMs ?? Date.now() - requestStartedAt,
        diagnostics: parsed.diagnostics ?? undefined,
        parsedActions: anchoredActions,
        appliedActions: [],
        droppedArtifacts: parsed.droppedArtifacts,
        filteredActionCount: anchoredActions.length,
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
  }, [buildRequestPayload, clearAnnotations, patchDebugEntry, pushDebugEntry, setAnnotations]);

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
    clearAnnotations();
  }, [clearAnnotations]);

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
