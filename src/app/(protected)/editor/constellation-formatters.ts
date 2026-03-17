import type {
  ConstellationExplorationNode,
  ConstellationNodeFamily,
  ConstellationProvenanceSource,
} from "../../../domain/gadfly/constellation-types";

export function formatConstellationConfidencePercent(score: number): string {
  return `${String(Math.round(Math.max(0, Math.min(1, score)) * 100))}%`;
}

function formatConstellationConfidenceBand(score: number): string {
  if (score >= 0.78) {
    return "High confidence";
  }

  if (score >= 0.52) {
    return "Moderate confidence";
  }

  return "Emerging confidence";
}

export function formatConstellationConfidenceSummary(score: number): string {
  return `${formatConstellationConfidenceBand(score)} · ${formatConstellationConfidencePercent(score)}`;
}

function formatConstellationSurfacedByLabel(
  source: ConstellationProvenanceSource,
): string {
  switch (source) {
    case "annotation":
      return "Draft anchors";
    case "draft":
      return "Freewrite";
    case "research":
      return "Research";
    case "mock":
      return "Mock AI";
  }
}

export function formatConstellationSignalLabel(
  family: ConstellationNodeFamily,
): string {
  switch (family) {
    case "seed":
      return "Seed";
    case "theme":
      return "Theme";
    case "question":
      return "Open question";
    case "counterargument":
      return "Objection";
    case "evidence":
      return "Support";
    case "source":
      return "Source trail";
    case "research_task":
      return "Research step";
    case "response":
      return "Response path";
  }
}

export function formatConstellationProvenanceSummary(
  node: ConstellationExplorationNode,
): string {
  const parts: string[] = [];

  switch (node.provenance.surfacedBy) {
    case "annotation":
      parts.push("Surfaced from anchored draft text");
      break;
    case "draft":
      parts.push("Built directly from the freewrite seed");
      break;
    case "research":
      parts.push("Surfaced from research-backed findings");
      break;
    case "mock":
      parts.push("Scaffolded from the current AI prototype output");
      break;
  }

  if (node.provenance.anchorRefs.length > 0) {
    parts.push(
      `${String(node.provenance.anchorRefs.length)} anchored span${
        node.provenance.anchorRefs.length === 1 ? "" : "s"
      }`,
    );
  }

  if (node.provenance.sourceRefs.length > 0) {
    parts.push(
      `${String(node.provenance.sourceRefs.length)} source${
        node.provenance.sourceRefs.length === 1 ? "" : "s"
      }`,
    );
  }

  if (node.provenance.researchTaskIds.length > 0) {
    parts.push(
      `${String(node.provenance.researchTaskIds.length)} research task${
        node.provenance.researchTaskIds.length === 1 ? "" : "s"
      }`,
    );
  }

  return parts.join(" · ");
}

export function formatConstellationCompactTrustSummary(
  node: ConstellationExplorationNode,
): string {
  return `${formatConstellationSurfacedByLabel(node.provenance.surfacedBy)} · ${formatConstellationConfidenceBand(node.confidenceScore)}`;
}
