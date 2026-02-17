// Domain EvidenceCard type — pure types, no framework imports

import type { EvidenceCardId } from "../types/branded";
import type { UserId } from "../types/branded";

export const STANCES = ["supports", "complicates", "contradicts"] as const;
export type Stance = (typeof STANCES)[number];

export type EvidenceCard = {
  readonly id: EvidenceCardId;
  readonly userId: UserId;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly quoteSnippet: string | null;
  readonly userSummary: string | null;
  readonly caveats: string | null;
  readonly stance: Stance;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
