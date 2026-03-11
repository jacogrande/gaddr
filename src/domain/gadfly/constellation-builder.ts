import type { Result } from "../types/result";
import type { ValidationError } from "../types/errors";
import { ok, err } from "../types/result";
import type { GadflyAnnotation, GadflyResearchVerdict } from "./types";
import type {
  ConstellationAnchorRef,
  ConstellationBoard,
  ConstellationDraftCard,
  ConstellationEdge,
  ConstellationFilters,
  ConstellationNode,
  ConstellationNodeKind,
  ConstellationSeverity,
  ConstellationSourceRef,
  ConstellationTheme,
  ConstellationThemeCounts,
  ConstellationVerdict,
} from "./constellation-types";
import {
  CONSTELLATION_LANE_KINDS,
  CONSTELLATION_NODE_KIND_TO_LANE,
  CONSTELLATION_NODE_ROLE_ORDER,
} from "./constellation-types";

export type ConstellationBuildInput = {
  noteId: string;
  docVersion: number;
  title: string | null;
  plainText: string;
  annotations: readonly GadflyAnnotation[];
  generatedAt: string;
  boardId: string;
};

type MockThemeTemplate = {
  title: string;
  summary: string;
  draftCentrality: number;
  conflictScore: number;
  evidenceGapScore: number;
  repetitionScore: number;
  freshnessScore: number;
  confidenceScore: number;
  nodes: MockNodeTemplate[];
};

type MockNodeTemplate = {
  kind: ConstellationNodeKind;
  title: string;
  summary: string;
  severity: ConstellationSeverity;
  verdict: ConstellationVerdict;
  confidenceScore: number;
};

const EXCERPT_MAX_LENGTH = 200;

const SEVERITY_RANK: Record<ConstellationSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const GADFLY_VERDICT_TO_CONSTELLATION: Record<GadflyResearchVerdict, ConstellationVerdict> = {
  unverified: "unverified",
  supported: "supported",
  mixed: "mixed",
  contradicted: "contradicted",
};

