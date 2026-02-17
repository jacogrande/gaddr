import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { evidenceCard, claimEvidenceLink, essay } from "../db/schema";
import type { EvidenceCardRepository, ClaimEvidenceLinkWithCard } from "../../domain/evidence/repository";
import type { EvidenceCard } from "../../domain/evidence/evidence-card";
import type { ClaimEvidenceLink } from "../../domain/evidence/claim-evidence-link";
import { STANCES } from "../../domain/evidence/evidence-card";
import { evidenceCardId, claimEvidenceLinkId, essayId, userId } from "../../domain/types/branded";
import type { EvidenceCardId, ClaimEvidenceLinkId, EssayId } from "../../domain/types/branded";
import type { UserId } from "../../domain/types/branded";
import type { NotFoundError, PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err, isErr } from "../../domain/types/result";

// ── Row mapping ──

type CardRow = typeof evidenceCard.$inferSelect;
type LinkRow = typeof claimEvidenceLink.$inferSelect;

function cardToDomain(row: CardRow): Result<EvidenceCard, PersistenceError> {
  const eid = evidenceCardId(row.id);
  if (isErr(eid)) {
    return err({ kind: "PersistenceError", message: `Invalid evidence card ID in row: ${row.id}` });
  }
  const uid = userId(row.userId);
  if (isErr(uid)) {
    return err({ kind: "PersistenceError", message: `Invalid user ID in row: ${row.userId}` });
  }
  const stance = STANCES.find((s) => s === row.stance);
  if (!stance) {
    return err({ kind: "PersistenceError", message: `Invalid stance in row: ${row.stance}` });
  }
  return ok({
    id: eid.value,
    userId: uid.value,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    quoteSnippet: row.quoteSnippet,
    userSummary: row.userSummary,
    caveats: row.caveats,
    stance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function cardToRow(card: EvidenceCard) {
  return {
    id: card.id as string,
    userId: card.userId as string,
    sourceUrl: card.sourceUrl,
    sourceTitle: card.sourceTitle,
    quoteSnippet: card.quoteSnippet,
    userSummary: card.userSummary,
    caveats: card.caveats,
    stance: card.stance,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function linkToDomain(row: LinkRow): Result<ClaimEvidenceLink, PersistenceError> {
  const lid = claimEvidenceLinkId(row.id);
  if (isErr(lid)) {
    return err({ kind: "PersistenceError", message: `Invalid link ID in row: ${row.id}` });
  }
  const eid = essayId(row.essayId);
  if (isErr(eid)) {
    return err({ kind: "PersistenceError", message: `Invalid essay ID in row: ${row.essayId}` });
  }
  const ecid = evidenceCardId(row.evidenceCardId);
  if (isErr(ecid)) {
    return err({ kind: "PersistenceError", message: `Invalid evidence card ID in row: ${row.evidenceCardId}` });
  }
  const uid = userId(row.userId);
  if (isErr(uid)) {
    return err({ kind: "PersistenceError", message: `Invalid user ID in row: ${row.userId}` });
  }
  return ok({
    id: lid.value,
    essayId: eid.value,
    evidenceCardId: ecid.value,
    userId: uid.value,
    claimText: row.claimText,
    anchorBlockIndex: row.anchorBlockIndex,
    createdAt: row.createdAt,
  });
}

function linkToRow(link: ClaimEvidenceLink) {
  return {
    id: link.id as string,
    essayId: link.essayId as string,
    evidenceCardId: link.evidenceCardId as string,
    userId: link.userId as string,
    claimText: link.claimText,
    anchorBlockIndex: link.anchorBlockIndex,
    createdAt: link.createdAt,
  };
}

// ── Repository implementation ──

export const postgresEvidenceCardRepository: EvidenceCardRepository = {
  async save(card: EvidenceCard): Promise<Result<EvidenceCard, PersistenceError>> {
    try {
      const row = cardToRow(card);
      const [saved] = await db
        .insert(evidenceCard)
        .values(row)
        .onConflictDoUpdate({
          target: evidenceCard.id,
          set: {
            sourceUrl: row.sourceUrl,
            sourceTitle: row.sourceTitle,
            quoteSnippet: row.quoteSnippet,
            userSummary: row.userSummary,
            caveats: row.caveats,
            stance: row.stance,
            updatedAt: row.updatedAt,
          },
          setWhere: eq(evidenceCard.userId, row.userId),
        })
        .returning();
      if (!saved) {
        return err({ kind: "PersistenceError", message: "Insert returned no rows" });
      }
      return cardToDomain(saved);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to save evidence card", cause });
    }
  },

  async findById(
    id: EvidenceCardId,
    uid: UserId,
  ): Promise<Result<EvidenceCard, NotFoundError | PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(evidenceCard)
        .where(and(eq(evidenceCard.id, id), eq(evidenceCard.userId, uid)))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return err({ kind: "NotFoundError", entity: "EvidenceCard", id: id as string });
      }
      return cardToDomain(row);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to find evidence card", cause });
    }
  },

  async listByUser(
    uid: UserId,
  ): Promise<Result<readonly EvidenceCard[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(evidenceCard)
        .where(eq(evidenceCard.userId, uid))
        .orderBy(desc(evidenceCard.updatedAt));
      const cards: EvidenceCard[] = [];
      for (const row of rows) {
        const result = cardToDomain(row);
        if (isErr(result)) return result;
        cards.push(result.value);
      }
      return ok(cards);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to list evidence cards", cause });
    }
  },

  async delete(
    id: EvidenceCardId,
    uid: UserId,
  ): Promise<Result<void, NotFoundError | PersistenceError>> {
    try {
      const deleted = await db
        .delete(evidenceCard)
        .where(and(eq(evidenceCard.id, id), eq(evidenceCard.userId, uid)))
        .returning();
      if (deleted.length === 0) {
        return err({ kind: "NotFoundError", entity: "EvidenceCard", id: id as string });
      }
      return ok(undefined);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to delete evidence card", cause });
    }
  },

  async saveLink(
    link: ClaimEvidenceLink,
  ): Promise<Result<ClaimEvidenceLink, PersistenceError>> {
    try {
      const row = linkToRow(link);
      const [saved] = await db
        .insert(claimEvidenceLink)
        .values(row)
        .returning();
      if (!saved) {
        return err({ kind: "PersistenceError", message: "Insert returned no rows" });
      }
      return linkToDomain(saved);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to save claim-evidence link", cause });
    }
  },

  async deleteLink(
    id: ClaimEvidenceLinkId,
    eid: EssayId,
    uid: UserId,
  ): Promise<Result<void, NotFoundError | PersistenceError>> {
    try {
      const deleted = await db
        .delete(claimEvidenceLink)
        .where(and(
          eq(claimEvidenceLink.id, id),
          eq(claimEvidenceLink.essayId, eid),
          eq(claimEvidenceLink.userId, uid),
        ))
        .returning();
      if (deleted.length === 0) {
        return err({ kind: "NotFoundError", entity: "ClaimEvidenceLink", id: id as string });
      }
      return ok(undefined);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to delete claim-evidence link", cause });
    }
  },

  async findLinksByEssay(
    eid: EssayId,
    uid: UserId,
  ): Promise<Result<readonly ClaimEvidenceLink[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(claimEvidenceLink)
        .where(and(eq(claimEvidenceLink.essayId, eid), eq(claimEvidenceLink.userId, uid)));
      const links: ClaimEvidenceLink[] = [];
      for (const row of rows) {
        const result = linkToDomain(row);
        if (isErr(result)) return result;
        links.push(result.value);
      }
      return ok(links);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to find links by essay", cause });
    }
  },

  async findLinksWithCardsByEssay(
    eid: EssayId,
    uid: UserId,
  ): Promise<Result<readonly ClaimEvidenceLinkWithCard[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(claimEvidenceLink)
        .innerJoin(evidenceCard, eq(claimEvidenceLink.evidenceCardId, evidenceCard.id))
        .where(
          and(
            eq(claimEvidenceLink.essayId, eid),
            eq(claimEvidenceLink.userId, uid),
          ),
        )
        .orderBy(claimEvidenceLink.anchorBlockIndex);

      const results: ClaimEvidenceLinkWithCard[] = [];
      for (const row of rows) {
        const linkResult = linkToDomain(row.claim_evidence_link);
        if (isErr(linkResult)) return linkResult;
        const cardResult = cardToDomain(row.evidence_card);
        if (isErr(cardResult)) return cardResult;
        results.push({ ...linkResult.value, card: cardResult.value });
      }
      return ok(results);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to find links with cards", cause });
    }
  },

  async findPublishedEvidenceByEssay(
    eid: EssayId,
  ): Promise<Result<readonly ClaimEvidenceLinkWithCard[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(claimEvidenceLink)
        .innerJoin(evidenceCard, eq(claimEvidenceLink.evidenceCardId, evidenceCard.id))
        .innerJoin(essay, eq(claimEvidenceLink.essayId, essay.id))
        .where(
          and(
            eq(claimEvidenceLink.essayId, eid),
            eq(essay.status, "published"),
            eq(claimEvidenceLink.userId, essay.userId),
          ),
        )
        .orderBy(
          claimEvidenceLink.anchorBlockIndex,
          claimEvidenceLink.createdAt,
          claimEvidenceLink.id,
        );

      const results: ClaimEvidenceLinkWithCard[] = [];
      for (const row of rows) {
        const linkResult = linkToDomain(row.claim_evidence_link);
        if (isErr(linkResult)) return linkResult;
        const cardResult = cardToDomain(row.evidence_card);
        if (isErr(cardResult)) return cardResult;
        results.push({ ...linkResult.value, card: cardResult.value });
      }
      return ok(results);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to find published evidence", cause });
    }
  },
};
