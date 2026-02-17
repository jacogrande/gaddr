"use client";

import { useTransition } from "react";
import { deleteEssayAction } from "../editor/actions";

export function DeleteEssayButton({ essayId }: { essayId: string }) {
  const [pending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Delete this essay? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteEssayAction(essayId);
      if ("error" in result) {
        window.alert(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDelete}
      className="rounded p-1 text-stone-300 transition-colors hover:text-red-600 disabled:opacity-50"
      aria-label="Delete essay"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
