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
