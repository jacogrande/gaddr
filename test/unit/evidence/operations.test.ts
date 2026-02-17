import { describe, expect, test } from "bun:test";
import {
  createEvidenceCard,
  updateEvidenceCard,
  createClaimEvidenceLink,
  MAX_SOURCE_TITLE_LENGTH,
  MAX_QUOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_CAVEATS_LENGTH,
  MAX_CLAIM_TEXT_LENGTH,
} from "../../../src/domain/evidence/operations";
import { isOk, isErr } from "../../../src/domain/types/result";
import type { EvidenceCard } from "../../../src/domain/evidence/evidence-card";
import type { EvidenceCardId, ClaimEvidenceLinkId, EssayId } from "../../../src/domain/types/branded";
import type { UserId } from "../../../src/domain/types/branded";

const CARD_ID = "550e8400-e29b-41d4-a716-446655440000" as EvidenceCardId;
const LINK_ID = "660e8400-e29b-41d4-a716-446655440000" as ClaimEvidenceLinkId;
const ESSAY_ID = "770e8400-e29b-41d4-a716-446655440000" as EssayId;
const USER_ID = "test-user-123" as UserId;
const NOW = new Date("2026-01-15T12:00:00Z");
const LATER = new Date("2026-01-15T12:05:00Z");

function makeCard(overrides?: Partial<EvidenceCard>): EvidenceCard {
  return {
    id: CARD_ID,
    userId: USER_ID,
    sourceUrl: "https://example.com/article",
    sourceTitle: "Example Article",
    quoteSnippet: "An important quote",
    userSummary: null,
    caveats: null,
    stance: "supports",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ── createEvidenceCard ──

describe("createEvidenceCard", () => {
  test("creates card with quote only", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "A quote",
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.quoteSnippet).toBe("A quote");
      expect(result.value.userSummary).toBeNull();
    }
  });

  test("creates card with summary only", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: null,
      userSummary: "My summary",
      caveats: null,
      stance: "contradicts",
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.quoteSnippet).toBeNull();
      expect(result.value.userSummary).toBe("My summary");
      expect(result.value.stance).toBe("contradicts");
    }
  });

  test("creates card with both quote and summary", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "Quote",
      userSummary: "Summary",
      caveats: "Some caveats",
      stance: "complicates",
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.caveats).toBe("Some caveats");
      expect(result.value.stance).toBe("complicates");
    }
  });

  test("rejects when neither quote nor summary", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: null,
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("quoteSnippet");
    }
  });

  test("rejects whitespace-only quote and summary", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "   ",
      userSummary: "   ",
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
  });

  test("rejects invalid URL", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "not-a-url",
      sourceTitle: "Title",
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("sourceUrl");
    }
  });

  test("rejects empty title", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "",
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("sourceTitle");
    }
  });

  test("rejects title exceeding max length", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "a".repeat(MAX_SOURCE_TITLE_LENGTH + 1),
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("sourceTitle");
    }
  });

  test("rejects quote exceeding max length", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "a".repeat(MAX_QUOTE_LENGTH + 1),
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("quoteSnippet");
    }
  });

  test("rejects summary exceeding max length", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: null,
      userSummary: "a".repeat(MAX_SUMMARY_LENGTH + 1),
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("userSummary");
    }
  });

  test("rejects caveats exceeding max length", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: "a".repeat(MAX_CAVEATS_LENGTH + 1),
      stance: "supports",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("caveats");
    }
  });

  test("trims whitespace from title, quote, summary", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "  Trimmed Title  ",
      quoteSnippet: "  Trimmed quote  ",
      userSummary: "  Trimmed summary  ",
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.sourceTitle).toBe("Trimmed Title");
      expect(result.value.quoteSnippet).toBe("Trimmed quote");
      expect(result.value.userSummary).toBe("Trimmed summary");
    }
  });

  test("sets timestamps from now parameter", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: null,
      stance: "supports",
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.createdAt).toBe(NOW);
      expect(result.value.updatedAt).toBe(NOW);
    }
  });

  test("rejects invalid stance", () => {
    const result = createEvidenceCard({
      id: CARD_ID,
      userId: USER_ID,
      sourceUrl: "https://example.com",
      sourceTitle: "Title",
      quoteSnippet: "Quote",
      userSummary: null,
      caveats: null,
      stance: "invalid",
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("stance");
    }
  });
});

// ── updateEvidenceCard ──

describe("updateEvidenceCard", () => {
  test("updates a single field", () => {
    const card = makeCard();
    const result = updateEvidenceCard(card, { sourceTitle: "New Title", now: LATER });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.sourceTitle).toBe("New Title");
      expect(result.value.sourceUrl).toBe(card.sourceUrl);
    }
  });

  test("updates stance", () => {
    const card = makeCard();
    const result = updateEvidenceCard(card, { stance: "contradicts", now: LATER });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.stance).toBe("contradicts");
    }
  });

  test("preserves validation on update", () => {
    const card = makeCard();
    const result = updateEvidenceCard(card, { sourceTitle: "", now: LATER });
    expect(isErr(result)).toBe(true);
  });

  test("changes updatedAt but not createdAt", () => {
    const card = makeCard();
    const result = updateEvidenceCard(card, { sourceTitle: "New", now: LATER });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.createdAt).toBe(NOW);
      expect(result.value.updatedAt).toBe(LATER);
    }
  });

  test("rejects removing both quote and summary", () => {
    const card = makeCard({ quoteSnippet: "Quote", userSummary: null });
    const result = updateEvidenceCard(card, { quoteSnippet: null, now: LATER });
    expect(isErr(result)).toBe(true);
  });
});

// ── createClaimEvidenceLink ──

describe("createClaimEvidenceLink", () => {
  test("creates valid link", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "This is a claim",
      anchorBlockIndex: 0,
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.claimText).toBe("This is a claim");
      expect(result.value.anchorBlockIndex).toBe(0);
    }
  });

  test("rejects empty claim text", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "",
      anchorBlockIndex: 0,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("claimText");
    }
  });

  test("rejects claim text exceeding max length", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "a".repeat(MAX_CLAIM_TEXT_LENGTH + 1),
      anchorBlockIndex: 0,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
  });

  test("rejects negative anchorBlockIndex", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "Claim",
      anchorBlockIndex: -1,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("anchorBlockIndex");
    }
  });

  test("rejects non-integer anchorBlockIndex", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "Claim",
      anchorBlockIndex: 1.5,
      now: NOW,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("anchorBlockIndex");
    }
  });

  test("trims claim text whitespace", () => {
    const result = createClaimEvidenceLink({
      id: LINK_ID,
      essayId: ESSAY_ID,
      evidenceCardId: CARD_ID,
      userId: USER_ID,
      claimText: "  Trimmed claim  ",
      anchorBlockIndex: 2,
      now: NOW,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.claimText).toBe("Trimmed claim");
    }
  });
});
