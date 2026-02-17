"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Skip client-side capture for server-originated errors (already reported via reportError)
    if (!error.digest) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0_0_#000]">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-black">
          Something went wrong
        </h2>
        <p className="mt-3 text-sm text-stone-600">
          We hit an unexpected error. Any unsaved changes may be lost.
        </p>
        <button
          type="button"
          onClick={() => { reset(); }}
          className="mt-6 rounded-full border-2 border-black bg-[#8B2500] px-6 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
