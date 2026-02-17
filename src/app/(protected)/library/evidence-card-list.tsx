"use client";

import { useState } from "react";
import { EvidenceCardForm } from "./evidence-card-form";
import { DeleteConfirmation } from "./delete-confirmation";
import { deleteEvidenceCardAction } from "./actions";
import type { SerializedCard } from "../evidence-types";

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; cardId: string }
  | { mode: "delete"; cardId: string };

const DEFAULT_STANCE = { bg: "bg-emerald-100", text: "text-emerald-800", label: "Supports" };

const STANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  supports: DEFAULT_STANCE,
  complicates: { bg: "bg-amber-100", text: "text-amber-800", label: "Complicates" },
  contradicts: { bg: "bg-red-100", text: "text-red-800", label: "Contradicts" },
};

export function EvidenceCardList({
  initialCards,
}: {
  initialCards: SerializedCard[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreated = (card: SerializedCard) => {
    setCards((prev) => [card, ...prev]);
    setModal({ mode: "closed" });
  };

  const handleUpdated = (card: SerializedCard) => {
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? card : c)),
    );
    setModal({ mode: "closed" });
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    const result = await deleteEvidenceCardAction(id);
    if ("error" in result) {
      setDeleteError(result.error);
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
    setModal({ mode: "closed" });
  };

  const editCard = modal.mode === "edit" ? cards.find((c) => c.id === modal.cardId) : undefined;
  const deleteCard = modal.mode === "delete" ? cards.find((c) => c.id === modal.cardId) : undefined;

  return (
    <>
      <div className="mt-6 mb-8">
        <button
          type="button"
          onClick={() => { setModal({ mode: "create" }); }}
          className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
        >
          Add Evidence
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-serif text-xl font-semibold text-stone-300">
            No evidence cards yet.
          </p>
          <p className="mt-2 text-sm text-stone-400">
            Click &ldquo;Add Evidence&rdquo; to start building your evidence library.
          </p>
        </div>
      ) : (
        <div className="space-y-4 stagger">
          {cards.map((card) => {
            const stance = STANCE_STYLES[card.stance] ?? DEFAULT_STANCE;
            return (
              <div
                key={card.id}
                className="animate-fade-up border-t-4 border-t-stone-900 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-serif text-lg font-semibold text-stone-900">
                        {card.sourceTitle}
                      </h3>
                      <span
                        className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${stance.bg} ${stance.text}`}
                      >
                        {stance.label}
                      </span>
                    </div>
                    {card.quoteSnippet && (
                      <p className="mt-2 line-clamp-2 text-sm italic text-stone-500">
                        &ldquo;{card.quoteSnippet}&rdquo;
                      </p>
                    )}
                    {card.userSummary && (
                      <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                        {card.userSummary}
                      </p>
                    )}
                    <a
                      href={card.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-stone-400 hover:text-[#B74134]"
                    >
                      {card.sourceUrl}
                    </a>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => { setModal({ mode: "edit", cardId: card.id }); }}
                      className="border-2 border-stone-300 bg-white px-3 py-1 text-xs font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModal({ mode: "delete", cardId: card.id }); }}
                      className="border-2 border-red-300 bg-white px-3 py-1 text-xs font-bold text-red-600 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-red-600 hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {modal.mode === "create" && (
        <EvidenceCardForm
          onClose={() => { setModal({ mode: "closed" }); }}
          onSaved={handleCreated}
        />
      )}

      {/* Edit modal */}
      {modal.mode === "edit" && editCard && (
        <EvidenceCardForm
          card={editCard}
          onClose={() => { setModal({ mode: "closed" }); }}
          onSaved={handleUpdated}
        />
      )}

      {/* Delete confirmation */}
      {modal.mode === "delete" && deleteCard && (
        <DeleteConfirmation
          cardTitle={deleteCard.sourceTitle}
          error={deleteError}
          onCancel={() => { setModal({ mode: "closed" }); setDeleteError(null); }}
          onConfirm={() => { void handleDelete(deleteCard.id); }}
        />
      )}
    </>
  );
}
