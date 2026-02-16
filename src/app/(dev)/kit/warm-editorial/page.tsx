import { Lora, Inter } from 'next/font/google';

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-lora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export default function WarmEditorialKit() {
  return (
    <div className={`${lora.variable} ${inter.variable} font-sans`}>
      <div className="min-h-screen bg-[#FAF8F5] text-[#2D2A26]">

        {/* Header */}
        <header className="border-b border-stone-200 bg-[#FAF8F5] px-4 py-12 md:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Warm Editorial
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              A cream-and-ink editorial workspace inspired by premium literary magazines.
              Warm, literate, focused — like working in a quiet bookshop.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 md:px-6 lg:px-8">

          {/* Color Palette */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Color Palette
            </h2>

            <div className="space-y-8">
              {/* Primary Colors */}
              <div>
                <h3 className="mb-4 font-serif text-2xl font-semibold leading-snug tracking-tight">
                  Primary & Accent
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-amber-700 shadow-sm"></div>
                    <p className="text-sm font-medium">Primary</p>
                    <p className="font-mono text-xs text-stone-600">#b45309</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-amber-800 shadow-sm"></div>
                    <p className="text-sm font-medium">Primary Hover</p>
                    <p className="font-mono text-xs text-stone-600">#92400e</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-amber-600 shadow-sm"></div>
                    <p className="text-sm font-medium">Accent</p>
                    <p className="font-mono text-xs text-stone-600">#d97706</p>
                  </div>
                </div>
              </div>

              {/* Surfaces */}
              <div>
                <h3 className="mb-4 font-serif text-2xl font-semibold leading-snug tracking-tight">
                  Surfaces
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-[#FAF8F5] shadow-sm"></div>
                    <p className="text-sm font-medium">Surface (Page)</p>
                    <p className="font-mono text-xs text-stone-600">#FAF8F5</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-[#FFFEFB] shadow-sm"></div>
                    <p className="text-sm font-medium">Card</p>
                    <p className="font-mono text-xs text-stone-600">#FFFEFB</p>
                  </div>
                </div>
              </div>

              {/* Text Colors */}
              <div>
                <h3 className="mb-4 font-serif text-2xl font-semibold leading-snug tracking-tight">
                  Text
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-[#2D2A26] shadow-sm"></div>
                    <p className="text-sm font-medium">Primary Text</p>
                    <p className="font-mono text-xs text-stone-600">#2D2A26</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-stone-600 shadow-sm"></div>
                    <p className="text-sm font-medium">Secondary Text</p>
                    <p className="font-mono text-xs text-stone-600">#57534e</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-stone-200 bg-stone-500 shadow-sm"></div>
                    <p className="text-sm font-medium">Tertiary Text</p>
                    <p className="font-mono text-xs text-stone-600">#78716c</p>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="mb-4 font-serif text-2xl font-semibold leading-snug tracking-tight">
                  Semantic
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-emerald-200 bg-emerald-50 shadow-sm"></div>
                    <p className="text-sm font-medium">Success</p>
                    <p className="font-mono text-xs text-stone-600">#ecfdf5</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-amber-200 bg-amber-50 shadow-sm"></div>
                    <p className="text-sm font-medium">Warning</p>
                    <p className="font-mono text-xs text-stone-600">#fffbeb</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-red-200 bg-red-50 shadow-sm"></div>
                    <p className="text-sm font-medium">Error</p>
                    <p className="font-mono text-xs text-stone-600">#fef2f2</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border border-sky-200 bg-sky-50 shadow-sm"></div>
                    <p className="text-sm font-medium">Info</p>
                    <p className="font-mono text-xs text-stone-600">#f0f9ff</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Typography
            </h2>

            <div className="space-y-8">
              <div className="space-y-6 rounded-lg border border-stone-200 bg-[#FFFEFB] p-6 shadow-sm">
                <div>
                  <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                    Heading 1: The Art of the Micro-Essay
                  </h1>
                  <p className="mt-2 text-xs text-stone-500">Lora Semibold, 36px/48px responsive</p>
                </div>

                <div>
                  <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                    Heading 2: Building a Thinking Portfolio
                  </h2>
                  <p className="mt-2 text-xs text-stone-500">Lora Semibold, 30px/36px responsive</p>
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-semibold leading-snug tracking-tight">
                    Heading 3: Evidence-Backed Claims
                  </h3>
                  <p className="mt-2 text-xs text-stone-500">Lora Semibold, 24px</p>
                </div>

                <div>
                  <h4 className="font-serif text-xl font-medium leading-snug">
                    Heading 4: Structured Feedback
                  </h4>
                  <p className="mt-2 text-xs text-stone-500">Lora Medium, 20px</p>
                </div>

                <div>
                  <p className="text-lg leading-relaxed">
                    Body Large: The best writing comes from practice, not performance. Each micro-essay is a repetition —
                    a chance to refine your thinking, challenge your assumptions, and build evidence-backed arguments.
                  </p>
                  <p className="mt-2 text-xs text-stone-500">Inter Regular, 18px, 1.75 line-height</p>
                </div>

                <div>
                  <p className="text-base leading-relaxed">
                    Body: Knowledge workers need a space to think out loud. Microblogger provides structure without
                    constraints, coaching without ghostwriting. Every claim should link to evidence. Every argument
                    should acknowledge counterpoints. This is where intellectual honesty meets craft.
                  </p>
                  <p className="mt-2 text-xs text-stone-500">Inter Regular, 16px, 1.75 line-height</p>
                </div>

                <div>
                  <p className="text-sm leading-relaxed">
                    Body Small: Used for secondary information, supporting details, and metadata.
                  </p>
                  <p className="mt-2 text-xs text-stone-500">Inter Regular, 14px</p>
                </div>

                <div>
                  <p className="text-xs leading-normal text-stone-600">
                    Caption: Last updated February 15, 2026 at 3:42 PM
                  </p>
                  <p className="mt-2 text-xs text-stone-500">Inter Regular, 12px</p>
                </div>

                <div>
                  <code className="rounded bg-stone-100 px-2 py-1 font-mono text-sm text-amber-800">
                    const inline = "code example";
                  </code>
                  <p className="mt-2 text-xs text-stone-500">Monospace, 14px</p>
                </div>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Buttons
            </h2>

            <div className="space-y-8">
              {/* Primary Buttons */}
              <div className="space-y-4">
                <h3 className="font-serif text-2xl font-semibold leading-snug tracking-tight">Primary</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md bg-amber-700 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-amber-800">
                    Publish Essay
                  </button>
                  <button className="rounded-md bg-amber-700 px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-amber-800">
                    Save Draft
                  </button>
                  <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-800">
                    Add Evidence
                  </button>
                  <button className="cursor-not-allowed rounded-md bg-stone-300 px-5 py-2.5 text-base font-medium text-stone-500 shadow-sm" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div className="space-y-4">
                <h3 className="font-serif text-2xl font-semibold leading-snug tracking-tight">Secondary</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md border border-amber-700 bg-transparent px-5 py-2.5 text-base font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    Preview
                  </button>
                  <button className="rounded-md border border-amber-700 bg-transparent px-5 py-2.5 text-base font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    View History
                  </button>
                  <button className="cursor-not-allowed rounded-md border border-stone-300 bg-transparent px-5 py-2.5 text-base font-medium text-stone-400" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              {/* Ghost Buttons */}
              <div className="space-y-4">
                <h3 className="font-serif text-2xl font-semibold leading-snug tracking-tight">Ghost</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md px-5 py-2.5 text-base font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    Cancel
                  </button>
                  <button className="rounded-md px-5 py-2.5 text-base font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Destructive */}
              <div className="space-y-4">
                <h3 className="font-serif text-2xl font-semibold leading-snug tracking-tight">Destructive</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md bg-red-600 px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-red-700">
                    Delete Essay
                  </button>
                  <button className="rounded-md border border-red-600 bg-transparent px-5 py-2.5 text-base font-medium text-red-600 transition-colors hover:bg-red-50">
                    Remove Evidence
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Form Inputs
            </h2>

            <div className="space-y-6 rounded-lg border border-stone-200 bg-[#FFFEFB] p-6 shadow-sm">
              {/* Text Input - Default */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Essay Title</label>
                <input
                  type="text"
                  placeholder="Enter a compelling title..."
                  className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 text-base leading-relaxed text-[#2D2A26] placeholder-stone-400 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                />
              </div>

              {/* Text Input - Focus */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">With Focus State</label>
                <input
                  type="text"
                  value="This input shows the focus ring"
                  readOnly
                  className="w-full rounded-md border-2 border-amber-500 bg-white px-4 py-2.5 text-base leading-relaxed text-[#2D2A26] shadow-sm ring-2 ring-amber-500 ring-offset-2 ring-offset-[#FAF8F5]"
                />
              </div>

              {/* Text Input - Error */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Title (Required)</label>
                <input
                  type="text"
                  placeholder="Title cannot be empty"
                  className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-base leading-relaxed text-[#2D2A26] placeholder-red-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-sm text-red-800">Please enter a title for your essay</p>
              </div>

              {/* Text Input - Disabled */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-500">Disabled Input</label>
                <input
                  type="text"
                  value="This field is disabled"
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-stone-200 bg-stone-100 px-4 py-2.5 text-base leading-relaxed text-stone-500 shadow-sm"
                />
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Essay Content</label>
                <textarea
                  rows={4}
                  placeholder="Write your micro-essay here..."
                  className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 text-base leading-relaxed text-[#2D2A26] placeholder-stone-400 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                />
              </div>

              {/* Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Essay Status</label>
                <select className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 text-base leading-relaxed text-[#2D2A26] shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]">
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Published</option>
                  <option>Archived</option>
                </select>
              </div>

              {/* Checkbox */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Preferences</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="check1"
                    className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                    defaultChecked
                  />
                  <label htmlFor="check1" className="text-base leading-relaxed">
                    Enable inline coaching comments
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="check2"
                    className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                  />
                  <label htmlFor="check2" className="text-base leading-relaxed">
                    Require evidence for all claims
                  </label>
                </div>
              </div>

              {/* Radio */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Visibility</label>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="radio1"
                    name="visibility"
                    className="h-4 w-4 border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                    defaultChecked
                  />
                  <label htmlFor="radio1" className="text-base leading-relaxed">
                    Private (only you)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="radio2"
                    name="visibility"
                    className="h-4 w-4 border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                  />
                  <label htmlFor="radio2" className="text-base leading-relaxed">
                    Public (anyone with link)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="radio3"
                    name="visibility"
                    className="h-4 w-4 border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FAF8F5]"
                  />
                  <label htmlFor="radio3" className="text-base leading-relaxed">
                    Community (listed in public directory)
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Cards */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Cards
            </h2>

            <div className="space-y-6">
              {/* Essay Card */}
              <div className="rounded-md border border-stone-200 bg-[#FFFEFB] p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-serif text-xl font-medium leading-snug">
                    The Practice of Deliberate Disagreement
                  </h3>
                  <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                    Published
                  </span>
                </div>
                <p className="mb-4 text-base leading-relaxed text-stone-600">
                  Intellectual honesty requires actively seeking out the strongest counterarguments.
                  This essay explores why seeking disagreement is a skill that compounds over time.
                </p>
                <div className="flex items-center gap-4 text-sm text-stone-500">
                  <span>647 words</span>
                  <span>•</span>
                  <span>3 evidence cards</span>
                  <span>•</span>
                  <span>Updated 2 hours ago</span>
                </div>
              </div>

              {/* Evidence Card */}
              <div className="rounded-md border border-stone-200 border-l-amber-100 border-l-4 bg-[#FFFEFB] p-6 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-amber-700">SOURCE</p>
                    <p className="mt-1 text-sm font-medium">
                      Tetlock & Gardner, "Superforecasting" (2015)
                    </p>
                  </div>
                </div>
                <blockquote className="border-l-2 border-stone-200 pl-4 text-base leading-relaxed text-stone-600">
                  "The forecasters who did best were not necessarily smarter, but they were more willing
                  to update their beliefs when presented with new evidence. They actively sought out
                  information that contradicted their initial hunches."
                </blockquote>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                    Epistemology
                  </span>
                  <span className="rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                    Decision-making
                  </span>
                </div>
              </div>

              {/* Stat Card */}
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-md bg-[#FFFEFB] p-6 shadow-sm">
                  <p className="text-sm font-medium text-stone-600">Total Essays</p>
                  <p className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight">
                    24
                  </p>
                </div>
                <div className="rounded-md bg-[#FFFEFB] p-6 shadow-sm">
                  <p className="text-sm font-medium text-stone-600">Evidence Cards</p>
                  <p className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight">
                    67
                  </p>
                </div>
                <div className="rounded-md bg-[#FFFEFB] p-6 shadow-sm">
                  <p className="text-sm font-medium text-stone-600">Writing Streak</p>
                  <p className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight">
                    12 days
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Mock */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Navigation
            </h2>

            <div className="overflow-hidden rounded-lg border border-stone-200 shadow-sm">
              <nav className="flex items-center justify-between border-b border-stone-200 bg-[#FAF8F5] px-6 py-4">
                <div className="flex items-center gap-8">
                  <h1 className="font-serif text-xl font-semibold">Microblogger</h1>
                  <div className="flex items-center gap-6">
                    <a href="#" className="text-sm font-medium text-amber-700 underline decoration-amber-700 decoration-2 underline-offset-4">
                      Editor
                    </a>
                    <a href="#" className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-700 hover:underline hover:decoration-2 hover:underline-offset-4">
                      Essays
                    </a>
                    <a href="#" className="text-sm font-medium text-stone-600 transition-colors hover:text-amber-700 hover:underline hover:decoration-2 hover:underline-offset-4">
                      Evidence
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="rounded-md px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    Help
                  </button>
                  <div className="h-8 w-8 rounded-full bg-amber-700"></div>
                </div>
              </nav>
              <div className="bg-[#FFFEFB] p-8 text-center text-stone-500">
                Page content would appear here
              </div>
            </div>
          </section>

          {/* Editor Mock */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Editor Mock
            </h2>

            <div className="overflow-hidden rounded-lg border border-stone-200 shadow-md">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-stone-200 bg-[#FAF8F5] px-6 py-3">
                <div className="flex items-center gap-2">
                  <button className="rounded p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-amber-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18m-9 5h9" />
                    </svg>
                  </button>
                  <button className="rounded p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-amber-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <button className="rounded p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-amber-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="mx-2 h-6 w-px bg-stone-200"></div>
                  <button className="rounded p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-amber-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">Auto-saved 30 seconds ago</span>
                  <button className="rounded-md border border-amber-700 bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    Preview
                  </button>
                  <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-800">
                    Publish
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="bg-[#FFFEFB] p-8">
                <div className="mx-auto max-w-2xl space-y-6">
                  {/* Title */}
                  <input
                    type="text"
                    value="Why Practice Beats Talent"
                    readOnly
                    className="w-full border-0 bg-transparent font-serif text-4xl font-semibold leading-tight tracking-tight text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#FFFEFB]"
                  />

                  {/* Word Count */}
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span>384 words</span>
                    <span>•</span>
                    <span>Target: 400-600</span>
                  </div>

                  {/* Content Area */}
                  <div className="space-y-4 text-base leading-relaxed text-[#2D2A26]">
                    <p>
                      The research is clear: deliberate practice — not innate talent — is the primary driver of
                      expertise. Anders Ericsson's decades of work show that what we call "natural ability" is
                      often just accumulated practice that started early.
                    </p>
                    <p className="rounded-md border-l-4 border-l-amber-600 bg-amber-50 p-4">
                      <span className="text-xs font-medium text-amber-700">COACH COMMENT</span>
                      <br />
                      <span className="text-sm">
                        Strong opening claim. Can you link to a specific Ericsson study as evidence?
                        Consider also addressing the counterargument: what about fields where physical
                        attributes matter (basketball height, etc.)?
                      </span>
                    </p>
                    <p>
                      But here's what's less discussed: practice quality matters more than quantity.
                      Mindless repetition creates habits, not skill. The distinguishing feature of deliberate
                      practice is immediate feedback and constant adjustment.
                    </p>
                    <p>
                      This has implications for how we design learning environments...
                    </p>
                  </div>

                  {/* Checklist */}
                  <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                    <h4 className="mb-3 text-sm font-medium">Publishing Checklist</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                        <span className="text-sm text-stone-600 line-through">Word count in range (400-600)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" readOnly className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                        <span className="text-sm text-stone-600">At least 2 evidence cards linked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" readOnly className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                        <span className="text-sm text-stone-600">Counterargument addressed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Responsive Layout Demo */}
          <section className="space-y-6">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Responsive Layout
            </h2>
            <p className="text-base leading-relaxed text-stone-600">
              This entire page demonstrates responsive behavior. Resize your browser to see typography scale,
              grids reflow, and spacing adjust. The design prioritizes readability at all viewport sizes,
              with generous margins and comfortable line lengths.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-[#FFFEFB] p-4 text-center shadow-sm">
                <p className="text-xs font-medium text-stone-600">Mobile</p>
                <p className="mt-1 text-sm text-stone-500">Single column</p>
              </div>
              <div className="rounded-md bg-[#FFFEFB] p-4 text-center shadow-sm">
                <p className="text-xs font-medium text-stone-600">Tablet</p>
                <p className="mt-1 text-sm text-stone-500">Two columns</p>
              </div>
              <div className="rounded-md bg-[#FFFEFB] p-4 text-center shadow-sm">
                <p className="text-xs font-medium text-stone-600">Desktop</p>
                <p className="mt-1 text-sm text-stone-500">Four columns</p>
              </div>
              <div className="rounded-md bg-[#FFFEFB] p-4 text-center shadow-sm">
                <p className="text-xs font-medium text-stone-600">Wide</p>
                <p className="mt-1 text-sm text-stone-500">Max 1280px</p>
              </div>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-stone-200 bg-[#FAF8F5] px-4 py-8 text-center md:px-6 lg:px-8">
          <p className="text-sm text-stone-500">
            Warm Editorial Design Kit — Built for Microblogger
          </p>
        </footer>

      </div>
    </div>
  );
}
