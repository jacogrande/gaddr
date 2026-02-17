import { notFound, redirect } from "next/navigation";
import { requireSession } from "../../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../../infra/essay/postgres-essay-repository";
import { postgresEvidenceCardRepository } from "../../../../infra/evidence/postgres-evidence-card-repository";
import { postgresEssayVersionRepository } from "../../../../infra/essay/postgres-essay-version-repository";
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

  // Load evidence links, evidence cards, and version count in parallel
  const [linksResult, cardsResult, versionCountResult] = await Promise.all([
    postgresEvidenceCardRepository.findLinksWithCardsByEssay(eid.value, uid.value),
    postgresEvidenceCardRepository.listByUser(uid.value),
    postgresEssayVersionRepository.countByEssay(eid.value, uid.value),
  ]);

  const initialLinks = isErr(linksResult)
    ? []
    : linksResult.value.map((link) => ({
        id: link.id,
        essayId: link.essayId,
        evidenceCardId: link.evidenceCardId,
        claimText: link.claimText,
        anchorBlockIndex: link.anchorBlockIndex,
        card: {
          id: link.card.id,
          sourceTitle: link.card.sourceTitle,
          stance: link.card.stance,
        },
      }));

  const evidenceCards = isErr(cardsResult)
    ? []
    : cardsResult.value.map((card) => ({
        id: card.id,
        sourceTitle: card.sourceTitle,
        quoteSnippet: card.quoteSnippet,
        userSummary: card.userSummary,
        stance: card.stance,
      }));

  const versionCount = isErr(versionCountResult) ? 0 : versionCountResult.value;

  return (
    <EssayEditor
      id={essay.id}
      initialTitle={essay.title}
      initialContent={essay.content}
      initialStatus={essay.status}
      initialPublishedAt={essay.publishedAt?.toISOString() ?? null}
      initialLinks={initialLinks}
      evidenceCards={evidenceCards}
      initialVersionCount={versionCount}
    />
  );
}
