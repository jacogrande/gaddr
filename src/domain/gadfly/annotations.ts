import type {
  GadflyAction,
  GadflyAnnotation,
  GadflyPreferences,
  GadflyState,
} from "./types";

const EMPTY_PREFERENCES: GadflyPreferences = {
  mutedCategories: [],
  learningGoal: null,
};

export type GadflyActionReducer = (state: GadflyState, action: GadflyAction) => GadflyState;

const gadflyActionReducers = new Map<string, GadflyActionReducer>();

function actionReducerKey(type: string, action: string): string {
  return `${type}:${action}`;
}

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

function cloneState(state: GadflyState): GadflyState {
  return {
    annotations: [...state.annotations],
    preferences: {
      mutedCategories: [...state.preferences.mutedCategories],
      learningGoal: state.preferences.learningGoal,
    },
    debugEvents: [...state.debugEvents],
  };
}

function baseState(currentAnnotations: readonly GadflyAnnotation[]): GadflyState {
  return {
    annotations: [...currentAnnotations],
    preferences: EMPTY_PREFERENCES,
    debugEvents: [],
  };
}

export function registerGadflyActionReducer(
  type: string,
  action: string,
  reducer: GadflyActionReducer,
): void {
  gadflyActionReducers.set(actionReducerKey(type, action), reducer);
}

export function unregisterGadflyActionReducer(type: string, action: string): void {
  gadflyActionReducers.delete(actionReducerKey(type, action));
}

export function clearGadflyActionReducers(): void {
  gadflyActionReducers.clear();
}

export function reduceGadflyState(
  current: GadflyState,
  actions: readonly GadflyAction[],
): GadflyState {
  let next = cloneState(current);

  for (const action of actions) {
    const reducer = gadflyActionReducers.get(actionReducerKey(action.type, action.action));
    if (!reducer) {
      continue;
    }

    next = reducer(next, action);
  }

  return {
    ...next,
    annotations: sortAnnotations(next.annotations),
  };
}

export function mergeGadflyActions(
  current: readonly GadflyAnnotation[],
  actions: readonly GadflyAction[],
): GadflyAnnotation[] {
  return reduceGadflyState(baseState(current), actions).annotations;
}