const MOCK_THEME_TEMPLATES: readonly MockThemeTemplate[] = [
  {
    title: "Central Argument Tension",
    summary: "The core claim carries internal contradictions that weaken its persuasive force.",
    draftCentrality: 0.92,
    conflictScore: 0.74,
    evidenceGapScore: 0.35,
    repetitionScore: 0.48,
    freshnessScore: 0.30,
    confidenceScore: 0.78,
    nodes: [
      {
        kind: "challenge",
        title: "Contradictory premises",
        summary: "Two foundational claims pull in opposite directions without acknowledgment.",
        severity: "high",
        verdict: "not_applicable",
        confidenceScore: 0.82,
      },
      {
        kind: "question",
        title: "Which framing wins?",
        summary: "If both framings are valid, what principle decides between them?",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.70,
      },
      {
        kind: "support",
        title: "Strong opening claim",
        summary: "The thesis is clearly stated and anchored to a concrete observation.",
        severity: "low",
        verdict: "supported",
        confidenceScore: 0.88,
      },
    ],
  },
  {
    title: "Evidence Gaps",
    summary: "Several claims lack supporting data or cite sources that don't fully apply.",
    draftCentrality: 0.55,
    conflictScore: 0.40,
    evidenceGapScore: 0.88,
    repetitionScore: 0.25,
    freshnessScore: 0.52,
    confidenceScore: 0.65,
    nodes: [
      {
        kind: "gap",
        title: "Unsupported statistic",
        summary: "A numerical claim appears without citation or source context.",
        severity: "high",
        verdict: "unverified",
        confidenceScore: 0.60,
      },
      {
        kind: "challenge",
        title: "Source mismatch",
        summary: "The cited study addresses a different population than claimed.",
        severity: "medium",
        verdict: "mixed",
        confidenceScore: 0.72,
      },
      {
        kind: "source",
        title: "Relevant background research",
        summary: "A recent meta-analysis covers the topic but was not referenced.",
        severity: "low",
        verdict: "supported",
        confidenceScore: 0.80,
      },
      {
        kind: "question",
        title: "What evidence would convince?",
        summary: "Clarifying the standard of proof would sharpen the argument.",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.68,
      },
    ],
  },
  {
    title: "Audience & Framing",
    summary: "The intended audience is unclear, causing tone and complexity to shift unpredictably.",
    draftCentrality: 0.60,
    conflictScore: 0.30,
    evidenceGapScore: 0.22,
    repetitionScore: 0.65,
    freshnessScore: 0.40,
    confidenceScore: 0.72,
    nodes: [
      {
        kind: "challenge",
        title: "Tone inconsistency",
        summary: "Formal analysis alternates with casual asides, weakening authority.",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.75,
      },
      {
        kind: "question",
        title: "Who is this for?",
        summary: "Defining the reader would resolve competing levels of detail.",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.65,
      },
      {
        kind: "claim",
        title: "Implicit expertise assumption",
        summary: "Several passages assume knowledge the general reader likely lacks.",
        severity: "low",
        verdict: "not_applicable",
        confidenceScore: 0.70,
      },
    ],
  },
  {
    title: "Counterargument Surface",
    summary: "Opposing viewpoints are absent or dismissed without engagement.",
    draftCentrality: 0.50,
    conflictScore: 0.90,
    evidenceGapScore: 0.45,
    repetitionScore: 0.20,
    freshnessScore: 0.60,
    confidenceScore: 0.58,
    nodes: [
      {
        kind: "challenge",
        title: "Strongest objection unaddressed",
        summary: "The most common counter-position is not mentioned at all.",
        severity: "high",
        verdict: "not_applicable",
        confidenceScore: 0.55,
      },
      {
        kind: "gap",
        title: "Missing steelman",
        summary: "The opposing view is caricatured rather than presented at its strongest.",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.62,
      },
      {
        kind: "question",
        title: "What would change your mind?",
        summary: "Stating the conditions for revision would demonstrate intellectual honesty.",
        severity: "medium",
        verdict: "not_applicable",
        confidenceScore: 0.70,
      },
      {
        kind: "source",
        title: "Opposing research",
        summary: "Published work directly challenges the central claim with empirical data.",
        severity: "low",
        verdict: "contradicted",
        confidenceScore: 0.78,
      },
    ],
  },
  {
    title: "Source Reliability",
    summary: "Referenced sources vary in credibility and recency, affecting overall trust.",
    draftCentrality: 0.38,
    conflictScore: 0.35,
    evidenceGapScore: 0.50,
    repetitionScore: 0.15,
    freshnessScore: 0.85,
    confidenceScore: 0.60,
    nodes: [
      {
        kind: "challenge",
        title: "Outdated primary source",
        summary: "The main reference predates significant developments in the field.",
        severity: "medium",
        verdict: "mixed",
        confidenceScore: 0.65,
      },
      {
        kind: "source",
        title: "Stronger alternative available",
        summary: "A more recent and more cited study covers the same ground.",
        severity: "low",
        verdict: "supported",
        confidenceScore: 0.82,
      },
      {
        kind: "question",
        title: "Is recency relevant here?",
        summary: "Some claims are time-invariant; others depend on current data.",
        severity: "low",
        verdict: "not_applicable",
        confidenceScore: 0.72,
      },
    ],
  },
];

function computeLeverageScore(theme: {
  draftCentrality: number;
  conflictScore: number;
  evidenceGapScore: number;
  repetitionScore: number;
  freshnessScore: number;
}): number {
  return (
    0.35 * theme.draftCentrality +
    0.25 * theme.conflictScore +
    0.20 * theme.evidenceGapScore +
    0.10 * theme.repetitionScore +
    0.10 * theme.freshnessScore
  );
}

function buildDraftCard(input: ConstellationBuildInput): ConstellationDraftCard {
  const words = input.plainText.trim().split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;
  const excerpt =
    input.plainText.length <= EXCERPT_MAX_LENGTH
      ? input.plainText
      : `${input.plainText.slice(0, EXCERPT_MAX_LENGTH - 1)}\u2026`;

  const anchorRefs: ConstellationAnchorRef[] = input.annotations.map((annotation) => ({
    annotationId: annotation.id,
    from: annotation.anchor.from,
    to: annotation.anchor.to,
    quote: annotation.anchor.quote,
  }));

  return {
    noteId: input.noteId,
    docVersion: input.docVersion,
    title: input.title,
    excerpt,
    wordCount,
    anchorRefs,
  };
}

