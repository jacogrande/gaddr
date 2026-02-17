import { describe, expect, test } from "bun:test";
import { validateArtifact } from "../../../src/domain/review/constraints";
import { extractEssayText } from "../../../src/domain/essay/operations";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { ReviewEvent } from "../../../src/domain/review/review";
import type { TipTapDoc } from "../../../src/domain/essay/essay";

// ── validateArtifact: InlineComment ──

describe("validateArtifact — InlineComment", () => {
  test("accepts valid inline comment with coaching language", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "The data clearly shows",
        problem: "Vague claim without specific reference",
        why: "Readers cannot verify claims without specifics",
        question: "Which data set are you referring to?",
        suggestedAction: "Consider specifying the exact source or study",
      },
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("rejects inline comment with 'Replace with:' in suggestedAction", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "The data clearly shows",
        problem: "Vague claim",
        why: "Needs specifics",
        question: "Which data?",
        suggestedAction: "Replace with: The 2024 Pew Research study demonstrates",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("rejects inline comment with 'Rewrite as:' in suggestedAction", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "stuff happens",
        problem: "Informal tone",
        why: "Undermines credibility",
        question: "Can you formalize this?",
        suggestedAction: "Rewrite as: Events unfold in a predictable pattern",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("rejects inline comment with backtick sentence in suggestedAction", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "test",
        problem: "problem",
        why: "why",
        question: "question?",
        suggestedAction:
          "Consider using `The evidence from multiple studies clearly supports this conclusion` instead",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("rejects inline comment with replacement prose in 'problem' field", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "The thing is important",
        problem: "Try: The significance of this finding cannot be overstated",
        why: "Vague language",
        question: "What specifically is important?",
        suggestedAction: "Be more specific about the importance",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("rejects inline comment with replacement prose in 'why' field", () => {
    const event: ReviewEvent = {
      type: "inline_comment",
      data: {
        quotedText: "test",
        problem: "Weak phrasing",
        why: "Change to: A stronger opening would establish immediate credibility with the reader",
        question: "How could you strengthen this?",
        suggestedAction: "Rephrase the opening",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });
});

// ── validateArtifact: ReviewIssue ──

describe("validateArtifact — ReviewIssue", () => {
  test("accepts valid review issue", () => {
    const event: ReviewEvent = {
      type: "issue",
      data: {
        tag: "evidence",
        severity: "high",
        description: "No sources cited for central claim",
        suggestedAction: "Add at least one supporting citation",
      },
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("rejects review issue with replacement prose in suggestedAction", () => {
    const event: ReviewEvent = {
      type: "issue",
      data: {
        tag: "clarity",
        severity: "medium",
        description: "Opening sentence is weak",
        suggestedAction: "Change to: A compelling introduction draws the reader in immediately",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });

  test("rejects review issue with replacement prose in description", () => {
    const event: ReviewEvent = {
      type: "issue",
      data: {
        tag: "structure",
        severity: "high",
        description: "Replace with: The essay should open with a clear thesis statement followed by evidence",
        suggestedAction: "Reorganize the opening section",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });
});

// ── validateArtifact: SocraticQuestion ──

describe("validateArtifact — SocraticQuestion", () => {
  test("accepts question ending with ?", () => {
    const event: ReviewEvent = {
      type: "question",
      data: {
        question: "What evidence would change your mind?",
        context: "The essay presents a one-sided argument",
      },
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("rejects question not ending with ?", () => {
    const event: ReviewEvent = {
      type: "question",
      data: {
        question: "Think about what evidence would change your mind",
        context: "The essay presents a one-sided argument",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });
});

// ── validateArtifact: RubricScore ──

describe("validateArtifact — RubricScore", () => {
  test("accepts valid rubric score with clean rationale", () => {
    const event: ReviewEvent = {
      type: "rubric_score",
      data: {
        dimension: "clarity",
        score: 4,
        rationale: "Clear thesis with well-structured paragraphs",
      },
    };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("rejects rubric score with replacement prose in rationale", () => {
    const event: ReviewEvent = {
      type: "rubric_score",
      data: {
        dimension: "argument",
        score: 2,
        rationale: "Try: The author should have started with a clear claim and built toward the evidence systematically",
      },
    };
    const result = validateArtifact(event);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("AuthorshipViolation");
    }
  });
});

// ── validateArtifact: passthrough events ──

describe("validateArtifact — passthrough events", () => {
  test("done event passes through", () => {
    const event: ReviewEvent = { type: "done" };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });

  test("error event passes through", () => {
    const event: ReviewEvent = { type: "error", message: "API limit reached" };
    const result = validateArtifact(event);
    expect(isOk(result)).toBe(true);
  });
});

// ── extractEssayText ──

describe("extractEssayText", () => {
  test("extracts text from doc with mixed formatting", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "My Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const text = extractEssayText(doc);
    expect(text).toContain("My Title");
    expect(text).toContain("First paragraph.");
    expect(text).toContain("Item one");
  });

  test("returns empty string for empty doc", () => {
    const doc: TipTapDoc = { type: "doc" };
    expect(extractEssayText(doc)).toBe("");
  });
});
