import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/client";
import { essayVersion } from "../db/schema";
import type { EssayVersionRepository } from "../../domain/essay/version-repository";
import type { EssayVersion } from "../../domain/essay/version";
import { TipTapDocSchema } from "../../domain/essay/schemas";
import { essayId, essayVersionId, userId } from "../../domain/types/branded";
import type { EssayId, EssayVersionId as EssayVersionIdType, UserId } from "../../domain/types/branded";
import type { NotFoundError, PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err, isErr } from "../../domain/types/result";

// ── Row mapping ──

type VersionRow = typeof essayVersion.$inferSelect;

function toDomain(row: VersionRow): Result<EssayVersion, PersistenceError> {
  const vid = essayVersionId(row.id);
  if (isErr(vid)) {
    return err({ kind: "PersistenceError", message: `Invalid version ID in row: ${row.id}` });
  }
  const eid = essayId(row.essayId);
  if (isErr(eid)) {
    return err({ kind: "PersistenceError", message: `Invalid essay ID in row: ${row.essayId}` });
  }
  const uid = userId(row.userId);
  if (isErr(uid)) {
    return err({ kind: "PersistenceError", message: `Invalid user ID in row: ${row.userId}` });
  }
  const contentResult = TipTapDocSchema.safeParse(row.content);
  if (!contentResult.success) {
    return err({ kind: "PersistenceError", message: `Invalid TipTap content in version ${row.id}` });
  }
  return ok({
    id: vid.value,
    essayId: eid.value,
    userId: uid.value,
    versionNumber: row.versionNumber,
    title: row.title,
    content: contentResult.data,
    // DB column is `createdAt` (row insert time); domain uses `publishedAt` (when the version was published)
    publishedAt: row.createdAt,
  });
}

function toRow(v: EssayVersion) {
  return {
    id: v.id,
    essayId: v.essayId,
    userId: v.userId,
    versionNumber: v.versionNumber,
    title: v.title,
    content: v.content,
    createdAt: v.publishedAt,
  };
}

// ── Repository implementation ──

export const postgresEssayVersionRepository: EssayVersionRepository = {
  async save(version: EssayVersion): Promise<Result<EssayVersion, PersistenceError>> {
    try {
      const row = toRow(version);
      const [saved] = await db.insert(essayVersion).values(row).returning();
      if (!saved) {
        return err({ kind: "PersistenceError", message: "Insert returned no rows" });
      }
      return toDomain(saved);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to save version", cause });
    }
  },

  async listByEssay(
    eid: EssayId,
    uid: UserId,
  ): Promise<Result<readonly EssayVersion[], PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essayVersion)
        .where(and(eq(essayVersion.essayId, eid), eq(essayVersion.userId, uid)))
        .orderBy(desc(essayVersion.versionNumber));
      const versions: EssayVersion[] = [];
      for (const row of rows) {
        const result = toDomain(row);
        if (isErr(result)) return result;
        versions.push(result.value);
      }
      return ok(versions);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to list versions", cause });
    }
  },

  async findById(
    id: EssayVersionIdType,
    uid: UserId,
  ): Promise<Result<EssayVersion, NotFoundError | PersistenceError>> {
    try {
      const rows = await db
        .select()
        .from(essayVersion)
        .where(and(eq(essayVersion.id, id), eq(essayVersion.userId, uid)))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return err({ kind: "NotFoundError", entity: "EssayVersion", id });
      }
      return toDomain(row);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to find version", cause });
    }
  },

  async countByEssay(eid: EssayId, uid: UserId): Promise<Result<number, PersistenceError>> {
    try {
      const [row] = await db
        .select({ value: count() })
        .from(essayVersion)
        .where(and(eq(essayVersion.essayId, eid), eq(essayVersion.userId, uid)));
      return ok(row?.value ?? 0);
    } catch (cause: unknown) {
      return err({ kind: "PersistenceError", message: "Failed to count versions", cause });
    }
  },
};
