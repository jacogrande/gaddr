import Link from "next/link";

export default function EditorNotFound() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-black">
        Essay not found
      </h1>
      <p className="mt-2 text-zinc-600">
        This essay doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-lg border-2 border-black bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
