// Evidence repository port — domain interface, implemented in infra

import type { EvidenceCard } from "./evidence-card";
import type { ClaimEvidenceLink } from "./claim-evidence-link";
import type { EvidenceCardId, ClaimEvidenceLinkId, EssayId } from "../types/branded";
import type { UserId } from "../types/branded";
import type { NotFoundError, PersistenceError } from "../types/errors";
import type { Result } from "../types/result";

export type ClaimEvidenceLinkWithCard = ClaimEvidenceLink & {
  readonly card: EvidenceCard;
};

export type EvidenceCardRepository = {
  save(card: EvidenceCard): Promise<Result<EvidenceCard, PersistenceError>>;
  findById(
    id: EvidenceCardId,
    userId: UserId,
  ): Promise<Result<EvidenceCard, NotFoundError | PersistenceError>>;
  listByUser(
    userId: UserId,
  ): Promise<Result<readonly EvidenceCard[], PersistenceError>>;
  delete(
    id: EvidenceCardId,
    userId: UserId,
  ): Promise<Result<void, NotFoundError | PersistenceError>>;

  saveLink(
    link: ClaimEvidenceLink,
  ): Promise<Result<ClaimEvidenceLink, PersistenceError>>;
  deleteLink(
    id: ClaimEvidenceLinkId,
    essayId: EssayId,
    userId: UserId,
  ): Promise<Result<void, NotFoundError | PersistenceError>>;
  findLinksByEssay(
    essayId: EssayId,
    userId: UserId,
  ): Promise<Result<readonly ClaimEvidenceLink[], PersistenceError>>;
  findLinksWithCardsByEssay(
    essayId: EssayId,
    userId: UserId,
  ): Promise<Result<readonly ClaimEvidenceLinkWithCard[], PersistenceError>>;
};
