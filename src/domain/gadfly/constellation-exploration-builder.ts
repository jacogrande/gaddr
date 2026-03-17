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

type ExpandConstellationExplorationGraphInput = {
  graph: ConstellationExplorationGraph;
  originNodeId: string;
  actionKind: ConstellationBranchActionKind;
  generatedAt?: string;
};

type MockBranchNodeSpec = {
  family: Exclude<ConstellationNodeFamily, "seed" | "theme">;
  title: string;
  summary: string;
  confidenceScore: number;
  whyLabel: string;
  whyDetail: string;
  sourceRefs?: ConstellationSourceRef[];
};

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

function buildMockSourceRef(
  node: Pick<ConstellationExplorationNode, "id" | "title">,
  suffix: string,
  verdict: ConstellationVerdict = "supported",
): ConstellationSourceRef {
  const slug = `${node.id}-${suffix}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return {
    sourceId: `${slug}:source`,
    researchTaskId: `${slug}:research-task`,
    title: `${node.title} · ${suffix.replaceAll("_", " ")}`,
    url: `https://research.mock/${slug}`,
    domain: "research.mock",
    pageAge: "2026-03",
    snippet: `Mock research trail generated while exploring ${node.title}.`,
    relevanceScore: 0.82,
    verdict,
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
    isUsedInDraft: false,
    generatedFromAction: null,
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
    isUsedInDraft: false,
    generatedFromAction: null,
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
    isUsedInDraft: false,
    generatedFromAction: null,
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
    relation: "branches_into",
    strength: theme.leverageScore,
    isStructural: true,
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
    isStructural: true,
  }));

  const legacyEdges: ConstellationExplorationEdge[] = board.edges
    .filter((edge) => edge.fromNodeId !== "draft")
    .map((edge) => ({
      id: `${board.id}:explore-edge:legacy:${edge.id}`,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      relation: edge.kind === "challenges" ? "contradicts" : "supports",
      strength: edge.strength,
      isStructural: false,
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

function buildMockBranchSpecs(
  originNode: ConstellationExplorationNode,
  actionKind: ConstellationBranchActionKind,
): MockBranchNodeSpec[] {
  switch (actionKind) {
    case "find_strongest_objection":
      return [
        {
          family: "counterargument",
          title: `Tough objection to ${originNode.title}`,
          summary: `A stronger skeptic could argue that ${originNode.summary.toLowerCase()} still leaves a major unresolved weakness.`,
          confidenceScore: 0.66,
          whyLabel: "Generated to pressure-test the current branch",
          whyDetail: `Mock AI explored the strongest objection it could surface against ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "strongest-objection", "mixed")],
        },
        {
          family: "source",
          title: `Critical source on ${originNode.title}`,
          summary: `A skeptical source thread the user could inspect before accepting this branch at face value.`,
          confidenceScore: 0.61,
          whyLabel: "Generated to ground the objection in outside material",
          whyDetail: `Mock AI attached a source trail that challenges ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "critical-source", "contradicted")],
        },
      ];
    case "find_stronger_evidence":
      return [
        {
          family: "evidence",
          title: `Stronger support for ${originNode.title}`,
          summary: `This branch now has a more concrete supporting point that the user could eventually turn into draft material.`,
          confidenceScore: 0.78,
          whyLabel: "Generated to strengthen the current line of reasoning",
          whyDetail: `Mock AI searched for evidence that could better support ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "supporting-evidence", "supported")],
        },
        {
          family: "source",
          title: `Supporting source for ${originNode.title}`,
          summary: `A plausible source artifact attached to the stronger-evidence branch for deeper inspection.`,
          confidenceScore: 0.74,
          whyLabel: "Generated to trace where the stronger evidence could come from",
          whyDetail: `Mock AI paired the evidence branch with a source summary for ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "supporting-source", "supported")],
        },
      ];
    case "ask_deeper_question":
      return [
        {
          family: "question",
          title: `Deeper question behind ${originNode.title}`,
          summary: `A follow-up question that exposes what still needs to be understood before this branch is ready for drafting.`,
          confidenceScore: 0.64,
          whyLabel: "Generated to deepen the inquiry",
          whyDetail: `Mock AI pushed beyond the first layer of reasoning around ${originNode.title}.`,
        },
        {
          family: "research_task",
          title: `Research task for ${originNode.title}`,
          summary: `A concrete next research step the assistant could eventually run to answer the deeper question.`,
          confidenceScore: 0.58,
          whyLabel: "Generated to turn the question into a research step",
          whyDetail: `Mock AI converted the deeper question into a research task linked to ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "deeper-question-task", "unverified")],
        },
      ];
    case "follow_source":
      return [
        {
          family: "source",
          title: `Follow-on source from ${originNode.title}`,
          summary: `A second-hop source summary that extends the current research trail instead of restarting it.`,
          confidenceScore: 0.68,
          whyLabel: "Generated to continue the source trail",
          whyDetail: `Mock AI followed the current source path outward from ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "follow-source", "supported")],
        },
        {
          family: "evidence",
          title: `Extracted finding from ${originNode.title}`,
          summary: `A finding pulled out of the followed source so the map grows as argument material, not just links.`,
          confidenceScore: 0.7,
          whyLabel: "Generated to capture the next useful takeaway",
          whyDetail: `Mock AI extracted a usable finding after following the source from ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "follow-source-finding", "supported")],
        },
      ];
    case "respond_to_counterargument":
      return [
        {
          family: "response",
          title: `Response to ${originNode.title}`,
          summary: `A draftable answer that directly addresses the counterargument without pretending the objection disappears.`,
          confidenceScore: 0.71,
          whyLabel: "Generated to answer the current objection",
          whyDetail: `Mock AI developed a response path after examining ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "response-path", "mixed")],
        },
        {
          family: "evidence",
          title: `Evidence backing the response to ${originNode.title}`,
          summary: `Supporting material that would make the response more credible if the user pulls it into a draft later.`,
          confidenceScore: 0.69,
          whyLabel: "Generated to support the new response path",
          whyDetail: `Mock AI paired the response with evidence that could help rebut ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "response-evidence", "supported")],
        },
      ];
  }
}

function buildGeneratedNode(
  graph: ConstellationExplorationGraph,
  originNode: ConstellationExplorationNode,
  actionKind: ConstellationBranchActionKind,
  spec: MockBranchNodeSpec,
  index: number,
): ConstellationExplorationNode {
  const nodeId = `${graph.id}:branch:${originNode.id}:${actionKind}:${String(index + 1)}:${String(graph.nodes.length + index + 1)}`;

  return {
    id: nodeId,
    family: spec.family,
    title: spec.title,
    summary: spec.summary,
    status: "active",
    confidenceScore: spec.confidenceScore,
    whySurfaced: {
      label: spec.whyLabel,
      detail: spec.whyDetail,
    },
    provenance: buildProvenance("mock", [], spec.sourceRefs ?? []),
    isPinned: false,
    isSavedToWorkingSet: false,
    isUsedInDraft: false,
    generatedFromAction: actionKind,
    suggestedBranchActions: branchActionsForFamily(spec.family),
  };
}

export function expandConstellationExplorationGraph({
  graph,
  originNodeId,
  actionKind,
  generatedAt,
}: ExpandConstellationExplorationGraphInput): ConstellationExplorationGraph {
  const originNode = graph.nodes.find((node) => node.id === originNodeId);
  if (!originNode) {
    return graph;
  }

  const generatedNodes = buildMockBranchSpecs(originNode, actionKind).map((spec, index) =>
    buildGeneratedNode(graph, originNode, actionKind, spec, index),
  );

  const generatedEdges: ConstellationExplorationEdge[] = generatedNodes.map((node, index) => ({
    id: `${graph.id}:branch-edge:${originNode.id}:${actionKind}:${String(index + 1)}:${node.id}`,
    fromNodeId: originNode.id,
    toNodeId: node.id,
    relation: relationForExplorationFamily(node.family, "supported"),
    strength: node.confidenceScore,
    isStructural: true,
  }));

  return {
    ...graph,
    generatedAt: generatedAt ?? graph.generatedAt,
    nodes: [...graph.nodes, ...generatedNodes],
    edges: [...graph.edges, ...generatedEdges],
  };
}
