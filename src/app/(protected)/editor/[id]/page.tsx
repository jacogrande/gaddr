import { notFound, redirect } from "next/navigation";
import { requireSession } from "../../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../../infra/essay/postgres-essay-repository";
import { postgresEvidenceCardRepository } from "../../../../infra/evidence/postgres-evidence-card-repository";
import { essayId, userId } from "../../../../domain/types/branded";
import { isErr } from "../../../../domain/types/result";
import { EssayEditor } from "./essay-editor";

type Params = Promise<{ id: string }>;

export default async function EditorPage({ params }: { params: Params }) {
  const { id } = await params;

  // Layout already redirects unauthenticated users. This call is for userId extraction; the guard is defense-in-depth.
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const eid = essayId(id);
  if (isErr(eid)) {
    notFound();
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/dashboard");
  }

  const result = await postgresEssayRepository.findById(eid.value, uid.value);
  if (isErr(result)) {
    if (result.error.kind === "NotFoundError") {
      notFound();
    }
    redirect("/dashboard");
  }

  const essay = result.value;

  // Load evidence links and user's evidence cards for the picker
  const linksResult = await postgresEvidenceCardRepository.findLinksWithCardsByEssay(eid.value, uid.value);
  const cardsResult = await postgresEvidenceCardRepository.listByUser(uid.value);

  const initialLinks = isErr(linksResult)
    ? []
    : linksResult.value.map((link) => ({
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
      }));

  const evidenceCards = isErr(cardsResult)
    ? []
    : cardsResult.value.map((card) => ({
        id: card.id as string,
        sourceTitle: card.sourceTitle,
        quoteSnippet: card.quoteSnippet,
        userSummary: card.userSummary,
        stance: card.stance,
      }));

  return (
    <EssayEditor
      id={essay.id}
      initialTitle={essay.title}
      initialContent={essay.content}
      initialStatus={essay.status}
      initialPublishedAt={essay.publishedAt?.toISOString() ?? null}
      initialLinks={initialLinks}
      evidenceCards={evidenceCards}
    />
  );
}
