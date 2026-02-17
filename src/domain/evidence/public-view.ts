// Public view model for evidence on published essay pages — pure domain logic

import type { TipTapDoc } from "../essay/essay";
import type { Stance } from "./evidence-card";
import type { ClaimEvidenceLinkWithCard } from "./repository";
import type { ClaimEvidenceLinkId, EvidenceCardId } from "../types/branded";

export type PublicEvidenceAttachment = {
  readonly linkId: ClaimEvidenceLinkId;
  readonly claimText: string;
  readonly anchorBlockIndex: number;
  readonly card: {
    readonly id: EvidenceCardId;
    readonly sourceUrl: string;
    readonly sourceTitle: string;
    readonly quoteSnippet: string | null;
    readonly userSummary: string | null;
    readonly caveats: string | null;
    readonly stance: Stance;
  };
};

export type EvidenceByBlock = Readonly<Record<number, readonly PublicEvidenceAttachment[]>>;

export type PublishedEssayView = {
  readonly title: string;
  readonly doc: TipTapDoc;
  readonly evidenceByBlock: EvidenceByBlock;
  readonly evidenceCount: number;
  readonly hasEvidence: boolean;
};

export function groupEvidenceByBlock(
  links: readonly ClaimEvidenceLinkWithCard[],
): EvidenceByBlock {
  const record: Record<number, PublicEvidenceAttachment[]> = {};

  for (const link of links) {
    const attachment: PublicEvidenceAttachment = {
      linkId: link.id,
      claimText: link.claimText,
      anchorBlockIndex: link.anchorBlockIndex,
      card: {
        id: link.card.id,
        sourceUrl: link.card.sourceUrl,
        sourceTitle: link.card.sourceTitle,
        quoteSnippet: link.card.quoteSnippet,
        userSummary: link.card.userSummary,
        caveats: link.card.caveats,
        stance: link.card.stance,
      },
    };

    const existing = record[link.anchorBlockIndex];
    if (existing) {
      existing.push(attachment);
    } else {
      record[link.anchorBlockIndex] = [attachment];
    }
  }

  return record;
}

// Caller must provide a validated TipTapDoc (e.g. from the essay repository).
// This function treats `doc` as a pass-through — it reads `content.length`
// for orphan filtering but does not validate the document structure.
export function buildPublishedEssayView(params: {
  title: string;
  doc: TipTapDoc;
  links: readonly ClaimEvidenceLinkWithCard[];
}): PublishedEssayView {
  const blockCount = params.doc.content?.length ?? 0;

  // Filter orphaned links whose anchorBlockIndex >= block count
  const validLinks = params.links.filter(
    (link) => link.anchorBlockIndex >= 0 && link.anchorBlockIndex < blockCount,
  );

  const evidenceByBlock = groupEvidenceByBlock(validLinks);

  return {
    title: params.title,
    doc: params.doc,
    evidenceByBlock,
    evidenceCount: validLinks.length,
    hasEvidence: validLinks.length > 0,
  };
}
