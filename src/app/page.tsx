import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8]">
      <h1 className="font-serif text-5xl font-bold tracking-tight text-black">
        Microblogger
      </h1>
      <p className="mt-4 max-w-md text-center text-lg text-zinc-600">
        Write short, evidence-backed micro-essays. Get coaching, not
        ghostwriting.
      </p>
      <Link
        href="/sign-in"
        className="mt-8 rounded-full border-2 border-black bg-[#8B2500] px-8 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
      >
        Start Writing
      </Link>
    </main>
  );
}
