import type {
  GadflyAction,
  GadflyAnnotation,
  GadflyCategory,
  GadflyDebugEvent,
  GadflyPreferences,
  GadflyPrompt,
  GadflyResearchResult,
  GadflyResearchTask,
  GadflyState,
} from "./types";
import { GADFLY_CATEGORIES } from "./types";

const COLLISION_ID_SEPARATOR = "#";
const MAX_DEBUG_EVENTS = 50;

const EMPTY_PREFERENCES: GadflyPreferences = {
  mutedCategories: [],
  learningGoal: null,
};

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

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function uniqueCategories(values: readonly GadflyCategory[]): GadflyCategory[] {
  const categories = uniqueStrings(values);
  return GADFLY_CATEGORIES.filter((category) => categories.includes(category));
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

function mergeAnnotationPayload(
  existing: GadflyAnnotation | undefined,
  incoming: GadflyAnnotation,
  id: string,
): GadflyAnnotation {
  const nextPrompts =
    existing && incoming.prompts.length === 0 && existing.prompts.length > 0
      ? existing.prompts
      : incoming.prompts;
  const nextResearch =
    existing &&
    !incoming.research.needsFactCheck &&
    incoming.research.factCheckNote === null &&
    incoming.research.tasks.length === 0 &&
    (existing.research.needsFactCheck ||
      existing.research.factCheckNote !== null ||
      existing.research.tasks.length > 0)
      ? existing.research
      : incoming.research;
  const nextSnoozedUntil =
    existing && incoming.snoozedUntil === null && existing.snoozedUntil !== null
      ? existing.snoozedUntil
      : incoming.snoozedUntil;
  const nextIsPinned =
    existing && !incoming.isPinned && existing.isPinned
      ? existing.isPinned
      : incoming.isPinned;
  const nextLinkedAnnotationIds =
    existing && incoming.linkedAnnotationIds.length === 0 && existing.linkedAnnotationIds.length > 0
      ? existing.linkedAnnotationIds
      : incoming.linkedAnnotationIds;

  return {
    ...incoming,
    id,
    prompts: nextPrompts,
    research: nextResearch,
    snoozedUntil: nextSnoozedUntil,
    isPinned: nextIsPinned,
    linkedAnnotationIds: uniqueStrings(nextLinkedAnnotationIds),
  };
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

function rangesOverlap(
  left: { from: number; to: number },
  right: { from: number; to: number },
): boolean {
  return left.from < right.to && right.from < left.to;
}

function findFamilyIds(annotationId: string, byId: Map<string, GadflyAnnotation>): string[] {
  if (byId.has(annotationId)) {
    return [annotationId];
  }

  const collisionPrefix = `${annotationId}${COLLISION_ID_SEPARATOR}`;
  return Array.from(byId.keys()).filter((id) => id.startsWith(collisionPrefix));
}

function promptKindForAction(
  action: Extract<GadflyAction, { type: "prompt.manage" }>["action"],
): GadflyPrompt["kind"] {
  switch (action) {
    case "ask_followup_question":
      return "followup_question";
    case "add_clarity_prompt":
      return "clarity";
    case "add_structure_prompt":
      return "structure";
    case "add_evidence_prompt":
      return "evidence";
    case "add_counterpoint_prompt":
      return "counterpoint";
    case "add_tone_consistency_prompt":
      return "tone_consistency";
  }
}

function upsertPromptByKind(
  prompts: readonly GadflyPrompt[],
  prompt: GadflyPrompt,
): GadflyPrompt[] {
  const existingIndex = prompts.findIndex((existingPrompt) => existingPrompt.kind === prompt.kind);
  if (existingIndex < 0) {
    return [...prompts, prompt];
  }

  return prompts.map((existingPrompt, index) => {
    if (index !== existingIndex) {
      return existingPrompt;
    }

    return prompt;
  });
}

function upsertResearchTaskById(
  tasks: readonly GadflyResearchTask[],
  task: GadflyResearchTask,
): GadflyResearchTask[] {
  const existingIndex = tasks.findIndex((existingTask) => existingTask.id === task.id);
  if (existingIndex < 0) {
    return [...tasks, task];
  }

  return tasks.map((existingTask, index) => {
    if (index !== existingIndex) {
      return existingTask;
    }

    return {
      ...existingTask,
      ...task,
      result: task.result ?? existingTask.result,
      status: task.result ? "completed" : task.status,
    };
  });
}

function attachResearchResultToTasks(
  tasks: readonly GadflyResearchTask[],
  taskId: string,
  result: GadflyResearchResult,
): GadflyResearchTask[] {
  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      status: "completed",
      result,
    };
  });
}

