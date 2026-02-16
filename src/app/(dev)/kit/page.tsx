import { Playfair_Display, Inter, Caveat } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif'
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans'
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-handwriting'
})

export default function DesignKitPage() {
  return (
    <div className={`${playfair.variable} ${inter.variable} ${caveat.variable} font-sans`}>
      <div className="min-h-screen bg-[#FAFAF8]">
        {/* Header */}
        <header className="border-b-2 border-black bg-[#FAFAF8]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-12">
            <h1 className="[font-family:var(--font-serif)] text-4xl md:text-5xl font-bold tracking-tight leading-tight text-black mb-3">
              Microblogger Design System
            </h1>
            <p className="text-lg leading-relaxed text-zinc-600 max-w-3xl">
              A serious editorial workspace with tangible, physical-feeling UI elements. Playfair Display typography and
              high-contrast black-and-white create structural authority. Hard drop shadows, heavy borders, and handwritten
              coaching annotations add substance and personality. This is a letterpress broadsheet you can touch.
            </p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16 space-y-16">
          {/* Color Palette */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Color Palette
            </h2>

            <div className="space-y-8">
              {/* Primary Colors */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Primary & Accent
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="h-24 bg-[#B74134] border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Primary (Brick Red)</p>
                    <p className="text-xs text-zinc-600 font-mono">#B74134</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-[#9A3329] border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Primary Hover</p>
                    <p className="text-xs text-zinc-600 font-mono">#9A3329</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-[#FFF5F3] border-2 border-[#B74134] shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Primary Light</p>
                    <p className="text-xs text-zinc-600 font-mono">#FFF5F3</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-[#1A1A1A] border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Ink Black (shadows)</p>
                    <p className="text-xs text-zinc-600 font-mono">#1A1A1A</p>
                  </div>
                </div>
              </div>

              {/* Surface Colors */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Surfaces
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="h-24 bg-[#FAFAF8] border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Surface Base</p>
                    <p className="text-xs text-zinc-600 font-mono">#FAFAF8</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-white border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Surface Raised</p>
                    <p className="text-xs text-zinc-600 font-mono">#FFFFFF</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-zinc-100 border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Surface Subtle</p>
                    <p className="text-xs text-zinc-600 font-mono">#f4f4f5</p>
                  </div>
                </div>
              </div>

              {/* Text & Border Colors */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Text & Borders
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <div className="h-24 bg-black border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Black</p>
                    <p className="text-xs text-zinc-600 font-mono">#000000</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-zinc-800 border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Zinc 800</p>
                    <p className="text-xs text-zinc-600 font-mono">#27272a</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-zinc-600 border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Zinc 600</p>
                    <p className="text-xs text-zinc-600 font-mono">#52525b</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-zinc-400 border-2 border-zinc-200 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Zinc 400</p>
                    <p className="text-xs text-zinc-600 font-mono">#a1a1aa</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-zinc-200 border-2 border-zinc-300 shadow-[4px_4px_0px_#1A1A1A]" />
                    <p className="text-sm font-semibold text-black">Zinc 200</p>
                    <p className="text-xs text-zinc-600 font-mono">#e4e4e7</p>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Semantic States
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="h-24 bg-emerald-50 border-2 border-emerald-200 shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-center">
                      <span className="text-sm font-semibold text-emerald-800">Success</span>
                    </div>
                    <p className="text-sm font-semibold text-black">Success</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-amber-50 border-2 border-amber-200 shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-center">
                      <span className="text-sm font-semibold text-amber-900">Warning</span>
                    </div>
                    <p className="text-sm font-semibold text-black">Warning</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-red-50 border-2 border-red-200 shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-center">
                      <span className="text-sm font-semibold text-red-800">Error</span>
                    </div>
                    <p className="text-sm font-semibold text-black">Error</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-24 bg-sky-50 border-2 border-sky-200 shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-center">
                      <span className="text-sm font-semibold text-sky-800">Info</span>
                    </div>
                    <p className="text-sm font-semibold text-black">Info</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Typography
            </h2>

            <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A] space-y-8">
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Display (60px responsive)</p>
                <h1 className="[font-family:var(--font-serif)] text-5xl md:text-6xl font-bold tracking-tight leading-tight text-black">
                  The practiced mind
                </h1>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">H1 — Page Title (48px)</p>
                <h1 className="[font-family:var(--font-serif)] text-4xl md:text-5xl font-bold tracking-tight leading-tight text-black">
                  Writing as a craft worth practicing
                </h1>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">H2 — Section Header (30px)</p>
                <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black">
                  Evidence-backed micro-essays
                </h2>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">H3 — Subsection (24px)</p>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black">
                  Building a thinking portfolio
                </h3>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">H4 — Label (20px, Inter)</p>
                <h4 className="text-xl font-semibold leading-snug text-black">
                  Version history and revision
                </h4>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Body (Editor) — 18px</p>
                <p className="text-lg leading-relaxed text-black">
                  The editor uses larger text for comfortable long-form writing. At 18 pixels with 1.7 line height,
                  this mimics editorial layouts and supports sustained focus. Every micro-essay is a deliberate practice session,
                  not a performance. The interface honors this by making reading comfortable and distraction-free.
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Body — 16px</p>
                <p className="text-base leading-relaxed text-black">
                  Standard body text for UI elements, cards, and non-editor content. Inter's clean letterforms and generous
                  line height ensure readability across all contexts. The high contrast keeps everything crystal clear.
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Body Small — Captions (14px)</p>
                <p className="text-sm leading-normal text-zinc-600">
                  Helper text, captions, and metadata display use a smaller size. The reduced color (zinc-600)
                  provides clear hierarchy without harsh contrast.
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Coaching Annotation (18px, Caveat handwriting)</p>
                <p className="[font-family:var(--font-handwriting)] text-lg leading-relaxed text-[#B74134]">
                  This handwriting font creates a "professor's red pen" feeling — used ONLY for coaching feedback, never for UI elements.
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2 font-semibold">Code — Monospace (14px)</p>
                <code className="font-mono text-sm bg-zinc-100 text-black px-2 py-0.5 rounded">
                  const essay = await db.query.essays.findFirst()
                </code>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Buttons
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Primary (Pill Shape, Brick Red, Hard Shadow)
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-full bg-[#B74134] px-4 py-2 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A] active:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-200">
                    Small
                  </button>
                  <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A] active:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-200">
                    Publish Essay
                  </button>
                  <button className="rounded-full bg-[#B74134] px-8 py-4 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A] active:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-200">
                    Large CTA
                  </button>
                  <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] opacity-40 cursor-not-allowed" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Secondary (Rounded-md, Black Outline, Heavy 2px Border)
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md border-2 border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-black hover:text-white transition-colors duration-200">
                    Save Draft
                  </button>
                  <button className="rounded-md border-2 border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-black hover:text-white transition-colors duration-200">
                    Preview
                  </button>
                  <button className="rounded-md border-2 border-black bg-white px-6 py-3 text-sm font-semibold text-black opacity-40 cursor-not-allowed" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Ghost
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-md px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors duration-200">
                    Cancel
                  </button>
                  <button className="rounded-md px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors duration-200">
                    Back
                  </button>
                  <button className="rounded-md px-6 py-3 text-sm font-semibold text-zinc-800 opacity-40 cursor-not-allowed" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Destructive
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-red-700 hover:shadow-[6px_6px_0px_#1A1A1A] transition-all duration-200">
                    Delete Essay
                  </button>
                  <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] opacity-40 cursor-not-allowed" disabled>
                    Disabled
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Form Inputs
            </h2>

            <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A] space-y-6">
              <div>
                <label htmlFor="text-input" className="block text-sm font-semibold text-black mb-2">
                  Text Input (Heavy 2px border, hard shadow on focus)
                </label>
                <input
                  type="text"
                  id="text-input"
                  placeholder="Enter your text here"
                  className="w-full rounded-md border-2 border-zinc-200 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:border-[#B74134] focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-all duration-200"
                />
                <p className="text-sm text-zinc-600 mt-1.5">This is helper text to guide the user.</p>
              </div>

              <div>
                <label htmlFor="title-input" className="block text-sm font-semibold text-black mb-2">
                  Title Input (Editor Style — Underline Only)
                </label>
                <input
                  type="text"
                  id="title-input"
                  placeholder="Essay title..."
                  className="w-full border-0 border-b-2 border-zinc-200 bg-transparent px-0 py-3 [font-family:var(--font-serif)] text-3xl font-bold text-black placeholder:text-zinc-400 focus:border-[#B74134] focus:outline-none focus:ring-0 transition-colors duration-200"
                />
              </div>

              <div>
                <label htmlFor="textarea" className="block text-sm font-semibold text-black mb-2">
                  Textarea (Heavy 2px border)
                </label>
                <textarea
                  id="textarea"
                  placeholder="Write your thoughts here..."
                  rows={4}
                  className="w-full rounded-md border-2 border-zinc-200 bg-white px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:border-[#B74134] focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-all duration-200 resize-none"
                />
              </div>

              <div>
                <label htmlFor="select" className="block text-sm font-semibold text-black mb-2">
                  Select
                </label>
                <select
                  id="select"
                  className="w-full rounded-md border-2 border-zinc-200 bg-white px-4 py-3 text-base text-black focus:border-[#B74134] focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-all duration-200"
                >
                  <option>Draft</option>
                  <option>Published</option>
                  <option>Archived</option>
                </select>
              </div>

              <div>
                <label htmlFor="error-input" className="block text-sm font-semibold text-black mb-2">
                  Error State
                </label>
                <input
                  type="email"
                  id="error-input"
                  placeholder="email@example.com"
                  className="w-full rounded-md border-2 border-red-200 bg-red-50 px-4 py-3 text-base text-black placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-all duration-200"
                />
                <p className="text-sm text-red-800 mt-1.5">Please enter a valid email address.</p>
              </div>

              <div>
                <label htmlFor="disabled-input" className="block text-sm font-semibold text-black mb-2">
                  Disabled
                </label>
                <input
                  type="text"
                  id="disabled-input"
                  placeholder="Disabled input"
                  disabled
                  className="w-full rounded-md border-2 border-zinc-200 bg-zinc-100 px-4 py-3 text-base text-zinc-600 placeholder:text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-[#B74134] focus:ring-2 focus:ring-[#B74134] focus:ring-offset-2"
                />
                <label htmlFor="checkbox" className="text-sm font-semibold text-black">
                  I agree to the terms and conditions
                </label>
              </div>
            </div>
          </section>

          {/* Stamp Badges */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Stamp Badges
            </h2>

            <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
              <p className="text-base leading-relaxed text-zinc-600 mb-6">
                Rubber stamp badges with rotation, heavy 3px borders, and hard shadows. Used ONLY for essay status — small, contained, memorable.
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="inline-block rotate-2">
                  <span className="inline-block border-[3px] border-amber-900 px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-900 shadow-[3px_3px_0px_#1A1A1A]">
                    DRAFT
                  </span>
                </div>
                <div className="inline-block -rotate-2">
                  <span className="inline-block border-[3px] border-emerald-900 px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-900 shadow-[3px_3px_0px_#1A1A1A]">
                    PUBLISHED
                  </span>
                </div>
                <div className="inline-block rotate-3">
                  <span className="inline-block border-[3px] border-sky-900 px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-sky-50 text-sky-900 shadow-[3px_3px_0px_#1A1A1A]">
                    IN REVIEW
                  </span>
                </div>
                <div className="inline-block -rotate-1">
                  <span className="inline-block border-[3px] border-red-900 px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-red-50 text-red-900 shadow-[3px_3px_0px_#1A1A1A]">
                    ARCHIVED
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Cards */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Cards
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Card (Sharp Corners with Hard Shadow) */}
              <div className="border-2 border-zinc-200 bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200">
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-3">
                  Standard Card
                </h3>
                <p className="text-base leading-relaxed text-zinc-600 mb-4">
                  Sharp corners, heavy 2px border, hard drop shadow. Hover increases shadow to 6px for tangibility.
                  This is the signature visual element borrowed from Collage Board.
                </p>
                <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
                  <span>347 words</span>
                  <span>·</span>
                  <span>2 min read</span>
                  <span>·</span>
                  <div className="inline-block rotate-2">
                    <span className="inline-block border-[3px] border-amber-900 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-900 shadow-[2px_2px_0px_#1A1A1A]">
                      DRAFT
                    </span>
                  </div>
                </div>
              </div>

              {/* Featured Card */}
              <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-3">
                  Featured Card
                </h3>
                <p className="text-base leading-relaxed text-zinc-600 mb-4">
                  Generous padding (p-8) and stronger 6px shadow. Used for editor surface and important content.
                </p>
                <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A] transition-all duration-200">
                  Continue Writing
                </button>
              </div>

              {/* Evidence Card (Thick Left Border, NO rotation) */}
              <div className="border-2 border-zinc-200 border-l-4 border-l-[#B74134] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200">
                <div className="mb-4">
                  <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                    Evidence Card
                  </h3>
                  <p className="text-base leading-relaxed text-black mb-3">
                    "The most effective learning happens when we deliberately practice at the edge of our current ability,
                    receiving immediate feedback on our performance."
                  </p>
                </div>
                <div className="text-sm text-zinc-600 space-y-1">
                  <p className="font-semibold text-black">Peak: Secrets from the New Science of Expertise</p>
                  <p>Anders Ericsson · 2016</p>
                  <a href="#" className="text-[#B74134] hover:text-[#9A3329] inline-flex items-center gap-1 transition-colors duration-200">
                    View source
                  </a>
                </div>
              </div>

              {/* Essay Card (Top Border) */}
              <div className="border-t-4 border-t-black bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black">
                    Why practice beats talent
                  </h3>
                  <div className="inline-block -rotate-2">
                    <span className="inline-block border-[3px] border-emerald-900 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-900 shadow-[2px_2px_0px_#1A1A1A]">
                      PUBLISHED
                    </span>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-zinc-600 mb-4">
                  Deliberate practice with structured feedback creates expertise more reliably than raw talent.
                  The "writing gym" model applies this to intellectual work.
                </p>
                <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
                  <span>623 words</span>
                  <span>·</span>
                  <span>3 min read</span>
                  <span>·</span>
                  <span>Feb 14, 2026</span>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Mock */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Navigation
            </h2>

            <div className="border-2 border-zinc-200 overflow-hidden shadow-[4px_4px_0px_#1A1A1A]">
              <nav className="bg-[#FAFAF8] border-b-2 border-black">
                <div className="px-6 h-16 flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <h1 className="[font-family:var(--font-serif)] text-xl font-bold text-black tracking-tight">
                      Microblogger
                    </h1>
                    <div className="hidden md:flex items-center gap-6">
                      <a href="#" className="text-sm font-semibold text-black underline decoration-2 underline-offset-4 transition-colors duration-150">
                        Editor
                      </a>
                      <a href="#" className="text-sm font-semibold text-zinc-800 hover:text-black transition-colors duration-150">
                        Library
                      </a>
                      <a href="#" className="text-sm font-semibold text-zinc-800 hover:text-black transition-colors duration-150">
                        Evidence
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors duration-150">
                      Settings
                    </button>
                    <div className="h-8 w-8 rounded-full bg-[#B74134] flex items-center justify-center text-white text-sm font-semibold">
                      JD
                    </div>
                  </div>
                </div>
              </nav>
            </div>
          </section>

          {/* Editor Mock (Most Important Section) */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Editor (Core Screen)
            </h2>

            <div className="border-2 border-zinc-200 bg-white shadow-[6px_6px_0px_#1A1A1A] overflow-hidden">
              {/* Toolbar */}
              <div className="bg-white border-b-2 border-zinc-200 px-6 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-zinc-600 hover:text-[#B74134] hover:bg-[#FFF5F3] rounded-md transition-colors duration-200">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button className="p-2 text-zinc-600 hover:text-[#B74134] hover:bg-[#FFF5F3] rounded-md transition-colors duration-200">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                  </button>
                </div>
                <div className="h-6 w-px bg-zinc-200" />
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[#B74134] bg-[#FFF5F3] rounded-md transition-colors duration-200">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <button className="p-2 text-zinc-600 hover:text-[#B74134] hover:bg-[#FFF5F3] rounded-md transition-colors duration-200">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm text-zinc-600 font-medium">
                  <span>347 words</span>
                  <span>·</span>
                  <span>2 min read</span>
                </div>
              </div>

              {/* Editor Content */}
              <div className="p-8">
                <input
                  type="text"
                  placeholder="Essay title..."
                  className="w-full border-0 border-b-2 border-zinc-200 bg-transparent px-0 py-3 [font-family:var(--font-serif)] text-3xl font-bold text-black placeholder:text-zinc-400 focus:border-[#B74134] focus:outline-none focus:ring-0 transition-colors duration-200 mb-8"
                />

                <div className="max-w-2xl mx-auto space-y-4">
                  <p className="text-lg leading-relaxed text-black">
                    The best writing environments disappear. They don't compete with your ideas or distract from your thinking.
                    They provide just enough structure to feel supportive and just enough breathing room to feel calm.
                  </p>

                  {/* Inline Comment Example with Handwriting */}
                  <div className="space-y-2">
                    <p className="text-lg leading-relaxed text-black">
                      This is particularly true for <mark className="bg-[#FFF5F3] border-b-2 border-[#B74134]">tools designed for deliberate practice</mark>,
                      where the focus should be on the skill being developed, not the interface itself.
                    </p>

                    <div className="border-l-4 border-[#B74134] bg-[#FFF5F3] p-4 shadow-[4px_4px_0px_#1A1A1A]">
                      <div className="flex items-start gap-2">
                        <svg className="h-5 w-5 text-[#B74134] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <div className="text-sm">
                          <p className="[font-family:var(--font-handwriting)] text-lg text-[#B74134] mb-1">
                            Coach feedback
                          </p>
                          <p className="text-zinc-800">
                            Strong claim. Can you add evidence to support why practice environments should be invisible?
                            Consider citing research on cognitive load or interface design.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-lg leading-relaxed text-black">
                    Microblogger's design philosophy reflects this: high-contrast black text on warm white creates focus
                    without clinical coldness, while the generous line height and comfortable line length make sustained reading
                    and writing feel natural rather than effortful. The brick-red accent signals action without urgency.
                  </p>

                  <p className="text-lg leading-relaxed text-black">
                    The hard drop shadows and heavy borders — borrowed from Collage Board — add tangibility. Every element feels
                    like paper on a surface. This isn't decoration; it's substance. The design communicates: your writing is
                    material, physical, real.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Layout Demo */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Layout Patterns
            </h2>

            <div className="space-y-8">
              {/* Single Column */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Single Column (Editor, Reading)
                </h3>
                <div className="border-2 border-zinc-200 bg-white p-8 shadow-[4px_4px_0px_#1A1A1A]">
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="h-8 bg-zinc-200 w-3/4" />
                    <div className="h-4 bg-zinc-100" />
                    <div className="h-4 bg-zinc-100" />
                    <div className="h-4 bg-zinc-100 w-5/6" />
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Card Grid (Library)
                </h3>
                <div className="border-2 border-zinc-200 bg-white p-8 shadow-[4px_4px_0px_#1A1A1A]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="border-2 border-zinc-200 bg-zinc-50 p-4 space-y-2 shadow-[4px_4px_0px_#1A1A1A]">
                        <div className="h-6 bg-zinc-200 w-3/4" />
                        <div className="h-3 bg-zinc-100" />
                        <div className="h-3 bg-zinc-100 w-5/6" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Two Column */}
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Two Column (Editor + Sidebar)
                </h3>
                <div className="border-2 border-zinc-200 bg-white overflow-hidden shadow-[4px_4px_0px_#1A1A1A]">
                  <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[300px]">
                    <div className="lg:col-span-2 p-8 space-y-3">
                      <div className="h-6 bg-zinc-200 w-1/2" />
                      <div className="h-4 bg-zinc-100" />
                      <div className="h-4 bg-zinc-100" />
                      <div className="h-4 bg-zinc-100 w-4/5" />
                    </div>
                    <div className="border-l-2 border-zinc-200 bg-zinc-50 p-6 space-y-3">
                      <div className="h-5 bg-zinc-200 w-2/3" />
                      <div className="h-3 bg-zinc-100" />
                      <div className="h-3 bg-zinc-100" />
                      <div className="h-3 bg-zinc-100 w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Loading & Empty States */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Loading & Empty States
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-6">
                  Loading Spinner
                </h3>
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#B74134]" />
                </div>
              </div>

              <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-6">
                  Empty State
                </h3>
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-zinc-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-bold text-black mb-2">No essays yet</p>
                  <p className="text-zinc-600 mb-6 text-sm">Start writing your first micro-essay to build your thinking portfolio.</p>
                  <button className="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A] transition-all duration-200">
                    New Essay
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Structural Elements */}
          <section>
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Structural Elements
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Section Divider with Top Border
                </h3>
                <div className="border-t-4 border-black pt-6">
                  <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-3">
                    Published Essays
                  </h3>
                  <p className="text-base leading-relaxed text-zinc-600">
                    The thick top border creates a strong visual anchor for major section breaks,
                    borrowed from Pressed Type's structural patterns.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Code Blocks
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-600 mb-2 font-semibold">Inline code</p>
                    <p className="text-base leading-relaxed text-black">
                      Use the <code className="font-mono text-sm bg-zinc-100 text-black px-2 py-0.5 rounded">useState</code> hook to manage component state.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 mb-2 font-semibold">Code block</p>
                    <pre className="font-mono text-sm bg-zinc-50 border-2 border-zinc-200 p-4 overflow-x-auto shadow-[4px_4px_0px_#1A1A1A]">
{`const essay = await db.query.essays.findFirst({
  where: eq(essays.id, essayId),
  with: { evidence: true }
})`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug text-black mb-4">
                  Standard Badges & Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Published
                  </span>
                  <span className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Draft
                  </span>
                  <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full">
                    Archived
                  </span>
                  <span className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
                    Under Review
                  </span>
                  <span className="text-xs font-semibold text-[#B74134] bg-[#FFF5F3] border border-[#B74134] px-3 py-1 rounded-full">
                    Featured
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Design Philosophy */}
          <section className="border-t-4 border-black pt-12">
            <h2 className="[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight text-black mb-8">
              Design Philosophy
            </h2>
            <div className="border-2 border-zinc-200 bg-white p-8 shadow-[6px_6px_0px_#1A1A1A] space-y-6">
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Typographic authority without aggression
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  Playfair Display creates clear hierarchy and editorial confidence, but scaled to 48px (not 60px)
                  and weight 700 (not 900) to avoid performance pressure. This is a practice space, not a performance stage.
                </p>
              </div>
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Tangible UI elements
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  Hard drop shadows (shadow-[4px_4px_0px_#1A1A1A]) make every element feel physical — like paper on a surface.
                  This is THE signature visual element borrowed from Collage Board. Not decoration, but substance.
                </p>
              </div>
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Heavy borders for substance
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  2px borders by default (instead of 1px) make everything feel more graphic and substantial.
                  Borrowed from Collage Board's bold approach without overwhelming the layout.
                </p>
              </div>
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Handwritten coaching annotations
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  Caveat font in brick red for margin notes ONLY — creates "professor's red pen" effect.
                  This adds humanity to the coaching model without undermining editorial discipline.
                </p>
              </div>
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Brick red, not alarm red
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  The accent color (#B74134) is warm and editorial — think literary journals, not error messages.
                  It signals action without urgency, confidence without aggression.
                </p>
              </div>
              <div>
                <h3 className="[font-family:var(--font-serif)] text-xl font-bold leading-snug text-black mb-2">
                  Graphic boldness with warmth
                </h3>
                <p className="text-base leading-relaxed text-zinc-600">
                  The warm off-white background (#FAFAF8) prevents clinical coldness while preserving the high-contrast
                  graphic aesthetic. Cards remain true white for maximum clarity.
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t-2 border-black bg-[#FAFAF8] mt-24">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-12">
            <p className="text-center text-sm text-zinc-600 font-medium">
              Microblogger Design System — Pressed Type foundation + Collage Board personality (hard shadows, heavy borders, handwriting annotations)
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
