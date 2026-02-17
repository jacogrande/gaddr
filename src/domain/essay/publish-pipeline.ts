// Pure publish-with-version pipeline — no framework imports, no throw

import type { Essay } from "./essay";
import type { EssayVersion } from "./version";
import type { EssayVersionId } from "../types/branded";
import type { PublishError, ValidationError, PersistenceError } from "../types/errors";
import type { Result } from "../types/result";
import { isErr, ok } from "../types/result";
import { publishEssay } from "./operations";
import { createVersionSnapshot } from "./version-operations";

// ── Types ──

export type PublishWithVersionResult = {
  readonly published: Essay;
  readonly snapshot: EssayVersion;
};

/** Port: atomically persist a published essay and its version snapshot. */
export type SavePublishWithVersion = (
  essay: Essay,
  version: EssayVersion,
) => Promise<Result<{ essay: Essay; version: EssayVersion }, PersistenceError>>;

// ── Pipeline ──

export function preparePublishWithVersion(params: {
  essay: Essay;
  versionId: EssayVersionId;
  currentVersionCount: number;
  now: Date;
}): Result<PublishWithVersionResult, PublishError | ValidationError> {
  const published = publishEssay(params.essay, params.now);
  if (isErr(published)) return published;

  const snapshot = createVersionSnapshot({
    id: params.versionId,
    essay: published.value,
    versionNumber: params.currentVersionCount + 1,
    now: params.now,
  });
  if (isErr(snapshot)) return snapshot;

  return ok({ published: published.value, snapshot: snapshot.value });
}
