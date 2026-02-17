export default function DesignKitPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── Hero ── */}
      <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24">
        <div className="animate-fade-up text-center">
          <div className="mx-auto mb-6 h-px w-12 bg-[#B74134]" />
          <h1 className="font-serif text-5xl font-semibold tracking-tight text-stone-900 md:text-7xl">
            Design Kit
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-stone-500">
            Warm editorial craft meets modern digital workspace. Newsreader
            serif, warm stone palette, tactile interactions, paper texture.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-32 px-6 pb-32 md:px-12">
        {/* ── Typography ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Typography
          </p>
          <div className="space-y-12">
            <div>
              <span className="font-mono text-xs text-stone-400">
                Display / Newsreader 60px
              </span>
              <h2 className="mt-2 font-serif text-5xl font-semibold leading-tight tracking-tight text-stone-900 md:text-6xl">
                The practiced mind writes with clarity
              </h2>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                H1 / Newsreader 48px
              </span>
              <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-900 md:text-5xl">
                Writing as a craft worth practicing
              </h2>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                H2 / Newsreader 30px
              </span>
              <h3 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight text-stone-900">
                Evidence-backed micro-essays
              </h3>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                H3 / Newsreader 24px
              </span>
              <h4 className="mt-2 font-serif text-2xl font-semibold leading-snug tracking-tight text-stone-900">
                Building a thinking portfolio
              </h4>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                Body / DM Sans 18px
              </span>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed text-stone-700">
                The best writing environments disappear. They don&apos;t compete
                with your ideas or distract from your thinking. They provide just
                enough structure to feel supportive and just enough breathing
                room to feel calm. Every micro-essay is a deliberate practice
                session, not a performance.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                Body Small / DM Sans 14px
              </span>
              <p className="mt-2 text-sm leading-normal text-stone-500">
                Helper text, captions, and metadata display. Reduced color
                provides hierarchy without harsh contrast.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                Coaching / Caveat 18px
              </span>
              <p className="mt-2 font-handwriting text-lg leading-relaxed text-[#B74134]">
                This handwriting font creates a &ldquo;professor&apos;s red
                pen&rdquo; feeling &mdash; coaching, not correcting. Used only
                for margin annotations.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-stone-400">
                Code / Monospace 14px
              </span>
              <code className="mt-2 inline-block rounded bg-stone-100 px-2 py-0.5 font-mono text-sm text-stone-800">
                const essay = await db.query.essays.findFirst()
              </code>
            </div>
          </div>
        </section>

        {/* ── Color ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Color
          </p>

          {/* Large accent swatches */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex h-32 items-end bg-[#B74134] p-4">
              <span className="font-mono text-sm text-white/80">
                Brick Red #B74134
              </span>
            </div>
            <div className="flex h-32 items-end bg-stone-900 p-4">
              <span className="font-mono text-sm text-stone-400">
                Ink #1C1917
              </span>
            </div>
            <div className="flex h-32 items-end border border-stone-200 bg-[#FAFAF8] p-4">
              <span className="font-mono text-sm text-stone-400">
                Surface #FAFAF8
              </span>
            </div>
          </div>

          {/* Accent variants */}
          <div className="mb-6 flex gap-2">
            <div className="flex h-16 flex-1 items-end justify-center bg-[#9A3329] pb-1">
              <span className="text-[10px] font-mono text-white/60">
                Hover
              </span>
            </div>
            <div className="flex h-16 flex-1 items-end justify-center bg-[#B74134] pb-1">
              <span className="text-[10px] font-mono text-white/60">
                Primary
              </span>
            </div>
            <div className="flex h-16 flex-1 items-end justify-center bg-[#FFF5F3] pb-1">
              <span className="text-[10px] font-mono text-stone-400">
                Light
              </span>
            </div>
            <div className="flex h-16 flex-1 items-end justify-center bg-[#2C2416] pb-1">
              <span className="text-[10px] font-mono text-stone-400">
                Shadow
              </span>
            </div>
          </div>

          {/* Stone scale */}
          <div className="flex gap-1">
            {[
              { bg: "bg-stone-950", label: "950" },
              { bg: "bg-stone-900", label: "900" },
              { bg: "bg-stone-800", label: "800" },
              { bg: "bg-stone-700", label: "700" },
              { bg: "bg-stone-600", label: "600" },
              { bg: "bg-stone-500", label: "500" },
              { bg: "bg-stone-400", label: "400" },
              { bg: "bg-stone-300", label: "300" },
              { bg: "bg-stone-200", label: "200" },
              { bg: "bg-stone-100", label: "100" },
              { bg: "bg-stone-50", label: "50" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} flex h-16 flex-1 items-end justify-center pb-1`}
              >
                <span
                  className={`font-mono text-[10px] ${
                    parseInt(s.label) >= 500
                      ? "text-white/60"
                      : "text-stone-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Semantic colors */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex h-16 items-center justify-center border border-emerald-200 bg-emerald-50">
              <span className="text-sm font-medium text-emerald-800">
                Success
              </span>
            </div>
            <div className="flex h-16 items-center justify-center border border-amber-200 bg-amber-50">
              <span className="text-sm font-medium text-amber-900">
                Warning
              </span>
            </div>
            <div className="flex h-16 items-center justify-center border border-red-200 bg-red-50">
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <div className="flex h-16 items-center justify-center border border-sky-200 bg-sky-50">
              <span className="text-sm font-medium text-sky-800">Info</span>
            </div>
          </div>
        </section>

        {/* ── Shadow Hierarchy ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Shadow Hierarchy
          </p>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-stone-600">
            Hard ink shadows are a <em>reward</em>, not a default. At rest,
            elements use subtle elevation. The hard shadow appears on hover and
            focus &mdash; making interaction feel tactile and intentional.
          </p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="bg-white p-8 text-center">
              <p className="text-sm font-medium text-stone-900">None</p>
              <p className="mt-1 font-mono text-xs text-stone-400">
                background elements
              </p>
            </div>
            <div className="bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-stone-900">Rest</p>
              <p className="mt-1 font-mono text-xs text-stone-400">shadow-sm</p>
            </div>
            <div className="bg-white p-8 text-center shadow-[3px_3px_0px_#2C2416]">
              <p className="text-sm font-medium text-stone-900">
                Hover / Focus
              </p>
              <p className="mt-1 font-mono text-xs text-stone-400">
                3px warm ink
              </p>
            </div>
            <div className="bg-white p-8 text-center shadow-[5px_5px_0px_#2C2416]">
              <p className="text-sm font-medium text-stone-900">Emphasis</p>
              <p className="mt-1 font-mono text-xs text-stone-400">
                5px warm ink
              </p>
            </div>
          </div>
        </section>

        {/* ── Buttons ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Buttons
          </p>
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-sm font-medium text-stone-500">
                Primary &mdash; pill, brick red, hard shadow
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full bg-[#B74134] px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  Small
                </button>
                <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  Publish Essay
                </button>
                <button className="rounded-full bg-[#B74134] px-8 py-4 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  Large CTA
                </button>
                <button
                  className="cursor-not-allowed rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] opacity-40"
                  disabled
                >
                  Disabled
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-stone-500">
                Secondary &mdash; pill outline
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-all duration-200 hover:bg-stone-900 hover:text-white">
                  Save Draft
                </button>
                <button className="rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-all duration-200 hover:bg-stone-900 hover:text-white">
                  Preview
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-stone-500">Ghost</p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full px-6 py-3 text-sm font-semibold text-stone-500 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900">
                  Cancel
                </button>
                <button className="rounded-full px-6 py-3 text-sm font-semibold text-stone-500 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900">
                  Back
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-stone-500">
                Destructive
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-red-700 hover:shadow-[5px_5px_0px_#2C2416]">
                  Delete Essay
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-stone-500">
                Toolbar &mdash; neobrutalist formatting buttons
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button className="border-2 border-[#B74134] bg-[#B74134] px-2.5 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  B
                </button>
                <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 hover:shadow-[3px_3px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  I
                </button>
                <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 hover:shadow-[3px_3px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  H2
                </button>
                <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 hover:shadow-[3px_3px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  H3
                </button>
                <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 hover:shadow-[3px_3px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416]">
                  List
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Form Inputs ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Form Inputs
          </p>
          <div className="max-w-lg space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-900">
                Text Input
              </label>
              <input
                type="text"
                placeholder="Start typing..."
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 transition-all duration-200 focus:border-[#B74134] focus:shadow-[3px_3px_0px_#2C2416] focus:outline-none"
              />
              <p className="mt-1.5 text-sm text-stone-500">
                Helper text guides the user.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-900">
                Essay Title (editor style)
              </label>
              <input
                type="text"
                placeholder="Untitled essay"
                className="w-full border-0 bg-transparent px-0 py-2 font-serif text-3xl font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-900">
                Textarea
              </label>
              <textarea
                placeholder="Write your thoughts here..."
                rows={4}
                className="w-full resize-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 transition-all duration-200 focus:border-[#B74134] focus:shadow-[3px_3px_0px_#2C2416] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-900">
                Error State
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 transition-all duration-200 focus:border-red-500 focus:shadow-[3px_3px_0px_#2C2416] focus:outline-none"
              />
              <p className="mt-1.5 text-sm text-red-800">
                Please enter a valid email address.
              </p>
            </div>
          </div>
        </section>

        {/* ── Stamp Badges ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Stamp Badges
          </p>
          <p className="mb-6 max-w-2xl text-base leading-relaxed text-stone-600">
            Rotated stamp badges with heavy borders and hard shadows. Used only
            for essay status markers &mdash; small, contained, memorable.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <div className="inline-block rotate-2">
              <span className="inline-block rounded border-[3px] border-amber-800 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 shadow-[2px_2px_0px_#2C2416]">
                Draft
              </span>
            </div>
            <div className="inline-block -rotate-2">
              <span className="inline-block rounded border-[3px] border-emerald-800 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 shadow-[2px_2px_0px_#2C2416]">
                Published
              </span>
            </div>
            <div className="inline-block rotate-3">
              <span className="inline-block rounded border-[3px] border-sky-800 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-800 shadow-[2px_2px_0px_#2C2416]">
                In Review
              </span>
            </div>
            <div className="inline-block -rotate-1">
              <span className="inline-block rounded border-[3px] border-red-800 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-800 shadow-[2px_2px_0px_#2C2416]">
                Archived
              </span>
            </div>
          </div>
        </section>

        {/* ── Cards ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Cards
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Essay card */}
            <div className="group cursor-pointer border-t-4 border-t-stone-900 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900 transition-colors duration-200 group-hover:text-[#B74134]">
                    Why practice beats talent
                  </h3>
                  <p className="mt-1 text-sm font-medium text-stone-500">
                    623 words &middot; 3 min read
                  </p>
                </div>
                <div className="inline-block -rotate-2">
                  <span className="inline-block rounded border-[3px] border-emerald-800 bg-emerald-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-800 shadow-[2px_2px_0px_#2C2416]">
                    Published
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence card */}
            <div className="border-l-4 border-l-[#B74134] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
              <h3 className="mb-2 font-serif text-lg font-semibold text-stone-900">
                Evidence Card
              </h3>
              <p className="mb-3 text-base leading-relaxed text-stone-700">
                &ldquo;The most effective learning happens when we deliberately
                practice at the edge of our current ability.&rdquo;
              </p>
              <p className="text-sm text-stone-500">
                Anders Ericsson &middot; 2016
              </p>
            </div>

            {/* Standard card */}
            <div className="bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
              <h3 className="mb-2 font-serif text-lg font-semibold text-stone-900">
                Standard Card
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Subtle at rest with shadow-sm. Hard warm shadow appears on hover
                as a tactile reward &mdash; not decoration, but interaction
                feedback.
              </p>
            </div>

            {/* Featured card */}
            <div className="bg-white p-8 shadow-[3px_3px_0px_#2C2416]">
              <h3 className="mb-2 font-serif text-lg font-semibold text-stone-900">
                Featured Card
              </h3>
              <p className="mb-4 text-base leading-relaxed text-stone-600">
                Generous padding and hard shadow by default signals importance.
              </p>
              <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-200 hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416]">
                Continue Writing
              </button>
            </div>
          </div>
        </section>

        {/* ── Navigation ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Navigation
          </p>
          <div className="overflow-hidden border border-stone-200">
            <nav className="flex h-14 items-center justify-between border-b border-stone-200 bg-white/80 px-6 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <span className="font-serif text-lg font-semibold tracking-tight text-stone-900">
                  Microblogger
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-stone-900 underline decoration-2 underline-offset-4">
                    Editor
                  </span>
                  <span className="text-sm font-medium text-stone-500 transition-colors duration-200 hover:text-stone-900">
                    Library
                  </span>
                  <span className="text-sm font-medium text-stone-500 transition-colors duration-200 hover:text-stone-900">
                    Evidence
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-stone-500">
                  Sign out
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B74134] text-xs font-semibold text-white ring-2 ring-stone-200">
                  JD
                </div>
              </div>
            </nav>
          </div>
        </section>

        {/* ── Editor Demo ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Editor
          </p>
          <div className="mx-auto max-w-2xl">
            <input
              type="text"
              defaultValue="Why practice beats talent"
              readOnly
              className="w-full border-0 bg-transparent px-0 py-2 font-serif text-4xl font-semibold tracking-tight text-stone-900 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3 text-sm font-medium">
              <span className="text-[#B74134]">623 words</span>
              <span className="text-stone-300">&middot;</span>
              <span className="text-stone-400">Saved</span>
            </div>

            {/* Word progress bar */}
            <div className="mb-8 mt-3 h-0.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-[78%] rounded-full bg-[#B74134] transition-all duration-500" />
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button className="border-2 border-[#B74134] bg-[#B74134] px-2.5 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416]">
                B
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                I
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                H2
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                H3
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                List
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                1.
              </button>
              <button className="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416]">
                &ldquo;
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 text-lg leading-relaxed text-stone-800">
              <p>
                Deliberate practice with structured feedback creates expertise
                more reliably than raw talent. The &ldquo;writing gym&rdquo;
                model applies this to intellectual work &mdash; each micro-essay
                is a rep, not a performance.
              </p>

              {/* Coaching annotation */}
              <div className="border-l-4 border-[#B74134] bg-[#FFF5F3] p-4 shadow-[3px_3px_0px_#2C2416]">
                <p className="mb-1 font-handwriting text-lg text-[#B74134]">
                  Coach feedback
                </p>
                <p className="text-sm text-stone-700">
                  Strong claim. Can you add evidence to support why practice
                  environments should be invisible? Consider citing research on
                  cognitive load.
                </p>
              </div>

              <p>
                The interface honors this by making reading comfortable and
                distraction-free. High-contrast text on warm surfaces creates
                focus without clinical coldness, while the generous line height
                makes sustained writing feel natural.
              </p>
            </div>
          </div>
        </section>

        {/* ── Motion ── */}
        <section className="animate-fade-up">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Motion
          </p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Entrance choreography
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Pages use <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">animate-fade-up</code> with
                staggered delays. Content cascades in naturally rather than
                appearing all at once.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Shadow as feedback
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Cards at rest use <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">shadow-sm</code>.
                On hover, the hard ink shadow appears via{" "}
                <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">transition-all duration-300</code>.
                This makes interaction feel tactile.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Word count progress
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                The thin progress bar below the editor status fills smoothly
                with a 700ms ease-out transition. Stone grey below target, brick
                red in the sweet spot, dark red over limit.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Button press
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Primary buttons and toolbar buttons use{" "}
                <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">active:translate</code> with
                shadow reduction for a physical press feeling.
              </p>
            </div>
          </div>
        </section>

        {/* ── Principles ── */}
        <section className="animate-fade-up border-t border-stone-200 pt-16">
          <p className="mb-12 text-sm font-medium uppercase tracking-widest text-[#B74134]">
            Principles
          </p>
          <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Shadow as emphasis, not wallpaper
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Hard ink shadows appear on hover and focus as a tactile reward.
                At rest, elements use subtle elevation. This creates delight
                through interaction, not visual noise.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Warm neutrals, not clinical greys
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                The stone palette carries warmth throughout. Ink black (#1C1917)
                replaces pure black. Paper grain texture adds craft that flat CSS
                colors cannot achieve alone.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Typography does the heavy lifting
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Newsreader for editorial authority. DM Sans for clear UI. Caveat
                for coaching warmth. Three typefaces, each with a clear role.
                Size and weight create hierarchy &mdash; not color or decoration.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Contained personality
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Stamp badges get rotation and heavy borders. Coaching annotations
                get handwriting. Everything else stays disciplined. Personality
                is impactful because it is rare.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Brick red signals action, not alarm
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                The accent (#B74134) is warm and editorial &mdash; think literary
                journals, not error messages. It signals action without urgency,
                confidence without aggression.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-stone-900">
                Entrance, not arrival
              </h3>
              <p className="text-base leading-relaxed text-stone-600">
                Content fades up with staggered timing. The page breathes to
                life rather than appearing instantly. Motion is subtle,
                choreographed, and meaningful &mdash; never gratuitous.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center md:px-12">
          <p className="text-sm font-medium text-stone-400">
            Microblogger Design Kit &mdash; Warm Editorial Craft
          </p>
        </div>
      </footer>
    </div>
  );
}
