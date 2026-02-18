import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { findUserById } from "../../../infra/db/queries";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { reportError } from "../../../infra/observability/report-error";
import { userId } from "../../../domain/types/branded";
import { wordCount } from "../../../domain/essay/operations";
import { formatPublishedDate } from "../../../domain/essay/formatting";
import { isErr } from "../../../domain/types/result";
import type { Essay } from "../../../domain/essay/essay";

type Params = Promise<{ id: string }>;

const getUser = cache((id: string) => findUserById(id));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const userResult = await getUser(id);
  if (isErr(userResult) || !userResult.value) {
    return { title: "User not found — Microblogger" };
  }
  const u = userResult.value;

  const title = `${u.name}'s Portfolio — Microblogger`;
  return {
    title,
    openGraph: {
      title,
      type: "profile",
      siteName: "Microblogger",
    },
    twitter: {
      card: "summary",
      title,
    },
  };
}

function EssayCard({ essay }: { essay: Essay }) {
  const words = wordCount(essay.content);
  return (
    <Link
      href={`/essay/${essay.id}`}
      className="block border-t-4 border-t-stone-900 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]"
    >
      <h3 className="font-serif text-lg font-semibold text-stone-900">
        {essay.title || "Untitled"}
      </h3>
      <p className="mt-1 text-sm text-stone-600 font-medium">
        {words} words
        {essay.publishedAt ? (
          <>
            {" "}&middot; {formatPublishedDate(essay.publishedAt)}
          </>
        ) : null}
      </p>
    </Link>
  );
}

export default async function PortfolioPage({ params }: { params: Params }) {
  const { id } = await params;

  const userResult = await getUser(id);
  if (isErr(userResult)) {
    reportError(userResult.error, { action: `portfolio.findUser:${id}` });
    notFound();
  }
  if (!userResult.value) {
    notFound();
  }
  const u = userResult.value;

  const uid = userId(id);
  if (isErr(uid)) {
    notFound();
  }

  const result = await postgresEssayRepository.listPublishedByUser(uid.value);
  if (isErr(result)) {
    reportError(result.error, { action: "portfolio.listPublished", userId: uid.value });
  }
  const essays = isErr(result) ? [] : result.value;

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

      <div className="mx-auto max-w-2xl px-6 py-12 animate-fade-up">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">
          {u.name}&apos;s Portfolio
        </h1>

        {essays.length === 0 ? (
          <p className="mt-8 text-stone-500">
            No published essays yet.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {essays.map((essay) => (
              <EssayCard key={essay.id} essay={essay} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
