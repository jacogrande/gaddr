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
      type: "annotate",
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
  });

  test("rejects unknown action type", () => {
    const parsed = parseGadflyAction({ type: "patch" });

    expect(parsed.ok).toBe(false);
  });
});

describe("validateGadflyAction", () => {
  test("rejects rewrite-style coaching text", () => {
    const parsed = parseGadflyAction({
      type: "annotate",
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
});
