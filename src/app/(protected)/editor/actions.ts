"use server";

import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { essayId, userId } from "../../../domain/types/branded";
import { isErr } from "../../../domain/types/result";
import { createDraft, updateDraft } from "../../../domain/essay/operations";
import { UpdateEssayInputSchema } from "../../../domain/essay/schemas";
import type { TipTapDoc } from "../../../domain/essay/essay";

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
    content: parsed.data.content as TipTapDoc | undefined,
    now: new Date(),
  });
  if (isErr(updated)) {
    return { error: updated.error.message };
  }

  const saved = await repo.save(updated.value);
  if (isErr(saved)) {
    return { error: "Failed to save changes" };
  }

  return { success: true };
}
