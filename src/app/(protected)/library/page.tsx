import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEvidenceCardRepository } from "../../../infra/evidence/postgres-evidence-card-repository";
import { userId } from "../../../domain/types/branded";
import { isErr } from "../../../domain/types/result";
import { EvidenceCardList } from "./evidence-card-list";

export default async function LibraryPage() {
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/sign-in");
  }

  const result = await postgresEvidenceCardRepository.listByUser(uid.value);
  const cards = isErr(result) ? [] : result.value;
  const loadError = isErr(result) ? "Failed to load evidence cards. Please try refreshing." : null;

  const serialized = cards.map((card) => ({
    id: card.id as string,
    sourceUrl: card.sourceUrl,
    sourceTitle: card.sourceTitle,
    quoteSnippet: card.quoteSnippet,
    userSummary: card.userSummary,
    caveats: card.caveats,
    stance: card.stance,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  }));

  return (
    <div className="animate-fade-up">
      {loadError && (
        <div className="mb-4 rounded border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
          {loadError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">
            Evidence Library
          </h1>
          <p className="mt-1 text-stone-500">
            Collect sources, quotes, and evidence to support your essays.
          </p>
        </div>
      </div>
      <EvidenceCardList initialCards={serialized} />
    </div>
  );
}
