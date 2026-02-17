"use client";

import { useRouter } from "next/navigation";

export function ErrorBanner({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div className="mb-6 flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-[3px_3px_0px_#2C2416]">
      <span className="font-medium">{message}</span>
      <button
        type="button"
        onClick={() => { router.replace("/dashboard", { scroll: false }); }}
        className="ml-4 text-sm font-semibold text-red-900 transition-colors duration-200 hover:text-red-700"
      >
        Dismiss
      </button>
    </div>
  );
}
