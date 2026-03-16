import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import { ok } from "../types/result";
import {
  buildConstellationBoard,
  type ConstellationBuildInput,
} from "./constellation-builder";
import type {
  ConstellationAnchorRef,
  ConstellationBranchAction,
  ConstellationBranchActionKind,
  ConstellationEdgeRelation,
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
  ConstellationNode,
  ConstellationNodeFamily,
  ConstellationProvenance,
  ConstellationSourceRef,
  ConstellationSuggestedAction,
  ConstellationTheme,
  ConstellationWhySurfaced,
  ConstellationVerdict,
} from "./constellation-types";

const BRANCH_ACTION_LABELS: Record<ConstellationBranchActionKind, string> = {
  find_strongest_objection: "Find strongest objection",
  find_stronger_evidence: "Find stronger evidence",
  ask_deeper_question: "Ask a deeper question",
  follow_source: "Follow this source",
  respond_to_counterargument: "Respond to this counterargument",
};

const DEFAULT_GRAPH_ACTIONS: readonly ConstellationBranchActionKind[] = [
  "find_strongest_objection",
  "find_stronger_evidence",
  "ask_deeper_question",
  "follow_source",
  "respond_to_counterargument",
];

function buildBranchAction(kind: ConstellationBranchActionKind): ConstellationBranchAction {
  return {
    kind,
    label: BRANCH_ACTION_LABELS[kind],
  };
}

