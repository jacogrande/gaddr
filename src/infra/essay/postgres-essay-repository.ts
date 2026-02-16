import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { essay } from "../db/schema";
import type { EssayRepository } from "../../domain/essay/repository";
import type { Essay, TipTapDoc } from "../../domain/essay/essay";
import { essayId, userId } from "../../domain/types/branded";
import type { EssayId } from "../../domain/types/branded";
import type { UserId } from "../../domain/types/branded";
import type { NotFoundError, PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err, isErr } from "../../domain/types/result";

// ── Row mapping ──

type EssayRow = typeof essay.$inferSelect;

function toDomain(row: EssayRow): Essay | null {
  const eid = essayId(row.id);
  const uid = userId(row.userId);
  if (isErr(eid) || isErr(uid)) return null;
  return {
    id: eid.value,
    userId: uid.value,
    title: row.title,
    content: row.content as TipTapDoc,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function toRow(e: Essay) {
  return {
    id: e.id as string,
    userId: e.userId as string,
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
      const domain = toDomain(saved);
      if (!domain) {
        return err({
          kind: "PersistenceError",
          message: "Failed to parse saved essay from database",
        });
      }
      return ok(domain);
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
      const domain = toDomain(row);
      if (!domain) {
        return err({
          kind: "PersistenceError",
          message: "Failed to parse essay from database",
        });
      }
      return ok(domain);
    } catch (cause: unknown) {
      return err({
        kind: "PersistenceError",
        message: "Failed to find essay",
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
        const domain = toDomain(row);
        if (domain) essays.push(domain);
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
};
