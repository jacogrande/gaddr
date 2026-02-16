// Domain Essay type — pure types, no framework imports

import type { EssayId } from "../types/branded";
import type { UserId } from "../types/branded";

// ── TipTap / ProseMirror document types ──

export type TipTapNode = {
  readonly type: string;
  readonly text?: string;
  readonly content?: readonly TipTapNode[];
  readonly marks?: readonly {
    readonly type: string;
    readonly attrs?: Record<string, unknown>;
  }[];
  readonly attrs?: Record<string, unknown>;
};

export type TipTapDoc = {
  readonly type: "doc";
  readonly content?: readonly TipTapNode[];
};

// ── Essay entity ──

export type Essay = {
  readonly id: EssayId;
  readonly userId: UserId;
  readonly title: string;
  readonly content: TipTapDoc;
  readonly status: "draft" | "published";
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
};
