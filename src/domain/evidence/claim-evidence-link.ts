// Domain ClaimEvidenceLink type — immutable link between essay claim and evidence

import type { ClaimEvidenceLinkId, EssayId, EvidenceCardId } from "../types/branded";
import type { UserId } from "../types/branded";

export type ClaimEvidenceLink = {
  readonly id: ClaimEvidenceLinkId;
  readonly essayId: EssayId;
  readonly evidenceCardId: EvidenceCardId;
  readonly userId: UserId;
  readonly claimText: string;
  readonly anchorBlockIndex: number;
  readonly createdAt: Date;
};
