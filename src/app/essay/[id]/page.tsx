import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { essayId } from "../../../domain/types/branded";
import { wordCount } from "../../../domain/essay/operations";
import { extractOgDescription } from "../../../domain/essay/og-metadata";
import { formatPublishedDate, pluralize } from "../../../domain/essay/formatting";
import { buildPublishedEssayView } from "../../../domain/evidence/public-view";
import { isErr } from "../../../domain/types/result";
import type { EssayId, UserId } from "../../../domain/types/branded";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { postgresEvidenceCardRepository } from "../../../infra/evidence/postgres-evidence-card-repository";
import { postgresEssayVersionRepository } from "../../../infra/essay/postgres-essay-version-repository";
import { EssayRenderer } from "./essay-renderer";

type Params = Promise<{ id: string }>;

const getPublishedEssay = cache((id: EssayId) =>
  postgresEssayRepository.findPublishedById(id),
);

const getPublishedEvidence = cache((id: EssayId) =>
  postgresEvidenceCardRepository.findPublishedEvidenceByEssay(id),
);

const getVersionCount = cache((id: EssayId, uid: UserId) =>
  postgresEssayVersionRepository.countByEssay(id, uid),
);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const eid = essayId(id);
  if (isErr(eid)) {
    return { title: "Essay not found — Microblogger" };
  }

  const result = await getPublishedEssay(eid.value);
  if (isErr(result)) {
    return { title: "Essay not found — Microblogger" };
  }

  const essay = result.value;
  const title = essay.title || "Untitled";
  const description = extractOgDescription(essay.content)
    || `A ${String(wordCount(essay.content))}-word micro-essay on Microblogger.`;

  return {
    title: `${title} — Microblogger`,
    description,
    openGraph: {
      title: `${title} — Microblogger`,
      description,
      type: "article",
      siteName: "Microblogger",
    },
    twitter: {
      card: "summary",
      title: `${title} — Microblogger`,
      description,
    },
  };
}

export default async function PublicEssayPage({ params }: { params: Params }) {
  const { id } = await params;

  const eid = essayId(id);
  if (isErr(eid)) {
    notFound();
  }

  const result = await getPublishedEssay(eid.value);
  if (isErr(result)) {
    notFound();
  }

  const essay = result.value;
  const words = wordCount(essay.content);

  // Gracefully degrade — if evidence/version fetch fails, render without them
  const [evidenceResult, versionCountResult] = await Promise.all([
    getPublishedEvidence(eid.value),
    getVersionCount(eid.value, essay.userId),
  ]);
  const links = isErr(evidenceResult) ? [] : evidenceResult.value;
  const revisionCount = isErr(versionCountResult) ? 0 : versionCountResult.value;

  const view = buildPublishedEssayView({
    title: essay.title,
    doc: essay.content,
    links,
  });

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <nav className="border-b border-stone-200 px-6 py-4">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-stone-900 hover:text-[#B74134]"
        >
          Microblogger
        </Link>
      </nav>

      <article className="mx-auto max-w-2xl px-6 py-12 animate-fade-up">
        <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-900">
          {essay.title || "Untitled"}
        </h1>

        <div className="mt-4 flex items-center gap-3 text-sm text-stone-500">
          <span>{words} words</span>
          <span>&middot;</span>
          <span>
            {essay.publishedAt ? formatPublishedDate(essay.publishedAt) : ""}
          </span>
          {view.hasEvidence ? (
            <>
              <span>&middot;</span>
              <span>{pluralize(view.evidenceCount, "source", "sources")} cited</span>
            </>
          ) : null}
          {revisionCount >= 2 ? (
            <>
              <span>&middot;</span>
              <span>Revised {pluralize(revisionCount - 1, "time", "times")}</span>
            </>
          ) : null}
        </div>

        <div className="mx-auto mt-8 h-px w-12 bg-[#B74134]" />

        <div className="mt-8">
          <EssayRenderer doc={essay.content} evidenceByBlock={view.evidenceByBlock} />
        </div>
      </article>
    </main>
  );
}