function resolveReferencedAnnotationId(
  annotationId: string,
  resolvedIdsBySourceId: Map<string, string>,
): string {
  return resolvedIdsBySourceId.get(annotationId) ?? annotationId;
}

function resolveReferencedAnnotationIds(
  annotationIds: readonly string[],
  resolvedIdsBySourceId: Map<string, string>,
): string[] {
  return uniqueStrings(
    annotationIds.map((annotationId) => resolveReferencedAnnotationId(annotationId, resolvedIdsBySourceId)),
  );
}

function appendDebugEvent(
  debugEvents: readonly GadflyDebugEvent[],
  event: GadflyDebugEvent,
): GadflyDebugEvent[] {
  const next = [...debugEvents, event];
  return next.length > MAX_DEBUG_EVENTS ? next.slice(next.length - MAX_DEBUG_EVENTS) : next;
}

function linkAnnotations(
  byId: Map<string, GadflyAnnotation>,
  rootId: string,
  relatedIds: readonly string[],
): void {
  const allIds = uniqueStrings([rootId, ...relatedIds]).filter((id) => byId.has(id));
  for (const currentId of allIds) {
    const current = byId.get(currentId);
    if (!current) {
      continue;
    }

    const linkedAnnotationIds = allIds.filter((id) => id !== currentId);
    byId.set(currentId, {
      ...current,
      linkedAnnotationIds: uniqueStrings([...current.linkedAnnotationIds, ...linkedAnnotationIds]),
    });
  }
}

function baseState(currentAnnotations: readonly GadflyAnnotation[]): GadflyState {
  return {
    annotations: [...currentAnnotations],
    preferences: EMPTY_PREFERENCES,
    debugEvents: [],
  };
}

