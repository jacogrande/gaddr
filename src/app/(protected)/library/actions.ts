"use server";

import { requireSession } from "../../../infra/auth/require-session";
import { postgresEvidenceCardRepository } from "../../../infra/evidence/postgres-evidence-card-repository";
import { evidenceCardId, userId } from "../../../domain/types/branded";
import { isErr } from "../../../domain/types/result";
import { createEvidenceCard, updateEvidenceCard } from "../../../domain/evidence/operations";
import { CreateEvidenceCardInputSchema, UpdateEvidenceCardInputSchema } from "../../../domain/evidence/schemas";
import type { SerializedCard } from "../evidence-types";
import { reportError } from "../../../infra/observability/report-error";

const repo = postgresEvidenceCardRepository;

export async function createEvidenceCardAction(
  data: unknown,
): Promise<{ success: true; card: SerializedCard } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const parsed = CreateEvidenceCardInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rawId = crypto.randomUUID();
  const eid = evidenceCardId(rawId);
  if (isErr(eid)) {
    return { error: "Failed to generate ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const now = new Date();
  const card = createEvidenceCard({
    id: eid.value,
    userId: uid.value,
    sourceUrl: parsed.data.sourceUrl,
    sourceTitle: parsed.data.sourceTitle,
    quoteSnippet: parsed.data.quoteSnippet ?? null,
    userSummary: parsed.data.userSummary ?? null,
    caveats: parsed.data.caveats ?? null,
    stance: parsed.data.stance,
    now,
  });
  if (isErr(card)) {
    return { error: card.error.message };
  }

  const saved = await repo.save(card.value);
  if (isErr(saved)) {
    reportError(saved.error, { action: "createEvidenceCard", userId: uid.value });
    return { error: "Failed to save evidence card" };
  }

  return {
    success: true,
    card: {
      id: saved.value.id,
      sourceUrl: saved.value.sourceUrl,
      sourceTitle: saved.value.sourceTitle,
      quoteSnippet: saved.value.quoteSnippet,
      userSummary: saved.value.userSummary,
      caveats: saved.value.caveats,
      stance: saved.value.stance,
      createdAt: saved.value.createdAt.toISOString(),
      updatedAt: saved.value.updatedAt.toISOString(),
    },
  };
}

export async function updateEvidenceCardAction(
  id: string,
  data: unknown,
): Promise<{ success: true; card: SerializedCard } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const parsed = UpdateEvidenceCardInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const eid = evidenceCardId(id);
  if (isErr(eid)) {
    return { error: "Invalid evidence card ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const found = await repo.findById(eid.value, uid.value);
  if (isErr(found)) {
    if (found.error.kind !== "NotFoundError") {
      reportError(found.error, { action: "updateEvidenceCard.findById", userId: uid.value, evidenceCardId: eid.value });
    }
    return { error: found.error.kind === "NotFoundError" ? "Evidence card not found" : "Database error" };
  }

  const updated = updateEvidenceCard(found.value, {
    sourceUrl: parsed.data.sourceUrl,
    sourceTitle: parsed.data.sourceTitle,
    quoteSnippet: parsed.data.quoteSnippet,
    userSummary: parsed.data.userSummary,
    caveats: parsed.data.caveats,
    stance: parsed.data.stance,
    now: new Date(),
  });
  if (isErr(updated)) {
    return { error: updated.error.message };
  }

  const saved = await repo.save(updated.value);
  if (isErr(saved)) {
    reportError(saved.error, { action: "updateEvidenceCard", userId: uid.value });
    return { error: "Failed to save evidence card" };
  }

  return {
    success: true,
    card: {
      id: saved.value.id,
      sourceUrl: saved.value.sourceUrl,
      sourceTitle: saved.value.sourceTitle,
      quoteSnippet: saved.value.quoteSnippet,
      userSummary: saved.value.userSummary,
      caveats: saved.value.caveats,
      stance: saved.value.stance,
      createdAt: saved.value.createdAt.toISOString(),
      updatedAt: saved.value.updatedAt.toISOString(),
    },
  };
}

export async function deleteEvidenceCardAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const eid = evidenceCardId(id);
  if (isErr(eid)) {
    return { error: "Invalid evidence card ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const result = await repo.delete(eid.value, uid.value);
  if (isErr(result)) {
    if (result.error.kind !== "NotFoundError") {
      reportError(result.error, { action: "deleteEvidenceCard", userId: uid.value });
    }
    return { error: result.error.kind === "NotFoundError" ? "Evidence card not found" : "Database error" };
  }

  return { success: true };
}
