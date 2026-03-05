export type GadflyCategory = "clarity" | "structure" | "evidence" | "tone" | "logic";
export type GadflySeverity = "low" | "medium" | "high";
export type GadflyAnnotationStatus =
  | "active"
  | "acknowledged"
  | "resolved"
  | "dismissed"
  | "snoozed";

export type GadflyPromptKind =
  | "followup_question"
  | "clarity"
  | "structure"
  | "evidence"
  | "counterpoint"
  | "tone_consistency";

export type GadflyResearchTaskKind =
  | "fact_check"
  | "supporting_evidence"
  | "counterpoint"
  | "context";

export type GadflyResearchTaskStatus = "pending" | "completed";
export type GadflyResearchVerdict = "unverified" | "supported" | "mixed" | "contradicted";

export const GADFLY_CATEGORIES: readonly GadflyCategory[] = [
  "clarity",
  "structure",
  "evidence",
  "tone",
  "logic",
];

export const GADFLY_SEVERITIES: readonly GadflySeverity[] = ["low", "medium", "high"];

export const GADFLY_ANNOTATION_STATUSES: readonly GadflyAnnotationStatus[] = [
  "active",
  "acknowledged",
  "resolved",
  "dismissed",
  "snoozed",
];

export const GADFLY_PROMPT_KINDS: readonly GadflyPromptKind[] = [
  "followup_question",
  "clarity",
  "structure",
  "evidence",
  "counterpoint",
  "tone_consistency",
];

export const GADFLY_RESEARCH_TASK_KINDS: readonly GadflyResearchTaskKind[] = [
  "fact_check",
  "supporting_evidence",
  "counterpoint",
  "context",
];

export const GADFLY_RESEARCH_TASK_STATUSES: readonly GadflyResearchTaskStatus[] = [
  "pending",
  "completed",
];

export const GADFLY_RESEARCH_VERDICTS: readonly GadflyResearchVerdict[] = [
  "unverified",
  "supported",
  "mixed",
  "contradicted",
];

export type GadflyRange = {
  from: number;
  to: number;
};

export type GadflyContextWindow = {
  from: number;
  to: number;
  text: string;
};

export type GadflyAnchor = GadflyRange & {
  quote: string;
};

export type GadflyPrompt = {
  kind: GadflyPromptKind;
  text: string;
};

export type GadflyResearchSource = {
  title: string;
  url: string;
  domain: string;
  pageAge: string | null;
};

export type GadflyResearchResult = {
  verdict: GadflyResearchVerdict;
  findings: string[];
  sources: GadflyResearchSource[];
};

export type GadflyResearchTask = {
  id: string;
  kind: GadflyResearchTaskKind;
  question: string;
  status: GadflyResearchTaskStatus;
  result: GadflyResearchResult | null;
};

export type GadflyResearchState = {
  needsFactCheck: boolean;
  factCheckNote: string | null;
  tasks: GadflyResearchTask[];
};

export type GadflyPreferences = {
  mutedCategories: GadflyCategory[];
  learningGoal: string | null;
};

export type GadflyDebugEvent = {
  eventName: string;
  detail: string;
};

export type GadflyAnnotation = {
  id: string;
  anchor: GadflyAnchor;
  category: GadflyCategory;
  severity: GadflySeverity;
  status: GadflyAnnotationStatus;
  explanation: string;
  rule: string;
  question: string;
  prompts: GadflyPrompt[];
  research: GadflyResearchState;
  snoozedUntil: string | null;
  isPinned: boolean;
  linkedAnnotationIds: string[];
};

export type GadflyActionPayload = Record<string, unknown>;

// Clean-slate action envelope.
// No concrete actions are currently active, but the reducer/guard pipeline remains in place.
export type GadflyAction = {
  type: string;
  action: string;
  payload?: GadflyActionPayload;
};

export type GadflyDroppedArtifact = {
  reason: string;
  artifactSnippet: string;
};

export type GadflyAnalyzeRequest = {
  noteId: string;
  docVersion: number;
  changedRanges: GadflyRange[];
  plainText: string;
  contextWindow: GadflyContextWindow[];
};

export type GadflyUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  webSearchRequests?: number;
};

export type GadflyAnalyzeDiagnostics = {
  webSearchEligible: boolean;
  webSearchIncluded: boolean;
  webSearchFallbackUsed: boolean;
};

export type GadflyAnalyzeResponse = {
  requestId: string;
  model: string;
  usage: GadflyUsage;
  latencyMs: number;
  actions: GadflyAction[];
  droppedArtifacts: GadflyDroppedArtifact[];
  diagnostics: GadflyAnalyzeDiagnostics;
  rawResponse: unknown;
};

export type GadflyState = {
  annotations: GadflyAnnotation[];
  preferences: GadflyPreferences;
  debugEvents: GadflyDebugEvent[];
};

export type GadflyAnalyzeErrorCode =
  | "unauthorized"
  | "invalid_input"
  | "llm_timeout"
  | "provider_error"
  | "ghostwriting_detected";

export type GadflyAnalyzeError = {
  code: GadflyAnalyzeErrorCode;
  message: string;
  details?: unknown;
};
