import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { essayId } from "../../../domain/types/branded";
import { wordCount } from "../../../domain/essay/operations";
import { formatPublishedDate } from "../../../domain/essay/formatting";
import { isErr } from "../../../domain/types/result";
import type { EssayId } from "../../../domain/types/branded";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { renderEssayHtml } from "../../../infra/essay/render-essay-html";

type Params = Promise<{ id: string }>;

const getPublishedEssay = cache((id: EssayId) =>
  postgresEssayRepository.findPublishedById(id),
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
  return {
    title: `${essay.title || "Untitled"} — Microblogger`,
    description: `A ${String(wordCount(essay.content))}-word micro-essay on Microblogger.`,
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
  const htmlResult = renderEssayHtml(essay.content);
  if (isErr(htmlResult)) {
    notFound();
  }
  const html = htmlResult.value;
  const words = wordCount(essay.content);

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

        <div className="mt-4 flex items-center gap-3 text-sm text-stone-400">
          <span>{words} words</span>
          <span>&middot;</span>
          <span>
            {essay.publishedAt ? formatPublishedDate(essay.publishedAt) : ""}
          </span>
        </div>

        <div className="mx-auto mt-8 h-px w-12 bg-[#B74134]" />

        <div
          className="tiptap mt-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </main>
  );
}
