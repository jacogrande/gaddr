"use client";

import { useRouter } from "next/navigation";

export function ErrorBanner({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => { router.replace("/dashboard", { scroll: false }); }}
        className="ml-4 font-medium text-red-900 hover:text-red-700"
      >
        Dismiss
      </button>
    </div>
  );
}
