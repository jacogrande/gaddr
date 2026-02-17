// Port — EssayVersion persistence interface

import type { EssayVersion } from "./version";
import type { EssayId, EssayVersionId, UserId } from "../types/branded";
import type { Result } from "../types/result";
import type { NotFoundError, PersistenceError } from "../types/errors";

export type EssayVersionRepository = {
  save(version: EssayVersion): Promise<Result<EssayVersion, PersistenceError>>;
  listByEssay(
    essayId: EssayId,
    userId: UserId,
  ): Promise<Result<readonly EssayVersion[], PersistenceError>>;
  findById(
    id: EssayVersionId,
    userId: UserId,
  ): Promise<Result<EssayVersion, NotFoundError | PersistenceError>>;
  countByEssay(essayId: EssayId): Promise<Result<number, PersistenceError>>;
};
