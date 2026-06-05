import { describe, expect, test } from "bun:test";
import {
  NOTE_MAX_CHARS,
  validateFinding,
} from "../../../src/domain/constellation/no-ghostwriting";
import type { Finding } from "../../../src/domain/constellation/types";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    kind: "assumption",
    tier: "inferred",
    claimSeq: 0,
    pointer: "“the real issue is…”",
    note: "What is this leaning on that hasn't been said out loud yet?",
    ...overrides,
  };
}

describe("validateFinding", () => {
  test("accepts a well-formed question-shaped assumption", () => {
    const result = validateFinding(finding());
    expect(result.ok).toBe(true);
  });

  test("rejects an empty pointer", () => {
    const result = validateFinding(finding({ pointer: "   " }));
    expect(result.ok).toBe(false);
  });

  test("rejects an empty note", () => {
    const result = validateFinding(finding({ note: "" }));
    expect(result.ok).toBe(false);
  });

  test("rejects a note longer than the pointer ceiling (ghostwriting guard)", () => {
    const longNote = `${"x".repeat(NOTE_MAX_CHARS + 1)}?`;
    const result = validateFinding(finding({ note: longNote }));
    expect(result.ok).toBe(false);
  });

  test("rejects a sourced finding with no source span", () => {
    const result = validateFinding(
      finding({ kind: "citation", tier: "sourced", note: "Grounds the claim." }),
    );
    expect(result.ok).toBe(false);
  });

  test("accepts a sourced finding that carries its source", () => {
    const result = validateFinding(
      finding({
        kind: "citation",
        tier: "sourced",
        note: "This source makes a closely related claim worth grounding against.",
        source: {
          title: "A study",
          url: "https://example.org",
          span: "relevant excerpt",
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  test("rejects a citation that isn't sourced (no speculative attribution)", () => {
    const result = validateFinding(
      finding({ kind: "citation", tier: "inferred", note: "Grounds the claim." }),
    );
    expect(result.ok).toBe(false);
  });

  test("rejects further-reading that isn't sourced", () => {
    const result = validateFinding(
      finding({
        kind: "further-reading",
        tier: "inferred",
        note: "Worth reading more on this.",
      }),
    );
    expect(result.ok).toBe(false);
  });

  test("rejects a counter-position phrased as a verdict, not a question", () => {
    const result = validateFinding(
      finding({
        kind: "counter-position",
        note: "This position is simply wrong.",
      }),
    );
    expect(result.ok).toBe(false);
  });

  test("accepts a counter-position posed as a question", () => {
    const result = validateFinding(
      finding({
        kind: "counter-position",
        note: "What is the strongest honest case against this?",
      }),
    );
    expect(result.ok).toBe(true);
  });
});
