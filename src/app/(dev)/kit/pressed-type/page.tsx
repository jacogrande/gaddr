import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export default function PressedTypeKit() {
  return (
    <div className={`${playfair.variable} ${inter.variable} font-sans`}>
      {/* Header */}
      <header className="border-b-4 border-zinc-950 bg-white px-6 py-8 md:px-12 lg:px-24">
        <h1 className="font-serif text-6xl font-black leading-tight text-zinc-950">
          Pressed Type
        </h1>
        <p className="mt-4 text-xl font-medium text-zinc-600">
          Bold typographic confidence inspired by letterpress printing and
          editorial design.
        </p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-zinc-800">
          High-contrast black and white foundation with a single strong accent.
          The type itself is the design — large, assertive serifs and a rigid
          grid create a visual language that feels like a broadsheet
          newspaper&apos;s opinion section: confident, graphic, editorial.
        </p>
      </header>

      <main className="bg-white px-6 py-12 md:px-12 md:py-16 lg:px-24">
        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Color Palette
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Pure White */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-white"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Pure White
                </p>
                <p className="text-xs text-zinc-600">#FFFFFF</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  bg-white
                </p>
              </div>
            </div>

            {/* True Black */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-zinc-950"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  True Black
                </p>
                <p className="text-xs text-zinc-600">#09090b</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  bg-zinc-950
                </p>
              </div>
            </div>

            {/* Ink Gray */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-zinc-800"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">Ink Gray</p>
                <p className="text-xs text-zinc-600">#27272a</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  text-zinc-800
                </p>
              </div>
            </div>

            {/* Mid Gray */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-zinc-600"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">Mid Gray</p>
                <p className="text-xs text-zinc-600">#52525b</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  text-zinc-600
                </p>
              </div>
            </div>

            {/* Light Gray */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-zinc-100"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Light Gray
                </p>
                <p className="text-xs text-zinc-600">#f4f4f5</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  bg-zinc-100
                </p>
              </div>
            </div>

            {/* Border Gray */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-zinc-200"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Border Gray
                </p>
                <p className="text-xs text-zinc-600">#e4e4e7</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  border-zinc-200
                </p>
              </div>
            </div>

            {/* Vermillion */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-red-600"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Vermillion
                </p>
                <p className="text-xs text-zinc-600">#dc2626</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  bg-red-600
                </p>
              </div>
            </div>

            {/* Vermillion Hover */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-red-700"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Vermillion Hover
                </p>
                <p className="text-xs text-zinc-600">#b91c1c</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  hover:bg-red-700
                </p>
              </div>
            </div>

            {/* Vermillion Muted */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-red-50"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Vermillion Muted
                </p>
                <p className="text-xs text-zinc-600">#fef2f2</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  bg-red-50
                </p>
              </div>
            </div>

            {/* Success Green */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-emerald-600"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Success Green
                </p>
                <p className="text-xs text-zinc-600">#059669</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  text-emerald-600
                </p>
              </div>
            </div>

            {/* Warning Amber */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-amber-600"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Warning Amber
                </p>
                <p className="text-xs text-zinc-600">#d97706</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  text-amber-600
                </p>
              </div>
            </div>

            {/* Error Red */}
            <div className="border border-zinc-200">
              <div className="h-24 bg-red-700"></div>
              <div className="bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Error Red
                </p>
                <p className="text-xs text-zinc-600">#b91c1c</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  text-red-700
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Typography
          </h2>
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                H1 — Playfair Display 900
              </p>
              <h1 className="font-serif text-6xl font-black leading-tight text-zinc-950">
                The Authorship Rule
              </h1>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                H2 — Playfair Display 700
              </p>
              <h2 className="font-serif text-4xl font-bold leading-tight text-zinc-950">
                Practice Over Performance
              </h2>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                H3 — Playfair Display 700
              </p>
              <h3 className="font-serif text-2xl font-bold leading-tight text-zinc-950">
                Evidence Over Vibes
              </h3>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                H4 — Inter 600
              </p>
              <h4 className="text-xl font-semibold leading-normal text-zinc-950">
                Constraints Create Craft
              </h4>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Body — Inter 400
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-800">
                Micro-essays are practice reps, not final exams. The system
                encourages quick drafts, frequent revision, and visible progress
                over weeks. We position the LLM as a coach who diagnoses issues
                and suggests actions, not as a ghostwriter who fixes your essay.
                Creative constraints reduce friction and improve outcomes.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Small — Inter 500
              </p>
              <p className="text-sm text-zinc-600">
                Published 3 days ago • 4 min read
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Caption — Inter 500
              </p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Evidence Required
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Inline Code
              </p>
              <p className="text-base leading-relaxed text-zinc-800">
                The <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-950">Result&lt;T, E&gt;</code> type
                handles errors without throwing.
              </p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Buttons
          </h2>
          <div className="space-y-8">
            {/* Primary */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Primary (Vermillion)
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Small
                </button>
                <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Medium (Default)
                </button>
                <button className="rounded-full bg-red-600 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Large
                </button>
                <button
                  className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white opacity-50"
                  disabled
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Secondary */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Secondary (Black Outline)
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full border-2 border-zinc-950 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white">
                  Small
                </button>
                <button className="rounded-full border-2 border-zinc-950 bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white">
                  Medium (Default)
                </button>
                <button className="rounded-full border-2 border-zinc-950 bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white">
                  Large
                </button>
                <button
                  className="rounded-full border-2 border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-400"
                  disabled
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Ghost */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">Ghost</p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                  Small
                </button>
                <button className="rounded-full px-6 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                  Medium (Default)
                </button>
                <button className="rounded-full px-8 py-4 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                  Large
                </button>
                <button
                  className="rounded-full px-6 py-3 text-sm font-semibold text-zinc-400"
                  disabled
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Destructive */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Destructive
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-800">
                  Delete Essay
                </button>
                <button className="rounded-full border-2 border-red-700 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white">
                  Remove Evidence
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Form Inputs
          </h2>
          <div className="space-y-6">
            {/* Text Input */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-950">
                Essay Title
              </label>
              <input
                type="text"
                placeholder="Enter your thesis..."
                className="w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            {/* Text Input — Focus State */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-950">
                Focus State
              </label>
              <input
                type="text"
                value="The authorship rule is non-negotiable"
                className="w-full rounded-md border border-zinc-950 bg-white px-4 py-3 text-base text-zinc-950 ring-1 ring-zinc-950"
                readOnly
              />
            </div>

            {/* Text Input — Error State */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-950">
                Error State
              </label>
              <input
                type="text"
                value=""
                className="w-full rounded-md border border-red-700 bg-white px-4 py-3 text-base text-zinc-950 ring-1 ring-red-700"
                readOnly
              />
              <p className="mt-2 text-sm text-red-700">
                Title is required. Please enter a thesis.
              </p>
            </div>

            {/* Text Input — Disabled */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-400">
                Disabled State
              </label>
              <input
                type="text"
                placeholder="Cannot edit..."
                className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-base text-zinc-400"
                disabled
              />
            </div>

            {/* Textarea */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-950">
                Essay Content
              </label>
              <textarea
                placeholder="Write your micro-essay..."
                className="min-h-[120px] w-full resize-none rounded-md border border-zinc-200 bg-white px-4 py-3 text-base leading-relaxed text-zinc-950 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            {/* Select */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-950">
                Essay Status
              </label>
              <select className="w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950">
                <option>Draft</option>
                <option>Published</option>
                <option>Unpublished</option>
              </select>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="evidence-check"
                className="mt-1 h-5 w-5 rounded border-zinc-300 text-red-600 focus:ring-1 focus:ring-zinc-950"
                defaultChecked
              />
              <label htmlFor="evidence-check" className="text-base text-zinc-800">
                <span className="font-semibold text-zinc-950">
                  Evidence attached
                </span>{" "}
                — This essay includes at least two evidence cards with proper
                citations.
              </label>
            </div>

            {/* Radio */}
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-950">
                Review Type
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="quick-review"
                    name="review-type"
                    className="h-5 w-5 border-zinc-300 text-red-600 focus:ring-1 focus:ring-zinc-950"
                    defaultChecked
                  />
                  <label htmlFor="quick-review" className="text-base text-zinc-800">
                    Quick Review (3 min)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="deep-review"
                    name="review-type"
                    className="h-5 w-5 border-zinc-300 text-red-600 focus:ring-1 focus:ring-zinc-950"
                  />
                  <label htmlFor="deep-review" className="text-base text-zinc-800">
                    Deep Review (10 min)
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Cards
          </h2>
          <div className="space-y-8">
            {/* Essay Card */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Essay Card
              </p>
              <article className="border-t-4 border-zinc-950 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                    Published
                  </span>
                  <span className="text-sm text-zinc-600">3 days ago</span>
                </div>
                <h3 className="mb-3 font-serif text-2xl font-bold leading-tight text-zinc-950">
                  The Case for Constrained Writing Practice
                </h3>
                <p className="mb-4 text-base leading-relaxed text-zinc-800">
                  Fixed constraints (200-800 words, 10-minute sprints, required
                  counterarguments) reduce decision fatigue and improve
                  outcomes. This micro-essay argues that creative constraints
                  are not limitations but catalysts for focused, deliberate
                  practice.
                </p>
                <div className="flex items-center gap-4 text-sm text-zinc-600">
                  <span>4 min read</span>
                  <span>•</span>
                  <span>2 evidence cards</span>
                  <span>•</span>
                  <span>1 revision</span>
                </div>
              </article>
            </div>

            {/* Evidence Card */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Evidence Card
              </p>
              <div className="border border-zinc-200 bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Supports
                  </span>
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    Evidence #1
                  </span>
                </div>
                <h4 className="mb-3 text-xl font-semibold text-zinc-950">
                  Shape Up: Set Boundaries
                </h4>
                <p className="mb-3 text-sm text-zinc-600">
                  Source: Basecamp, 2019 • basecamp.com/shapeup
                </p>
                <blockquote className="mb-4 border-l-4 border-zinc-950 pl-4 italic leading-relaxed text-zinc-800">
                  "We use shaping principles: set boundaries first, shape
                  solutions to fit an appetite. This keeps scope under control
                  and encourages creative constraints."
                </blockquote>
                <p className="text-base leading-relaxed text-zinc-800">
                  This quote demonstrates how fixed time and scope constraints
                  (the "appetite") force clearer thinking and more focused
                  solutions. The parallel to micro-essay practice is direct:
                  word limits and time boxes create productive pressure.
                </p>
              </div>
            </div>

            {/* Stat Card */}
            <div>
              <p className="mb-4 text-sm font-semibold text-zinc-950">
                Stat Card (Minimal)
              </p>
              <div className="space-y-6">
                <div>
                  <p className="font-serif text-4xl font-bold text-zinc-950">
                    12
                  </p>
                  <p className="mt-1 text-base text-zinc-600">
                    Essays published this month
                  </p>
                </div>
                <div>
                  <p className="font-serif text-4xl font-bold text-zinc-950">
                    8
                  </p>
                  <p className="mt-1 text-base text-zinc-600">
                    Revisions after coach feedback
                  </p>
                </div>
                <div>
                  <p className="font-serif text-4xl font-bold text-zinc-950">
                    24
                  </p>
                  <p className="mt-1 text-base text-zinc-600">
                    Evidence cards attached
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Mock */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Navigation
          </h2>
          <nav className="border-b-2 border-zinc-950 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-8">
                <p className="font-serif text-2xl font-bold text-zinc-950">
                  Microblogger
                </p>
                <div className="flex items-center gap-6">
                  <a
                    href="#"
                    className="border-b-2 border-red-600 pb-1 text-sm font-semibold text-zinc-950"
                  >
                    Editor
                  </a>
                  <a
                    href="#"
                    className="pb-1 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
                  >
                    Library
                  </a>
                  <a
                    href="#"
                    className="pb-1 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
                  >
                    Published
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="rounded-full px-6 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                  Settings
                </button>
                <button className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  New Essay
                </button>
              </div>
            </div>
          </nav>
        </section>

        {/* Editor Mock */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Editor (Most Important Screen)
          </h2>
          <div className="border-t-4 border-zinc-950 bg-white p-8">
            {/* Toolbar */}
            <div className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-3">
                <button className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Request Review
                </button>
                <button className="rounded-full border-2 border-zinc-950 bg-white px-6 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white">
                  Save Draft
                </button>
                <button className="rounded-full px-6 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                  Preview
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600">Draft • Autosaved</span>
                <span className="text-sm font-semibold text-zinc-950">
                  342 words
                </span>
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Essay title..."
                className="w-full border-0 bg-transparent font-serif text-4xl font-bold leading-tight text-zinc-950 placeholder-zinc-400 focus:outline-none"
                defaultValue="The Authorship Rule is a Design Decision"
              />
            </div>

            {/* Content Textarea */}
            <div className="mb-6">
              <textarea
                placeholder="Write your micro-essay..."
                className="min-h-[300px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-zinc-800 placeholder-zinc-400 focus:outline-none"
                defaultValue="When we decided that the LLM assistant would never write user prose, we weren't just setting a product policy. We were making an architectural decision that ripples through the entire system.

The constraint is enforced as a pure, testable function in the domain layer. The assistant can return only structured coaching artifacts: feedback, questions, research, argument analysis, checklists. Any response containing replacement prose is rejected by schema validation before it reaches the user.

This isn't prompt engineering. This is type-level enforcement. The product cannot violate its core rule even if someone tries.

Why does this matter? Because the no-ghostwriting rule is the product's entire value proposition. If it breaks, Microblogger becomes just another AI writing tool. The architecture makes the product promise impossible to violate."
              />
            </div>

            {/* Inline Comment Example */}
            <div className="border-l-4 border-amber-600 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Coach Feedback
                </span>
                <span className="text-xs text-zinc-600">Line 3</span>
              </div>
              <p className="mb-2 text-sm font-semibold text-zinc-950">
                Strong claim, but needs evidence
              </p>
              <p className="mb-3 text-sm leading-relaxed text-zinc-800">
                You assert that "type-level enforcement" prevents violations,
                but you haven't shown how. What does the schema validation look
                like? What happens when a response fails validation?
              </p>
              <p className="mb-2 text-sm font-semibold text-zinc-950">
                Suggested action:
              </p>
              <p className="text-sm leading-relaxed text-zinc-800">
                Add a concrete example (code snippet or step-by-step flow) or
                link to an evidence card that shows the validation in action.
              </p>
              <button className="mt-3 rounded-full border-2 border-zinc-950 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white">
                Resolve
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center gap-4">
              <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                Publish Essay
              </button>
              <button className="rounded-full px-6 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                Attach Evidence
              </button>
              <button className="rounded-full px-6 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
                View Argument Map
              </button>
            </div>
          </div>
        </section>

        {/* Page Layout Example */}
        <section>
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-zinc-950">
            Responsive Layout
          </h2>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="border-t-4 border-zinc-950 bg-white p-6">
                <h3 className="mb-3 font-serif text-2xl font-bold text-zinc-950">
                  Main Content Area
                </h3>
                <p className="mb-4 text-base leading-relaxed text-zinc-800">
                  The primary content takes up 2/3 of the layout on large
                  screens. Essays, editor, and reading views live here. On
                  mobile, this becomes full-width with a stacked layout.
                </p>
                <p className="text-base leading-relaxed text-zinc-800">
                  The rigid grid creates strong visual hierarchy without
                  relying on color or decoration. White space does the work.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="border border-zinc-200 bg-white p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-950">
                  Sidebar
                </h4>
                <p className="text-sm leading-relaxed text-zinc-800">
                  Evidence cards, coach feedback, and secondary actions appear
                  in the sidebar on desktop. On mobile, they're inline.
                </p>
              </div>
              <div className="border border-zinc-200 bg-white p-4">
                <p className="font-serif text-2xl font-bold text-zinc-950">
                  18
                </p>
                <p className="mt-1 text-sm text-zinc-600">Active essays</p>
              </div>
              <div className="border border-zinc-200 bg-white p-4">
                <p className="font-serif text-2xl font-bold text-zinc-950">
                  6
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Unresolved comments
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-zinc-950 bg-white px-6 py-8 md:px-12 lg:px-24">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            Pressed Type Kit • Microblogger Design System
          </p>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            2026
          </p>
        </div>
      </footer>
    </div>
  );
}
