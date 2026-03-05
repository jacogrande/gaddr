import { afterEach, describe, expect, test } from "bun:test";
import {
  clearGadflyActionReducers,
  mergeGadflyActions,
  reduceGadflyState,
  registerGadflyActionReducer,
  unregisterGadflyActionReducer,
} from "../../../src/domain/gadfly/annotations";
import type { GadflyAction, GadflyAnnotation, GadflyState } from "../../../src/domain/gadfly/types";

function annotation(id: string, from: number, to: number): GadflyAnnotation {
  return {
    id,
    anchor: {
      from,
      to,
      quote: `quote-${id}`,
    },
    category: "clarity",
    severity: "low",
    status: "active",
    explanation: `explain-${id}`,
    rule: `rule-${id}`,
    question: `question-${id}`,
    prompts: [],
    research: {
      needsFactCheck: false,
      factCheckNote: null,
      tasks: [],
    },
    snoozedUntil: null,
    isPinned: false,
    linkedAnnotationIds: [],
  };
}

function stateWithAnnotations(annotations: GadflyAnnotation[]): GadflyState {
  return {
    annotations,
    preferences: {
      mutedCategories: [],
      learningGoal: null,
    },
    debugEvents: [],
  };
}

afterEach(() => {
  clearGadflyActionReducers();
});

describe("reduceGadflyState", () => {
  test("is a no-op when no reducers are registered", () => {
    const initial = stateWithAnnotations([annotation("b", 10, 20), annotation("a", 1, 5)]);

    const next = reduceGadflyState(initial, [
      {
        type: "future.tool",
        action: "future_action",
      },
    ]);

    expect(next.annotations).toEqual([annotation("a", 1, 5), annotation("b", 10, 20)]);
    expect(next.preferences).toEqual(initial.preferences);
    expect(next.debugEvents).toEqual(initial.debugEvents);
  });

  test("applies registered reducers by type/action key", () => {
    registerGadflyActionReducer("future.tool", "set_learning_goal", (current, action) => {
      const goal = typeof action.payload?.["goal"] === "string" ? action.payload["goal"] : null;
      return {
        ...current,
        preferences: {
          ...current.preferences,
          learningGoal: goal,
        },
      };
    });

    const initial = stateWithAnnotations([]);
    const action: GadflyAction = {
      type: "future.tool",
      action: "set_learning_goal",
      payload: { goal: "Focus on argument structure" },
    };

    const next = reduceGadflyState(initial, [action]);
    expect(next.preferences.learningGoal).toBe("Focus on argument structure");

    unregisterGadflyActionReducer("future.tool", "set_learning_goal");
    const afterUnregister = reduceGadflyState(next, [action]);
    expect(afterUnregister.preferences.learningGoal).toBe("Focus on argument structure");
  });
});

describe("mergeGadflyActions", () => {
  test("uses the same reducer infrastructure for annotation arrays", () => {
    registerGadflyActionReducer("future.tool", "append_annotation", (current, action) => {
      const id = typeof action.payload?.["id"] === "string" ? action.payload["id"] : null;
      const from = typeof action.payload?.["from"] === "number" ? action.payload["from"] : null;
      const to = typeof action.payload?.["to"] === "number" ? action.payload["to"] : null;

      if (!id || from === null || to === null) {
        return current;
      }

      return {
        ...current,
        annotations: [...current.annotations, annotation(id, from, to)],
      };
    });

    const next = mergeGadflyActions([], [
      {
        type: "future.tool",
        action: "append_annotation",
        payload: { id: "z", from: 20, to: 30 },
      },
      {
        type: "future.tool",
        action: "append_annotation",
        payload: { id: "a", from: 1, to: 5 },
      },
    ]);

    expect(next).toEqual([annotation("a", 1, 5), annotation("z", 20, 30)]);
  });
});
