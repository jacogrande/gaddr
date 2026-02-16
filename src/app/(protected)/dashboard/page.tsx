import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { userId } from "../../../domain/types/branded";
import { wordCount } from "../../../domain/essay/operations";
import { isErr } from "../../../domain/types/result";
import { createDraftAction } from "../editor/actions";
import { ErrorBanner } from "./error-banner";
import type { Essay } from "../../../domain/essay/essay";

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHr < 24) return `${String(diffHr)}h ago`;
  if (diffDay < 30) return `${String(diffDay)}d ago`;
  return date.toLocaleDateString();
}

function EssayCard({ essay }: { essay: Essay }) {
  const words = wordCount(essay.content);
  return (
    <Link
      href={`/editor/${essay.id}`}
      className="block rounded-lg border-2 border-zinc-200 bg-white p-4 transition-colors hover:border-[#B44C43]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg font-semibold text-black">
            {essay.title || "Untitled"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {words} words &middot; {relativeTime(essay.updatedAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            essay.status === "published"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {essay.status}
        </span>
      </div>
    </Link>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = params.error === "create-failed" ? "Failed to create essay. Please try again." : null;
  // Layout already redirects unauthenticated users. This call is for userId extraction; the guard is defense-in-depth.
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/sign-in");
  }

  const result = await postgresEssayRepository.listByUser(uid.value);
  const essays = isErr(result) ? [] : result.value;

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-black">
            Dashboard
          </h1>
          <p className="mt-1 text-zinc-600">
            Your micro-essay studio. Start writing or revisit a draft.
          </p>
        </div>
        <form action={createDraftAction}>
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
          >
            New Essay
          </button>
        </form>
      </div>

      {essays.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-lg text-zinc-400">No essays yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Click &ldquo;New Essay&rdquo; to start your first micro-essay.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {essays.map((essay) => (
            <EssayCard key={essay.id} essay={essay} />
          ))}
        </div>
      )}
    </div>
  );
}
