// Legacy review-era Constellation types used by the current runtime.
// Sprint 0 adds exploratory scaffolding below without switching the active UI yet.
export type ConstellationNodeKind =
  | "claim"
  | "support"
  | "challenge"
  | "question"
  | "gap"
  | "source";

export type ConstellationLaneKind =
  | "supports"
  | "challenges"
  | "questions"
  | "sources";

export type ConstellationEdgeKind =
  | "anchors_to_text"
  | "supports"
  | "challenges"
  | "derived_from"
  | "relates_to";

export type ConstellationNodeStatus =
  | "active"
  | "pinned"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export type ConstellationThemeStatus =
  | "suggested"
  | "accepted"
  | "edited"
  | "dismissed";

export type ConstellationSeverity = "low" | "medium" | "high";

export type ConstellationVerdict =
  | "unverified"
  | "supported"
  | "mixed"
  | "contradicted"
  | "not_applicable";

export const CONSTELLATION_NODE_KINDS: readonly ConstellationNodeKind[] = [
  "claim",
  "support",
  "challenge",
  "question",
  "gap",
  "source",
];

export const CONSTELLATION_LANE_KINDS: readonly ConstellationLaneKind[] = [
  "supports",
  "challenges",
  "questions",
  "sources",
];

export const CONSTELLATION_EDGE_KINDS: readonly ConstellationEdgeKind[] = [
  "anchors_to_text",
  "supports",
  "challenges",
  "derived_from",
  "relates_to",
];

export const CONSTELLATION_NODE_STATUSES: readonly ConstellationNodeStatus[] = [
  "active",
  "pinned",
  "acknowledged",
  "resolved",
  "dismissed",
];

export const CONSTELLATION_THEME_STATUSES: readonly ConstellationThemeStatus[] = [
  "suggested",
  "accepted",
  "edited",
  "dismissed",
];

export const CONSTELLATION_NODE_KIND_TO_LANE: Record<ConstellationNodeKind, ConstellationLaneKind> = {
  claim: "supports",
  support: "supports",
  challenge: "challenges",
  question: "questions",
  gap: "challenges",
  source: "sources",
};

// Spec section 9.2: challenge > gap > question > support > claim > source
export const CONSTELLATION_NODE_ROLE_ORDER: Record<ConstellationNodeKind, number> = {
  challenge: 0,
  gap: 1,
  question: 2,
  support: 3,
  claim: 4,
  source: 5,
};

export type ConstellationAnchorRef = {
  annotationId: string;
  from: number;
  to: number;
  quote: string;
};

export type ConstellationSourceRef = {
  sourceId: string;
  researchTaskId: string | null;
  title: string;
  url: string;
  domain: string;
  pageAge: string | null;
  snippet: string | null;
  relevanceScore: number;
  verdict: ConstellationVerdict;
};

export type ConstellationNode = {
  id: string;
  kind: ConstellationNodeKind;
  lane: ConstellationLaneKind;
  themeId: string;
  title: string;
  summary: string;
  severity: ConstellationSeverity;
  status: ConstellationNodeStatus;
  verdict: ConstellationVerdict;
  confidenceScore: number;
  leverageScore: number;
  sourceRefs: ConstellationSourceRef[];
  anchorRefs: ConstellationAnchorRef[];
  linkedNodeIds: string[];
};

export type ConstellationThemeCounts = {
  supports: number;
  challenges: number;
  questions: number;
  sources: number;
};

export type ConstellationTheme = {
  id: string;
  title: string;
  summary: string;
  status: ConstellationThemeStatus;
  counts: ConstellationThemeCounts;
  leverageScore: number;
  draftCentrality: number;
  conflictScore: number;
  evidenceGapScore: number;
  repetitionScore: number;
  freshnessScore: number;
  confidenceScore: number;
  anchorRefs: ConstellationAnchorRef[];
  nodeIds: string[];
};

export type ConstellationEdge = {
  id: string;
  kind: ConstellationEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  strength: number;
};

