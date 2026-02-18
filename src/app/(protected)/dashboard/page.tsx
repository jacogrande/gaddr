import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { userId } from "../../../domain/types/branded";
import { wordCount } from "../../../domain/essay/operations";
import { relativeTime } from "../../../domain/essay/formatting";
import { isErr } from "../../../domain/types/result";
import { createDraftAction } from "../editor/actions";
import { reportError } from "../../../infra/observability/report-error";
import { ErrorBanner } from "./error-banner";
import { DeleteEssayButton } from "./delete-essay-button";
import type { Essay } from "../../../domain/essay/essay";

function StampBadge({ status }: { status: "draft" | "published" }) {
  const styles =
    status === "published"
      ? "border-emerald-800 bg-emerald-50 text-emerald-800 -rotate-2"
      : "border-amber-800 bg-amber-50 text-amber-800 rotate-2";

  return (
    <div className="inline-block shrink-0">
      <span
        className={`inline-block border-[3px] px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#2C2416] ${styles}`}
      >
        {status}
      </span>
    </div>
  );
}

function EssayCard({ essay, now }: { essay: Essay; now: Date }) {
  const words = wordCount(essay.content);
  return (
    <div className="group relative border-t-4 border-t-stone-900 bg-white shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
      <Link
        href={`/editor/${essay.id}`}
        className="block p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-serif text-lg font-semibold text-stone-900 transition-colors duration-200 group-hover:text-[#B74134]">
              {essay.title || "Untitled"}
            </h3>
            <p className="mt-1 text-sm text-stone-600 font-medium">
              {words} words &middot; {relativeTime(essay.updatedAt, now)}
            </p>
          </div>
          <StampBadge status={essay.status} />
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <DeleteEssayButton essayId={essay.id} />
      </div>
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const PAGE_SIZE = 20;
  const params = await searchParams;
  const error = params.error === "create-failed" ? "Failed to create essay. Please try again." : null;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Layout already redirects unauthenticated users. This call is for userId extraction; the guard is defense-in-depth.
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/sign-in");
  }

  const result = await postgresEssayRepository.listByUser(uid.value, {
    limit: PAGE_SIZE + 1,
    offset,
  });
  if (isErr(result)) {
    reportError(result.error, { action: "dashboard.listByUser", userId: uid.value });
  }
  const listError = isErr(result) ? "Failed to load essays. Please try refreshing." : null;
  const allEssays = isErr(result) ? [] : result.value;
  const hasMore = allEssays.length > PAGE_SIZE;
  const essays = hasMore ? allEssays.slice(0, PAGE_SIZE) : allEssays;
  const now = new Date();

  return (
    <div className="animate-fade-up">
      {error && <ErrorBanner message={error} />}
      {listError && <ErrorBanner message={listError} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">
            Dashboard
          </h1>
          <p className="mt-1 text-stone-600">
            Your micro-essay studio. Start writing or revisit a draft.
          </p>
        </div>
        <form action={createDraftAction}>
          <button
            type="submit"
            className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
          >
            New Essay
          </button>
        </form>
      </div>

      {essays.length === 0 && page === 1 ? (
        <div className="mt-16 text-center">
          <p className="font-serif text-xl font-semibold text-stone-300">No essays yet.</p>
          <p className="mt-2 text-sm text-stone-500">
            Click &ldquo;New Essay&rdquo; to start your first micro-essay.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4 stagger">
            {essays.map((essay) => (
              <div key={essay.id} className="animate-fade-up">
                <EssayCard essay={essay} now={now} />
              </div>
            ))}
          </div>

          {(page > 1 || hasMore) && (
            <div className="mt-8 flex items-center justify-between">
              {page > 1 ? (
                <Link
                  href={page === 2 ? "/dashboard" : `/dashboard?page=${String(page - 1)}`}
                  className="text-sm font-semibold text-stone-600 hover:text-stone-900"
                >
                  &larr; Newer
                </Link>
              ) : (
                <span />
              )}
              {hasMore ? (
                <Link
                  href={`/dashboard?page=${String(page + 1)}`}
                  className="text-sm font-semibold text-stone-600 hover:text-stone-900"
                >
                  Older &rarr;
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
