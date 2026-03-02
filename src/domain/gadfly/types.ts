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
  | "clear_by_category"
  | "update_annotation"
  | "set_severity"
  | "set_status"
  | "snooze_until"
  | "unsnooze"
  | "pin_annotation"
  | "unpin_annotation"
  | "link_annotations";
export type GadflyPromptManageActionType =
  | "ask_followup_question"
  | "add_clarity_prompt"
  | "add_structure_prompt"
  | "add_evidence_prompt"
  | "add_counterpoint_prompt"
  | "add_tone_consistency_prompt";
export type GadflyResearchManageActionType =
  | "flag_fact_check_needed"
  | "create_research_task"
  | "attach_research_result";
export type GadflyPreferenceManageActionType =
  | "mute_category"
  | "unmute_category"
  | "set_learning_goal"
  | "clear_learning_goal";
export type GadflyDebugEmitActionType = "emit_debug_event";
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
export const GADFLY_ANNOTATION_MANAGE_ACTIONS: readonly GadflyAnnotationManageActionType[] = [
  "annotate",
  "clear",
  "clear_in_range",
  "clear_by_category",
  "update_annotation",
  "set_severity",
  "set_status",
  "snooze_until",
  "unsnooze",
  "pin_annotation",
  "unpin_annotation",
  "link_annotations",
];
export const GADFLY_PROMPT_MANAGE_ACTIONS: readonly GadflyPromptManageActionType[] = [
  "ask_followup_question",
  "add_clarity_prompt",
  "add_structure_prompt",
  "add_evidence_prompt",
  "add_counterpoint_prompt",
  "add_tone_consistency_prompt",
];
export const GADFLY_RESEARCH_MANAGE_ACTIONS: readonly GadflyResearchManageActionType[] = [
  "flag_fact_check_needed",
  "create_research_task",
  "attach_research_result",
];
export const GADFLY_PREFERENCE_MANAGE_ACTIONS: readonly GadflyPreferenceManageActionType[] = [
  "mute_category",
  "unmute_category",
  "set_learning_goal",
  "clear_learning_goal",
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
      action: "clear_by_category";
      category: GadflyCategory;
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
    }
  | {
      type: "annotation.manage";
      action: "snooze_until";
      annotationId: string;
      until: string;
    }
  | {
      type: "annotation.manage";
      action: "unsnooze";
      annotationId: string;
    }
  | {
      type: "annotation.manage";
      action: "pin_annotation";
      annotationId: string;
    }
  | {
      type: "annotation.manage";
      action: "unpin_annotation";
      annotationId: string;
    }
  | {
      type: "annotation.manage";
      action: "link_annotations";
      annotationId: string;
      relatedAnnotationIds: string[];
    }
  | {
      type: "prompt.manage";
      action: "ask_followup_question";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "prompt.manage";
      action: "add_clarity_prompt";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "prompt.manage";
      action: "add_structure_prompt";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "prompt.manage";
      action: "add_evidence_prompt";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "prompt.manage";
      action: "add_counterpoint_prompt";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "prompt.manage";
      action: "add_tone_consistency_prompt";
      annotationId: string;
      prompt: string;
    }
  | {
      type: "research.manage";
      action: "flag_fact_check_needed";
      annotationId: string;
      note: string;
    }
  | {
      type: "research.manage";
      action: "create_research_task";
      annotationId: string;
      task: {
        id: string;
        kind: GadflyResearchTaskKind;
        question: string;
      };
    }
  | {
      type: "research.manage";
      action: "attach_research_result";
      annotationId: string;
      taskId: string;
      result: GadflyResearchResult;
    }
  | {
      type: "preference.manage";
      action: "mute_category";
      category: GadflyCategory;
    }
  | {
      type: "preference.manage";
      action: "unmute_category";
      category: GadflyCategory;
    }
  | {
      type: "preference.manage";
      action: "set_learning_goal";
      goal: string;
    }
  | {
      type: "preference.manage";
      action: "clear_learning_goal";
    }
  | {
      type: "debug.emit";
      action: "emit_debug_event";
      event: GadflyDebugEvent;
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
