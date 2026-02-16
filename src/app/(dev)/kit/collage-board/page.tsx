import { Fraunces, Space_Grotesk, Caveat } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-fraunces',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-caveat',
  display: 'swap',
});

export default function CollageBoardKit() {
  return (
    <div className={`${fraunces.variable} ${spaceGrotesk.variable} ${caveat.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .font-display { font-family: var(--font-fraunces); }
        .font-sans { font-family: var(--font-space-grotesk); }
        .font-handwriting { font-family: var(--font-caveat); }
        .grid-canvas {
          background-image: radial-gradient(circle, #D8D3C8 1px, transparent 1px);
          background-size: 24px 24px;
        }
      ` }} />

      <div className="grid-canvas min-h-screen bg-[#F7F5F0] font-sans text-[#1A1A1A]">

        {/* Header with color block */}
        <header className="border-b-4 border-[#1A1A1A] bg-[#F7F5F0] px-6 py-16 md:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tighter md:text-6xl lg:text-7xl">
              Collage-Board
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed">
              A mixed-media collage aesthetic inspired by designers' working walls, Bauhaus posters, and physical mood boards.
              Bold geometry meets human creativity.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-12 px-6 py-12 md:px-10 lg:px-16">

          {/* Color Palette with hard shadows */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Color Palette
            </h2>

            {/* Primary Colors - Color Block Style */}
            <div className="space-y-8">
              <div>
                <h3 className="mb-6 font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Core Colors
                </h3>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#F7F5F0] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Canvas</p>
                    <p className="font-mono text-sm font-medium">#F7F5F0</p>
                  </div>
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#1A1A1A] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Ink Black</p>
                    <p className="font-mono text-sm font-medium">#1A1A1A</p>
                  </div>
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-white shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">White</p>
                    <p className="font-mono text-sm font-medium">#FFFFFF</p>
                  </div>
                </div>
              </div>

              {/* Bold Color Blocks */}
              <div>
                <h3 className="mb-6 font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Bold Blocks
                </h3>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#1B2838] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Navy</p>
                    <p className="font-mono text-sm font-medium">#1B2838</p>
                  </div>
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#E8634A] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Coral</p>
                    <p className="font-mono text-sm font-medium">#E8634A</p>
                  </div>
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#F2C94C] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Yellow</p>
                    <p className="font-mono text-sm font-medium">#F2C94C</p>
                  </div>
                  <div className="space-y-3">
                    <div className="h-32 border-2 border-[#1A1A1A] bg-[#7BA68D] shadow-[6px_6px_0px_#1A1A1A]"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Sage</p>
                    <p className="font-mono text-sm font-medium">#7BA68D</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography Showcase */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Typography
            </h2>

            <div className="space-y-8 rounded-none border-2 border-[#1A1A1A] bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
              <div>
                <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tighter md:text-6xl">
                  Display Heading
                </h1>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Fraunces Black, 48-60px, uppercase, tight tracking</p>
              </div>

              <div>
                <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
                  Secondary Display
                </h2>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Fraunces Black, 36-48px, tight tracking</p>
              </div>

              <div>
                <h3 className="font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Section Heading
                </h3>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Bold, 24-30px, uppercase, wide tracking</p>
              </div>

              <div>
                <h4 className="font-sans text-xl font-bold leading-tight">
                  Subsection Heading
                </h4>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Bold, 20px</p>
              </div>

              <div>
                <p className="text-lg font-medium leading-relaxed">
                  Body Large: The best writing comes from practice, not performance. Each micro-essay is a repetition —
                  a chance to refine your thinking, build evidence-backed arguments, and create a thinking portfolio.
                </p>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Medium, 18px, relaxed line-height</p>
              </div>

              <div>
                <p className="text-base leading-relaxed">
                  Body Regular: Knowledge workers need a creative workspace that reflects their process. This isn't a polished
                  publishing platform — it's a thinking studio where ideas are assembled, rearranged, and connected. Bold geometry
                  signals intellectual rigor. Human touches (rotations, handwriting) add creative warmth.
                </p>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Regular, 16px, relaxed line-height</p>
              </div>

              <div>
                <p className="text-sm leading-normal">
                  Body Small: Used for supporting text, metadata, and secondary information throughout the interface.
                </p>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Regular, 14px</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Label/Caption: All-Caps Bold
                </p>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Space Grotesk Bold, 12px, uppercase, wide tracking</p>
              </div>

              <div className="border-l-2 border-[#E8634A] pl-6">
                <p className="font-handwriting text-lg leading-loose text-[#E8634A]">
                  Annotation: This handwriting style is used ONLY for margin notes and coach comments.
                  It creates a human, editorial feel — like a professor's red-pen feedback.
                </p>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Caveat Regular, 18px — use sparingly!</p>
              </div>

              <div>
                <span className="inline-block rotate-2 border-[3px] border-[#1A1A1A] bg-[#E8634A] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A]">
                  PUBLISHED
                </span>
                <p className="mt-3 text-xs font-medium text-[#4A4A4A]">Stamp Badge: Rotated, heavy border, uppercase, black weight</p>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Buttons
            </h2>

            <div className="space-y-8">
              {/* Primary Buttons */}
              <div className="space-y-4">
                <h3 className="font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">Primary</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#E8634A] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A] transition-all hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Publish Essay
                  </button>
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#E8634A] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A] transition-all hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Save Draft
                  </button>
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#E8634A] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A] transition-all hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Add
                  </button>
                  <button className="cursor-not-allowed rounded-none border-2 border-[#1A1A1A] bg-[#D8D3C8] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#4A4A4A] opacity-60" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div className="space-y-4">
                <h3 className="font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">Secondary</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <button className="rounded-none border-2 border-[#E8634A] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E8634A] shadow-[4px_4px_0px_#1A1A1A] transition-all hover:bg-[#E8634A] hover:text-white hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Preview
                  </button>
                  <button className="rounded-none border-2 border-[#7BA68D] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#7BA68D] shadow-[4px_4px_0px_#1A1A1A] transition-all hover:bg-[#7BA68D] hover:text-white hover:shadow-[6px_6px_0px_#1A1A1A]">
                    View History
                  </button>
                </div>
              </div>

              {/* Navy Action */}
              <div className="space-y-4">
                <h3 className="font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">Navy Block</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#1B2838] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#F7F5F0] shadow-[4px_4px_0px_#1A1A1A] transition-all hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Request Review
                  </button>
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#F2C94C] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] transition-all hover:shadow-[6px_6px_0px_#1A1A1A]">
                    Add Evidence
                  </button>
                </div>
              </div>

              {/* Ghost */}
              <div className="space-y-4">
                <h3 className="font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">Ghost</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <button className="rounded-none px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E8634A] transition-all hover:border-b-[3px] hover:border-[#E8634A]">
                    Cancel
                  </button>
                  <button className="rounded-none px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E8634A] transition-all hover:border-b-[3px] hover:border-[#E8634A]">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Form Inputs
            </h2>

            <div className="space-y-6 rounded-none border-2 border-[#1A1A1A] bg-white p-8 shadow-[6px_6px_0px_#1A1A1A]">
              {/* Text Input - Default */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">Essay Title</label>
                <input
                  type="text"
                  placeholder="Enter a compelling title..."
                  className="w-full rounded-none border-2 border-[#1A1A1A] bg-white px-4 py-3 text-base leading-relaxed text-[#1A1A1A] placeholder-[#4A4A4A] transition-all focus:shadow-[4px_4px_0px_#1A1A1A] focus:outline-none"
                />
              </div>

              {/* Text Input - Focus State */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">With Focus Shadow</label>
                <input
                  type="text"
                  value="This input shows the hard shadow on focus"
                  readOnly
                  className="w-full rounded-none border-2 border-[#1A1A1A] bg-white px-4 py-3 text-base leading-relaxed text-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A]"
                />
              </div>

              {/* Text Input - Error */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#E8634A]">Title (Required)</label>
                <input
                  type="text"
                  placeholder="Title cannot be empty"
                  className="w-full rounded-none border-2 border-[#E8634A] bg-[#FFFBF0] px-4 py-3 text-base leading-relaxed text-[#1A1A1A] placeholder-[#E8634A]"
                />
                <p className="text-sm font-medium text-[#E8634A]">Please enter a title for your essay</p>
              </div>

              {/* Text Input - Disabled */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A4A4A]">Disabled Input</label>
                <input
                  type="text"
                  value="This field is disabled"
                  disabled
                  className="w-full cursor-not-allowed rounded-none border-2 border-[#D8D3C8] bg-[#F7F5F0] px-4 py-3 text-base leading-relaxed text-[#4A4A4A]"
                />
              </div>

              {/* Textarea */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">Essay Content</label>
                <textarea
                  rows={4}
                  placeholder="Write your micro-essay here..."
                  className="w-full rounded-none border-2 border-[#1A1A1A] bg-white px-4 py-3 text-base leading-relaxed text-[#1A1A1A] placeholder-[#4A4A4A] transition-all focus:shadow-[4px_4px_0px_#1A1A1A] focus:outline-none"
                />
              </div>

              {/* Select */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">Essay Status</label>
                <select className="w-full rounded-none border-2 border-[#1A1A1A] bg-white px-4 py-3 text-base leading-relaxed text-[#1A1A1A] transition-all focus:shadow-[4px_4px_0px_#1A1A1A] focus:outline-none">
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Published</option>
                  <option>Archived</option>
                </select>
              </div>

              {/* Checkbox */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider">Preferences</label>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="check1"
                    className="mt-1 h-5 w-5 rounded-none border-2 border-[#1A1A1A] text-[#E8634A] focus:ring-0 focus:ring-offset-0"
                    defaultChecked
                  />
                  <label htmlFor="check1" className="text-base leading-relaxed">
                    Enable inline coaching comments
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="check2"
                    className="mt-1 h-5 w-5 rounded-none border-2 border-[#1A1A1A] text-[#E8634A] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="check2" className="text-base leading-relaxed">
                    Require evidence for all claims
                  </label>
                </div>
              </div>

              {/* Radio */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider">Visibility</label>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="radio1"
                    name="visibility"
                    className="mt-1 h-5 w-5 border-2 border-[#1A1A1A] text-[#E8634A] focus:ring-0 focus:ring-offset-0"
                    defaultChecked
                  />
                  <label htmlFor="radio1" className="text-base leading-relaxed">
                    Private (only you)
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="radio2"
                    name="visibility"
                    className="mt-1 h-5 w-5 border-2 border-[#1A1A1A] text-[#E8634A] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="radio2" className="text-base leading-relaxed">
                    Public (anyone with link)
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="radio3"
                    name="visibility"
                    className="mt-1 h-5 w-5 border-2 border-[#1A1A1A] text-[#E8634A] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="radio3" className="text-base leading-relaxed">
                    Community (listed in public directory)
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Cards - Including Pinboard Style */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Cards
            </h2>

            <div className="space-y-8">
              {/* Standard Essay Card */}
              <div className="rounded-none border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] transition-shadow hover:shadow-[6px_6px_0px_#1A1A1A]">
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="font-sans text-xl font-bold leading-tight">
                    The Practice of Deliberate Disagreement
                  </h3>
                  <span className="inline-block rotate-2 rounded-full border-2 border-[#1A1A1A] bg-[#7BA68D] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_#1A1A1A]">
                    Published
                  </span>
                </div>
                <p className="mb-4 text-base leading-relaxed text-[#4A4A4A]">
                  Intellectual honesty requires actively seeking out the strongest counterarguments.
                  This essay explores why seeking disagreement is a skill that compounds over time.
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-[#4A4A4A]">
                  <span>647 words</span>
                  <span>•</span>
                  <span>3 evidence cards</span>
                  <span>•</span>
                  <span>Updated 2 hours ago</span>
                </div>
              </div>

              {/* Pinboard-Style Evidence Cards with Rotations */}
              <div>
                <h3 className="mb-6 font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Evidence Library (Pinboard Style)
                </h3>
                <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Evidence Card 1 - Rotated */}
                  <div className="rotate-1 rounded-none border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] transition-all hover:rotate-0 hover:shadow-[6px_6px_0px_#1A1A1A]">
                    {/* Pushpin accent */}
                    <div className="absolute -top-2 right-6 h-3 w-3 rounded-full border-2 border-[#1A1A1A] bg-[#F2C94C] shadow-[2px_2px_0px_#1A1A1A]"></div>
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Source</p>
                      <p className="mt-1 text-sm font-bold">
                        Tetlock & Gardner, "Superforecasting" (2015)
                      </p>
                    </div>
                    <blockquote className="border-l-4 border-[#1A1A1A] pl-4 text-base leading-relaxed text-[#4A4A4A]">
                      "The forecasters who did best were not necessarily smarter, but they were more willing
                      to update their beliefs when presented with new evidence."
                    </blockquote>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border-2 border-[#1A1A1A] bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        Epistemology
                      </span>
                    </div>
                  </div>

                  {/* Evidence Card 2 - Rotated opposite */}
                  <div className="-rotate-1 rounded-none border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] transition-all hover:rotate-0 hover:shadow-[6px_6px_0px_#1A1A1A]">
                    {/* Pushpin accent */}
                    <div className="absolute -top-2 right-6 h-3 w-3 rounded-full border-2 border-[#1A1A1A] bg-[#E8634A] shadow-[2px_2px_0px_#1A1A1A]"></div>
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Source</p>
                      <p className="mt-1 text-sm font-bold">
                        Carol Dweck, "Mindset" (2006)
                      </p>
                    </div>
                    <blockquote className="border-l-4 border-[#1A1A1A] pl-4 text-base leading-relaxed text-[#4A4A4A]">
                      "The growth mindset creates a powerful passion for learning rather than a hunger for approval."
                    </blockquote>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border-2 border-[#1A1A1A] bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        Learning
                      </span>
                    </div>
                  </div>

                  {/* Evidence Card 3 - Rotated */}
                  <div className="rotate-2 rounded-none border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] transition-all hover:rotate-0 hover:shadow-[6px_6px_0px_#1A1A1A]">
                    {/* Pushpin accent */}
                    <div className="absolute -top-2 right-6 h-3 w-3 rounded-full border-2 border-[#1A1A1A] bg-[#7BA68D] shadow-[2px_2px_0px_#1A1A1A]"></div>
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Source</p>
                      <p className="mt-1 text-sm font-bold">
                        Annie Duke, "Thinking in Bets" (2018)
                      </p>
                    </div>
                    <blockquote className="border-l-4 border-[#1A1A1A] pl-4 text-base leading-relaxed text-[#4A4A4A]">
                      "Thinking in bets starts with recognizing that there are exactly two things that determine how our lives turn out: the quality of our decisions and luck."
                    </blockquote>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border-2 border-[#1A1A1A] bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        Decision-Making
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Cards with Color Blocks */}
              <div>
                <h3 className="mb-6 font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Stats (Color Blocks)
                </h3>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="rounded-none border-2 border-[#1A1A1A] bg-[#1B2838] p-6 shadow-[4px_4px_0px_#1A1A1A]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#F2C94C]">Total Essays</p>
                    <p className="mt-3 font-display text-4xl font-black leading-none tracking-tighter text-white">
                      24
                    </p>
                  </div>
                  <div className="rounded-none border-2 border-[#1A1A1A] bg-[#E8634A] p-6 shadow-[4px_4px_0px_#1A1A1A]">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Evidence Cards</p>
                    <p className="mt-3 font-display text-4xl font-black leading-none tracking-tighter text-white">
                      67
                    </p>
                  </div>
                  <div className="rounded-none border-2 border-[#1A1A1A] bg-[#F2C94C] p-6 shadow-[4px_4px_0px_#1A1A1A]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Writing Streak</p>
                    <p className="mt-3 font-display text-4xl font-black leading-none tracking-tighter text-[#1A1A1A]">
                      12 days
                    </p>
                  </div>
                </div>
              </div>

              {/* Stamp Badges */}
              <div>
                <h3 className="mb-6 font-sans text-2xl font-bold uppercase leading-tight tracking-wide md:text-3xl">
                  Rubber Stamp Badges
                </h3>
                <div className="flex flex-wrap items-center gap-6">
                  <span className="inline-block -rotate-2 border-[3px] border-[#1A1A1A] bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A]">
                    DRAFT
                  </span>
                  <span className="inline-block rotate-3 border-[3px] border-[#1A1A1A] bg-[#E8634A] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A]">
                    Published
                  </span>
                  <span className="inline-block -rotate-3 border-[3px] border-[#1A1A1A] bg-[#F2C94C] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A]">
                    In Review
                  </span>
                  <span className="inline-block rotate-2 border-[3px] border-[#1A1A1A] bg-[#7BA68D] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A]">
                    Revised
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Mock */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Navigation
            </h2>

            <div className="overflow-hidden rounded-none border-2 border-[#1A1A1A] shadow-[6px_6px_0px_#1A1A1A]">
              <nav className="flex items-center justify-between border-b-4 border-[#1A1A1A] bg-[#F7F5F0] px-6 py-5">
                <div className="flex items-center gap-10">
                  <h1 className="font-display text-2xl font-black uppercase tracking-tighter">Microblogger</h1>
                  <div className="flex items-center gap-8">
                    <a href="#" className="border-b-[3px] border-[#E8634A] pb-1 text-sm font-bold uppercase tracking-wide text-[#E8634A]">
                      Editor
                    </a>
                    <a href="#" className="pb-1 text-sm font-bold uppercase tracking-wide text-[#1A1A1A] transition-all hover:border-b-[3px] hover:border-[#E8634A] hover:text-[#E8634A]">
                      Essays
                    </a>
                    <a href="#" className="pb-1 text-sm font-bold uppercase tracking-wide text-[#1A1A1A] transition-all hover:border-b-[3px] hover:border-[#E8634A] hover:text-[#E8634A]">
                      Evidence
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#E8634A] transition-all hover:border-b-[3px] hover:border-[#E8634A]">
                    Help
                  </button>
                  <div className="h-10 w-10 rounded-full border-2 border-[#1A1A1A] bg-[#E8634A] shadow-[2px_2px_0px_#1A1A1A]"></div>
                </div>
              </nav>
              <div className="bg-white p-12 text-center text-[#4A4A4A]">
                Page content would appear here
              </div>
            </div>
          </section>

          {/* Editor Mock with Margin Annotations */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Editor Mock
            </h2>

            <div className="overflow-hidden rounded-none border-2 border-[#1A1A1A] shadow-[6px_6px_0px_#1A1A1A]">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b-4 border-[#1A1A1A] bg-[#F7F5F0] px-6 py-4">
                <div className="flex items-center gap-3">
                  <button className="rounded-none border-2 border-transparent p-2 text-[#1A1A1A] transition-all hover:border-[#1A1A1A] hover:bg-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18m-9 5h9" />
                    </svg>
                  </button>
                  <button className="rounded-none border-2 border-transparent p-2 text-[#1A1A1A] transition-all hover:border-[#1A1A1A] hover:bg-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <div className="mx-2 h-8 w-px border-l-2 border-[#1A1A1A]"></div>
                  <button className="rounded-none border-2 border-transparent p-2 text-[#1A1A1A] transition-all hover:border-[#1A1A1A] hover:bg-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A4A4A]">Auto-saved 30s ago</span>
                  <button className="rounded-none border-2 border-[#7BA68D] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#7BA68D] shadow-[2px_2px_0px_#1A1A1A] transition-all hover:bg-[#7BA68D] hover:text-white hover:shadow-[4px_4px_0px_#1A1A1A]">
                    Preview
                  </button>
                  <button className="rounded-none border-2 border-[#1A1A1A] bg-[#E8634A] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_#1A1A1A] transition-all hover:shadow-[4px_4px_0px_#1A1A1A]">
                    Publish
                  </button>
                </div>
              </div>

              {/* Editor Content with Margin Annotation */}
              <div className="bg-white p-8 lg:p-12">
                <div className="mx-auto max-w-4xl">
                  {/* Title */}
                  <input
                    type="text"
                    value="Why Practice Beats Talent"
                    readOnly
                    className="w-full border-0 bg-transparent font-display text-4xl font-black leading-none tracking-tighter text-[#1A1A1A] focus:border-b-4 focus:border-[#1A1A1A] focus:outline-none lg:text-5xl"
                  />

                  {/* Word Count */}
                  <div className="mt-6 flex items-center gap-4 text-sm font-medium text-[#4A4A4A]">
                    <span className="rounded-full border-2 border-[#1A1A1A] bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      384 words
                    </span>
                    <span>Target: 400-600</span>
                  </div>

                  {/* Content Area with Side Annotation */}
                  <div className="relative mt-8 space-y-6 text-base leading-relaxed text-[#1A1A1A]">
                    <p>
                      The research is clear: deliberate practice — not innate talent — is the primary driver of
                      expertise. Anders Ericsson's decades of work show that what we call "natural ability" is
                      often just accumulated practice that started early.
                    </p>

                    {/* Inline Coach Comment Block */}
                    <div className="relative rounded-none border-l-4 border-[#E8634A] bg-[#FFFBF0] p-5">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#E8634A]">Coach Comment</p>
                      <p className="text-sm leading-relaxed text-[#4A4A4A]">
                        Strong opening claim. Can you link to a specific Ericsson study as evidence?
                        Consider also addressing the counterargument: what about fields where physical
                        attributes matter (basketball height, etc.)?
                      </p>
                    </div>

                    <div className="relative">
                      <p>
                        But here's what's less discussed: practice quality matters more than quantity.
                        Mindless repetition creates habits, not skill. The distinguishing feature of deliberate
                        practice is immediate feedback and constant adjustment.
                      </p>

                      {/* Margin Annotation (hidden on mobile, visible on large screens) */}
                      <div className="absolute -right-64 top-0 hidden w-56 lg:block">
                        <div className="relative">
                          {/* Connecting line */}
                          <svg className="absolute -left-8 top-3 h-px w-8" viewBox="0 0 32 1">
                            <line x1="0" y1="0.5" x2="32" y2="0.5" stroke="#E8634A" strokeWidth="2" strokeDasharray="4 2" />
                          </svg>
                          <p className="font-handwriting text-lg leading-loose text-[#E8634A]">
                            This is the key insight! Expand on what "immediate feedback" looks like in writing practice.
                          </p>
                        </div>
                      </div>
                    </div>

                    <p>
                      This has implications for how we design learning environments. If feedback loops are slow or absent,
                      we're not building skill — we're just logging hours.
                    </p>
                  </div>

                  {/* Publishing Checklist */}
                  <div className="mt-10 rounded-none border-2 border-[#1A1A1A] bg-[#F7F5F0] p-6">
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-wider">Publishing Checklist</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked readOnly className="mt-1 h-5 w-5 rounded-none border-2 border-[#1A1A1A] text-[#7BA68D]" />
                        <span className="text-sm text-[#4A4A4A] line-through">Word count in range (400-600)</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" readOnly className="mt-1 h-5 w-5 rounded-none border-2 border-[#1A1A1A] text-[#E8634A]" />
                        <span className="text-sm text-[#1A1A1A]">At least 2 evidence cards linked</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" readOnly className="mt-1 h-5 w-5 rounded-none border-2 border-[#1A1A1A] text-[#E8634A]" />
                        <span className="text-sm text-[#1A1A1A]">Counterargument addressed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Responsive Layout Demonstration */}
          <section className="space-y-8">
            <h2 className="font-display text-4xl font-black leading-none tracking-tighter md:text-5xl">
              Responsive Layout
            </h2>
            <p className="text-base leading-relaxed text-[#4A4A4A]">
              This entire page demonstrates responsive behavior. The bold typography scales dramatically,
              pinboard cards reflow from 3 columns to single column, and spacing adjusts to maintain visual
              impact at all viewport sizes. The hard shadows and rotations remain consistent — the aesthetic
              is uncompromising.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-none border-2 border-[#1A1A1A] bg-white p-5 text-center shadow-[4px_4px_0px_#1A1A1A]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Mobile</p>
                <p className="mt-2 text-sm text-[#4A4A4A]">Single column, full impact</p>
              </div>
              <div className="rounded-none border-2 border-[#1A1A1A] bg-white p-5 text-center shadow-[4px_4px_0px_#1A1A1A]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Tablet</p>
                <p className="mt-2 text-sm text-[#4A4A4A]">Two columns</p>
              </div>
              <div className="rounded-none border-2 border-[#1A1A1A] bg-white p-5 text-center shadow-[4px_4px_0px_#1A1A1A]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Desktop</p>
                <p className="mt-2 text-sm text-[#4A4A4A]">Full grid, rotations</p>
              </div>
              <div className="rounded-none border-2 border-[#1A1A1A] bg-white p-5 text-center shadow-[4px_4px_0px_#1A1A1A]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E8634A]">Wide</p>
                <p className="mt-2 text-sm text-[#4A4A4A]">Max 1400px</p>
              </div>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="mt-20 border-t-4 border-[#1A1A1A] bg-[#1B2838] px-6 py-10 text-center md:px-10 lg:px-16">
          <p className="font-sans text-sm font-bold uppercase tracking-wider text-[#F7F5F0]">
            Collage-Board Design Kit — Built for Microblogger
          </p>
          <p className="mt-2 text-xs text-[#7BA68D]">
            Creative workspace. Bold geometry. Human touch.
          </p>
        </footer>

      </div>
    </div>
  );
}
