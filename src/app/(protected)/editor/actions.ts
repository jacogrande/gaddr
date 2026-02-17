"use server";

import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { postgresEvidenceCardRepository } from "../../../infra/evidence/postgres-evidence-card-repository";
import { essayId, userId, evidenceCardId, claimEvidenceLinkId } from "../../../domain/types/branded";
import type { PublishError, UnpublishError, UpdateError } from "../../../domain/types/errors";
import { isErr } from "../../../domain/types/result";
import { createDraft, updateDraft, publishEssay, unpublishEssay } from "../../../domain/essay/operations";
import { UpdateEssayInputSchema } from "../../../domain/essay/schemas";
import { AttachEvidenceInputSchema } from "../../../domain/evidence/schemas";
import { createClaimEvidenceLink } from "../../../domain/evidence/operations";

const repo = postgresEssayRepository;
const evidenceRepo = postgresEvidenceCardRepository;

export async function createDraftAction(): Promise<void> {
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const rawId = crypto.randomUUID();
  const eid = essayId(rawId);
  if (isErr(eid)) {
    redirect("/dashboard?error=create-failed");
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/dashboard?error=create-failed");
  }

  const essay = createDraft({ id: eid.value, userId: uid.value, now: new Date() });
  const saved = await repo.save(essay);
  if (isErr(saved)) {
    redirect("/dashboard?error=create-failed");
  }

  redirect(`/editor/${saved.value.id}`);
}

export async function updateDraftAction(
  id: string,
  data: unknown,
): Promise<{ success: true } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const parsed = UpdateEssayInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const eid = essayId(id);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const found = await repo.findById(eid.value, uid.value);
  if (isErr(found)) {
    return { error: found.error.kind === "NotFoundError" ? "Essay not found" : "Database error" };
  }

  const updated = updateDraft(found.value, {
    title: parsed.data.title,
    content: parsed.data.content,
    now: new Date(),
  });
  if (isErr(updated)) {
    return { error: updateErrorMessage(updated.error) };
  }

  const saved = await repo.save(updated.value);
  if (isErr(saved)) {
    return { error: "Failed to save changes" };
  }

  return { success: true };
}

function publishErrorMessage(error: PublishError): string {
  switch (error.kind) {
    case "EmptyContent":
      return "Cannot publish an empty essay";
    case "AlreadyPublished":
      return "Essay is already published";
  }
}

function unpublishErrorMessage(_error: UnpublishError): string {
  return "Essay is already a draft";
}

function updateErrorMessage(error: UpdateError | { kind: "ValidationError"; message: string }): string {
  switch (error.kind) {
    case "NotDraft":
      return "Can only update essays in draft status";
    case "ValidationError":
      return error.message;
  }
}

export async function publishEssayAction(
  id: string,
): Promise<{ success: true; publishedAt: string } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const eid = essayId(id);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const found = await repo.findById(eid.value, uid.value);
  if (isErr(found)) {
    return { error: found.error.kind === "NotFoundError" ? "Essay not found" : "Database error" };
  }

  const published = publishEssay(found.value, new Date());
  if (isErr(published)) {
    return { error: publishErrorMessage(published.error) };
  }

  const saved = await repo.save(published.value);
  if (isErr(saved)) {
    return { error: "Failed to publish essay" };
  }

  const pa = saved.value.publishedAt;
  if (!pa) {
    return { error: "Failed to publish essay" };
  }
  return { success: true, publishedAt: pa.toISOString() };
}

export async function unpublishEssayAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const eid = essayId(id);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const found = await repo.findById(eid.value, uid.value);
  if (isErr(found)) {
    return { error: found.error.kind === "NotFoundError" ? "Essay not found" : "Database error" };
  }

  const unpublished = unpublishEssay(found.value, new Date());
  if (isErr(unpublished)) {
    return { error: unpublishErrorMessage(unpublished.error) };
  }

  const saved = await repo.save(unpublished.value);
  if (isErr(saved)) {
    return { error: "Failed to unpublish essay" };
  }

  return { success: true };
}

