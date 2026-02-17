import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { essay } from "../db/schema";
import type { EssayRepository } from "../../domain/essay/repository";
import type { Essay } from "../../domain/essay/essay";
import { TipTapDocSchema } from "../../domain/essay/schemas";
import { essayId, userId } from "../../domain/types/branded";
import type { EssayId } from "../../domain/types/branded";
import type { UserId } from "../../domain/types/branded";
import type { NotFoundError, PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err, isErr } from "../../domain/types/result";

// ── Row mapping ──

type EssayRow = typeof essay.$inferSelect;

function toDomain(row: EssayRow): Result<Essay, PersistenceError> {
  const eid = essayId(row.id);
  if (isErr(eid)) {
    return err({ kind: "PersistenceError", message: `Invalid essay ID in row: ${row.id}` });
  }
  const uid = userId(row.userId);
  if (isErr(uid)) {
    return err({ kind: "PersistenceError", message: `Invalid user ID in row: ${row.userId}` });
  }
  const contentResult = TipTapDocSchema.safeParse(row.content);
  if (!contentResult.success) {
    return err({ kind: "PersistenceError", message: `Invalid TipTap content in essay ${row.id}` });
  }
  return ok({
    id: eid.value,
    userId: uid.value,
    title: row.title,
    content: contentResult.data,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });
}

function toRow(e: Essay) {
  return {
    id: e.id,
    userId: e.userId,
    title: e.title,
    content: e.content,
    status: e.status,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    publishedAt: e.publishedAt,
  };
}

// ── Repository implementation ──

export const postgresEssayRepository: EssayRepository = {
  async save(e: Essay): Promise<Result<Essay, PersistenceError>> {
    try {
      const row = toRow(e);
      const [saved] = await db
        .insert(essay)
        .values(row)
        .onConflictDoUpdate({
          target: essay.id,
          set: {
            title: row.title,
            content: row.content,
            status: row.status,
            updatedAt: row.updatedAt,
            publishedAt: row.publishedAt,
          },
          setWhere: eq(essay.userId, row.userId),
        })
        .returning();
      if (!saved) {
        return err({
          kind: "PersistenceError",
          message: "Insert returned no rows",
        });
      }
      return toDomain(saved);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to save essay",
        cause,
      });
    }
  },

  async findById(
    id: EssayId,
    userId: UserId,
  ): Promise<Result<Essay, NotFoundError | PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essay)
        .where(and(eq(essay.id, id), eq(essay.userId, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return err({
          kind: "NotFoundError",
          entity: "Essay",
          id: id as string,
        });
      }
      return toDomain(row);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to find essay",
        cause,
      });
    }
  },

  async findPublishedById(
    id: EssayId,
  ): Promise<Result<Essay, NotFoundError | PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essay)
        .where(and(eq(essay.id, id), eq(essay.status, "published")))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return err({
          kind: "NotFoundError",
          entity: "Essay",
          id: id as string,
        });
      }
      return toDomain(row);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to find published essay",
        cause,
      });
    }
  },

  async delete(
    id: EssayId,
    ownerUserId: UserId,
  ): Promise<Result<void, NotFoundError | PersistenceError>> {
    try {
      const rows = await db
        .delete(essay)
        .where(and(eq(essay.id, id), eq(essay.userId, ownerUserId)))
        .returning({ id: essay.id });
      if (rows.length === 0) {
        return err({
          kind: "NotFoundError",
          entity: "Essay",
          id: id as string,
        });
      }
      return ok(undefined);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to delete essay",
        cause,
      });
    }
  },

  async listByUser(
    userId: UserId,
  ): Promise<Result<readonly Essay[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essay)
        .where(eq(essay.userId, userId))
        .orderBy(desc(essay.updatedAt));
      const essays: Essay[] = [];
      for (const row of rows) {
        const result = toDomain(row);
        if (isErr(result)) return result;
        essays.push(result.value);
      }
      return ok(essays);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to list essays",
        cause,
      });
    }
  },

  async listPublishedByUser(
    userId: UserId,
  ): Promise<Result<readonly Essay[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essay)
        .where(and(eq(essay.userId, userId), eq(essay.status, "published")))
        .orderBy(desc(essay.publishedAt));
      const essays: Essay[] = [];
      for (const row of rows) {
        const result = toDomain(row);
        if (isErr(result)) return result;
        essays.push(result.value);
      }
      return ok(essays);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to list published essays",
        cause,
      });
    }
  },
};
