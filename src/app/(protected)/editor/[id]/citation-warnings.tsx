"use client";

import { useState } from "react";
import type { CitationMismatch } from "../../../../domain/evidence/citation-mismatch";

type Props = {
  mismatches: CitationMismatch[];
  onRemoveLink?: (linkId: string) => void;
};

export function CitationWarnings({ mismatches, onRemoveLink }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (mismatches.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-in border-2 border-amber-300 bg-amber-50 px-4 py-3">
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); }}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-bold text-amber-800">
          {mismatches.length} citation {mismatches.length === 1 ? "warning" : "warnings"}
        </span>
        <span className="text-xs text-amber-600">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {mismatches.map((m, i) => (
            <li
              key={`${m.kind}-${String(i)}`}
              className="flex items-start gap-2 text-sm text-amber-800"
            >
              <span className="mt-0.5 shrink-0">
                {m.kind === "OrphanedLink"
                  ? "🔗"
                  : m.kind === "StanceMismatch"
                    ? "⚠"
                    : "📝"}
              </span>
              <div className="min-w-0 flex-1">
                <p>{m.message}</p>
                {m.kind === "OrphanedLink" && onRemoveLink && (
                  <button
                    type="button"
                    onClick={() => { onRemoveLink(m.linkId); }}
                    className="mt-1 text-xs font-bold text-amber-700 underline hover:text-amber-900"
                  >
                    Remove link
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
