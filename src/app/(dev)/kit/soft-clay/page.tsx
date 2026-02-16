import { Bitter, DM_Sans } from 'next/font/google';

const bitter = Bitter({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-bitter',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
});

export default function SoftClayKit() {
  return (
    <div
      className={`${bitter.variable} ${dmSans.variable} min-h-screen bg-[#F5EDE4] font-sans`}
    >
      {/* Header */}
      <header className="border-b border-[#D4CCC3] bg-white px-4 py-8 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#2D2520]">
            Soft Clay
          </h1>
          <p className="mt-2 text-lg text-[#5A4F47]">
            Warm, tactile, and grounded — a pottery studio for ideas
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5A4F47]">
            Earthy terracotta, sage, and sandstone tones create an approachable
            craft-workshop feeling. Generous rounded corners and soft shadows
            make the interface feel handmade and human. This aesthetic supports
            the "writing gym" philosophy by evoking practice, process, and
            patient iteration.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Color Palette */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Color Palette
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Earthy and organic tones for a warm, grounded interface
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Primary Colors */}
            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#C47D5E] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Primary</p>
                <p className="text-sm text-[#8A7F76]">#C47D5E</p>
                <p className="text-xs text-[#8A7F76]">Soft terracotta</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#7D8E74] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Secondary</p>
                <p className="text-sm text-[#8A7F76]">#7D8E74</p>
                <p className="text-xs text-[#8A7F76]">Sage green</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#C4919B] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Accent</p>
                <p className="text-sm text-[#8A7F76]">#C4919B</p>
                <p className="text-xs text-[#8A7F76]">Dusty rose</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#F5EDE4] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Surface Base</p>
                <p className="text-sm text-[#8A7F76]">#F5EDE4</p>
                <p className="text-xs text-[#8A7F76]">Warm sand</p>
              </div>
            </div>

            {/* Neutral Scale */}
            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#2D2520] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Neutral 900</p>
                <p className="text-sm text-[#8A7F76]">#2D2520</p>
                <p className="text-xs text-[#8A7F76]">Primary text</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#5A4F47] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Neutral 700</p>
                <p className="text-sm text-[#8A7F76]">#5A4F47</p>
                <p className="text-xs text-[#8A7F76]">Secondary text</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-[#8A7F76] shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Neutral 500</p>
                <p className="text-sm text-[#8A7F76]">#8A7F76</p>
                <p className="text-xs text-[#8A7F76]">Tertiary text</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl border border-[#D4CCC3] bg-white shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Surface Raised</p>
                <p className="text-sm text-[#8A7F76]">#FFFFFF</p>
                <p className="text-xs text-[#8A7F76]">Cards, elevated</p>
              </div>
            </div>

            {/* Semantic Colors */}
            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-emerald-600 shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Success</p>
                <p className="text-sm text-[#8A7F76]">#059669</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-amber-600 shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Warning</p>
                <p className="text-sm text-[#8A7F76]">#D97706</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-red-600 shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Error</p>
                <p className="text-sm text-[#8A7F76]">#DC2626</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 rounded-xl bg-blue-600 shadow"></div>
              <div>
                <p className="font-medium text-[#2D2520]">Info</p>
                <p className="text-sm text-[#8A7F76]">#2563EB</p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Typography
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Bitter (rounded serif) for headings, DM Sans (humanist sans) for body
            </p>
          </div>

          <div className="space-y-8 rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(125,142,116,0.08)]">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#2D2520]">
                Heading 1: The Practice of Writing
              </h1>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                36px / Bitter Semibold / -0.02em tracking
              </p>
            </div>

            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
                Heading 2: Building a Thinking Portfolio
              </h2>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                30px / Bitter Semibold / -0.01em tracking
              </p>
            </div>

            <div>
              <h3 className="font-serif text-2xl font-semibold tracking-tight text-[#2D2520]">
                Heading 3: Evidence-Backed Arguments
              </h3>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                24px / Bitter Semibold / -0.01em tracking
              </p>
            </div>

            <div>
              <h4 className="font-serif text-xl font-semibold text-[#2D2520]">
                Heading 4: Structured Feedback
              </h4>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                20px / Bitter Semibold
              </p>
            </div>

            <div>
              <p className="text-lg text-[#2D2520]">
                Body Large: This is a larger body text size, ideal for introductory
                paragraphs or lead-in content that deserves extra emphasis and
                readability.
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                18px / DM Sans Regular / 1.6 line height
              </p>
            </div>

            <div>
              <p className="text-base text-[#2D2520]">
                Body: Micro-essays are short, evidence-backed pieces where writers
                practice making clear arguments. The goal is not perfection but
                deliberate practice — each essay is a rep, building the muscle of
                structured thinking. Writers receive coaching feedback that helps
                them improve their own work, never ghostwritten replacements.
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                16px / DM Sans Regular / 1.6 line height
              </p>
            </div>

            <div>
              <p className="text-sm text-[#5A4F47]">
                Body Small: Used for secondary information, captions, and supporting
                details that complement the main content without competing for
                attention.
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                14px / DM Sans Regular / 1.5 line height
              </p>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-[#8A7F76]">
                CAPTION: METADATA, LABELS, AND SECONDARY UI TEXT
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                12px / DM Sans Medium / 0.01em tracking
              </p>
            </div>

            <div>
              <code className="rounded-lg bg-[#EBE5DD] px-2 py-1 font-mono text-sm text-[#2D2520]">
                const essay = "inline code example";
              </code>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#8A7F76]">
                14px / Monospace / Subtle background
              </p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Buttons
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Multiple variants, three sizes, with hover and disabled states
            </p>
          </div>

          <div className="space-y-8 rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(125,142,116,0.08)]">
            {/* Primary Buttons */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#2D2520]">Primary</p>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-lg bg-[#C47D5E] px-4 py-2 text-sm font-medium text-white shadow transition-colors duration-200 hover:bg-[#A86A4D]">
                  Small Button
                </button>
                <button className="rounded-lg bg-[#C47D5E] px-5 py-2.5 text-base font-medium text-white shadow transition-colors duration-200 hover:bg-[#A86A4D]">
                  Medium Button
                </button>
                <button className="rounded-lg bg-[#C47D5E] px-6 py-3 text-base font-medium text-white shadow transition-colors duration-200 hover:bg-[#A86A4D]">
                  Large Button
                </button>
                <button
                  disabled
                  className="rounded-lg bg-[#C47D5E] px-5 py-2.5 text-base font-medium text-white opacity-60 shadow"
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#2D2520]">Secondary</p>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-lg bg-[#7D8E74] px-4 py-2 text-sm font-medium text-white shadow transition-colors duration-200 hover:bg-[#6A7862]">
                  Small Button
                </button>
                <button className="rounded-lg bg-[#7D8E74] px-5 py-2.5 text-base font-medium text-white shadow transition-colors duration-200 hover:bg-[#6A7862]">
                  Medium Button
                </button>
                <button className="rounded-lg bg-[#7D8E74] px-6 py-3 text-base font-medium text-white shadow transition-colors duration-200 hover:bg-[#6A7862]">
                  Large Button
                </button>
              </div>
            </div>

            {/* Outline Buttons */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#2D2520]">Outline</p>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-lg border border-[#C47D5E] bg-white px-4 py-2 text-sm font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E] hover:text-white">
                  Small Button
                </button>
                <button className="rounded-lg border border-[#C47D5E] bg-white px-5 py-2.5 text-base font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E] hover:text-white">
                  Medium Button
                </button>
                <button className="rounded-lg border border-[#C47D5E] bg-white px-6 py-3 text-base font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E] hover:text-white">
                  Large Button
                </button>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#2D2520]">Ghost</p>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E]/10">
                  Small Button
                </button>
                <button className="rounded-lg px-5 py-2.5 text-base font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E]/10">
                  Medium Button
                </button>
                <button className="rounded-lg px-6 py-3 text-base font-medium text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E]/10">
                  Large Button
                </button>
              </div>
            </div>

            {/* Destructive Buttons */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#2D2520]">Destructive</p>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-lg bg-red-600 px-5 py-2.5 text-base font-medium text-white shadow transition-colors duration-200 hover:bg-red-700">
                  Delete Essay
                </button>
                <button className="rounded-lg border border-red-600 bg-white px-5 py-2.5 text-base font-medium text-red-600 transition-colors duration-200 hover:bg-red-600 hover:text-white">
                  Discard Draft
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Form Inputs
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Text fields, textareas, selects, checkboxes, and radios with various states
            </p>
          </div>

          <div className="space-y-8 rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(125,142,116,0.08)]">
            {/* Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2D2520]">
                Essay Title
              </label>
              <input
                type="text"
                placeholder="Enter a clear, specific title..."
                className="w-full rounded-lg border border-[#D4CCC3] bg-white px-4 py-3 text-base text-[#2D2520] placeholder:text-[#8A7F76] focus:outline-none focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
              />
            </div>

            {/* Text Input - Focus State (simulated) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2D2520]">
                Focused Input (simulated)
              </label>
              <input
                type="text"
                value="The Practice of Deliberate Writing"
                className="w-full rounded-lg border border-[#D4CCC3] bg-white px-4 py-3 text-base text-[#2D2520] ring-2 ring-[#C47D5E] ring-offset-2 focus:outline-none"
              />
            </div>

            {/* Text Input - Error State */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2D2520]">
                Email Address
              </label>
              <input
                type="email"
                value="invalid-email"
                className="w-full rounded-lg border border-red-600 bg-white px-4 py-3 text-base text-[#2D2520] focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              />
              <p className="text-sm text-red-600">Please enter a valid email address</p>
            </div>

            {/* Text Input - Disabled State */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#8A7F76]">
                Disabled Input
              </label>
              <input
                type="text"
                disabled
                value="This field is not editable"
                className="w-full rounded-lg border border-[#D4CCC3] bg-[#EBE5DD] px-4 py-3 text-base text-[#8A7F76]"
              />
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2D2520]">
                Essay Content
              </label>
              <textarea
                placeholder="Write your micro-essay here. Focus on making one clear claim backed by evidence..."
                rows={6}
                className="w-full rounded-lg border border-[#D4CCC3] bg-white px-4 py-3 text-base text-[#2D2520] placeholder:text-[#8A7F76] focus:outline-none focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
              ></textarea>
            </div>

            {/* Select Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2D2520]">
                Essay Status
              </label>
              <select className="w-full rounded-lg border border-[#D4CCC3] bg-white px-4 py-3 text-base text-[#2D2520] focus:outline-none focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2">
                <option>Draft</option>
                <option>In Review</option>
                <option>Published</option>
                <option>Archived</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#2D2520]">
                Review Checklist
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked
                    className="h-5 w-5 rounded border-[#D4CCC3] text-[#7D8E74] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Clear claim stated in opening
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked
                    className="h-5 w-5 rounded border-[#D4CCC3] text-[#7D8E74] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Evidence cited for each key point
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-[#D4CCC3] text-[#7D8E74] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Counterargument addressed
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled
                    className="h-5 w-5 rounded border-[#D4CCC3] text-[#7D8E74] opacity-60"
                  />
                  <span className="text-base text-[#8A7F76]">
                    Peer feedback received (disabled)
                  </span>
                </label>
              </div>
            </div>

            {/* Radio Buttons */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#2D2520]">
                Essay Length Target
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="length"
                    checked
                    className="h-5 w-5 border-[#D4CCC3] text-[#C47D5E] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Short (200-400 words)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="length"
                    className="h-5 w-5 border-[#D4CCC3] text-[#C47D5E] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Medium (400-600 words)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="length"
                    className="h-5 w-5 border-[#D4CCC3] text-[#C47D5E] focus:ring-2 focus:ring-[#C47D5E] focus:ring-offset-2"
                  />
                  <span className="text-base text-[#2D2520]">
                    Long (600-800 words)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Cards
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Content cards, evidence cards, and metric cards with consistent styling
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Essay Card */}
            <article className="rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(125,142,116,0.08)] transition-shadow duration-200 hover:shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#7D8E74]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#7D8E74]">
                  PUBLISHED
                </span>
                <span className="text-xs text-[#8A7F76]">3 days ago</span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2D2520]">
                The Value of Constraints in Creative Work
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[#5A4F47]">
                Creative constraints — word limits, time boxes, format requirements —
                are often seen as restrictions. But they function more like the walls
                of a pottery studio: boundaries that enable focus and deliberate
                practice.
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-[#8A7F76]">
                <span>487 words</span>
                <span>·</span>
                <span>3 evidence cards</span>
                <span>·</span>
                <span>2 revisions</span>
              </div>
            </article>

            {/* Evidence Card */}
            <article className="rounded-xl border border-[#D4CCC3] bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#8A7F76]">
                    EVIDENCE CARD
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#2D2520]">
                    Stravinsky on Constraints
                  </p>
                </div>
                <span className="rounded-full bg-[#C4919B]/10 px-2.5 py-1 text-xs font-medium text-[#C4919B]">
                  QUOTE
                </span>
              </div>
              <blockquote className="border-l-4 border-[#C47D5E] bg-[#F5EDE4] px-4 py-3">
                <p className="text-base italic leading-relaxed text-[#2D2520]">
                  "The more constraints one imposes, the more one frees oneself. And
                  the arbitrariness of the constraint serves only to obtain precision
                  of execution."
                </p>
              </blockquote>
              <div className="mt-4">
                <p className="text-sm text-[#5A4F47]">
                  <span className="font-medium">Source:</span> Igor Stravinsky,{' '}
                  <em>Poetics of Music</em> (1942)
                </p>
                <p className="mt-2 text-xs text-[#8A7F76]">
                  Used in: "The Value of Constraints in Creative Work"
                </p>
              </div>
            </article>

            {/* Stat Card */}
            <div className="rounded-xl bg-gradient-to-br from-[#7D8E74] to-[#6A7862] p-6 text-white shadow-lg">
              <p className="text-sm font-medium uppercase tracking-wide opacity-90">
                Writing Streak
              </p>
              <p className="mt-2 font-serif text-4xl font-semibold">12 days</p>
              <p className="mt-3 text-sm opacity-90">
                Your longest streak this month. Keep building the habit.
              </p>
            </div>

            {/* Info Card */}
            <div className="rounded-xl border border-[#D4CCC3] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-600/10 p-2">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2D2520]">
                    Evidence Library Tip
                  </h4>
                  <p className="mt-2 text-sm text-[#5A4F47]">
                    Tag your evidence cards by theme to make them easier to find when
                    writing new essays. Cards can be reused across multiple pieces.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Mock */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Navigation
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              Primary navigation pattern with active states
            </p>
          </div>

          <div className="overflow-hidden rounded-xl shadow-lg">
            <nav className="border-b border-[#D4CCC3] bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="font-serif text-xl font-semibold text-[#C47D5E]">
                    Microblogger
                  </div>
                  <div className="flex gap-1">
                    <a
                      href="#"
                      className="rounded-lg bg-[#C47D5E]/10 px-4 py-2 text-sm font-medium text-[#C47D5E] transition-colors duration-200"
                    >
                      Editor
                    </a>
                    <a
                      href="#"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[#5A4F47] transition-colors duration-200 hover:text-[#7D8E74]"
                    >
                      Evidence
                    </a>
                    <a
                      href="#"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[#5A4F47] transition-colors duration-200 hover:text-[#7D8E74]"
                    >
                      Portfolio
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="rounded-lg px-4 py-2 text-sm font-medium text-[#5A4F47] transition-colors duration-200 hover:bg-[#7D8E74]/10">
                    Settings
                  </button>
                  <div className="h-9 w-9 rounded-full bg-[#C47D5E] text-center leading-9 text-white">
                    JD
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </section>

        {/* Editor Mock */}
        <section className="mt-16 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#2D2520]">
              Editor Mockup
            </h2>
            <p className="mt-2 text-sm text-[#5A4F47]">
              The core writing interface — simplified to show layout and styling
            </p>
          </div>

          <div className="overflow-hidden rounded-xl shadow-lg">
            {/* Toolbar */}
            <div className="border-b border-[#D4CCC3] bg-white px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="rounded-lg p-2 text-[#7D8E74] transition-colors duration-200 hover:bg-[#7D8E74]/10">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                  <div className="mx-2 h-6 w-px bg-[#D4CCC3]"></div>
                  <button className="rounded-lg p-2 text-[#C47D5E] transition-colors duration-200 hover:bg-[#C47D5E]/10">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                  <span className="text-xs text-[#8A7F76]">Add Evidence</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8A7F76]">423 words</span>
                  <button className="rounded-lg border border-[#7D8E74] bg-white px-4 py-1.5 text-sm font-medium text-[#7D8E74] transition-colors duration-200 hover:bg-[#7D8E74] hover:text-white">
                    Request Feedback
                  </button>
                  <button className="rounded-lg bg-[#C47D5E] px-4 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#A86A4D]">
                    Publish
                  </button>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="bg-white p-8 lg:p-12">
              <div className="mx-auto max-w-3xl">
                <input
                  type="text"
                  placeholder="Essay title..."
                  value="Why Constraints Accelerate Creative Practice"
                  className="w-full border-0 border-b-2 border-transparent bg-transparent pb-2 font-serif text-3xl font-semibold tracking-tight text-[#2D2520] placeholder:text-[#8A7F76] focus:border-[#C47D5E] focus:outline-none"
                />
                <div className="mt-8 space-y-4 text-base leading-relaxed text-[#2D2520]">
                  <p>
                    Creative constraints are often misunderstood as limitations on
                    freedom. But in practice, they function more like the walls of a
                    pottery studio: boundaries that enable focus and deliberate
                    repetition. Without constraints, creative work becomes
                    directionless exploration.{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10">This is particularly true</span>
                      <span className="absolute inset-0 -mx-1 bg-[#C4919B]/20"></span>
                    </span>{' '}
                    in writing, where infinite choices about structure, length, and
                    scope can paralyze even experienced writers.
                  </p>
                  <p>
                    Stravinsky famously argued that "the more constraints one imposes,
                    the more one frees oneself" — not because constraints reduce
                    options, but because they eliminate decision fatigue and create
                    a clear framework for execution. In micro-essay practice, word
                    limits (200-800 words) and time constraints (10-minute sprints)
                    serve this function.
                  </p>
                  <p className="text-[#8A7F76]">
                    [Continue writing... the editor provides a clean, distraction-free
                    space with subtle inline highlights for coaching feedback.]
                  </p>
                </div>

                {/* Inline Comment Simulation */}
                <div className="mt-6 rounded-xl border-l-4 border-[#C4919B] bg-[#C4919B]/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#C4919B] p-1.5">
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2D2520]">
                        Coaching Feedback
                      </p>
                      <p className="mt-1 text-sm text-[#5A4F47]">
                        Strong claim, but could you add specific evidence here? Link
                        to a study or example that demonstrates this pattern in
                        practice.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="mt-8 rounded-xl border border-[#D4CCC3] bg-[#F5EDE4]/50 p-5">
                  <h4 className="font-semibold text-[#2D2520]">
                    Review Checklist
                  </h4>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked
                        className="h-4 w-4 rounded border-[#D4CCC3] text-[#7D8E74]"
                      />
                      <span className="text-sm text-[#2D2520]">
                        Clear claim in opening
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#D4CCC3] text-[#7D8E74]"
                      />
                      <span className="text-sm text-[#2D2520]">
                        Evidence for each point
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#D4CCC3] text-[#7D8E74]"
                      />
                      <span className="text-sm text-[#2D2520]">
                        Counterargument addressed
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Layout Note */}
        <section className="mt-16 rounded-xl border border-[#D4CCC3] bg-white p-6 shadow-sm">
          <h3 className="font-serif text-xl font-semibold text-[#2D2520]">
            Responsive Design
          </h3>
          <p className="mt-3 text-base text-[#5A4F47]">
            This entire page demonstrates responsive behavior using Tailwind's
            breakpoint system. Resize your browser to see columns reflow, padding
            adjust, and typography scale appropriately. The design maintains its
            warm, grounded aesthetic at all viewport sizes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#7D8E74]/10 px-3 py-1 text-xs font-medium text-[#7D8E74]">
              Mobile-first
            </span>
            <span className="rounded-full bg-[#C47D5E]/10 px-3 py-1 text-xs font-medium text-[#C47D5E]">
              Fluid typography
            </span>
            <span className="rounded-full bg-[#C4919B]/10 px-3 py-1 text-xs font-medium text-[#C4919B]">
              Adaptive spacing
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#D4CCC3] bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm text-[#8A7F76]">
            Soft Clay Design Kit — Built for Microblogger
          </p>
          <p className="mt-2 text-xs text-[#8A7F76]">
            Earthy, approachable, and craft-focused • A writing gym, not a writing
            machine
          </p>
        </div>
      </footer>
    </div>
  );
}
