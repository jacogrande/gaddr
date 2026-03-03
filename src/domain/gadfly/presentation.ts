import type {
  GadflyAnnotation,
  GadflyAnnotationStatus,
  GadflySeverity,
} from "./types";

export type GadflyAnnotationReference = {
  annotationId: string;
  index: number;
};

export type GadflyAnnotationGroup = {
  id: string;
  anchor: {
    from: number;
    to: number;
    quote: string;
  };
  severity: GadflySeverity;
  status: GadflyAnnotationStatus;
  annotations: GadflyAnnotation[];
  references: GadflyAnnotationReference[];
};

const RENDERABLE_STATUSES: GadflyAnnotationStatus[] = ["active", "acknowledged"];
const SEVERITY_RANK: Record<GadflySeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};
const STATUS_RANK: Record<GadflyAnnotationStatus, number> = {
  active: 0,
  acknowledged: 1,
  snoozed: 2,
  resolved: 3,
  dismissed: 4,
};

function normalizeQuote(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sortAnnotations(left: GadflyAnnotation, right: GadflyAnnotation): number {
  if (left.anchor.from !== right.anchor.from) {
    return left.anchor.from - right.anchor.from;
  }

  if (left.anchor.to !== right.anchor.to) {
    return left.anchor.to - right.anchor.to;
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  if (left.severity !== right.severity) {
    return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
  }

  return left.id.localeCompare(right.id);
}

function isRenderableAnnotation(annotation: GadflyAnnotation): boolean {
  return RENDERABLE_STATUSES.includes(annotation.status);
}

function chooseGroupSeverity(annotations: readonly GadflyAnnotation[]): GadflySeverity {
  let winner: GadflySeverity = "low";

  for (const annotation of annotations) {
    if (SEVERITY_RANK[annotation.severity] > SEVERITY_RANK[winner]) {
      winner = annotation.severity;
    }
  }

  return winner;
}

function chooseGroupStatus(annotations: readonly GadflyAnnotation[]): GadflyAnnotationStatus {
  let winner: GadflyAnnotationStatus = "acknowledged";

  for (const annotation of annotations) {
    if (STATUS_RANK[annotation.status] < STATUS_RANK[winner]) {
      winner = annotation.status;
    }
  }

  return winner;
}

function overlaps(
  left: { from: number; to: number },
  right: { from: number; to: number },
): boolean {
  return left.from < right.to && right.from < left.to;
}

function canJoinGroup(
  group: GadflyAnnotationGroup,
  annotation: GadflyAnnotation,
): boolean {
  if (group.annotations.length === 0) {
    return false;
  }

  const groupQuote = normalizeQuote(group.anchor.quote);
  const annotationQuote = normalizeQuote(annotation.anchor.quote);
  if (groupQuote.length === 0 || annotationQuote.length === 0) {
    return false;
  }

  if (groupQuote !== annotationQuote) {
    return false;
  }

  return overlaps(group.anchor, annotation.anchor);
}

export function groupGadflyAnnotations(
  annotations: readonly GadflyAnnotation[],
): GadflyAnnotationGroup[] {
  const renderableAnnotations = annotations
    .filter(isRenderableAnnotation)
    .slice()
    .sort(sortAnnotations);

  const groups: GadflyAnnotationGroup[] = [];

  for (const annotation of renderableAnnotations) {
    const existingGroup = groups.find((group) => canJoinGroup(group, annotation));
    if (existingGroup) {
      existingGroup.annotations.push(annotation);
      existingGroup.anchor.from = Math.min(existingGroup.anchor.from, annotation.anchor.from);
      existingGroup.anchor.to = Math.max(existingGroup.anchor.to, annotation.anchor.to);
      continue;
    }

    groups.push({
      id: `group:${annotation.id}`,
      anchor: {
        from: annotation.anchor.from,
        to: annotation.anchor.to,
        quote: annotation.anchor.quote,
      },
      severity: annotation.severity,
      status: annotation.status,
      annotations: [annotation],
      references: [],
    });
  }

  let nextReferenceIndex = 1;
  for (const group of groups) {
    group.annotations.sort(sortAnnotations);
    group.severity = chooseGroupSeverity(group.annotations);
    group.status = chooseGroupStatus(group.annotations);
    group.references = group.annotations.map((annotation) => {
      const reference = {
        annotationId: annotation.id,
        index: nextReferenceIndex,
      };
      nextReferenceIndex += 1;
      return reference;
    });
    group.id = `group:${group.annotations.map((annotation) => annotation.id).join("|")}`;
  }

  return groups;
}
