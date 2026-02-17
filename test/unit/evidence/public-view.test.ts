import { describe, expect, test } from "bun:test";
import {
  groupEvidenceByBlock,
  buildPublishedEssayView,
} from "../../../src/domain/evidence/public-view";
import type { ClaimEvidenceLinkWithCard } from "../../../src/domain/evidence/repository";
import type { TipTapDoc } from "../../../src/domain/essay/essay";
import type {
  ClaimEvidenceLinkId,
  EssayId,
  EvidenceCardId,
  UserId,
} from "../../../src/domain/types/branded";

const ESSAY_ID = "770e8400-e29b-41d4-a716-446655440000" as EssayId;
const USER_ID = "test-user-123" as UserId;
const NOW = new Date("2026-01-15T12:00:00Z");

function makeLink(
  index: number,
  overrides?: Partial<ClaimEvidenceLinkWithCard>,
): ClaimEvidenceLinkWithCard {
  const id = `${String(index).padStart(8, "0")}-e29b-41d4-a716-446655440000`;
  const cardId = `${String(index).padStart(8, "0")}-e29b-41d4-a716-446655440001`;
  return {
    id: id as ClaimEvidenceLinkId,
    essayId: ESSAY_ID,
    evidenceCardId: cardId as EvidenceCardId,
    userId: USER_ID,
    claimText: `Claim ${String(index)}`,
    anchorBlockIndex: index,
    createdAt: NOW,
    card: {
      id: cardId as EvidenceCardId,
      userId: USER_ID,
      sourceUrl: `https://example.com/${String(index)}`,
      sourceTitle: `Source ${String(index)}`,
      quoteSnippet: `Quote ${String(index)}`,
      userSummary: null,
      caveats: null,
      stance: "supports",
      createdAt: NOW,
      updatedAt: NOW,
    },
    ...overrides,
  };
}

function makeDoc(blockCount: number): TipTapDoc {
  return {
    type: "doc",
    content: Array.from({ length: blockCount }, (_, i) => ({
      type: "paragraph",
      content: [{ type: "text", text: `Paragraph ${String(i)}` }],
    })),
  };
}

// ── groupEvidenceByBlock ──

describe("groupEvidenceByBlock", () => {
  test("groups links by block index correctly", () => {
    const links = [
      makeLink(0),
      makeLink(1),
      makeLink(0, {
        id: "99999999-e29b-41d4-a716-446655440000" as ClaimEvidenceLinkId,
        claimText: "Another claim at block 0",
      }),
    ];

    const record = groupEvidenceByBlock(links);
    expect(Object.keys(record).length).toBe(2);
    expect(record[0]?.length).toBe(2);
    expect(record[1]?.length).toBe(1);
  });

  test("returns empty record for empty input", () => {
    const record = groupEvidenceByBlock([]);
    expect(Object.keys(record).length).toBe(0);
  });

  test("preserves order within blocks", () => {
    const link1 = makeLink(0);
    const link2 = makeLink(0, {
      id: "99999999-e29b-41d4-a716-446655440000" as ClaimEvidenceLinkId,
      claimText: "Second claim",
    });

    const record = groupEvidenceByBlock([link1, link2]);
    const block0 = record[0];
    expect(block0?.[0]?.claimText).toBe("Claim 0");
    expect(block0?.[1]?.claimText).toBe("Second claim");
  });
});

// ── buildPublishedEssayView ──

describe("buildPublishedEssayView", () => {
  test("filters orphaned links (anchorBlockIndex >= block count)", () => {
    const doc = makeDoc(2); // blocks at index 0, 1
    const links = [makeLink(0), makeLink(1), makeLink(5)]; // index 5 is orphaned

    const view = buildPublishedEssayView({ title: "Test", doc, links });
    expect(view.evidenceCount).toBe(2);
    expect(view.evidenceByBlock[5]).toBeUndefined();
  });

  test("sets hasEvidence false when no links", () => {
    const doc = makeDoc(3);
    const view = buildPublishedEssayView({ title: "Test", doc, links: [] });
    expect(view.hasEvidence).toBe(false);
    expect(view.evidenceCount).toBe(0);
  });

  test("sets correct evidenceCount", () => {
    const doc = makeDoc(3);
    const links = [makeLink(0), makeLink(1), makeLink(2)];
    const view = buildPublishedEssayView({ title: "Test", doc, links });
    expect(view.evidenceCount).toBe(3);
    expect(view.hasEvidence).toBe(true);
  });

  test("handles doc with no content blocks", () => {
    const doc: TipTapDoc = { type: "doc" };
    const links = [makeLink(0)];
    const view = buildPublishedEssayView({ title: "Test", doc, links });
    expect(view.evidenceCount).toBe(0);
    expect(view.hasEvidence).toBe(false);
    expect(Object.keys(view.evidenceByBlock).length).toBe(0);
  });
});
