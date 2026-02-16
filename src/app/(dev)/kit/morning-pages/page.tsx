import { Libre_Baskerville, Plus_Jakarta_Sans } from 'next/font/google';

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-serif',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
});

export default function MorningPagesKitDemo() {
  return (
    <div
      className={`${libreBaskerville.variable} ${plusJakartaSans.variable} font-sans min-h-screen bg-[#FBF9F6]`}
    >
      {/* Header */}
      <header className="border-b border-[#EEDAD0] bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-12">
          <h1 className="font-serif text-5xl font-normal leading-tight tracking-tight text-stone-900">
            Morning Pages
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-stone-600">
            Light, airy, and gentle — like writing in a sunlit room at dawn.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-600">
            A design kit for Microblogger that prioritizes emotional comfort during the writing
            process. Soft warm gradients, cream and blush tones, and generous whitespace create a
            journaling sanctuary for knowledge workers building their thinking portfolio.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-12">
        {/* Color Palette Section */}
        <section className="space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Color Palette
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              Soft, warm tones that evoke dawn light and emotional safety.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Primary Colors */}
            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-amber-700"></div>
              <div>
                <p className="font-semibold text-stone-900">Primary</p>
                <p className="text-sm text-stone-600">amber-700</p>
                <p className="text-xs text-stone-400">#B45309</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-rose-400"></div>
              <div>
                <p className="font-semibold text-stone-900">Accent</p>
                <p className="text-sm text-stone-600">rose-400</p>
                <p className="text-xs text-stone-400">#FB7185</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-[#D6CFE6]"></div>
              <div>
                <p className="font-semibold text-stone-900">Lavender Accent</p>
                <p className="text-sm text-stone-600">custom</p>
                <p className="text-xs text-stone-400">#D6CFE6</p>
              </div>
            </div>

            {/* Surface Colors */}
            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg border border-[#EEDAD0] bg-[#FBF9F6]"></div>
              <div>
                <p className="font-semibold text-stone-900">Surface Base</p>
                <p className="text-sm text-stone-600">custom cream</p>
                <p className="text-xs text-stone-400">#FBF9F6</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg border border-[#EEDAD0] bg-white"></div>
              <div>
                <p className="font-semibold text-stone-900">Surface Elevated</p>
                <p className="text-sm text-stone-600">white</p>
                <p className="text-xs text-stone-400">#FFFFFF</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-[#EEDAD0]"></div>
              <div>
                <p className="font-semibold text-stone-900">Border Default</p>
                <p className="text-sm text-stone-600">warm blush</p>
                <p className="text-xs text-stone-400">#EEDAD0</p>
              </div>
            </div>

            {/* Text Colors */}
            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="flex h-20 w-full items-center justify-center rounded-lg bg-stone-900">
                <span className="font-serif text-2xl text-white">Aa</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Text Primary</p>
                <p className="text-sm text-stone-600">stone-900</p>
                <p className="text-xs text-stone-400">#1C1917</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="flex h-20 w-full items-center justify-center rounded-lg bg-stone-600">
                <span className="font-serif text-2xl text-white">Aa</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Text Secondary</p>
                <p className="text-sm text-stone-600">stone-600</p>
                <p className="text-xs text-stone-400">#57534E</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="flex h-20 w-full items-center justify-center rounded-lg bg-stone-400">
                <span className="font-serif text-2xl text-white">Aa</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Text Muted</p>
                <p className="text-sm text-stone-600">stone-400</p>
                <p className="text-xs text-stone-400">#A8A29E</p>
              </div>
            </div>

            {/* Semantic Colors */}
            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <span className="text-sm font-medium text-emerald-600">Success</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Success</p>
                <p className="text-sm text-stone-600">emerald-600/50</p>
                <p className="text-xs text-stone-400">#059669</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <span className="text-sm font-medium text-amber-600">Warning</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Warning</p>
                <p className="text-sm text-stone-600">amber-600/50</p>
                <p className="text-xs text-stone-400">#D97706</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#EEDAD0] bg-white p-6 shadow-sm">
              <div className="h-20 w-full rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <span className="text-sm font-medium text-red-600">Error</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">Error</p>
                <p className="text-sm text-stone-600">red-600/50</p>
                <p className="text-xs text-stone-400">#DC2626</p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Typography
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              Libre Baskerville (serif) for headings, Plus Jakarta Sans (sans-serif) for body.
              Generous line heights for mindful reading.
            </p>
          </div>

          <div className="space-y-8 rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
            <div className="space-y-2 border-b border-amber-100 pb-6">
              <h1 className="font-serif text-5xl font-normal leading-tight tracking-tight text-stone-900">
                Heading 1: The Art of Thinking in Writing
              </h1>
              <p className="text-sm text-stone-400">
                text-5xl / font-serif / font-normal / leading-tight
              </p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
                Heading 2: Evidence-Based Micro-Essays
              </h2>
              <p className="text-sm text-stone-400">
                text-3xl / font-serif / font-normal / leading-snug
              </p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <h3 className="font-serif text-2xl font-normal leading-snug text-stone-900">
                Heading 3: Building Your Thinking Portfolio
              </h3>
              <p className="text-sm text-stone-400">
                text-2xl / font-serif / font-normal / leading-snug
              </p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Heading 4: Practice Over Performance
              </h4>
              <p className="text-sm text-stone-400">
                text-xl / font-sans / font-semibold / leading-relaxed
              </p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <p className="text-lg leading-relaxed text-stone-600">
                Body Large: This is a larger body paragraph used for emphasis or lead-in text. It
                maintains the relaxed, comfortable reading rhythm that defines this kit.
              </p>
              <p className="text-sm text-stone-400">text-lg / font-sans / leading-relaxed</p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <p className="text-base leading-relaxed text-stone-600">
                Body Regular: Knowledge workers need a writing environment that reduces cognitive
                friction. This design creates space for deep thinking by eliminating visual noise
                and prioritizing readability. Every decision—from color to spacing—supports the core
                goal: making daily writing practice feel like a comforting ritual.
              </p>
              <p className="text-sm text-stone-400">text-base / font-sans / leading-relaxed</p>
            </div>

            <div className="space-y-2 border-b border-amber-100 pb-6">
              <p className="text-sm leading-relaxed text-stone-600">
                Small Text: Used for supplementary information, metadata, or less critical content
                that still needs to be accessible.
              </p>
              <p className="text-sm text-stone-400">text-sm / font-sans / leading-relaxed</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-stone-400">
                Caption: Timestamps, hints, minor labels
              </p>
              <p className="text-sm text-stone-400">text-xs / font-sans / leading-relaxed</p>
            </div>

            <div className="space-y-2 border-t border-amber-100 pt-6">
              <p className="text-base leading-relaxed text-stone-600">
                Inline elements: <strong className="font-semibold text-stone-900">bold text</strong>
                , <em className="italic">emphasized text</em>, and{' '}
                <code className="rounded bg-amber-50 px-2 py-1 text-sm font-mono text-amber-700">
                  inline code
                </code>{' '}
                all maintain the warm, gentle aesthetic.
              </p>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">Buttons</h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              Soft, rounded, with warm color palette. Hover states are gentle.
            </p>
          </div>

          <div className="space-y-6 rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
            {/* Primary Buttons */}
            <div className="space-y-4">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Primary Buttons
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-lg bg-amber-700 px-8 py-4 text-base font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-amber-800 hover:shadow-md">
                  Large Button
                </button>
                <button className="rounded-lg bg-amber-700 px-6 py-3 text-base font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-amber-800 hover:shadow-md">
                  Medium Button
                </button>
                <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-amber-800 hover:shadow-md">
                  Small Button
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="space-y-4 border-t border-amber-100 pt-6">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Secondary Buttons
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-lg border border-[#EEDAD0] bg-transparent px-6 py-3 text-base font-medium text-amber-700 transition-all duration-200 ease-out hover:border-amber-700 hover:bg-amber-50">
                  Add Evidence
                </button>
                <button className="rounded-lg border border-[#EEDAD0] bg-transparent px-6 py-3 text-base font-medium text-amber-700 transition-all duration-200 ease-out hover:border-amber-700 hover:bg-amber-50">
                  Save Draft
                </button>
                <button className="rounded-lg border border-[#EEDAD0] bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:border-amber-700 hover:bg-amber-50">
                  Cancel
                </button>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div className="space-y-4 border-t border-amber-100 pt-6">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Ghost Buttons
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-lg bg-transparent px-6 py-3 text-base font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                  View History
                </button>
                <button className="rounded-lg bg-transparent px-6 py-3 text-base font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                  Share
                </button>
              </div>
            </div>

            {/* Destructive Button */}
            <div className="space-y-4 border-t border-amber-100 pt-6">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Destructive
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <button className="rounded-lg border border-red-200 bg-transparent px-6 py-3 text-base font-medium text-red-600 transition-all duration-200 ease-out hover:border-red-600 hover:bg-red-50">
                  Delete Essay
                </button>
              </div>
            </div>

            {/* Disabled State */}
            <div className="space-y-4 border-t border-amber-100 pt-6">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Disabled State
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  disabled
                  className="cursor-not-allowed rounded-lg bg-amber-700 px-6 py-3 text-base font-medium text-white opacity-40"
                >
                  Publish Essay
                </button>
                <button
                  disabled
                  className="cursor-not-allowed rounded-lg border border-[#EEDAD0] bg-transparent px-6 py-3 text-base font-medium text-amber-700 opacity-40"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Form Inputs
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              Generous padding, soft borders, warm focus states.
            </p>
          </div>

          <div className="space-y-6 rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
            {/* Text Input */}
            <div className="space-y-2">
              <label
                htmlFor="essay-title"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                Essay Title
              </label>
              <input
                type="text"
                id="essay-title"
                placeholder="Enter your essay title..."
                className="w-full rounded-lg border border-[#EEDAD0] bg-white px-4 py-3 text-base leading-relaxed text-stone-900 placeholder-stone-400 transition-all duration-200 ease-out focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
              />
            </div>

            {/* Text Input with Focus State Example */}
            <div className="space-y-2">
              <label
                htmlFor="essay-subtitle"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                Subtitle (focus state shown)
              </label>
              <input
                type="text"
                id="essay-subtitle"
                value="This input shows the focus ring style"
                className="w-full rounded-lg border border-amber-700 bg-white px-4 py-3 text-base leading-relaxed text-stone-900 outline-none ring-2 ring-amber-200 ring-offset-2"
              />
            </div>

            {/* Text Input with Error */}
            <div className="space-y-2">
              <label
                htmlFor="essay-slug"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                URL Slug (error state)
              </label>
              <input
                type="text"
                id="essay-slug"
                value="my essay"
                className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base leading-relaxed text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
              />
              <p className="text-sm text-red-600">Slugs cannot contain spaces</p>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <label
                htmlFor="essay-content"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                Essay Content
              </label>
              <textarea
                id="essay-content"
                rows={6}
                placeholder="Begin writing your micro-essay..."
                className="w-full rounded-lg border border-[#EEDAD0] bg-white px-4 py-3 text-base leading-relaxed text-stone-900 placeholder-stone-400 transition-all duration-200 ease-out focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
              />
            </div>

            {/* Select Dropdown */}
            <div className="space-y-2">
              <label
                htmlFor="essay-category"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                Category
              </label>
              <select
                id="essay-category"
                className="w-full rounded-lg border border-[#EEDAD0] bg-white px-4 py-3 text-base leading-relaxed text-stone-900 transition-all duration-200 ease-out focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
              >
                <option>Select a category...</option>
                <option>Philosophy</option>
                <option>Science</option>
                <option>Technology</option>
                <option>Literature</option>
              </select>
            </div>

            {/* Checkbox Group */}
            <div className="space-y-3 border-t border-amber-100 pt-6">
              <p className="text-sm font-medium leading-relaxed text-stone-900">
                Publishing Options
              </p>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Make this essay publicly visible
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Allow comments and feedback
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked
                  className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Show version history (checked state)
                </span>
              </label>
            </div>

            {/* Radio Group */}
            <div className="space-y-3 border-t border-amber-100 pt-6">
              <p className="text-sm font-medium leading-relaxed text-stone-900">Essay Length</p>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="length"
                  className="mt-1 h-4 w-4 border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Short (200-400 words)
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="length"
                  checked
                  className="mt-1 h-4 w-4 border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Medium (400-600 words)
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="length"
                  className="mt-1 h-4 w-4 border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
                />
                <span className="text-base leading-relaxed text-stone-600">
                  Long (600-800 words)
                </span>
              </label>
            </div>

            {/* Disabled Input */}
            <div className="space-y-2 border-t border-amber-100 pt-6">
              <label
                htmlFor="disabled-input"
                className="block text-sm font-medium leading-relaxed text-stone-900"
              >
                Author (disabled state)
              </label>
              <input
                type="text"
                id="disabled-input"
                disabled
                value="Jane Doe"
                className="w-full cursor-not-allowed rounded-lg border border-[#EEDAD0] bg-stone-50 px-4 py-3 text-base leading-relaxed text-stone-400 opacity-60"
              />
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">Cards</h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              White backgrounds on cream, warm borders, generous padding.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Essay Card */}
            <article className="rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm transition-all duration-200 ease-out hover:shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Philosophy
                </span>
                <span className="text-xs text-stone-400">Draft</span>
              </div>
              <h3 className="font-serif text-2xl font-normal leading-snug text-stone-900">
                The Practice of Thinking
              </h3>
              <p className="mt-3 text-base leading-relaxed text-stone-600">
                Knowledge work isn't about consuming information—it's about transforming it through
                deliberate practice. This essay explores why writing micro-essays creates a
                compounding return on intellectual investment.
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-amber-100 pt-4">
                <p className="text-sm text-stone-400">Last edited 2 hours ago</p>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                    Edit
                  </button>
                  <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-amber-800">
                    Publish
                  </button>
                </div>
              </div>
            </article>

            {/* Evidence Card */}
            <article className="rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <span className="rounded-md bg-[#D6CFE6] px-3 py-1 text-xs font-medium text-purple-900">
                  Evidence
                </span>
                <span className="text-xs text-stone-400">Added 3 days ago</span>
              </div>
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Deliberate Practice in Writing
              </h4>
              <p className="mt-2 text-sm text-stone-600">Source: Ericsson et al. (1993)</p>
              <blockquote className="mt-4 border-l-2 border-amber-700 bg-amber-50 p-4 italic leading-relaxed text-stone-700">
                "Expert performance is the result of individuals' prolonged efforts to improve
                performance while negotiating motivational and external constraints."
              </blockquote>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                This research demonstrates that expertise comes from structured, focused practice
                with immediate feedback—exactly what Microblogger provides through LLM coaching.
              </p>
            </article>

            {/* Stats Card */}
            <article className="rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
              <h4 className="font-sans text-xl font-semibold leading-relaxed text-stone-900">
                Your Writing Progress
              </h4>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-4xl font-bold text-amber-700">24</p>
                  <p className="mt-1 text-sm text-stone-600">Essays Written</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-rose-400">18</p>
                  <p className="mt-1 text-sm text-stone-600">Evidence Cards</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-emerald-600">12</p>
                  <p className="mt-1 text-sm text-stone-600">Published</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-stone-900">6</p>
                  <p className="mt-1 text-sm text-stone-600">Days Streak</p>
                </div>
              </div>
              <div className="mt-6 border-t border-amber-100 pt-4">
                <p className="text-sm leading-relaxed text-stone-600">
                  You're building a strong thinking practice. Keep going!
                </p>
              </div>
            </article>

            {/* Comment/Feedback Card */}
            <article className="rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700">
                  AI
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900">Coach Feedback</p>
                    <span className="text-xs text-stone-400">Just now</span>
                  </div>
                  <p className="mt-2 text-base leading-relaxed text-stone-600">
                    This claim would be stronger with a citation. Have you considered linking to
                    your evidence card on deliberate practice? It directly supports your argument
                    about compounding intellectual returns.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-100">
                      Add Evidence
                    </button>
                    <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-stone-600 transition-all duration-200 ease-out hover:bg-stone-50">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Navigation Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Navigation
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              Clean, text-based navigation with subtle active states.
            </p>
          </div>

          <div className="rounded-xl border border-[#EEDAD0] bg-white shadow-sm">
            <nav className="flex items-center justify-between border-b border-amber-100 px-8 py-4">
              <div className="flex items-center gap-8">
                <div className="font-serif text-2xl font-normal text-amber-700">Microblogger</div>
                <div className="flex gap-6">
                  <a
                    href="#"
                    className="border-b-2 border-amber-700 pb-1 text-base font-medium text-amber-700 transition-all duration-200"
                  >
                    Editor
                  </a>
                  <a
                    href="#"
                    className="border-b-2 border-transparent pb-1 text-base font-medium text-stone-600 transition-all duration-200 hover:border-amber-200 hover:text-amber-700"
                  >
                    Evidence Library
                  </a>
                  <a
                    href="#"
                    className="border-b-2 border-transparent pb-1 text-base font-medium text-stone-600 transition-all duration-200 hover:border-amber-200 hover:text-amber-700"
                  >
                    Essays
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-stone-600 transition-all duration-200 ease-out hover:bg-stone-50">
                  Profile
                </button>
                <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-amber-800">
                  New Essay
                </button>
              </div>
            </nav>
            <div className="p-8">
              <p className="text-base leading-relaxed text-stone-600">
                The navigation uses a warm underline to indicate the active page. Hover states are
                gentle, with a barely-visible underline preview.
              </p>
            </div>
          </div>
        </section>

        {/* Editor Mock Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Editor Mock
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              The core writing interface with maximum breathing room and serif content typography.
            </p>
          </div>

          <div className="rounded-xl border border-[#EEDAD0] bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-amber-100 px-8 py-4">
              <div className="flex items-center gap-4">
                <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                  Format
                </button>
                <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                  Add Evidence
                </button>
                <button className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:bg-amber-50">
                  Get Feedback
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-400">Auto-saved 1 min ago</span>
                <button className="rounded-lg border border-[#EEDAD0] bg-transparent px-4 py-2 text-sm font-medium text-amber-700 transition-all duration-200 ease-out hover:border-amber-700 hover:bg-amber-50">
                  Preview
                </button>
                <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-amber-800">
                  Publish
                </button>
              </div>
            </div>

            {/* Editor Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Main Writing Area */}
              <div className="lg:col-span-2 border-r border-amber-100 p-12">
                <input
                  type="text"
                  placeholder="Essay title..."
                  value="The Compound Interest of Daily Writing"
                  className="w-full border-none bg-transparent font-serif text-4xl font-normal leading-tight text-stone-900 placeholder-stone-300 focus:outline-none"
                />
                <div className="mt-8 space-y-6">
                  <p className="font-serif text-lg leading-relaxed text-stone-900">
                    Most knowledge workers treat writing as a one-off task—something you do when you
                    need to communicate a finished thought. But writing is better understood as a
                    thinking tool, and like any tool, it gets more valuable with deliberate
                    practice.
                  </p>
                  <p className="font-serif text-lg leading-relaxed text-stone-900">
                    Consider the difference between lifting weights once and following a structured
                    program for six months. The latter creates compounding returns: strength builds
                    on strength, form improves, and the practice itself becomes easier even as the
                    weights get heavier.
                  </p>
                  <p className="font-serif text-lg leading-relaxed text-stone-900">
                    The same principle applies to writing micro-essays. Each 10-minute writing
                    sprint isn't just producing an artifact—it's training your ability to think
                    clearly, structure arguments, and notice gaps in your reasoning.
                  </p>
                  <div className="rounded-lg border-l-2 border-amber-700 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">
                      Coach suggestion: This paragraph would benefit from evidence.
                    </p>
                    <p className="mt-2 text-sm text-amber-800">
                      Link to your evidence card on deliberate practice research (Ericsson, 1993) to
                      support this analogy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar: Checklist/Tools */}
              <div className="bg-stone-50 p-6">
                <h4 className="font-sans text-lg font-semibold leading-relaxed text-stone-900">
                  Essay Checklist
                </h4>
                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked
                      className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-emerald-600 transition-all duration-200 focus:ring-2 focus:ring-emerald-200"
                    />
                    <span className="text-sm leading-relaxed text-stone-700">
                      Clear thesis statement
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked
                      className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-emerald-600 transition-all duration-200 focus:ring-2 focus:ring-emerald-200"
                    />
                    <span className="text-sm leading-relaxed text-stone-700">
                      Supporting examples
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200"
                    />
                    <span className="text-sm leading-relaxed text-stone-700">
                      At least one citation
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200"
                    />
                    <span className="text-sm leading-relaxed text-stone-700">
                      Address potential objection
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[#EEDAD0] text-amber-700 transition-all duration-200 focus:ring-2 focus:ring-amber-200"
                    />
                    <span className="text-sm leading-relaxed text-stone-700">
                      Within word limit (200-800)
                    </span>
                  </label>
                </div>

                <div className="mt-8 border-t border-amber-100 pt-6">
                  <h4 className="font-sans text-lg font-semibold leading-relaxed text-stone-900">
                    Quick Stats
                  </h4>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Word count</span>
                      <span className="font-medium text-stone-900">427</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Reading time</span>
                      <span className="font-medium text-stone-900">2 min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Evidence cards</span>
                      <span className="font-medium text-stone-900">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Page Layout Section */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-snug text-stone-900">
              Page Layout
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-600">
              This entire demo page demonstrates responsive behavior. Notice the generous spacing,
              soft cream background, and breathing room between sections. The design adapts
              gracefully from mobile to desktop while maintaining its serene, journaling-sanctuary
              aesthetic.
            </p>
          </div>

          <div className="rounded-xl border border-[#EEDAD0] bg-white p-8 shadow-sm">
            <h3 className="font-serif text-2xl font-normal leading-snug text-stone-900">
              Responsive Strategy
            </h3>
            <ul className="mt-4 space-y-3 text-base leading-relaxed text-stone-600">
              <li className="flex gap-3">
                <span className="text-amber-700">•</span>
                <span>
                  <strong className="font-semibold text-stone-900">Mobile:</strong> Single column,
                  px-6 gutters, reduced font sizes on headings, stacked cards
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-700">•</span>
                <span>
                  <strong className="font-semibold text-stone-900">Tablet:</strong> Two-column
                  grids where appropriate, px-8 gutters, comfortable reading line length
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-700">•</span>
                <span>
                  <strong className="font-semibold text-stone-900">Desktop:</strong> Three-column
                  grids for cards, max-w-7xl container, px-12 gutters, editor sidebar becomes visible
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-700">•</span>
                <span>
                  <strong className="font-semibold text-stone-900">Typography:</strong> Line length
                  constrained for readability (max-w-prose where appropriate), relaxed line-height on
                  all text
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-amber-100 pt-8">
          <p className="text-center text-sm text-stone-400">
            Morning Pages Design Kit for Microblogger — A serene, journaling-sanctuary aesthetic
          </p>
        </footer>
      </main>
    </div>
  );
}
