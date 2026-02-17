"use server";

import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { essayId, userId } from "../../../domain/types/branded";
import type { PublishError, UnpublishError, UpdateError } from "../../../domain/types/errors";
import { isErr } from "../../../domain/types/result";
import { createDraft, updateDraft, publishEssay, unpublishEssay } from "../../../domain/essay/operations";
import { UpdateEssayInputSchema } from "../../../domain/essay/schemas";

const repo = postgresEssayRepository;

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
