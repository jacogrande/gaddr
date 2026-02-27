import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[var(--app-fg)]">Page not found</h1>
        <p className="mt-3 text-[color:var(--app-muted)]">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded border border-[color:var(--border-soft)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[color:var(--app-muted)] hover:bg-[var(--surface-2)]"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