function mapAnnotationToNodeKind(annotation: GadflyAnnotation): ConstellationNodeKind {
  if (annotation.research.needsFactCheck) {
    return "gap";
  }

  if (annotation.prompts.some((prompt) => prompt.kind === "followup_question")) {
    return "question";
  }

  if (annotation.category === "logic" || annotation.category === "evidence") {
    return "challenge";
  }

  return "claim";
}

function buildMockSourceRefs(themeIndex: number, nodeIndex: number): ConstellationSourceRef[] {
  if (nodeIndex % 3 !== 0) {
    return [];
  }

  return [
    {
      sourceId: `mock-source-${String(themeIndex)}-${String(nodeIndex)}`,
      researchTaskId: null,
      title: "Related research finding",
      url: "https://example.com/source",
      domain: "example.com",
      pageAge: null,
      snippet: null,
      relevanceScore: 0.75,
      verdict: "supported",
    },
  ];
}

function buildThemesAndNodes(
  input: ConstellationBuildInput,
  boardId: string,
): { themes: ConstellationTheme[]; nodes: ConstellationNode[] } {
  const themes: ConstellationTheme[] = [];
  const allNodes: ConstellationNode[] = [];

  for (let themeIndex = 0; themeIndex < MOCK_THEME_TEMPLATES.length; themeIndex += 1) {
    const template = MOCK_THEME_TEMPLATES[themeIndex];
    if (!template) {
      continue;
    }

    const themeId = `${boardId}:theme-${String(themeIndex)}`;
    const themeNodes: ConstellationNode[] = [];
    const themeAnchorRefs: ConstellationAnchorRef[] = [];
    const leverageScore = computeLeverageScore(template);

    for (let nodeIndex = 0; nodeIndex < template.nodes.length; nodeIndex += 1) {
      const nodeTemplate = template.nodes[nodeIndex];
      if (!nodeTemplate) {
        continue;
      }

      const nodeId = `${themeId}:node-${String(nodeIndex)}`;
      const lane = CONSTELLATION_NODE_KIND_TO_LANE[nodeTemplate.kind];

      themeNodes.push({
        id: nodeId,
        kind: nodeTemplate.kind,
        lane,
        themeId,
        title: nodeTemplate.title,
        summary: nodeTemplate.summary,
        severity: nodeTemplate.severity,
        status: "active",
        verdict: nodeTemplate.verdict,
        confidenceScore: nodeTemplate.confidenceScore,
        leverageScore: leverageScore * nodeTemplate.confidenceScore,
        sourceRefs: buildMockSourceRefs(themeIndex, nodeIndex),
        anchorRefs: [],
        linkedNodeIds: [],
      });
    }

    // Map real annotations into the first theme that doesn't have too many nodes
    if (themeIndex === 0 && input.annotations.length > 0) {
      for (const annotation of input.annotations.slice(0, 3)) {
        const nodeId = `${themeId}:ann-${annotation.id}`;
        const kind = mapAnnotationToNodeKind(annotation);
        const lane = CONSTELLATION_NODE_KIND_TO_LANE[kind];

        const anchorRef: ConstellationAnchorRef = {
          annotationId: annotation.id,
          from: annotation.anchor.from,
          to: annotation.anchor.to,
          quote: annotation.anchor.quote,
        };

        themeAnchorRefs.push(anchorRef);

        const sourceRefs: ConstellationSourceRef[] = [];
        for (const task of annotation.research.tasks) {
          if (task.result) {
            for (const source of task.result.sources) {
              sourceRefs.push({
                sourceId: `${nodeId}:src-${source.url}`,
                researchTaskId: task.id,
                title: source.title,
                url: source.url,
                domain: source.domain,
                pageAge: source.pageAge,
                snippet: null,
                relevanceScore: 0.7,
                verdict: GADFLY_VERDICT_TO_CONSTELLATION[task.result.verdict],
              });
            }
          }
        }

        themeNodes.push({
          id: nodeId,
          kind,
          lane,
          themeId,
          title: annotation.explanation.slice(0, 60),
          summary: annotation.explanation,
          severity: annotation.severity,
          status: "active",
          verdict: "not_applicable",
          confidenceScore: 0.7,
          leverageScore: leverageScore * 0.7,
          sourceRefs,
          anchorRefs: [anchorRef],
          linkedNodeIds: [],
        });
      }
    }

    // Sort nodes: by role order, then severity descending
    themeNodes.sort((left, right) => {
      const roleLeft = CONSTELLATION_NODE_ROLE_ORDER[left.kind];
      const roleRight = CONSTELLATION_NODE_ROLE_ORDER[right.kind];
      if (roleLeft !== roleRight) {
        return roleLeft - roleRight;
      }
      return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
    });

    const counts: ConstellationThemeCounts = { supports: 0, challenges: 0, questions: 0, sources: 0 };
    for (const node of themeNodes) {
      counts[node.lane] += 1;
    }

    themes.push({
      id: themeId,
      title: template.title,
      summary: template.summary,
      status: "suggested",
      counts,
      leverageScore,
      draftCentrality: template.draftCentrality,
      conflictScore: template.conflictScore,
      evidenceGapScore: template.evidenceGapScore,
      repetitionScore: template.repetitionScore,
      freshnessScore: template.freshnessScore,
      confidenceScore: template.confidenceScore,
      anchorRefs: themeAnchorRefs,
      nodeIds: themeNodes.map((node) => node.id),
    });

    allNodes.push(...themeNodes);
  }

  // Sort themes by leverage score descending
  themes.sort((left, right) => right.leverageScore - left.leverageScore);

  return { themes, nodes: allNodes };
}

