import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import { err, ok } from "../types/result";
import type { GadflyResearchVerdict } from "./types";
import type {
  ConstellationAnchorRef,
  ConstellationBranchAction,
  ConstellationBranchActionKind,
  ConstellationBuildInput,
  ConstellationEdgeRelation,
  ConstellationExplorationEdge,
  ConstellationExplorationGraph,
  ConstellationExplorationNode,
  ConstellationNodeFamily,
  ConstellationProvenance,
  ConstellationSourceRef,
  ConstellationSuggestedAction,
  ConstellationVerdict,
  ConstellationWhySurfaced,
} from "./constellation-types";

const EXCERPT_MAX_LENGTH = 200;

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

const GADFLY_RESEARCH_TO_CONSTELLATION: Record<
  GadflyResearchVerdict,
  ConstellationVerdict
> = {
  unverified: "unverified",
  supported: "supported",
  mixed: "mixed",
  contradicted: "contradicted",
};

type ExpandConstellationExplorationGraphInput = {
  graph: ConstellationExplorationGraph;
  originNodeId: string;
  actionKind: ConstellationBranchActionKind;
  generatedAt?: string;
};

type BuildAnnotation = ConstellationBuildInput["annotations"][number];
type ThemeAnnotationBucket = {
  anchorRefs: ConstellationAnchorRef[];
  annotations: BuildAnnotation[];
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

type MockThemeNodeTemplate = {
  family: Exclude<ConstellationNodeFamily, "seed" | "theme">;
  title: string;
  summary: string;
  confidenceScore: number;
  verdict: ConstellationVerdict;
};

type MockThemeTemplate = {
  title: string;
  summary: string;
  confidenceScore: number;
  strengthScore: number;
  nodes: MockThemeNodeTemplate[];
};

const MOCK_THEME_TEMPLATES: readonly MockThemeTemplate[] = [
  {
    title: "Central Argument Tension",
    summary: "The draft’s core claim opens a strong path, but its strongest pressure points still need to be surfaced and understood.",
    confidenceScore: 0.78,
    strengthScore: 0.82,
    nodes: [
      {
        family: "counterargument",
        title: "Contradictory premises",
        summary: "Two foundational claims pull in opposite directions without acknowledgment.",
        confidenceScore: 0.82,
        verdict: "not_applicable",
      },
      {
        family: "question",
        title: "Which framing wins?",
        summary: "If both framings are valid, what principle decides between them?",
        confidenceScore: 0.7,
        verdict: "not_applicable",
      },
      {
        family: "evidence",
        title: "Promising opening support",
        summary: "The freewrite already contains a useful supporting observation worth strengthening.",
        confidenceScore: 0.88,
        verdict: "supported",
      },
    ],
  },
  {
    title: "Evidence Gaps",
    summary: "Several lines feel promising, but they still need credible support before they should move toward a first draft.",
    confidenceScore: 0.65,
    strengthScore: 0.68,
    nodes: [
      {
        family: "counterargument",
        title: "Unsupported statistic",
        summary: "A numerical claim appears without citation or source context.",
        confidenceScore: 0.6,
        verdict: "unverified",
      },
      {
        family: "counterargument",
        title: "Source mismatch",
        summary: "The cited study addresses a different population than the draft implies.",
        confidenceScore: 0.72,
        verdict: "mixed",
      },
      {
        family: "source",
        title: "Relevant background research",
        summary: "A recent meta-analysis could deepen this branch before drafting.",
        confidenceScore: 0.8,
        verdict: "supported",
      },
      {
        family: "question",
        title: "What evidence would convince?",
        summary: "Clarifying the standard of proof would sharpen the branch.",
        confidenceScore: 0.68,
        verdict: "not_applicable",
      },
    ],
  },
  {
    title: "Audience & Framing",
    summary: "The draft has multiple possible audiences, and the argument shifts tone depending on which reader it seems to imagine.",
    confidenceScore: 0.72,
    strengthScore: 0.61,
    nodes: [
      {
        family: "counterargument",
        title: "Tone inconsistency",
        summary: "Formal analysis alternates with casual asides, weakening authority.",
        confidenceScore: 0.75,
        verdict: "not_applicable",
      },
      {
        family: "question",
        title: "Who is this for?",
        summary: "Defining the reader would resolve competing levels of detail.",
        confidenceScore: 0.65,
        verdict: "not_applicable",
      },
      {
        family: "response",
        title: "Implicit expertise assumption",
        summary: "Several passages assume knowledge the general reader likely lacks.",
        confidenceScore: 0.7,
        verdict: "not_applicable",
      },
    ],
  },
  {
    title: "Counterargument Surface",
    summary: "The draft points toward debate, but the strongest outside objections still need to be explored before drafting.",
    confidenceScore: 0.58,
    strengthScore: 0.57,
    nodes: [
      {
        family: "counterargument",
        title: "Strongest objection unaddressed",
        summary: "The most common counter-position is not mentioned at all.",
        confidenceScore: 0.55,
        verdict: "not_applicable",
      },
      {
        family: "counterargument",
        title: "Missing steelman",
        summary: "The opposing view is caricatured rather than presented at its strongest.",
        confidenceScore: 0.62,
        verdict: "not_applicable",
      },
      {
        family: "question",
        title: "What would change your mind?",
        summary: "Stating the conditions for revision would demonstrate intellectual honesty.",
        confidenceScore: 0.7,
        verdict: "not_applicable",
      },
      {
        family: "source",
        title: "Opposing research trail",
        summary: "Published work directly challenges the central claim with empirical data.",
        confidenceScore: 0.78,
        verdict: "contradicted",
      },
    ],
  },
  {
    title: "Source Reliability",
    summary: "The draft’s research direction is promising, but trust will depend on recency, fit, and source quality.",
    confidenceScore: 0.6,
    strengthScore: 0.52,
    nodes: [
      {
        family: "counterargument",
        title: "Outdated primary source",
        summary: "The main reference predates significant developments in the field.",
        confidenceScore: 0.65,
        verdict: "mixed",
      },
      {
        family: "source",
        title: "Stronger alternative available",
        summary: "A more recent and more cited study covers the same ground.",
        confidenceScore: 0.82,
        verdict: "supported",
      },
      {
        family: "question",
        title: "Is recency relevant here?",
        summary: "Some claims are time-invariant; others depend on current data.",
        confidenceScore: 0.72,
        verdict: "not_applicable",
      },
    ],
  },
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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function buildAnchorRefs(input: ConstellationBuildInput): ConstellationAnchorRef[] {
  return input.annotations.map((annotation) => ({
    annotationId: annotation.id,
    from: annotation.anchor.from,
    to: annotation.anchor.to,
    quote: annotation.anchor.quote,
  }));
}

function buildSeedSummary(input: ConstellationBuildInput): string {
  const trimmedText = input.plainText.trim();
  const excerpt = truncateText(trimmedText, EXCERPT_MAX_LENGTH);
  const wordCount = trimmedText.split(/\s+/).length;
  return `${excerpt} (${String(wordCount)} words)`;
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

function buildThemeWhySurfaced(anchorRefs: readonly ConstellationAnchorRef[]): ConstellationWhySurfaced {
  if (anchorRefs.length > 0) {
    return {
      label: "Clustered from anchored draft spans",
      detail: "This theme is grounded in specific parts of the freewrite that already carry analytical weight.",
    };
  }

  return {
    label: "Clustered from the freewrite’s strongest exploratory directions",
    detail: "This theme is a mocked preview of how the assistant could organize promising branches after the sprint.",
  };
}

function buildNodeWhySurfaced(
  family: Exclude<ConstellationNodeFamily, "seed" | "theme">,
  hasAnchors: boolean,
  hasSources: boolean,
  fallbackSummary: string,
): ConstellationWhySurfaced {
  if (hasAnchors) {
    return {
      label: "Surfaced from anchored draft text",
      detail: fallbackSummary,
    };
  }

  if (hasSources) {
    return {
      label: "Surfaced from attached research results",
      detail: fallbackSummary,
    };
  }

  switch (family) {
    case "counterargument":
      return {
        label: "Generated to pressure-test this line of reasoning",
        detail: fallbackSummary,
      };
    case "evidence":
      return {
        label: "Generated to strengthen this branch with support",
        detail: fallbackSummary,
      };
    case "question":
      return {
        label: "Generated to deepen the inquiry",
        detail: fallbackSummary,
      };
    case "source":
      return {
        label: "Generated to extend the research trail",
        detail: fallbackSummary,
      };
    case "research_task":
      return {
        label: "Generated to turn open questions into next research steps",
        detail: fallbackSummary,
      };
    case "response":
      return {
        label: "Generated to sketch a response path the user could develop later",
        detail: fallbackSummary,
      };
  }
}

function buildSeedNode(input: ConstellationBuildInput): ConstellationExplorationNode {
  const anchorRefs = buildAnchorRefs(input);

  return {
    id: `${input.boardId}:seed`,
    family: "seed",
    title: input.title ?? "Freewrite seed",
    summary: buildSeedSummary(input),
    status: "active",
    confidenceScore: 1,
    whySurfaced: {
      label: "Seed created from the user freewrite",
      detail: truncateText(input.plainText.trim(), EXCERPT_MAX_LENGTH),
    },
    provenance: buildProvenance("draft", anchorRefs, []),
    isPinned: false,
    isSavedToWorkingSet: false,
    isUsedInDraft: false,
    generatedFromAction: null,
    suggestedBranchActions: branchActionsForFamily("seed"),
  };
}

function buildThemeNode(
  input: ConstellationBuildInput,
  template: MockThemeTemplate,
  themeIndex: number,
  anchorRefs: readonly ConstellationAnchorRef[],
): ConstellationExplorationNode {
  return {
    id: `${input.boardId}:theme-${String(themeIndex)}`,
    family: "theme",
    title: template.title,
    summary: template.summary,
    status: "active",
    confidenceScore: template.confidenceScore,
    whySurfaced: buildThemeWhySurfaced(anchorRefs),
    provenance: buildProvenance(anchorRefs.length > 0 ? "annotation" : "mock", anchorRefs, []),
    isPinned: false,
    isSavedToWorkingSet: false,
    isUsedInDraft: false,
    generatedFromAction: null,
    suggestedBranchActions: branchActionsForFamily("theme"),
  };
}

function buildAnnotationAnchorRef(annotation: BuildAnnotation): ConstellationAnchorRef {
  return {
    annotationId: annotation.id,
    from: annotation.anchor.from,
    to: annotation.anchor.to,
    quote: annotation.anchor.quote,
  };
}

function annotationHasSourceTrail(annotation: BuildAnnotation): boolean {
  return annotation.research.tasks.some((task) => (task.result?.sources.length ?? 0) > 0);
}

function selectThemeCandidatesForAnnotation(annotation: BuildAnnotation): number[] {
  const baseCandidates = (() => {
    switch (annotation.category) {
      case "evidence":
        return [1];
      case "tone":
        return [2];
      case "logic":
        return [0, 3];
      case "structure":
        return [0, 3];
      case "clarity":
        return [0, 2];
    }
  })();

  const hasResearchPressure =
    annotation.research.needsFactCheck ||
    annotation.research.tasks.some((task) => task.kind === "fact_check" || task.kind === "context") ||
    annotationHasSourceTrail(annotation);

  if (!hasResearchPressure) {
    return baseCandidates;
  }

  return [...new Set([4, ...baseCandidates])];
}

function buildTemplateNode(
  themeNode: ConstellationExplorationNode,
  nodeIndex: number,
  template: MockThemeNodeTemplate,
): ConstellationExplorationNode {
  const sourceRefs =
    template.family === "source" || template.family === "evidence"
      ? [buildMockSourceRef(themeNode, `${themeNode.id}-node-${String(nodeIndex + 1)}`, template.verdict)]
      : [];

  return {
    id: `${themeNode.id}:node-${String(nodeIndex)}`,
    family: template.family,
    title: template.title,
    summary: template.summary,
    status: "active",
    confidenceScore: template.confidenceScore,
    whySurfaced: buildNodeWhySurfaced(
      template.family,
      false,
      sourceRefs.length > 0,
      template.summary,
    ),
    provenance: buildProvenance(sourceRefs.length > 0 ? "research" : "mock", [], sourceRefs),
    isPinned: false,
    isSavedToWorkingSet: false,
    isUsedInDraft: false,
    generatedFromAction: null,
    suggestedBranchActions: branchActionsForFamily(template.family),
  };
}

function mapAnnotationToFamily(
  annotation: BuildAnnotation,
): Exclude<ConstellationNodeFamily, "seed" | "theme"> {
  if (annotation.research.needsFactCheck) {
    return "research_task";
  }

  if (annotation.prompts.some((prompt) => prompt.kind === "followup_question")) {
    return "question";
  }

  if (annotation.category === "logic" || annotation.category === "evidence") {
    return "counterargument";
  }

  return "response";
}

function buildAnnotationSourceRefs(
  annotation: BuildAnnotation,
  nodeId: string,
): ConstellationSourceRef[] {
  const sourceRefs: ConstellationSourceRef[] = [];

  for (const task of annotation.research.tasks) {
    if (!task.result) {
      continue;
    }

    for (const source of task.result.sources) {
      sourceRefs.push({
        sourceId: `${nodeId}:source:${source.url}`,
        researchTaskId: task.id,
        title: source.title,
        url: source.url,
        domain: source.domain,
        pageAge: source.pageAge,
        snippet: null,
        relevanceScore: 0.7,
        verdict: GADFLY_RESEARCH_TO_CONSTELLATION[task.result.verdict],
      });
    }
  }

  return sourceRefs;
}

function buildAnnotationNode(
  themeNode: ConstellationExplorationNode,
  annotation: BuildAnnotation,
): ConstellationExplorationNode {
  const family = mapAnnotationToFamily(annotation);
  const anchorRef = buildAnnotationAnchorRef(annotation);
  const sourceRefs = buildAnnotationSourceRefs(annotation, `${themeNode.id}:annotation:${annotation.id}`);
  const surfacedBy = sourceRefs.length > 0 ? "research" : "annotation";

  return {
    id: `${themeNode.id}:annotation:${annotation.id}`,
    family,
    title: truncateText(annotation.explanation, 60),
    summary: annotation.explanation,
    status: annotation.isPinned ? "pinned" : "active",
    confidenceScore: 0.7,
    whySurfaced: buildNodeWhySurfaced(family, true, sourceRefs.length > 0, annotation.explanation),
    provenance: buildProvenance(surfacedBy, [anchorRef], sourceRefs),
    isPinned: annotation.isPinned,
    isSavedToWorkingSet: false,
    isUsedInDraft: false,
    generatedFromAction: null,
    suggestedBranchActions: branchActionsForFamily(family),
  };
}

function buildThemeStructure(input: ConstellationBuildInput): {
  themes: ConstellationExplorationNode[];
  themeChildren: Map<string, ConstellationExplorationNode[]>;
} {
  const annotationBuckets: ThemeAnnotationBucket[] = MOCK_THEME_TEMPLATES.map(() => ({
    anchorRefs: [],
    annotations: [],
  }));
  const allocationCountByCandidateSet = new Map<string, number>();

  for (const annotation of input.annotations) {
    const candidateIndices = selectThemeCandidatesForAnnotation(annotation);
    const allocationKey = candidateIndices.join(":");
    const currentAllocationCount = allocationCountByCandidateSet.get(allocationKey) ?? 0;
    const themeIndex =
      candidateIndices[currentAllocationCount % candidateIndices.length] ?? 0;
    allocationCountByCandidateSet.set(allocationKey, currentAllocationCount + 1);

    const bucket = annotationBuckets[themeIndex] ?? annotationBuckets[0];
    if (!bucket) {
      continue;
    }
    bucket.anchorRefs.push(buildAnnotationAnchorRef(annotation));
    bucket.annotations.push(annotation);
  }

  const themes: Array<{
    node: ConstellationExplorationNode;
    children: ConstellationExplorationNode[];
    strengthScore: number;
  }> = [];

  for (const [themeIndex, template] of MOCK_THEME_TEMPLATES.entries()) {
    const bucket = annotationBuckets[themeIndex] ?? annotationBuckets[0];
    if (!bucket) {
      continue;
    }
    const anchorRefs = bucket.anchorRefs;
    const themeNode = buildThemeNode(input, template, themeIndex, anchorRefs);
    const templateNodes = template.nodes.map((node, nodeIndex) => buildTemplateNode(themeNode, nodeIndex, node));

    for (const annotation of bucket.annotations) {
      templateNodes.push(buildAnnotationNode(themeNode, annotation));
    }

    themes.push({
      node: themeNode,
      children: templateNodes,
      strengthScore: template.strengthScore,
    });
  }

  themes.sort((left, right) => right.strengthScore - left.strengthScore);

  return {
    themes: themes.map((item) => item.node),
    themeChildren: new Map(themes.map((item) => [item.node.id, item.children])),
  };
}

function buildThemeCrossLinks(
  graphId: string,
  themeId: string,
  nodes: readonly ConstellationExplorationNode[],
): ConstellationExplorationEdge[] {
  const objections = nodes.filter((node) => node.family === "counterargument");
  const supportNodes = nodes.filter((node) => node.family === "evidence" || node.family === "response");
  const edges: ConstellationExplorationEdge[] = [];
  let edgeIndex = 0;

  for (const objection of objections) {
    for (const supportNode of supportNodes) {
      edgeIndex += 1;
      edges.push({
        id: `${graphId}:cross-link:${themeId}:${String(edgeIndex)}`,
        fromNodeId: objection.id,
        toNodeId: supportNode.id,
        relation: supportNode.family === "response" ? "responds_to" : "contradicts",
        strength: (objection.confidenceScore + supportNode.confidenceScore) / 2,
        isStructural: false,
      });
    }
  }

  return edges;
}

export function buildConstellationExplorationGraph(
  input: ConstellationBuildInput,
): Result<ConstellationExplorationGraph, ValidationError> {
  if (input.plainText.trim().length === 0) {
    return err({
      kind: "ValidationError",
      message: "Cannot build constellation graph for empty text",
      field: "plainText",
    });
  }

  const seedNode = buildSeedNode(input);
  const { themes, themeChildren } = buildThemeStructure(input);
  const childNodes = themes.flatMap((theme) => themeChildren.get(theme.id) ?? []);

  const overviewEdges: ConstellationExplorationEdge[] = themes.map((theme, index) => ({
    id: `${input.boardId}:overview-edge:${String(index + 1)}`,
    fromNodeId: seedNode.id,
    toNodeId: theme.id,
    relation: "branches_into",
    strength: theme.confidenceScore,
    isStructural: true,
  }));

  const themeEdges: ConstellationExplorationEdge[] = themes.flatMap((theme) =>
    (themeChildren.get(theme.id) ?? []).map((node, index) => ({
      id: `${input.boardId}:theme-edge:${theme.id}:${String(index + 1)}`,
      fromNodeId: theme.id,
      toNodeId: node.id,
      relation: relationForExplorationFamily(node.family, node.provenance.sourceRefs[0]?.verdict ?? "supported"),
      strength: node.confidenceScore,
      isStructural: true,
    })),
  );

  const crossLinks = themes.flatMap((theme) =>
    buildThemeCrossLinks(input.boardId, theme.id, themeChildren.get(theme.id) ?? []),
  );

  return ok({
    id: input.boardId,
    noteId: input.noteId,
    generatedAt: input.generatedAt,
    seedNodeId: seedNode.id,
    nodes: [seedNode, ...themes, ...childNodes],
    edges: [...overviewEdges, ...themeEdges, ...crossLinks],
    workingSet: [],
    suggestedActions: DEFAULT_GRAPH_ACTIONS.map((kind) => buildSuggestedAction(kind, seedNode.id)),
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
          summary: "A skeptical source thread the user could inspect before accepting this branch at face value.",
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
          summary: "This branch now has a more concrete supporting point that the user could eventually turn into draft material.",
          confidenceScore: 0.78,
          whyLabel: "Generated to strengthen the current line of reasoning",
          whyDetail: `Mock AI searched for evidence that could better support ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "supporting-evidence", "supported")],
        },
        {
          family: "source",
          title: `Supporting source for ${originNode.title}`,
          summary: "A plausible source artifact attached to the stronger-evidence branch for deeper inspection.",
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
          summary: "A follow-up question that exposes what still needs to be understood before this branch is ready for drafting.",
          confidenceScore: 0.64,
          whyLabel: "Generated to deepen the inquiry",
          whyDetail: `Mock AI pushed beyond the first layer of reasoning around ${originNode.title}.`,
        },
        {
          family: "research_task",
          title: `Research task for ${originNode.title}`,
          summary: "A concrete next research step the assistant could eventually run to answer the deeper question.",
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
          summary: "A second-hop source summary that extends the current research trail instead of restarting it.",
          confidenceScore: 0.68,
          whyLabel: "Generated to continue the source trail",
          whyDetail: `Mock AI followed the current source path outward from ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "follow-source", "supported")],
        },
        {
          family: "evidence",
          title: `Extracted finding from ${originNode.title}`,
          summary: "A finding pulled out of the followed source so the map grows as argument material, not just links.",
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
          summary: "A draftable answer that directly addresses the counterargument without pretending the objection disappears.",
          confidenceScore: 0.71,
          whyLabel: "Generated to answer the current objection",
          whyDetail: `Mock AI developed a response path after examining ${originNode.title}.`,
          sourceRefs: [buildMockSourceRef(originNode, "response-path", "mixed")],
        },
        {
          family: "evidence",
          title: `Evidence backing the response to ${originNode.title}`,
          summary: "Supporting material that would make the response more credible if the user pulls it into a draft later.",
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
    relation: relationForExplorationFamily(
      node.family,
      node.provenance.sourceRefs[0]?.verdict ?? "supported",
    ),
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
