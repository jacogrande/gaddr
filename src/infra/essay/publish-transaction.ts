import { db } from "../db/client";
import { essay, essayVersion } from "../db/schema";
import { eq } from "drizzle-orm";
import type { Essay } from "../../domain/essay/essay";
import type { EssayVersion } from "../../domain/essay/version";
import type { SavePublishWithVersion } from "../../domain/essay/publish-pipeline";
import type { PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";

/**
 * Atomically saves a published essay and its version snapshot in a single
 * DB transaction. If either write fails, both are rolled back.
 */
export const savePublishWithVersion: SavePublishWithVersion = async function savePublishWithVersion(
  publishedEssay: Essay,
  version: EssayVersion,
): Promise<Result<{ essay: Essay; version: EssayVersion }, PersistenceError>> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(essayVersion)
        .values({
          id: version.id,
          essayId: version.essayId,
          userId: version.userId,
          versionNumber: version.versionNumber,
          title: version.title,
          content: version.content,
          createdAt: version.publishedAt,
        });

      await tx
        .insert(essay)
        .values({
          id: publishedEssay.id,
          userId: publishedEssay.userId,
          title: publishedEssay.title,
          content: publishedEssay.content,
          status: publishedEssay.status,
          createdAt: publishedEssay.createdAt,
          updatedAt: publishedEssay.updatedAt,
          publishedAt: publishedEssay.publishedAt,
        })
        .onConflictDoUpdate({
          target: essay.id,
          set: {
            title: publishedEssay.title,
            content: publishedEssay.content,
            status: publishedEssay.status,
            updatedAt: publishedEssay.updatedAt,
            publishedAt: publishedEssay.publishedAt,
          },
          setWhere: eq(essay.userId, publishedEssay.userId),
        });
    });

    return ok({ essay: publishedEssay, version });
  } catch (cause: unknown) {
    return err({ kind: "PersistenceError", message: "Failed to publish essay with version snapshot", cause });
  }
};
