// Domain Essay type — pure types, no framework imports

import type { EssayId } from "../types/branded";
import type { UserId } from "../types/branded";

export type Essay = {
  readonly id: EssayId;
  readonly userId: UserId;
  readonly title: string;
  readonly content: string;
  readonly status: "draft" | "published";
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
};
