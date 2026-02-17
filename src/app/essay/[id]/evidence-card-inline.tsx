"use client";

import { useState } from "react";
import type { Stance } from "../../../domain/evidence/evidence-card";
import { isSafeUrl } from "../../../domain/types/url";

type Props = {
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly quoteSnippet: string | null;
  readonly userSummary: string | null;
  readonly caveats: string | null;
  readonly stance: Stance;
  readonly claimText: string;
};

const STANCE_COLORS: Record<Stance, { border: string; bg: string; badge: string; label: string }> = {
  supports: {
    border: "border-l-emerald-600",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Supports",
  },
  complicates: {
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    label: "Complicates",
  },
  contradicts: {
    border: "border-l-red-600",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    label: "Contradicts",
  },
};

export function EvidenceCardInline({
  sourceUrl,
  sourceTitle,
  quoteSnippet,
  userSummary,
  caveats,
  stance,
  claimText,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const colors = STANCE_COLORS[stance];
  const safeHref = isSafeUrl(sourceUrl) ? sourceUrl : "#";

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => { setExpanded(true); }}
        className="mt-1 mb-3 flex items-center gap-2 rounded-sm border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-700"
      >
        <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors.badge}`}>
          {colors.label}
        </span>
        <span className="truncate">{sourceTitle}</span>
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`mt-1 mb-3 border-l-4 ${colors.border} bg-white p-4 shadow-[3px_3px_0px_#2C2416] animate-fade-up`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors.badge}`}>
            {colors.label}
          </span>
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-[#B74134]"
          >
            {sourceTitle}
          </a>
        </div>
        <button
          type="button"
          onClick={() => { setExpanded(false); }}
          className="shrink-0 text-stone-400 hover:text-stone-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-xs text-stone-400">
        re: &ldquo;{claimText}&rdquo;
      </p>

      {quoteSnippet ? (
        <blockquote className="mt-3 border-l-2 border-stone-300 pl-3 text-sm italic text-stone-600">
          &ldquo;{quoteSnippet}&rdquo;
        </blockquote>
      ) : null}

      {userSummary ? (
        <p className="mt-2 text-sm text-stone-700">{userSummary}</p>
      ) : null}

      {caveats ? (
        <p className="mt-2 text-xs text-stone-500">
          <span className="font-semibold">Caveats:</span> {caveats}
        </p>
      ) : null}
    </div>
  );
}