function buildSuggestedAction(
  kind: ConstellationBranchActionKind,
  nodeId: string,
): ConstellationSuggestedAction {
  return {
    kind,
    label: BRANCH_ACTION_LABELS[kind],
    nodeId,
  };
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function buildProvenance(
  surfacedBy: ConstellationProvenance["surfacedBy"],
  anchorRefs: readonly ConstellationAnchorRef[],
  sourceRefs: readonly ConstellationSourceRef[],
): ConstellationProvenance {
  return {
    surfacedBy,
    anchorRefs: [...anchorRefs],
    sourceRefs: [...sourceRefs],
    annotationIds: uniqueStrings(anchorRefs.map((ref) => ref.annotationId)),
    researchTaskIds: uniqueStrings(sourceRefs.map((ref) => ref.researchTaskId)),
  };
}

function buildThemeWhySurfaced(theme: ConstellationTheme): ConstellationWhySurfaced {
  if (theme.anchorRefs.length > 0) {
    return {
      label: "Theme emerged from anchored draft spans",
      detail: theme.summary,
    };
  }

  return {
    label: "Theme scaffolded from the current constellation prototype model",
    detail: theme.summary,
  };
}

function explorationFamilyForLegacyNode(node: ConstellationNode): ConstellationNodeFamily {
  switch (node.kind) {
    case "question":
      return "question";
    case "source":
      return "source";
    case "support":
      return "evidence";
    case "claim":
      return "response";
    case "challenge":
    case "gap":
      return "counterargument";
  }
}

function relationForExplorationFamily(
  family: ConstellationNodeFamily,
  verdict: ConstellationVerdict,
): ConstellationEdgeRelation {
  switch (family) {
    case "question":
      return "questions";
    case "source":
      return "derived_from";
    case "response":
      return "responds_to";
    case "evidence":
      return verdict === "contradicted" ? "contradicts" : "supports";
    case "counterargument":
      return "contradicts";
    case "research_task":
      return "expands";
    case "seed":
    case "theme":
      return "expands";
  }
}

function branchActionsForFamily(family: ConstellationNodeFamily): ConstellationBranchAction[] {
  switch (family) {
    case "seed":
    case "theme":
      return [
        buildBranchAction("find_strongest_objection"),
        buildBranchAction("find_stronger_evidence"),
        buildBranchAction("ask_deeper_question"),
      ];
    case "question":
      return [
        buildBranchAction("ask_deeper_question"),
        buildBranchAction("find_stronger_evidence"),
      ];
    case "counterargument":
      return [
        buildBranchAction("respond_to_counterargument"),
        buildBranchAction("find_stronger_evidence"),
      ];
    case "evidence":
      return [
        buildBranchAction("find_strongest_objection"),
        buildBranchAction("ask_deeper_question"),
      ];
    case "source":
      return [
        buildBranchAction("follow_source"),
        buildBranchAction("find_stronger_evidence"),
      ];
    case "response":
      return [
        buildBranchAction("find_strongest_objection"),
        buildBranchAction("find_stronger_evidence"),
      ];
    case "research_task":
      return [
        buildBranchAction("follow_source"),
        buildBranchAction("ask_deeper_question"),
      ];
  }
}

function buildNodeWhySurfaced(node: ConstellationNode, family: ConstellationNodeFamily): ConstellationWhySurfaced {
  if (node.anchorRefs.length > 0) {
    return {
      label: "Surfaced from anchored draft text",
      detail: node.summary,
    };
  }

  if (node.sourceRefs.length > 0) {
    return {
      label: "Surfaced from attached research results",
      detail: node.summary,
    };
  }

  switch (family) {
    case "counterargument":
      return {
        label: "Counterargument scaffolded from the current prototype model",
        detail: node.summary,
      };
    case "evidence":
      return {
        label: "Evidence scaffolded from the current prototype model",
        detail: node.summary,
      };
    case "question":
      return {
        label: "Question scaffolded from the current prototype model",
        detail: node.summary,
      };
    case "source":
      return {
        label: "Source scaffolded from the current prototype model",
        detail: node.summary,
      };
    case "response":
      return {
        label: "Response scaffolded from the current prototype model",
        detail: node.summary,
      };
    case "seed":
    case "theme":
    case "research_task":
      return {
        label: "Exploration node scaffolded from the current prototype model",
        detail: node.summary,
      };
  }
}

function surfacedByForLegacyNode(node: ConstellationNode): ConstellationProvenance["surfacedBy"] {
  if (node.sourceRefs.length > 0) {
    return "research";
  }

  if (node.anchorRefs.length > 0) {
    return "annotation";
  }

  return "mock";
}

function buildThemeNode(theme: ConstellationTheme): ConstellationExplorationNode {
  const surfacedBy = theme.anchorRefs.length > 0 ? "annotation" : "mock";

  return {
    id: theme.id,
    family: "theme",
    title: theme.title,
    summary: theme.summary,
    status: theme.status === "dismissed" ? "dismissed" : "active",
    confidenceScore: theme.confidenceScore,
    whySurfaced: buildThemeWhySurfaced(theme),
    provenance: buildProvenance(surfacedBy, theme.anchorRefs, []),
    isPinned: false,
    isSavedToWorkingSet: false,
    suggestedBranchActions: branchActionsForFamily("theme"),
  };
}

function buildLegacyMappedNode(node: ConstellationNode): ConstellationExplorationNode {
  const family = explorationFamilyForLegacyNode(node);
  const surfacedBy = surfacedByForLegacyNode(node);

  return {
    id: node.id,
    family,
    title: node.title,
    summary: node.summary,
    status: node.status,
    confidenceScore: node.confidenceScore,
    whySurfaced: buildNodeWhySurfaced(node, family),
    provenance: buildProvenance(surfacedBy, node.anchorRefs, node.sourceRefs),
    isPinned: node.status === "pinned",
    isSavedToWorkingSet: false,
    suggestedBranchActions: branchActionsForFamily(family),
  };
}

function buildSeedNode(
  boardId: string,
  draft: {
    title: string | null;
    excerpt: string;
    wordCount: number;
    anchorRefs: readonly ConstellationAnchorRef[];
  },
): ConstellationExplorationNode {
  return {
    id: `${boardId}:seed`,
    family: "seed",
    title: draft.title ?? "Freewrite seed",
    summary: `${draft.excerpt} (${String(draft.wordCount)} words)`,
    status: "active",
    confidenceScore: 1,
    whySurfaced: {
      label: "Seed created from the user freewrite",
      detail: draft.excerpt,
    },
    provenance: buildProvenance("draft", draft.anchorRefs, []),
    isPinned: false,
    isSavedToWorkingSet: false,
    suggestedBranchActions: [
      buildBranchAction("find_strongest_objection"),
      buildBranchAction("find_stronger_evidence"),
      buildBranchAction("ask_deeper_question"),
    ],
  };
}

export function buildConstellationExplorationGraph(
  input: ConstellationBuildInput,
): Result<ConstellationExplorationGraph, ValidationError> {
  const legacyBoardResult = buildConstellationBoard(input);
  if (!legacyBoardResult.ok) {
    return legacyBoardResult;
  }

  const board = legacyBoardResult.value;
  const seedNode = buildSeedNode(board.id, board.draft);
  const themeNodes = board.themes.map(buildThemeNode);
  const explorationNodes = board.nodes.map(buildLegacyMappedNode);

  const overviewEdges: ConstellationExplorationEdge[] = board.themes.map((theme) => ({
    id: `${board.id}:explore-edge:seed:${theme.id}`,
    fromNodeId: seedNode.id,
    toNodeId: theme.id,
    relation: "emerges_from",
    strength: theme.leverageScore,
  }));

  const themeEdges: ConstellationExplorationEdge[] = board.nodes.map((node) => ({
    id: `${board.id}:explore-edge:${node.themeId}:${node.id}`,
    fromNodeId: node.themeId,
    toNodeId: node.id,
    relation: relationForExplorationFamily(
      explorationFamilyForLegacyNode(node),
      node.verdict,
    ),
    strength: node.confidenceScore,
  }));

  const legacyEdges: ConstellationExplorationEdge[] = board.edges
    .filter((edge) => edge.fromNodeId !== "draft")
    .map((edge) => ({
      id: `${board.id}:explore-edge:legacy:${edge.id}`,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      relation: edge.kind === "challenges" ? "contradicts" : "supports",
      strength: edge.strength,
    }));

  return ok({
    id: board.id,
    noteId: board.noteId,
    generatedAt: board.generatedAt,
    seedNodeId: seedNode.id,
    nodes: [seedNode, ...themeNodes, ...explorationNodes],
    edges: [...overviewEdges, ...themeEdges, ...legacyEdges],
    workingSet: [],
    suggestedActions: DEFAULT_GRAPH_ACTIONS.map((kind) =>
      buildSuggestedAction(kind, seedNode.id),
    ),
  });
}
