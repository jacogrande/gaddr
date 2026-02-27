export type GadflyCategory = "clarity" | "structure" | "evidence" | "tone" | "logic";
export type GadflySeverity = "low" | "medium" | "high";
export type GadflyAnnotationStatus =
  | "active"
  | "acknowledged"
  | "resolved"
  | "dismissed"
  | "snoozed";
export type GadflyAnnotationManageActionType =
  | "annotate"
  | "clear"
  | "clear_in_range"
  | "update_annotation"
  | "set_severity"
  | "set_status";

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
export const GADFLY_ANNOTATION_MANAGE_ACTIONS: readonly GadflyAnnotationManageActionType[] = [
  "annotate",
  "clear",
  "clear_in_range",
  "update_annotation",
  "set_severity",
  "set_status",
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

export type GadflyAnnotation = {
  id: string;
  anchor: GadflyAnchor;
  category: GadflyCategory;
  severity: GadflySeverity;
  status: GadflyAnnotationStatus;
  explanation: string;
  rule: string;
  question: string;
};

export type GadflyAction =
  | {
      type: "annotation.manage";
      action: "annotate";
      annotation: GadflyAnnotation;
    }
  | {
      type: "annotation.manage";
      action: "clear";
      annotationId: string;
    }
  | {
      type: "annotation.manage";
      action: "clear_in_range";
      range: GadflyRange;
    }
  | {
      type: "annotation.manage";
      action: "update_annotation";
      annotation: GadflyAnnotation;
    }
  | {
      type: "annotation.manage";
      action: "set_severity";
      annotationId: string;
      severity: GadflySeverity;
    }
  | {
      type: "annotation.manage";
      action: "set_status";
      annotationId: string;
      status: GadflyAnnotationStatus;
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
