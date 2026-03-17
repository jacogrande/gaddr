import type { GadflyAnnotation } from "./types";

export type ConstellationBuildInput = {
  noteId: string;
  docVersion: number;
  title: string | null;
  plainText: string;
  annotations: readonly GadflyAnnotation[];
  generatedAt: string;
  boardId: string;
};

export type ConstellationNodeFamily =
  | "seed"
  | "theme"
  | "question"
  | "counterargument"
  | "evidence"
  | "source"
  | "research_task"
  | "response";

export type ConstellationNodeStatus =
  | "active"
  | "pinned"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export type ConstellationEdgeRelation =
  | "branches_into"
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

export type ConstellationVerdict =
  | "unverified"
  | "supported"
  | "mixed"
  | "contradicted"
  | "not_applicable";

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
  "branches_into",
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
  isUsedInDraft: boolean;
  generatedFromAction: ConstellationBranchActionKind | null;
  suggestedBranchActions: ConstellationBranchAction[];
};

export type ConstellationExplorationEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: ConstellationEdgeRelation;
  strength: number;
  isStructural: boolean;
};

export type ConstellationWorkingSetItem = {
  nodeId: string;
  disposition: ConstellationWorkingSetDisposition;
  addedAt: string;
  order: number | null;
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