// ── Evidence link actions ──

import type { EvidenceLinkData } from "../evidence-types";

export async function attachEvidenceAction(
  rawEssayId: string,
  data: unknown,
): Promise<{ success: true; link: EvidenceLinkData } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const parsed = AttachEvidenceInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const eid = essayId(rawEssayId);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  // Verify essay ownership
  const essayResult = await repo.findById(eid.value, uid.value);
  if (isErr(essayResult)) {
    return { error: essayResult.error.kind === "NotFoundError" ? "Essay not found" : "Database error" };
  }

  // Verify evidence card ownership
  const ecid = evidenceCardId(parsed.data.evidenceCardId);
  if (isErr(ecid)) {
    return { error: "Invalid evidence card ID" };
  }
  const card = await evidenceRepo.findById(ecid.value, uid.value);
  if (isErr(card)) {
    return { error: card.error.kind === "NotFoundError" ? "Evidence card not found" : "Database error" };
  }

  const rawLinkId = crypto.randomUUID();
  const lid = claimEvidenceLinkId(rawLinkId);
  if (isErr(lid)) {
    return { error: "Failed to generate link ID" };
  }

  const link = createClaimEvidenceLink({
    id: lid.value,
    essayId: eid.value,
    evidenceCardId: ecid.value,
    userId: uid.value,
    claimText: parsed.data.claimText,
    anchorBlockIndex: parsed.data.anchorBlockIndex,
    now: new Date(),
  });
  if (isErr(link)) {
    return { error: link.error.message };
  }

  const savedLink = await evidenceRepo.saveLink(link.value);
  if (isErr(savedLink)) {
    return { error: "Failed to save evidence link" };
  }

  return {
    success: true,
    link: {
      id: savedLink.value.id as string,
      essayId: savedLink.value.essayId as string,
      evidenceCardId: savedLink.value.evidenceCardId as string,
      claimText: savedLink.value.claimText,
      anchorBlockIndex: savedLink.value.anchorBlockIndex,
      card: {
        id: card.value.id as string,
        sourceTitle: card.value.sourceTitle,
        stance: card.value.stance,
      },
    },
  };
}

export async function detachEvidenceAction(
  rawEssayId: string,
  linkId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const eid = essayId(rawEssayId);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  // Verify essay ownership before allowing link deletion
  const essayCheck = await repo.findById(eid.value, uid.value);
  if (isErr(essayCheck)) {
    return { error: essayCheck.error.kind === "NotFoundError" ? "Essay not found" : "Database error" };
  }

  const lid = claimEvidenceLinkId(linkId);
  if (isErr(lid)) {
    return { error: "Invalid link ID" };
  }

  const deleteResult = await evidenceRepo.deleteLink(lid.value, eid.value, uid.value);
  if (isErr(deleteResult)) {
    return { error: deleteResult.error.kind === "NotFoundError" ? "Link not found" : "Database error" };
  }

  return { success: true };
}

export async function listEssayEvidenceAction(
  rawEssayId: string,
): Promise<{ links: EvidenceLinkData[] } | { error: string }> {
  const session = await requireSession();
  if (isErr(session)) {
    return { error: "Not authenticated" };
  }

  const eid = essayId(rawEssayId);
  if (isErr(eid)) {
    return { error: "Invalid essay ID" };
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return { error: "Invalid user ID" };
  }

  const linksResult = await evidenceRepo.findLinksWithCardsByEssay(eid.value, uid.value);
  if (isErr(linksResult)) {
    return { error: "Failed to load evidence links" };
  }

  return {
    links: linksResult.value.map((link) => ({
      id: link.id as string,
      essayId: link.essayId as string,
      evidenceCardId: link.evidenceCardId as string,
      claimText: link.claimText,
      anchorBlockIndex: link.anchorBlockIndex,
      card: {
        id: link.card.id as string,
        sourceTitle: link.card.sourceTitle,
        stance: link.card.stance,
      },
    })),
  };
}
