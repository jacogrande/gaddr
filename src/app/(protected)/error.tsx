"use client";

export default function ProtectedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-1)] p-6 text-center">
        <h2 className="text-xl font-semibold text-[var(--app-fg)]">Something went wrong</h2>
        <p className="mt-2 text-sm text-[color:var(--app-muted)]">Please try again.</p>
        <button
          type="button"
          onClick={() => {
            reset();
          }}
          className="mt-4 rounded border border-[color:var(--border-soft)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium text-[color:var(--app-muted)] hover:bg-[var(--surface-3)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
