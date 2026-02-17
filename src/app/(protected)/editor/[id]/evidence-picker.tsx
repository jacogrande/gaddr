"use client";

import { useEffect, useState } from "react";
import type { EvidenceCardSummary } from "../../evidence-types";

type Props = {
  cards: EvidenceCardSummary[];
  onPick: (cardId: string) => void;
  onClose: () => void;
};

const DEFAULT_STANCE = { bg: "bg-emerald-100", text: "text-emerald-800", label: "Supports" };

const STANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  supports: DEFAULT_STANCE,
  complicates: { bg: "bg-amber-100", text: "text-amber-800", label: "Complicates" },
  contradicts: { bg: "bg-red-100", text: "text-red-800", label: "Contradicts" },
};

export function EvidencePicker({ cards, onPick, onClose }: Props) {
  const [filter, setFilter] = useState("");
  const filtered = cards.filter(
    (c) =>
      c.sourceTitle.toLowerCase().includes(filter.toLowerCase()) ||
      (c.quoteSnippet?.toLowerCase().includes(filter.toLowerCase()) ?? false) ||
      (c.userSummary?.toLowerCase().includes(filter.toLowerCase()) ?? false),
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => { window.removeEventListener("keydown", handleEscape); };
  }, [onClose]);

  return (
    <div className="w-full lg:w-[380px] flex-shrink-0">
      <div className="lg:sticky lg:top-8">
        <div className="animate-fade-in border-t-4 border-t-stone-900 bg-white p-5 shadow-[4px_4px_0px_#2C2416]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Attach Evidence
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-900"
            >
              &times;
            </button>
          </div>

          <input
            type="text"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); }}
            placeholder="Filter evidence..."
            className="mt-3 w-full border-2 border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
          />

          <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">
                {cards.length === 0
                  ? "No evidence cards yet. Add some in your Library."
                  : "No matches found."}
              </p>
            ) : (
              filtered.map((card) => {
                const stance = STANCE_STYLES[card.stance] ?? DEFAULT_STANCE;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => { onPick(card.id); }}
                    className="w-full border-2 border-stone-200 bg-white p-3 text-left transition-all duration-150 hover:border-stone-900 hover:shadow-[2px_2px_0px_#2C2416]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900">
                        {card.sourceTitle}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${stance.bg} ${stance.text}`}
                      >
                        {stance.label}
                      </span>
                    </div>
                    {card.quoteSnippet && (
                      <p className="mt-1 line-clamp-1 text-xs italic text-stone-500">
                        &ldquo;{card.quoteSnippet}&rdquo;
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
