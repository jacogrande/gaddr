import Link from "next/link";

export default function EditorNotFound() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center animate-fade-up">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">
        Essay not found
      </h1>
      <p className="mt-3 text-stone-500">
        This essay doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-block rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-all duration-200 hover:bg-stone-900 hover:text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
