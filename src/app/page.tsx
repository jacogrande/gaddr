import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-6">
      <div className="animate-fade-up text-center">
        <div className="mx-auto mb-8 h-px w-16 bg-[#B74134]" />
        <h1 className="font-serif text-6xl font-semibold tracking-tight text-stone-900 md:text-7xl">
          Microblogger
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-stone-500">
          Write short, evidence-backed micro-essays.
          <br />
          Get coaching, not ghostwriting.
        </p>
        <Link
          href="/sign-in"
          className="mt-10 inline-block rounded-full bg-[#B74134] px-8 py-3.5 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]"
        >
          Start Writing
        </Link>
      </div>
    </main>
  );
}
