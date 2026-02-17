// Pure essay operations — no framework imports, no throw

import type { Essay, TipTapDoc, TipTapNode } from "./essay";
import type { EssayId } from "../types/branded";
import type { UserId } from "../types/branded";
import type {
  PublishError,
  UnpublishError,
  ValidationError,
} from "../types/errors";
import type { Result } from "../types/result";
import { ok, err } from "../types/result";

export const MAX_TITLE_LENGTH = 200;
export const WORD_COUNT_TARGET = 600;
export const WORD_COUNT_LIMIT = 800;

export function createDraft(params: {
  id: EssayId;
  userId: UserId;
  now: Date;
}): Essay {
  return {
    id: params.id,
    userId: params.userId,
    title: "",
    content: { type: "doc" },
    status: "draft",
    createdAt: params.now,
    updatedAt: params.now,
    publishedAt: null,
  };
}

export function updateDraft(
  essay: Essay,
  update: { title?: string; content?: TipTapDoc; now: Date },
): Result<Essay, ValidationError> {
  if (essay.status !== "draft") {
    return err({
      kind: "ValidationError",
      message: "Can only update essays in draft status",
      field: "status",
    });
  }

  if (update.title !== undefined && update.title.length > MAX_TITLE_LENGTH) {
    return err({
      kind: "ValidationError",
      message: `Title must be ${String(MAX_TITLE_LENGTH)} characters or fewer`,
      field: "title",
    });
  }

  return ok({
    ...essay,
    title: update.title ?? essay.title,
    content: update.content ?? essay.content,
    updatedAt: update.now,
  });
}

const INLINE_CONTAINERS = new Set(["paragraph", "heading", "codeBlock"]);

function isInlineContainer(type: string): boolean {
  return INLINE_CONTAINERS.has(type);
}

function extractText(node: TipTapNode): string {
  if (node.type === "hardBreak") return " ";
  if (node.text !== undefined) return node.text;
  if (node.content) {
    const separator = isInlineContainer(node.type) ? "" : " ";
    return node.content.map((child) => extractText(child)).join(separator);
  }
  return "";
}

// ── Publish / Unpublish transitions ──

export function publishEssay(
  essay: Essay,
  now: Date,
): Result<Essay, PublishError> {
  if (essay.status === "published") {
    return err({ kind: "already_published" });
  }
  if (wordCount(essay.content) === 0) {
    return err({ kind: "empty_content" });
  }
  return ok({
    ...essay,
    status: "published",
    updatedAt: now,
    publishedAt: now,
  });
}

export function unpublishEssay(
  essay: Essay,
  now: Date,
): Result<Essay, UnpublishError> {
  if (essay.status === "draft") {
    return err({ kind: "already_draft" });
  }
  return ok({
    ...essay,
    status: "draft",
    updatedAt: now,
    publishedAt: null,
  });
}

// ── Word counting ──

export function wordCount(doc: TipTapDoc): number {
  const text = doc.content
    ? doc.content.map((node) => extractText(node)).join(" ")
    : "";
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}
