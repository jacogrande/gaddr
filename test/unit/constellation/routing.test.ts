import { describe, expect, test } from "bun:test";
import {
  escalatingSignals,
  shouldEscalate,
} from "../../../src/domain/constellation/routing";
import type { TriageResult } from "../../../src/domain/constellation/types";

function triage(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    intent: "testing",
    themeDelta: "none",
    retrievalSignals: [],
    tier: "inferred",
    ...overrides,
  };
}

describe("shouldEscalate", () => {
  test("does not escalate a bare testing burst with no signals", () => {
    expect(shouldEscalate(triage())).toBe(false);
  });

  test("escalates on a retrieval-worthy signal", () => {
    expect(
      shouldEscalate(triage({ retrievalSignals: ["near-citation"] })),
    ).toBe(true);
  });

  test("escalates an asserting burst even without an explicit signal", () => {
    expect(shouldEscalate(triage({ intent: "asserting" }))).toBe(true);
  });

  test("does not escalate on emotional-marker or topic-shift alone", () => {
    expect(
      shouldEscalate(
        triage({ retrievalSignals: ["emotional-marker", "topic-shift"] }),
      ),
    ).toBe(false);
  });

  test("escalates a wondering burst that carries a named entity", () => {
    expect(
      shouldEscalate(
        triage({ intent: "wondering", retrievalSignals: ["named-entity"] }),
      ),
    ).toBe(true);
  });
});

describe("escalatingSignals", () => {
  test("returns only the signals that justify escalation", () => {
    expect(
      escalatingSignals(
        triage({
          retrievalSignals: [
            "emotional-marker",
            "near-citation",
            "topic-shift",
            "backtrack",
          ],
        }),
      ),
    ).toEqual(["near-citation", "backtrack"]);
  });
});
