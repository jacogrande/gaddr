"use client";

import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
} from "../../../../domain/review/review";

type Props = {
  status: "idle" | "loading" | "done" | "error";
  comments: InlineComment[];
  issues: ReviewIssue[];
  questions: SocraticQuestion[];
  scores: RubricScore[];
  errorMessage: string | null;
  onCommentClick: (quotedText: string) => void;
  onDismiss: () => void;
  onRetry: () => void;
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-stone-100 text-stone-600 border-stone-200",
};

const TAG_LABELS: Record<string, string> = {
  clarity: "Clarity",
  evidence: "Evidence",
  structure: "Structure",
  argument: "Argument",
  style: "Style",
  originality: "Originality",
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rounded-full border ${
            i <= score
              ? "border-[#B74134] bg-[#B74134]"
              : "border-stone-300 bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-3/4" />
      <div className="h-4 bg-stone-200 rounded w-full" />
      <div className="h-4 bg-stone-200 rounded w-5/6" />
      <div className="h-4 bg-stone-200 rounded w-2/3" />
      <div className="h-4 bg-stone-200 rounded w-full" />
      <div className="h-4 bg-stone-200 rounded w-4/5" />
    </div>
  );
}

export function FeedbackPanel({
  status,
  comments,
  issues,
  questions,
  scores,
  errorMessage,
  onCommentClick,
  onDismiss,
  onRetry,
}: Props) {
  const hasContent =
    comments.length > 0 ||
    issues.length > 0 ||
    questions.length > 0 ||
    scores.length > 0;
  const isLoading = status === "loading";

  return (
    <div data-testid="feedback-panel" className="border-2 border-stone-200 bg-white shadow-[4px_4px_0px_#2C2416] p-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          Coach Feedback
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          className="text-stone-500 hover:text-stone-600 text-sm font-medium"
        >
          Dismiss
        </button>
      </div>

      {/* Error state */}
      {status === "error" && (
        <div className="rounded border-2 border-red-300 bg-red-50 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-red-800">
            {errorMessage ?? "Something went wrong"}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeleton when no content yet */}
      {isLoading && !hasContent && <Skeleton />}

      {/* Inline Comments */}
      {comments.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Inline Comments
          </h3>
          <div className="space-y-3">
            {comments.map((comment) => (
              <button
                type="button"
                key={comment.quotedText}
                onClick={() => { onCommentClick(comment.quotedText); }}
                className="w-full text-left border-2 border-stone-100 hover:border-[#B74134] p-3 transition-colors group"
              >
                <p className="text-sm font-medium text-[#B74134] mb-1 group-hover:underline">
                  &ldquo;{comment.quotedText}&rdquo;
                </p>
                <p className="text-sm text-stone-700 mb-1">
                  <span className="font-semibold">Problem:</span>{" "}
                  {comment.problem}
                </p>
                <p className="text-sm text-stone-600 mb-1">
                  <span className="font-semibold">Why it matters:</span>{" "}
                  {comment.why}
                </p>
                <p className="text-sm text-stone-700 italic mb-1">
                  {comment.question}
                </p>
                <p className="text-sm text-stone-600">
                  <span className="font-semibold">Action:</span>{" "}
                  {comment.suggestedAction}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Issues
          </h3>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div key={`${issue.tag}-${issue.severity}-${issue.description.slice(0, 40)}`} className="border-2 border-stone-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[issue.severity] ?? ""}`}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    {TAG_LABELS[issue.tag] ?? issue.tag}
                  </span>
                </div>
                <p className="text-sm text-stone-700 mb-1">
                  {issue.description}
                </p>
                <p className="text-sm text-stone-600">
                  <span className="font-semibold">Action:</span>{" "}
                  {issue.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Socratic Questions */}
      {questions.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Questions to Consider
          </h3>
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.question} className="border-l-3 border-[#B74134] pl-3 py-1">
                <p className="text-sm font-medium text-stone-800 italic">
                  {q.question}
                </p>
                <p className="text-xs text-stone-600 mt-1">{q.context}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rubric Scores */}
      {scores.length > 0 && (
        <section className="mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Rubric
          </h3>
          <div className="space-y-2">
            {scores.map((s) => (
              <div
                key={s.dimension}
                className="flex items-center justify-between border-2 border-stone-100 p-2.5"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold text-stone-800 capitalize">
                    {TAG_LABELS[s.dimension] ?? s.dimension}
                  </p>
                  <p className="text-xs text-stone-600 truncate">
                    {s.rationale}
                  </p>
                </div>
                <ScoreDots score={s.score} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading indicator when streaming */}
      {isLoading && hasContent && (
        <div className="flex items-center gap-2 text-sm text-stone-500 mt-3">
          <div className="h-1.5 w-1.5 rounded-full bg-[#B74134] animate-pulse" />
          Analyzing...
        </div>
      )}
    </div>
  );
}