function buildEdges(
  boardId: string,
  themes: readonly ConstellationTheme[],
  nodes: readonly ConstellationNode[],
): ConstellationEdge[] {
  const edges: ConstellationEdge[] = [];
  let edgeCounter = 0;

  // Draft-to-theme edges
  for (const theme of themes) {
    edgeCounter += 1;
    edges.push({
      id: `${boardId}:edge-${String(edgeCounter)}`,
      kind: "anchors_to_text",
      fromNodeId: "draft",
      toNodeId: theme.id,
      strength: theme.leverageScore,
    });
  }

  // Intra-theme edges between challenges and supports
  for (const theme of themes) {
    const themeNodes = nodes.filter((node) => node.themeId === theme.id);
    const challenges = themeNodes.filter((node) => node.lane === "challenges");
    const supports = themeNodes.filter((node) => node.lane === "supports");

    for (const challenge of challenges) {
      for (const support of supports) {
        edgeCounter += 1;
        edges.push({
          id: `${boardId}:edge-${String(edgeCounter)}`,
          kind: "challenges",
          fromNodeId: challenge.id,
          toNodeId: support.id,
          strength: 0.5 * (challenge.confidenceScore + support.confidenceScore),
        });
      }
    }
  }

  return edges;
}

function buildDefaultFilters(): ConstellationFilters {
  return {
    lanes: [...CONSTELLATION_LANE_KINDS],
    severity: ["low", "medium", "high"],
    unresolvedOnly: false,
    showDismissed: false,
  };
}

export function buildConstellationBoard(
  input: ConstellationBuildInput,
): Result<ConstellationBoard, ValidationError> {
  if (input.plainText.trim().length === 0) {
    return err({
      kind: "ValidationError",
      message: "Cannot build constellation board for empty text",
      field: "plainText",
    });
  }

  const draft = buildDraftCard(input);
  const { themes, nodes } = buildThemesAndNodes(input, input.boardId);
  const edges = buildEdges(input.boardId, themes, nodes);
  const filters = buildDefaultFilters();

  return ok({
    id: input.boardId,
    noteId: input.noteId,
    generatedAt: input.generatedAt,
    draft,
    themes,
    nodes,
    edges,
    filters,
  });
}

// Re-export for testing
export { computeLeverageScore };
