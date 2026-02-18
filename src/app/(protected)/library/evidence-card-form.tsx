"use client";

import { useState } from "react";
import { CreateEvidenceCardInputSchema, UpdateEvidenceCardInputSchema } from "../../../domain/evidence/schemas";
import { createEvidenceCardAction, updateEvidenceCardAction } from "./actions";
import type { SerializedCard } from "../evidence-types";

type Props = {
  card?: SerializedCard;
  onClose: () => void;
  onSaved: (card: SerializedCard) => void;
};

const STANCE_OPTIONS = [
  { value: "supports", label: "Supports", color: "border-emerald-600 bg-emerald-50 text-emerald-800" },
  { value: "complicates", label: "Complicates", color: "border-amber-600 bg-amber-50 text-amber-800" },
  { value: "contradicts", label: "Contradicts", color: "border-red-600 bg-red-50 text-red-800" },
] as const;

export function EvidenceCardForm({ card, onClose, onSaved }: Props) {
  const isEdit = !!card;
  const [sourceUrl, setSourceUrl] = useState(card?.sourceUrl ?? "");
  const [sourceTitle, setSourceTitle] = useState(card?.sourceTitle ?? "");
  const [quoteSnippet, setQuoteSnippet] = useState(card?.quoteSnippet ?? "");
  const [userSummary, setUserSummary] = useState(card?.userSummary ?? "");
  const [caveats, setCaveats] = useState(card?.caveats ?? "");
  const [stance, setStance] = useState(card?.stance ?? "supports");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    const formData = {
      sourceUrl,
      sourceTitle,
      quoteSnippet: quoteSnippet || null,
      userSummary: userSummary || null,
      caveats: caveats || null,
      stance,
    };

    // Client-side validation
    const schema = isEdit ? UpdateEvidenceCardInputSchema : CreateEvidenceCardInputSchema;
    const validation = schema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = isEdit
      ? await updateEvidenceCardAction(card.id, formData)
      : await createEvidenceCardAction(formData);
    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    onSaved(result.card);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg animate-fade-up border-t-4 border-t-stone-900 bg-white p-8 shadow-[6px_6px_0px_#2C2416]">
        <h2 className="font-serif text-2xl font-semibold text-stone-900">
          {isEdit ? "Edit Evidence Card" : "Add Evidence Card"}
        </h2>

        {error && (
          <div className="mt-4 rounded border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="mt-6 space-y-5">
          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-bold text-stone-700">
              Source URL
            </label>
            <input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => { setSourceUrl(e.target.value); }}
              placeholder="https://example.com/article"
              className="mt-1 w-full border-2 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="sourceTitle" className="block text-sm font-bold text-stone-700">
              Source Title
            </label>
            <input
              id="sourceTitle"
              type="text"
              value={sourceTitle}
              onChange={(e) => { setSourceTitle(e.target.value); }}
              placeholder="Name of the article, paper, or source"
              className="mt-1 w-full border-2 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              required
              maxLength={300}
            />
          </div>

          <div>
            <label htmlFor="quoteSnippet" className="block text-sm font-bold text-stone-700">
              Quote Snippet
            </label>
            <textarea
              id="quoteSnippet"
              value={quoteSnippet}
              onChange={(e) => { setQuoteSnippet(e.target.value); }}
              placeholder="Paste a relevant quote from the source"
              rows={3}
              className="mt-1 w-full border-2 border-stone-300 bg-white px-3 py-2 text-sm italic text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              maxLength={2000}
            />
          </div>

          <div>
            <label htmlFor="userSummary" className="block text-sm font-bold text-stone-700">
              Your Summary
            </label>
            <textarea
              id="userSummary"
              value={userSummary}
              onChange={(e) => { setUserSummary(e.target.value); }}
              placeholder="Summarize the key point in your own words"
              rows={3}
              className="mt-1 w-full border-2 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              maxLength={2000}
            />
          </div>

          <div>
            <label htmlFor="caveats" className="block text-sm font-bold text-stone-700">
              Caveats
            </label>
            <textarea
              id="caveats"
              value={caveats}
              onChange={(e) => { setCaveats(e.target.value); }}
              placeholder="Any limitations, caveats, or context about this evidence"
              rows={2}
              className="mt-1 w-full border-2 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              maxLength={1000}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700">Stance</label>
            <div className="mt-2 flex gap-3">
              {STANCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setStance(option.value); }}
                  className={`flex-1 border-2 px-3 py-2 text-sm font-bold transition-all duration-150 ${
                    stance === option.value
                      ? `${option.color} shadow-[3px_3px_0px_#2C2416]`
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border-2 border-[#B74134] bg-[#B74134] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-150 hover:bg-[#9A3329] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
