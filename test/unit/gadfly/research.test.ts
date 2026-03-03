import { describe, expect, test } from "bun:test";
import {
  extractResearchQuestionCandidates,
  isPrimaryResearchQuestionRequest,
  isResearchQuestionCandidate,
  shouldEnableResearchForRequest,
} from "../../../src/domain/gadfly/research";

describe("gadfly research question detection", () => {
  test("detects explicit user curiosity questions", () => {
    expect(
      isResearchQuestionCandidate("I wonder why new headlights are so bright?"),
    ).toBe(true);
    expect(
      isResearchQuestionCandidate("Why are new headlights so bright?"),
    ).toBe(true);
  });

  test("ignores generic argumentative vocabulary without an explicit question", () => {
    expect(
      isResearchQuestionCandidate("This essay needs better evidence and more research to support its claims."),
    ).toBe(false);
    expect(
      isResearchQuestionCandidate("What evidence best supports this claim?"),
    ).toBe(false);
  });

  test("extracts sentence-like question candidates from context text", () => {
    expect(
      extractResearchQuestionCandidates(
        "The draft meanders. I wonder why new headlights are so bright? That detail keeps bothering me.",
      ),
    ).toContain("I wonder why new headlights are so bright?");
  });

  test("enables research only when a context window contains a real-world question", () => {
    expect(
      shouldEnableResearchForRequest({
        noteId: "note-1",
        docVersion: 1,
        changedRanges: [{ from: 0, to: 20 }],
        plainText: "I wonder why new headlights are so bright?",
        contextWindow: [
          {
            from: 0,
            to: 44,
            text: "I wonder why new headlights are so bright?",
          },
        ],
      }),
    ).toBe(true);

    expect(
      shouldEnableResearchForRequest({
        noteId: "note-1",
        docVersion: 1,
        changedRanges: [{ from: 0, to: 20 }],
        plainText: "This argument needs more evidence and research.",
        contextWindow: [
          {
            from: 0,
            to: 45,
            text: "This argument needs more evidence and research.",
          },
        ],
      }),
    ).toBe(false);
  });

  test("treats a direct knowledge question as research-first even with minor wording issues", () => {
    expect(
      isPrimaryResearchQuestionRequest({
        noteId: "note-1",
        docVersion: 1,
        changedRanges: [{ from: 0, to: 39 }],
        plainText: "Why are headlights so bright now adays?",
        contextWindow: [
          {
            from: 0,
            to: 40,
            text: "Why are headlights so bright now adays?",
          },
        ],
      }),
    ).toBe(true);
  });
});
