import { describe, expect, test } from "bun:test";
import { checkCitationMismatches } from "../../../src/domain/evidence/citation-mismatch";
import type { LinkForMismatchCheck } from "../../../src/domain/evidence/citation-mismatch";
import type { TipTapDoc } from "../../../src/domain/essay/essay";
import type { Stance } from "../../../src/domain/evidence/evidence-card";

const LINK_ID = "660e8400-e29b-41d4-a716-446655440000";

function makeLink(
  overrides?: Partial<Omit<LinkForMismatchCheck, "card">>,
  cardOverrides?: Partial<LinkForMismatchCheck["card"]>,
): LinkForMismatchCheck {
  return {
    linkId: LINK_ID,
    claimText: "This is a claim",
    anchorBlockIndex: 0,
    ...overrides,
    card: {
      sourceTitle: "Example Source",
      stance: "supports" as Stance,
      ...cardOverrides,
    },
  };
}

function makeDoc(paragraphs: string[]): TipTapDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text.length > 0 ? [{ type: "text", text }] : undefined,
    })),
  };
}

describe("checkCitationMismatches", () => {
  test("returns empty for empty doc with no links", () => {
    const result = checkCitationMismatches({
      doc: { type: "doc" },
      links: [],
    });
    expect(result).toEqual([]);
  });

  test("returns empty for doc with no links and short paragraphs", () => {
    const result = checkCitationMismatches({
      doc: makeDoc(["Short text", "Also short"]),
      links: [],
    });
    expect(result).toEqual([]);
  });

  test("detects orphaned link when block index exceeds doc length", () => {
    const doc = makeDoc(["Only one paragraph here with some words."]);
    const link = makeLink({ anchorBlockIndex: 5 });

    const result = checkCitationMismatches({ doc, links: [link] });
    const orphaned = result.filter((m) => m.kind === "OrphanedLink");
    expect(orphaned.length).toBe(1);
    expect(orphaned[0]?.blockIndex).toBe(5);
    if (orphaned[0]?.kind === "OrphanedLink") {
      expect(orphaned[0].linkId).toBe(LINK_ID);
    }
  });

  test("detects stance mismatch for contradicts", () => {
    const doc = makeDoc(["A paragraph with enough words to test with."]);
    const link = makeLink({ anchorBlockIndex: 0 }, { stance: "contradicts" });

    const result = checkCitationMismatches({ doc, links: [link] });
    const stanceWarnings = result.filter((m) => m.kind === "StanceMismatch");
    expect(stanceWarnings.length).toBe(1);
    expect(stanceWarnings[0]?.kind === "StanceMismatch" && stanceWarnings[0].actualStance).toBe("contradicts");
  });

  test("detects stance mismatch for complicates", () => {
    const doc = makeDoc(["A paragraph with enough words to test with."]);
    const link = makeLink({ anchorBlockIndex: 0 }, { stance: "complicates" });

    const result = checkCitationMismatches({ doc, links: [link] });
    const stanceWarnings = result.filter((m) => m.kind === "StanceMismatch");
    expect(stanceWarnings.length).toBe(1);
    expect(stanceWarnings[0]?.kind === "StanceMismatch" && stanceWarnings[0].actualStance).toBe("complicates");
  });

  test("no stance mismatch for supports", () => {
    const doc = makeDoc(["A paragraph with enough words to test with."]);
    const link = makeLink({ anchorBlockIndex: 0 }, { stance: "supports" });

    const result = checkCitationMismatches({ doc, links: [link] });
    const stanceWarnings = result.filter((m) => m.kind === "StanceMismatch");
    expect(stanceWarnings.length).toBe(0);
  });

  test("detects unsupported claim for long paragraph without evidence", () => {
    const longParagraph =
      "This is a long paragraph that contains at least ten words to trigger the unsupported claim check.";
    const doc = makeDoc([longParagraph]);

    const result = checkCitationMismatches({ doc, links: [] });
    const unsupported = result.filter((m) => m.kind === "UnsupportedClaim");
    expect(unsupported.length).toBe(1);
    expect(unsupported[0]?.blockIndex).toBe(0);
  });

  test("does not flag short paragraphs as unsupported", () => {
    const doc = makeDoc(["Short text."]);
    const result = checkCitationMismatches({ doc, links: [] });
    const unsupported = result.filter((m) => m.kind === "UnsupportedClaim");
    expect(unsupported.length).toBe(0);
  });

  test("does not flag paragraphs with linked evidence as unsupported", () => {
    const longParagraph =
      "This is a long paragraph that contains at least ten words and has linked evidence.";
    const doc = makeDoc([longParagraph]);
    const link = makeLink({ anchorBlockIndex: 0 });

    const result = checkCitationMismatches({ doc, links: [link] });
    const unsupported = result.filter((m) => m.kind === "UnsupportedClaim");
    expect(unsupported.length).toBe(0);
  });

  test("handles mixed scenario with all mismatch types", () => {
    const longParagraph =
      "This is a long paragraph that contains more than ten words and has no evidence attached at all.";
    const doc = makeDoc([
      "First paragraph with enough words to test the system works.",
      longParagraph,
    ]);

    const orphanedLink = makeLink(
      { anchorBlockIndex: 10, claimText: "Orphaned claim" },
    );
    const contradictLink = makeLink(
      { anchorBlockIndex: 0, claimText: "Contradicted claim" },
      { stance: "contradicts" },
    );

    const result = checkCitationMismatches({
      doc,
      links: [orphanedLink, contradictLink],
    });

    const kinds = result.map((m) => m.kind);
    expect(kinds).toContain("OrphanedLink");
    expect(kinds).toContain("StanceMismatch");
    expect(kinds).toContain("UnsupportedClaim");
  });

  test("does not flag heading blocks as unsupported", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [
            {
              type: "text",
              text: "This heading has more than ten words and should not be flagged as unsupported claim.",
            },
          ],
        },
      ],
    };

    const result = checkCitationMismatches({ doc, links: [] });
    const unsupported = result.filter((m) => m.kind === "UnsupportedClaim");
    expect(unsupported.length).toBe(0);
  });
});
