import type { GadflyAction, GadflyAnnotation } from "./types";

const COLLISION_ID_SEPARATOR = "#";

function sortAnnotations(annotations: readonly GadflyAnnotation[]): GadflyAnnotation[] {
  return [...annotations].sort((left, right) => {
    if (left.anchor.from !== right.anchor.from) {
      return left.anchor.from - right.anchor.from;
    }

    if (left.anchor.to !== right.anchor.to) {
      return left.anchor.to - right.anchor.to;
    }

    return left.id.localeCompare(right.id);
  });
}

function isLikelySameAnnotation(
  existing: GadflyAnnotation,
  incoming: GadflyAnnotation,
): boolean {
  if (existing.category !== incoming.category) {
    return false;
  }

  const existingQuote = existing.anchor.quote.trim();
  const incomingQuote = incoming.anchor.quote.trim();
  if (existingQuote.length > 0 && existingQuote === incomingQuote) {
    return true;
  }

  const rangesOverlap =
    existing.anchor.from < incoming.anchor.to &&
    incoming.anchor.from < existing.anchor.to;
  if (rangesOverlap) {
    return true;
  }

  return (
    existing.rule === incoming.rule &&
    existing.question === incoming.question &&
    existing.severity === incoming.severity
  );
}

function nextCollisionId(baseId: string, byId: Map<string, GadflyAnnotation>): string {
  let suffix = 2;

  while (byId.has(`${baseId}${COLLISION_ID_SEPARATOR}${String(suffix)}`)) {
    suffix += 1;
  }

  return `${baseId}${COLLISION_ID_SEPARATOR}${String(suffix)}`;
}

function resolveAnnotationId(
  incoming: GadflyAnnotation,
  byId: Map<string, GadflyAnnotation>,
): string {
  const baseId = incoming.id;
  const directMatch = byId.get(baseId);
  if (!directMatch) {
    return baseId;
  }

  if (isLikelySameAnnotation(directMatch, incoming)) {
    return baseId;
  }

  const collisionPrefix = `${baseId}${COLLISION_ID_SEPARATOR}`;
  for (const [id, existing] of byId) {
    if (!id.startsWith(collisionPrefix)) {
      continue;
    }

    if (isLikelySameAnnotation(existing, incoming)) {
      return id;
    }
  }

  return nextCollisionId(baseId, byId);
}

function clearAnnotationFamily(annotationId: string, byId: Map<string, GadflyAnnotation>): void {
  byId.delete(annotationId);

  const collisionPrefix = `${annotationId}${COLLISION_ID_SEPARATOR}`;
  for (const existingId of Array.from(byId.keys())) {
    if (existingId.startsWith(collisionPrefix)) {
      byId.delete(existingId);
    }
  }
}

export function mergeGadflyActions(
  current: readonly GadflyAnnotation[],
  actions: readonly GadflyAction[],
): GadflyAnnotation[] {
  const byId = new Map<string, GadflyAnnotation>(current.map((annotation) => [annotation.id, annotation]));

  for (const action of actions) {
    if (action.type === "annotate") {
      const resolvedId = resolveAnnotationId(action.annotation, byId);
      if (resolvedId === action.annotation.id) {
        byId.set(action.annotation.id, action.annotation);
      } else {
        byId.set(resolvedId, {
          ...action.annotation,
          id: resolvedId,
        });
      }
      continue;
    }

    clearAnnotationFamily(action.annotationId, byId);
  }

  return sortAnnotations(Array.from(byId.values()));
}
