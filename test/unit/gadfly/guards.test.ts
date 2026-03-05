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
  test("accepts a generic action envelope", () => {
    const parsed = parseGadflyAction({
      type: "future.tool",
      action: "future_action",
      payload: {
        foo: "bar",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value).toEqual({
      type: "future.tool",
      action: "future_action",
      payload: {
        foo: "bar",
      },
    });
  });

  test("rejects missing action fields", () => {
    const parsed = parseGadflyAction({ type: "future.tool" });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.error.field).toBe("action");
  });

  test("rejects non-object payload", () => {
    const parsed = parseGadflyAction({
      type: "future.tool",
      action: "future_action",
      payload: "bad",
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.error.field).toBe("payload");
  });
});

describe("validateGadflyAction", () => {
  test("passes through valid envelopes", () => {
    const parsed = parseGadflyAction({
      type: "future.tool",
      action: "future_action",
      payload: { value: 1 },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateGadflyAction(parsed.value);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    expect(validated.value).toEqual(parsed.value);
  });
});
