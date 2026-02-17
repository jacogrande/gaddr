import Link from "next/link";

export default function PortfolioNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-6">
      <div className="animate-fade-up text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">
          User not found
        </h1>
        <p className="mt-3 text-stone-500">
          This portfolio doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-all duration-200 hover:bg-stone-900 hover:text-white"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
