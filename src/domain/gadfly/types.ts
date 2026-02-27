export type GadflyCategory = "clarity" | "structure" | "evidence" | "tone" | "logic";
export type GadflySeverity = "low" | "medium" | "high";

export const GADFLY_CATEGORIES: readonly GadflyCategory[] = [
  "clarity",
  "structure",
  "evidence",
  "tone",
  "logic",
];
export const GADFLY_SEVERITIES: readonly GadflySeverity[] = ["low", "medium", "high"];

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

export type GadflyAnnotation = {
  id: string;
  anchor: GadflyAnchor;
  category: GadflyCategory;
  severity: GadflySeverity;
  explanation: string;
  rule: string;
  question: string;
};

export type GadflyAction =
  | {
      type: "annotate";
      annotation: GadflyAnnotation;
    }
  | {
      type: "clear";
      annotationId: string;
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
};

export type GadflyAnalyzeResponse = {
  requestId: string;
  model: string;
  usage: GadflyUsage;
  latencyMs: number;
  actions: GadflyAction[];
  droppedArtifacts: GadflyDroppedArtifact[];
  rawResponse: unknown;
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
