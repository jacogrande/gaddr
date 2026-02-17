// Essay repository port — domain interface, implemented in infra

import type { Essay } from "./essay";
import type { EssayId } from "../types/branded";
import type { UserId } from "../types/branded";
import type { NotFoundError, PersistenceError } from "../types/errors";
import type { Result } from "../types/result";

export type EssayRepository = {
  save(essay: Essay): Promise<Result<Essay, PersistenceError>>;
  findById(
    id: EssayId,
    userId: UserId,
  ): Promise<Result<Essay, NotFoundError | PersistenceError>>;
  findPublishedById(
    id: EssayId,
  ): Promise<Result<Essay, NotFoundError | PersistenceError>>;
  listByUser(
    userId: UserId,
  ): Promise<Result<readonly Essay[], PersistenceError>>;
};