export type ConstellationDraftCard = {
  noteId: string;
  docVersion: number;
  title: string | null;
  excerpt: string;
  wordCount: number;
  anchorRefs: ConstellationAnchorRef[];
};

export type ConstellationFilters = {
  lanes: ConstellationLaneKind[];
  severity: ConstellationSeverity[];
  unresolvedOnly: boolean;
  showDismissed: boolean;
};

export type ConstellationBoard = {
  id: string;
  noteId: string;
  generatedAt: string;
  draft: ConstellationDraftCard;
  themes: ConstellationTheme[];
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  filters: ConstellationFilters;
};

// Exploratory Constellation model scaffold for Sprint 0.

export type ConstellationNodeFamily =
  | "seed"
  | "theme"
  | "question"
  | "counterargument"
  | "evidence"
  | "source"
  | "research_task"
  | "response";

export type ConstellationEdgeRelation =
  | "emerges_from"
  | "supports"
  | "contradicts"
  | "questions"
  | "derived_from"
  | "responds_to"
  | "expands";

export type ConstellationBranchActionKind =
  | "find_strongest_objection"
  | "find_stronger_evidence"
  | "ask_deeper_question"
  | "follow_source"
  | "respond_to_counterargument";

export type ConstellationWorkingSetDisposition = "saved" | "pinned" | "use_in_draft";

export type ConstellationProvenanceSource = "draft" | "annotation" | "research" | "mock";

export const CONSTELLATION_NODE_FAMILIES: readonly ConstellationNodeFamily[] = [
  "seed",
  "theme",
  "question",
  "counterargument",
  "evidence",
  "source",
  "research_task",
  "response",
];

export const CONSTELLATION_EDGE_RELATIONS: readonly ConstellationEdgeRelation[] = [
  "emerges_from",
  "supports",
  "contradicts",
  "questions",
  "derived_from",
  "responds_to",
  "expands",
];

export const CONSTELLATION_BRANCH_ACTION_KINDS: readonly ConstellationBranchActionKind[] = [
  "find_strongest_objection",
  "find_stronger_evidence",
  "ask_deeper_question",
  "follow_source",
  "respond_to_counterargument",
];

export const CONSTELLATION_WORKING_SET_DISPOSITIONS: readonly ConstellationWorkingSetDisposition[] = [
  "saved",
  "pinned",
  "use_in_draft",
];

export const CONSTELLATION_PROVENANCE_SOURCES: readonly ConstellationProvenanceSource[] = [
  "draft",
  "annotation",
  "research",
  "mock",
];

export type ConstellationWhySurfaced = {
  label: string;
  detail: string | null;
};

export type ConstellationProvenance = {
  surfacedBy: ConstellationProvenanceSource;
  anchorRefs: ConstellationAnchorRef[];
  sourceRefs: ConstellationSourceRef[];
  annotationIds: string[];
  researchTaskIds: string[];
};

export type ConstellationBranchAction = {
  kind: ConstellationBranchActionKind;
  label: string;
};

export type ConstellationExplorationNode = {
  id: string;
  family: ConstellationNodeFamily;
  title: string;
  summary: string;
  status: ConstellationNodeStatus;
  confidenceScore: number;
  whySurfaced: ConstellationWhySurfaced;
  provenance: ConstellationProvenance;
  isPinned: boolean;
  isSavedToWorkingSet: boolean;
  suggestedBranchActions: ConstellationBranchAction[];
};

export type ConstellationExplorationEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: ConstellationEdgeRelation;
  strength: number;
};

export type ConstellationWorkingSetItem = {
  nodeId: string;
  disposition: ConstellationWorkingSetDisposition;
  addedAt: string;
};

export type ConstellationSuggestedAction = {
  kind: ConstellationBranchActionKind;
  label: string;
  nodeId: string | null;
};

export type ConstellationExplorationGraph = {
  id: string;
  noteId: string;
  generatedAt: string;
  seedNodeId: string;
  nodes: ConstellationExplorationNode[];
  edges: ConstellationExplorationEdge[];
  workingSet: ConstellationWorkingSetItem[];
  suggestedActions: ConstellationSuggestedAction[];
};
