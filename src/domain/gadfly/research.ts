import type { GadflyAnalyzeRequest } from "./types";

const USER_CURIOSITY_CUE_PATTERN =
  /\b(i wonder|i am wondering|i'm wondering|im wondering|curious why|curious how|curious what|curious whether)\b/i;
const QUESTION_LEAD_PATTERN =
  /^\s*(why|how|what|when|where|who|which|is|are|can|could|does|do|did|will|would|should)\b/i;
const WRITING_META_PATTERN =
  /\b(sentence|paragraph|essay|draft|thesis|argument|claim|writing|write|rewrite|tone|style|wording|section|intro|conclusion)\b/i;

function normalizeCandidate(candidate: string): string {
  return candidate.trim().replace(/\s+/g, " ");
}

export function extractResearchQuestionCandidates(text: string): string[] {
  const rawCandidates = text.match(/[^.!?\n]+[.!?]?/g) ?? [];
  return rawCandidates
    .map((candidate) => normalizeCandidate(candidate))
    .filter((candidate) => candidate.length >= 16);
}

export function isResearchQuestionCandidate(candidate: string): boolean {
  const normalized = normalizeCandidate(candidate);
  if (normalized.length < 16) {
    return false;
  }

  if (WRITING_META_PATTERN.test(normalized)) {
    return false;
  }

  if (USER_CURIOSITY_CUE_PATTERN.test(normalized)) {
    return true;
  }

  return normalized.includes("?") && QUESTION_LEAD_PATTERN.test(normalized);
}

export function shouldEnableResearchForRequest(request: GadflyAnalyzeRequest): boolean {
  for (const window of request.contextWindow) {
    const candidates = extractResearchQuestionCandidates(window.text);
    for (const candidate of candidates) {
      if (isResearchQuestionCandidate(candidate)) {
        return true;
      }
    }
  }

  return false;
}

export function isPrimaryResearchQuestionRequest(request: GadflyAnalyzeRequest): boolean {
  const normalizedPlainText = normalizeCandidate(request.plainText);
  if (normalizedPlainText.length === 0) {
    return false;
  }

  if (isResearchQuestionCandidate(normalizedPlainText)) {
    return true;
  }

  const candidates = extractResearchQuestionCandidates(normalizedPlainText).filter((candidate) =>
    isResearchQuestionCandidate(candidate),
  );
  if (candidates.length !== 1) {
    return false;
  }

  const [candidate] = candidates;
  if (!candidate) {
    return false;
  }

  return normalizedPlainText.length - candidate.length <= 12;
}