export function reduceGadflyState(
  current: GadflyState,
  actions: readonly GadflyAction[],
): GadflyState {
  const byId = new Map<string, GadflyAnnotation>(
    current.annotations.map((annotation) => [annotation.id, annotation]),
  );
  const resolvedIdsBySourceId = new Map<string, string>();
  let preferences: GadflyPreferences = {
    mutedCategories: [...current.preferences.mutedCategories],
    learningGoal: current.preferences.learningGoal,
  };
  let debugEvents = [...current.debugEvents];

  for (const action of actions) {
    switch (action.action) {
      case "annotate": {
        const resolvedId = resolveAnnotationId(action.annotation, byId);
        const existing = byId.get(resolvedId);
        byId.set(resolvedId, mergeAnnotationPayload(existing, action.annotation, resolvedId));
        resolvedIdsBySourceId.set(action.annotation.id, resolvedId);
        break;
      }
      case "update_annotation": {
        const nextId = byId.has(action.annotation.id)
          ? action.annotation.id
          : resolveAnnotationId(action.annotation, byId);
        const existing = byId.get(nextId);
        byId.set(nextId, mergeAnnotationPayload(existing, action.annotation, nextId));
        resolvedIdsBySourceId.set(action.annotation.id, nextId);
        break;
      }
      case "clear": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        clearAnnotationFamily(referencedId, byId);
        break;
      }
      case "clear_in_range": {
        const deletions: string[] = [];
        for (const [annotationId, annotation] of byId) {
          if (
            rangesOverlap(
              {
                from: annotation.anchor.from,
                to: annotation.anchor.to,
              },
              action.range,
            )
          ) {
            deletions.push(annotationId);
          }
        }
        for (const annotationId of deletions) {
          byId.delete(annotationId);
        }
        break;
      }
      case "clear_by_category": {
        for (const [annotationId, annotation] of Array.from(byId.entries())) {
          if (annotation.category === action.category) {
            byId.delete(annotationId);
          }
        }
        break;
      }
      case "set_severity": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            severity: action.severity,
          });
        }
        break;
      }
      case "set_status": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            status: action.status,
          });
        }
        break;
      }
      case "snooze_until": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            status: "snoozed",
            snoozedUntil: action.until,
          });
        }
        break;
      }
      case "unsnooze": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            status: existing.status === "snoozed" ? "active" : existing.status,
            snoozedUntil: null,
          });
        }
        break;
      }
      case "pin_annotation":
      case "unpin_annotation": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            isPinned: action.action === "pin_annotation",
          });
        }
        break;
      }
      case "link_annotations": {
        const rootId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const relatedIds = resolveReferencedAnnotationIds(action.relatedAnnotationIds, resolvedIdsBySourceId);
        linkAnnotations(byId, rootId, relatedIds);
        break;
      }
      case "ask_followup_question":
      case "add_clarity_prompt":
      case "add_structure_prompt":
      case "add_evidence_prompt":
      case "add_counterpoint_prompt":
      case "add_tone_consistency_prompt": {
        const promptKind = promptKindForAction(action.action);
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            prompts: upsertPromptByKind(existing.prompts, {
              kind: promptKind,
              text: action.prompt,
            }),
          });
        }
        break;
      }
      case "flag_fact_check_needed": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            research: {
              ...existing.research,
              needsFactCheck: true,
              factCheckNote: action.note,
            },
          });
        }
        break;
      }
      case "create_research_task": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            research: {
              ...existing.research,
              tasks: upsertResearchTaskById(existing.research.tasks, {
                id: action.task.id,
                kind: action.task.kind,
                question: action.task.question,
                status: "pending",
                result: null,
              }),
            },
          });
        }
        break;
      }
      case "attach_research_result": {
        const referencedId = resolveReferencedAnnotationId(action.annotationId, resolvedIdsBySourceId);
        const familyIds = findFamilyIds(referencedId, byId);
        for (const annotationId of familyIds) {
          const existing = byId.get(annotationId);
          if (!existing) {
            continue;
          }
          byId.set(annotationId, {
            ...existing,
            research: {
              ...existing.research,
              tasks: attachResearchResultToTasks(
                existing.research.tasks,
                action.taskId,
                action.result,
              ),
            },
          });
        }
        break;
      }
      case "mute_category": {
        preferences = {
          ...preferences,
          mutedCategories: uniqueCategories([...preferences.mutedCategories, action.category]),
        };
        break;
      }
      case "unmute_category": {
        preferences = {
          ...preferences,
          mutedCategories: preferences.mutedCategories.filter((category) => category !== action.category),
        };
        break;
      }
      case "set_learning_goal": {
        preferences = {
          ...preferences,
          learningGoal: action.goal,
        };
        break;
      }
      case "clear_learning_goal": {
        preferences = {
          ...preferences,
          learningGoal: null,
        };
        break;
      }
      case "emit_debug_event": {
        debugEvents = appendDebugEvent(debugEvents, action.event);
        break;
      }
    }
  }

  return {
    annotations: sortAnnotations(Array.from(byId.values())),
    preferences,
    debugEvents,
  };
}

export function mergeGadflyActions(
  current: readonly GadflyAnnotation[],
  actions: readonly GadflyAction[],
): GadflyAnnotation[] {
  return reduceGadflyState(baseState(current), actions).annotations;
}
