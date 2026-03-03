import { describe, expect, test } from "bun:test";
import { mergeGadflyActions, reduceGadflyState } from "../../../src/domain/gadfly/annotations";
import type { GadflyAnnotation } from "../../../src/domain/gadfly/types";

function annotation(
  id: string,
  from: number,
  to: number,
  overrides?: Partial<GadflyAnnotation>,
): GadflyAnnotation {
  return {
    id,
    anchor: {
      from,
      to,
      quote: overrides?.anchor?.quote ?? `quote-${id}`,
    },
    category: overrides?.category ?? "clarity",
    severity: overrides?.severity ?? "low",
    status: overrides?.status ?? "active",
    explanation: overrides?.explanation ?? `explain-${id}`,
    rule: overrides?.rule ?? `rule-${id}`,
    question: overrides?.question ?? `question-${id}`,
    prompts: overrides?.prompts ?? [],
    research: overrides?.research ?? {
      needsFactCheck: false,
      factCheckNote: null,
      tasks: [],
    },
    snoozedUntil: overrides?.snoozedUntil ?? null,
    isPinned: overrides?.isPinned ?? false,
    linkedAnnotationIds: overrides?.linkedAnnotationIds ?? [],
  };
}

describe("mergeGadflyActions", () => {
  test("adds and updates annotations by id", () => {
    const current = [annotation("a", 2, 7)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("a", 4, 9),
      },
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("b", 12, 16),
      },
    ]);

    expect(next).toEqual([annotation("a", 4, 9), annotation("b", 12, 16)]);
  });

  test("clears annotations when clear action is received", () => {
    const current = [annotation("a", 2, 7), annotation("b", 12, 16)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "clear",
        annotationId: "a",
      },
    ]);

    expect(next).toEqual([annotation("b", 12, 16)]);
  });

  test("preserves unrelated annotations when a model id is reused", () => {
    const current = [
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("a", 24, 31, {
          anchor: { from: 24, to: 31, quote: "second bad sentence" },
          rule: "logic rule",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 31, {
        anchor: { from: 24, to: 31, quote: "second bad sentence" },
        explanation: "explain-a",
        rule: "logic rule",
        question: "question-a",
      }),
    ]);
  });

  test("updates a collided annotation family entry when a later action matches it", () => {
    const current = [
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 31, {
        anchor: { from: 24, to: 31, quote: "second bad sentence" },
        rule: "logic rule",
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("a", 24, 34, {
          anchor: { from: 24, to: 34, quote: "second bad sentence revised" },
          rule: "logic rule",
          question: "question-a#2",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first bad sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 34, {
        anchor: { from: 24, to: 34, quote: "second bad sentence revised" },
        explanation: "explain-a",
        rule: "logic rule",
        question: "question-a#2",
      }),
    ]);
  });

  test("reuses an existing annotation when a later model response changes the id but keeps the same quoted span", () => {
    const current = [
      annotation("headlights-brightness-q1", 1, 39, {
        category: "evidence",
        anchor: { from: 1, to: 39, quote: "why are headlights so bright nowadays?" },
        explanation: "original explanation",
        rule: "original rule",
        question: "original question",
        research: {
          needsFactCheck: false,
          factCheckNote: null,
          tasks: [
            {
              id: "headlights-brightness-research",
              kind: "supporting_evidence",
              question: "Why are modern headlights brighter than older models?",
              status: "pending",
              result: null,
            },
          ],
        },
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("headlight-brightness-q1", 1, 39, {
          category: "evidence",
          anchor: { from: 1, to: 39, quote: "why are headlights so bright nowadays?" },
          explanation: "updated explanation",
          rule: "updated rule",
          question: "updated question",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("headlights-brightness-q1", 1, 39, {
        category: "evidence",
        anchor: { from: 1, to: 39, quote: "why are headlights so bright nowadays?" },
        explanation: "updated explanation",
        rule: "updated rule",
        question: "updated question",
        research: {
          needsFactCheck: false,
          factCheckNote: null,
          tasks: [
            {
              id: "headlights-brightness-research",
              kind: "supporting_evidence",
              question: "Why are modern headlights brighter than older models?",
              status: "pending",
              result: null,
            },
          ],
        },
      }),
    ]);
  });

  test("clear removes base id and collided siblings", () => {
    const current = [annotation("a", 2, 7), annotation("a#2", 24, 31), annotation("b", 40, 49)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "clear",
        annotationId: "a",
      },
    ]);

    expect(next).toEqual([annotation("b", 40, 49)]);
  });

  test("update_annotation updates existing annotation by id", () => {
    const current = [annotation("a", 2, 7)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "update_annotation",
        annotation: annotation("a", 3, 10, {
          severity: "medium",
          question: "question-a-updated",
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 3, 10, {
        severity: "medium",
        question: "question-a-updated",
      }),
    ]);
  });

  test("clear_in_range removes overlapping annotations only", () => {
    const current = [
      annotation("a", 2, 7),
      annotation("b", 12, 18),
      annotation("c", 22, 30),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "clear_in_range",
        range: { from: 10, to: 21 },
      },
    ]);

    expect(next).toEqual([annotation("a", 2, 7), annotation("c", 22, 30)]);
  });

  test("set_severity updates the targeted annotation severity", () => {
    const current = [annotation("a", 2, 7), annotation("b", 12, 18)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "set_severity",
        annotationId: "b",
        severity: "high",
      },
    ]);

    expect(next).toEqual([annotation("a", 2, 7), annotation("b", 12, 18, { severity: "high" })]);
  });

  test("set_status updates the targeted annotation status", () => {
    const current = [annotation("a", 2, 7), annotation("b", 12, 18)];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "set_status",
        annotationId: "a",
        status: "acknowledged",
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, { status: "acknowledged" }),
      annotation("b", 12, 18),
    ]);
  });

  test("upserts prompt rows by kind for prompt.manage actions", () => {
    const current = [annotation("a", 2, 7)];

    const next = mergeGadflyActions(current, [
      {
        type: "prompt.manage",
        action: "add_clarity_prompt",
        annotationId: "a",
        prompt: "Can you simplify this claim into one direct sentence?",
      },
      {
        type: "prompt.manage",
        action: "add_clarity_prompt",
        annotationId: "a",
        prompt: "What is the shortest way to express this idea?",
      },
      {
        type: "prompt.manage",
        action: "add_evidence_prompt",
        annotationId: "a",
        prompt: "What evidence best supports this claim?",
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        prompts: [
          { kind: "clarity", text: "What is the shortest way to express this idea?" },
          { kind: "evidence", text: "What evidence best supports this claim?" },
        ],
      }),
    ]);
  });

  test("preserves existing prompts on update_annotation when no prompts are provided", () => {
    const current = [
      annotation("a", 2, 7, {
        prompts: [{ kind: "structure", text: "How does this paragraph advance your thesis?" }],
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "update_annotation",
        annotation: annotation("a", 3, 10, {
          severity: "medium",
          question: "question-a-updated",
          prompts: [],
        }),
      },
    ]);

    expect(next).toEqual([
      annotation("a", 3, 10, {
        severity: "medium",
        question: "question-a-updated",
        prompts: [{ kind: "structure", text: "How does this paragraph advance your thesis?" }],
      }),
    ]);
  });

  test("flags fact checks and attaches research tasks/results", () => {
    const current = [annotation("a", 2, 7)];

    const next = mergeGadflyActions(current, [
      {
        type: "research.manage",
        action: "flag_fact_check_needed",
        annotationId: "a",
        note: "This historical claim is time-sensitive and should be verified.",
      },
      {
        type: "research.manage",
        action: "create_research_task",
        annotationId: "a",
        task: {
          id: "task-1",
          kind: "fact_check",
          question: "Which primary source verifies this date?",
        },
      },
      {
        type: "research.manage",
        action: "attach_research_result",
        annotationId: "a",
        taskId: "task-1",
        result: {
          verdict: "supported",
          findings: ["Two independent sources agree on the date."],
          sources: [
            {
              title: "Example Source",
              url: "https://example.com/source",
              domain: "example.com",
              pageAge: null,
            },
          ],
        },
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        research: {
          needsFactCheck: true,
          factCheckNote: "This historical claim is time-sensitive and should be verified.",
          tasks: [
            {
              id: "task-1",
              kind: "fact_check",
              question: "Which primary source verifies this date?",
              status: "completed",
              result: {
                verdict: "supported",
                findings: ["Two independent sources agree on the date."],
                sources: [
                  {
                    title: "Example Source",
                    url: "https://example.com/source",
                    domain: "example.com",
                    pageAge: null,
                  },
                ],
              },
            },
          ],
        },
      }),
    ]);
  });

  test("routes prompt and research follow-ups to the collided annotation created earlier in the same batch", () => {
    const current = [
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first sentence" },
        rule: "clarity rule",
      }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "annotate",
        annotation: annotation("a", 24, 35, {
          anchor: { from: 24, to: 35, quote: "second sentence" },
          rule: "logic rule",
        }),
      },
      {
        type: "prompt.manage",
        action: "add_clarity_prompt",
        annotationId: "a",
        prompt: "What is the simplest version of this idea?",
      },
      {
        type: "research.manage",
        action: "create_research_task",
        annotationId: "a",
        task: {
          id: "task-1",
          kind: "fact_check",
          question: "Which source verifies this claim?",
        },
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        anchor: { from: 2, to: 7, quote: "first sentence" },
        rule: "clarity rule",
      }),
      annotation("a#2", 24, 35, {
        anchor: { from: 24, to: 35, quote: "second sentence" },
        explanation: "explain-a",
        rule: "logic rule",
        question: "question-a",
        prompts: [{ kind: "clarity", text: "What is the simplest version of this idea?" }],
        research: {
          needsFactCheck: false,
          factCheckNote: null,
          tasks: [
            {
              id: "task-1",
              kind: "fact_check",
              question: "Which source verifies this claim?",
              status: "pending",
              result: null,
            },
          ],
        },
      }),
    ]);
  });

  test("supports the remaining annotation lifecycle actions", () => {
    const current = [
      annotation("a", 2, 7, { category: "clarity" }),
      annotation("b", 12, 18, { category: "tone" }),
      annotation("c", 22, 30, { category: "structure" }),
    ];

    const next = mergeGadflyActions(current, [
      {
        type: "annotation.manage",
        action: "pin_annotation",
        annotationId: "a",
      },
      {
        type: "annotation.manage",
        action: "snooze_until",
        annotationId: "b",
        until: "2026-03-10T12:00:00.000Z",
      },
      {
        type: "annotation.manage",
        action: "link_annotations",
        annotationId: "a",
        relatedAnnotationIds: ["c"],
      },
      {
        type: "annotation.manage",
        action: "clear_by_category",
        category: "tone",
      },
    ]);

    expect(next).toEqual([
      annotation("a", 2, 7, {
        category: "clarity",
        isPinned: true,
        linkedAnnotationIds: ["c"],
      }),
      annotation("c", 22, 30, {
        category: "structure",
        linkedAnnotationIds: ["a"],
      }),
    ]);
  });
});

describe("reduceGadflyState", () => {
  test("applies preference and debug actions", () => {
    const next = reduceGadflyState(
      {
        annotations: [annotation("a", 2, 7, { category: "clarity" })],
        preferences: {
          mutedCategories: [],
          learningGoal: null,
        },
        debugEvents: [],
      },
      [
        {
          type: "preference.manage",
          action: "mute_category",
          category: "clarity",
        },
        {
          type: "preference.manage",
          action: "set_learning_goal",
          goal: "Tighten paragraph flow",
        },
        {
          type: "debug.emit",
          action: "emit_debug_event",
          event: {
            eventName: "tool-selection",
            detail: "Model chose preference.manage after repeated user preference cues.",
          },
        },
      ],
    );

    expect(next.preferences).toEqual({
      mutedCategories: ["clarity"],
      learningGoal: "Tighten paragraph flow",
    });
    expect(next.debugEvents).toEqual([
      {
        eventName: "tool-selection",
        detail: "Model chose preference.manage after repeated user preference cues.",
      },
    ]);
  });
});
