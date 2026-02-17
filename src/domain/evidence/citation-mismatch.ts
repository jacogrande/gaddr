// Citation mismatch detection — pure function, no side effects

import type { TipTapDoc, TipTapNode } from "../essay/essay";
import type { Stance } from "./evidence-card";

// Narrow input — only the fields actually used by mismatch detection
export type LinkForMismatchCheck = {
  readonly linkId: string;
  readonly claimText: string;
  readonly anchorBlockIndex: number;
  readonly card: {
    readonly sourceTitle: string;
    readonly stance: Stance;
  };
};

export type CitationMismatch =
  | {
      readonly kind: "UnsupportedClaim";
      readonly claimText: string;
      readonly blockIndex: number;
      readonly message: string;
    }
  | {
      readonly kind: "StanceMismatch";
      readonly claimText: string;
      readonly evidenceTitle: string;
      readonly actualStance: Stance;
      readonly message: string;
    }
  | {
      readonly kind: "OrphanedLink";
      readonly linkId: string;
      readonly claimText: string;
      readonly blockIndex: number;
      readonly message: string;
    };

function extractBlockText(node: TipTapNode): string {
  if (node.text !== undefined) return node.text;
  if (node.content) {
    return node.content.map((child) => extractBlockText(child)).join("");
  }
  return "";
}

const MIN_WORDS_FOR_UNSUPPORTED = 10;
const PROSE_BLOCK_TYPES = new Set(["paragraph"]);

export function checkCitationMismatches(params: {
  doc: TipTapDoc;
  links: readonly LinkForMismatchCheck[];
}): CitationMismatch[] {
  const { doc, links } = params;
  const mismatches: CitationMismatch[] = [];
  const blockCount = doc.content?.length ?? 0;

  // 1. OrphanedLink — link's anchorBlockIndex >= doc block count
  for (const link of links) {
    if (link.anchorBlockIndex >= blockCount) {
      mismatches.push({
        kind: "OrphanedLink",
        linkId: link.linkId,
        claimText: link.claimText,
        blockIndex: link.anchorBlockIndex,
        message: `Evidence link for "${link.claimText}" refers to a block that no longer exists`,
      });
    }
  }

  // 2. StanceMismatch — evidence stance is "complicates" or "contradicts"
  for (const link of links) {
    if (link.card.stance === "complicates" || link.card.stance === "contradicts") {
      mismatches.push({
        kind: "StanceMismatch",
        claimText: link.claimText,
        evidenceTitle: link.card.sourceTitle,
        actualStance: link.card.stance,
        message:
          link.card.stance === "contradicts"
            ? `"${link.card.sourceTitle}" contradicts "${link.claimText}" — consider addressing this counterevidence`
            : `"${link.card.sourceTitle}" complicates "${link.claimText}" — consider acknowledging the nuance`,
      });
    }
  }

  // 3. UnsupportedClaim — paragraph blocks with >=10 words and no attached evidence
  // Headings, lists, and other non-paragraph blocks are intentionally excluded.
  if (doc.content) {
    const linkedBlockIndexes = new Set(
      links
        .filter((l) => l.anchorBlockIndex < blockCount)
        .map((l) => l.anchorBlockIndex),
    );

    for (let i = 0; i < doc.content.length; i++) {
      const block = doc.content[i];
      if (!block || !PROSE_BLOCK_TYPES.has(block.type)) continue;

      if (linkedBlockIndexes.has(i)) continue;

      const text = extractBlockText(block).trim();
      const wordCount = text.length === 0 ? 0 : text.split(/\s+/).length;

      if (wordCount >= MIN_WORDS_FOR_UNSUPPORTED) {
        const preview =
          text.length > 80 ? `${text.slice(0, 80)}...` : text;
        mismatches.push({
          kind: "UnsupportedClaim",
          claimText: preview,
          blockIndex: i,
          message: `Paragraph ${String(i + 1)} has ${String(wordCount)} words but no linked evidence`,
        });
      }
    }
  }

  return mismatches;
}
