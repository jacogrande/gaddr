"use client";

type Props = {
  cardTitle: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmation({ cardTitle, error, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm animate-fade-up border-t-4 border-t-red-600 bg-white p-8 shadow-[6px_6px_0px_#2C2416]">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          Delete Evidence Card
        </h2>
        <p className="mt-3 text-sm text-stone-600">
          Delete &ldquo;{cardTitle}&rdquo;? This will remove it from all linked essays.
        </p>

        {error && (
          <div className="mt-3 rounded border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-150 hover:bg-red-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
