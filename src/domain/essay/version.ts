// Domain EssayVersion type — immutable snapshot of an essay at publish time

import type { EssayVersionId, EssayId, UserId } from "../types/branded";
import type { TipTapDoc } from "./essay";

export type EssayVersion = {
  readonly id: EssayVersionId;
  readonly essayId: EssayId;
  readonly userId: UserId;
  readonly versionNumber: number;
  readonly title: string;
  readonly content: TipTapDoc;
  readonly publishedAt: Date;
};
