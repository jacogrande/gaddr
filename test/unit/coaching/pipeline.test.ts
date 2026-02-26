import { describe, expect, test } from "bun:test";
import {
  prepareCoachingRequest,
  validateCoachingResult,
  coachingNoteKey,
  MAX_COACHING_NOTES,
} from "../../../src/domain/coaching/pipeline";
import type { CoachingNote, CoachingResult } from "../../../src/domain/coaching/coaching";
import type { DetectedClaim } from "../../../src/domain/claims/claim";

const KNOWN_CLAIMS: readonly DetectedClaim[] = [
  { quotedText: "Global temperatures have risen", claimType: "factual", confidence: 0.95 },
  { quotedText: "This leads to flooding", claimType: "causal", confidence: 0.85 },
  { quotedText: "Carbon pricing is most effective", claimType: "evaluative", confidence: 0.71 },
];

// ── prepareCoachingRequest ──

describe("prepareCoachingRequest", () => {
  test("rejects empty claims array", () => {
    const result = prepareCoachingRequest("Some essay text here", []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.message).toContain("claim");
    }
  });

  test("accepts valid input with claims", () => {
    const result = prepareCoachingRequest("Some essay text", KNOWN_CLAIMS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.essayText).toBe("Some essay text");
      expect(result.value.claims).toHaveLength(3);
    }
  });

  test("caps claims at MAX_COACHING_NOTES, keeping highest confidence", () => {
    const manyClaims: DetectedClaim[] = Array.from(
      { length: MAX_COACHING_NOTES + 3 },
      (_, i): DetectedClaim => ({
        quotedText: `Claim ${String(i)}`,
        claimType: "factual",
        confidence: i * 0.1, // 0.0, 0.1, 0.2, ...
      }),
    );
    const result = prepareCoachingRequest("Some essay text", manyClaims);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claims).toHaveLength(MAX_COACHING_NOTES);
      // Should be sorted by confidence descending
      const confidences = result.value.claims.map((c) => c.confidence);
      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i - 1]).toBeGreaterThanOrEqual(confidences[i] ?? 0);
      }
    }
  });

  test("passes all claims through when under cap", () => {
    const result = prepareCoachingRequest("Some essay text", KNOWN_CLAIMS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Under cap, original order preserved
      expect(result.value.claims).toHaveLength(KNOWN_CLAIMS.length);
      expect(result.value.claims[0]?.quotedText).toBe("Global temperatures have risen");
    }
  });
});

// ── validateCoachingResult ──

describe("validateCoachingResult", () => {
  test("filters notes with empty claimQuotedText", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "Got a source?", category: "needs-evidence" },
        { claimQuotedText: "", note: "Some note", category: "logic-gap" },
        { claimQuotedText: "   ", note: "Another note", category: "strong-point" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.claimQuotedText).toBe("Global temperatures have risen");
  });

  test("filters notes with empty note text", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "Good note", category: "needs-evidence" },
        { claimQuotedText: "This leads to flooding", note: "", category: "logic-gap" },
        { claimQuotedText: "Carbon pricing is most effective", note: "   ", category: "strong-point" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(1);
  });

  test("filters notes whose claimQuotedText doesn't match any known claim", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "Got a source?", category: "needs-evidence" },
        { claimQuotedText: "Unknown claim text", note: "This is unmatched", category: "counterargument" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.claimQuotedText).toBe("Global temperatures have risen");
  });

  test("deduplicates by normalized claimQuotedText + category", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "First note", category: "needs-evidence" },
        { claimQuotedText: "global temperatures have risen", note: "Duplicate note", category: "needs-evidence" },
        { claimQuotedText: "  Global  Temperatures  Have  Risen  ", note: "Another dup", category: "needs-evidence" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.note).toBe("First note");
  });

  test("normalizes claimQuotedText to match original claim casing", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "global temperatures have risen", note: "Got a source?", category: "needs-evidence" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(1);
    // Should restore to original casing from KNOWN_CLAIMS
    expect(result.notes[0]?.claimQuotedText).toBe("Global temperatures have risen");
  });

  test("allows same claim with different categories", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "Got a source?", category: "needs-evidence" },
        { claimQuotedText: "Global temperatures have risen", note: "Nice work!", category: "strong-point" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(2);
  });

  test("caps at MAX_COACHING_NOTES", () => {
    const categories: CoachingNote["category"][] = ["needs-evidence", "counterargument", "logic-gap", "strong-point"];
    const notes: CoachingNote[] = [];
    for (let i = 0; i < MAX_COACHING_NOTES + 3; i++) {
      const claim = KNOWN_CLAIMS[i % KNOWN_CLAIMS.length];
      const cat = categories[i % categories.length];
      if (claim && cat) {
        notes.push({
          claimQuotedText: claim.quotedText,
          note: `Note ${String(i)}`,
          category: cat,
        });
      }
    }
    const result = validateCoachingResult({ notes }, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(MAX_COACHING_NOTES);
  });

  test("passes through valid notes unchanged", () => {
    const input: CoachingResult = {
      notes: [
        { claimQuotedText: "Global temperatures have risen", note: "Got a source?", category: "needs-evidence" },
        { claimQuotedText: "This leads to flooding", note: "What would a skeptic say?", category: "counterargument" },
      ],
    };
    const result = validateCoachingResult(input, KNOWN_CLAIMS);
    expect(result.notes).toHaveLength(2);
  });
});

// ── coachingNoteKey ──

describe("coachingNoteKey", () => {
  test("normalizes whitespace and lowercases", () => {
    const note: CoachingNote = {
      claimQuotedText: "  Multiple   Spaces   Here  ",
      note: "Some note",
      category: "needs-evidence",
    };
    expect(coachingNoteKey(note)).toBe("multiple spaces here::needs-evidence");
  });

  test("includes category in key", () => {
    const note: CoachingNote = {
      claimQuotedText: "Same claim",
      note: "Some note",
      category: "counterargument",
    };
    expect(coachingNoteKey(note)).toBe("same claim::counterargument");
  });

  test("different categories produce different keys", () => {
    const base = { claimQuotedText: "Same claim", note: "Note" };
    const key1 = coachingNoteKey({ ...base, category: "needs-evidence" });
    const key2 = coachingNoteKey({ ...base, category: "strong-point" });
    expect(key1).not.toBe(key2);
  });
});
