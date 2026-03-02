import { describe, expect, test } from "bun:test";
import {
  parseGadflyAction,
  parseGadflyAnalyzeRequest,
  validateGadflyAction,
} from "../../../src/domain/gadfly/guards";

describe("parseGadflyAnalyzeRequest", () => {
  test("accepts a valid request", () => {
    const parsed = parseGadflyAnalyzeRequest({
      noteId: "note-1",
      docVersion: 3,
      changedRanges: [{ from: 12, to: 28 }],
      plainText: "Hello world",
      contextWindow: [{ from: 0, to: 40, text: "Hello world" }],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.noteId).toBe("note-1");
    expect(parsed.value.changedRanges).toEqual([{ from: 12, to: 28 }]);
  });

  test("rejects invalid range bounds", () => {
    const parsed = parseGadflyAnalyzeRequest({
      noteId: "note-1",
      docVersion: 0,
      changedRanges: [{ from: 10, to: 8 }],
      plainText: "x",
      contextWindow: [],
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.error.field).toBe("changedRanges[0]");
  });
});

describe("parseGadflyAction", () => {
  test("accepts annotate actions", () => {
    const parsed = parseGadflyAction({
      type: "annotation.manage",
      action: "annotate",
      annotation: {
        id: "a1",
        anchor: {
          from: 12,
          to: 20,
          quote: "problem text",
        },
        category: "clarity",
        severity: "medium",
        explanation: "This sentence is hard to parse.",
        rule: "Prefer direct subject-verb structure.",
        question: "What is the main claim in one clause?",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("annotate");
    if (parsed.value.action !== "annotate") {
      return;
    }

    expect(parsed.value.annotation.status).toBe("active");
  });

  test("accepts set_status actions", () => {
    const parsed = parseGadflyAction({
      type: "annotation.manage",
      action: "set_status",
      annotationId: "a1",
      status: "acknowledged",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("set_status");
  });

  test("accepts prompt.manage actions", () => {
    const parsed = parseGadflyAction({
      type: "prompt.manage",
      action: "add_structure_prompt",
      annotationId: "a1",
      prompt: "How does this paragraph connect to your thesis?",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("add_structure_prompt");
  });

  test("accepts research.manage create task actions", () => {
    const parsed = parseGadflyAction({
      type: "research.manage",
      action: "create_research_task",
      annotationId: "a1",
      task: {
        id: "task-1",
        kind: "fact_check",
        question: "Which source verifies this statistic?",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("create_research_task");
  });

  test("accepts research.manage attach result actions", () => {
    const parsed = parseGadflyAction({
      type: "research.manage",
      action: "attach_research_result",
      annotationId: "a1",
      taskId: "task-1",
      result: {
        verdict: "supported",
        findings: ["The number is confirmed by the cited report."],
        sources: [
          {
            title: "Report",
            url: "https://example.com/report",
          },
        ],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("attach_research_result");
  });

  test("accepts preference.manage actions", () => {
    const parsed = parseGadflyAction({
      type: "preference.manage",
      action: "set_learning_goal",
      goal: "Strengthen evidence discipline",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("set_learning_goal");
  });

  test("accepts debug.emit actions", () => {
    const parsed = parseGadflyAction({
      type: "debug.emit",
      action: "emit_debug_event",
      event: {
        eventName: "tool-selection",
        detail: "Selected annotation.manage because the issue was inline and local.",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.action).toBe("emit_debug_event");
  });

  test("rejects unknown action type", () => {
    const parsed = parseGadflyAction({ type: "patch" });

    expect(parsed.ok).toBe(false);
  });
});

describe("validateGadflyAction", () => {
  test("rejects rewrite-style coaching text", () => {
    const parsed = parseGadflyAction({
      type: "annotation.manage",
      action: "annotate",
      annotation: {
        id: "a1",
        anchor: {
          from: 12,
          to: 20,
          quote: "problem text",
        },
        category: "clarity",
        severity: "medium",
        explanation: "Replace with: this is clearer.",
        rule: "Clarity",
        question: "Why is this unclear?",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateGadflyAction(parsed.value);
    expect(validated.ok).toBe(false);
    if (validated.ok) {
      return;
    }

    expect(validated.error.reason).toBe("ghostwriting_pattern:explanation");
  });

  test("rejects rewrite-style prompt.manage text", () => {
    const parsed = parseGadflyAction({
      type: "prompt.manage",
      action: "add_clarity_prompt",
      annotationId: "a1",
      prompt: "Rewrite as: this sentence is cleaner and more concise.",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateGadflyAction(parsed.value);
    expect(validated.ok).toBe(false);
    if (validated.ok) {
      return;
    }

    expect(validated.error.reason).toBe("ghostwriting_pattern:prompt");
  });

  test("rejects rewrite-style research findings", () => {
    const parsed = parseGadflyAction({
      type: "research.manage",
      action: "attach_research_result",
      annotationId: "a1",
      taskId: "task-1",
      result: {
        verdict: "mixed",
        findings: ["Change to: a cleaner sentence with this source integrated."],
        sources: [
          {
            title: "Report",
            url: "https://example.com/report",
          },
        ],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateGadflyAction(parsed.value);
    expect(validated.ok).toBe(false);
    if (validated.ok) {
      return;
    }

    expect(validated.error.reason).toBe("ghostwriting_pattern:prompt");
  });

  test("rejects rewrite-style learning goals", () => {
    const parsed = parseGadflyAction({
      type: "preference.manage",
      action: "set_learning_goal",
      goal: "Rewrite as: cleaner and more forceful prose.",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateGadflyAction(parsed.value);
    expect(validated.ok).toBe(false);
    if (validated.ok) {
      return;
    }

    expect(validated.error.reason).toBe("ghostwriting_pattern:prompt");
  });
});
