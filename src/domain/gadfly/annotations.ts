import type { GadflyAction, GadflyAnnotation } from "./types";

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

export function mergeGadflyActions(
  current: readonly GadflyAnnotation[],
  actions: readonly GadflyAction[],
): GadflyAnnotation[] {
  const byId = new Map<string, GadflyAnnotation>(current.map((annotation) => [annotation.id, annotation]));

  for (const action of actions) {
    if (action.type === "annotate") {
      byId.set(action.annotation.id, action.annotation);
      continue;
    }

    byId.delete(action.annotationId);
  }

  return sortAnnotations(Array.from(byId.values()));
}
