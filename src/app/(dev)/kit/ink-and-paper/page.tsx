import { Newsreader } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export default function InkAndPaperKit() {
  return (
    <div className={`${newsreader.className} bg-[#FDFCFA] min-h-screen`}>
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-8 md:px-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[40px] font-normal leading-tight tracking-tight text-black mb-3">
            Ink and Paper
          </h1>
          <p className="text-lg font-normal leading-relaxed text-gray-800">
            Stripped to the absolute essentials, like writing with a good pen on
            quality paper. Near-monochrome with a barely-there warm undertone.
            The interface disappears so the writing can breathe.
          </p>
        </div>
      </header>

      <main className="px-6 py-16 md:px-12">
        <div className="max-w-2xl mx-auto space-y-16">
          {/* Color Palette */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Color Palette
            </h2>
            <div className="space-y-6">
              {/* Primary Colors */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Primary
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <div className="h-20 bg-[#FDFCFA] border border-gray-200"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Paper
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #FDFCFA
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-black"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Ink
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #000000
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-[#C05A3C]"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Terracotta
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #C05A3C
                    </p>
                  </div>
                </div>
              </div>

              {/* Neutral Scale */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Neutral Scale
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <div className="h-20 bg-gray-800"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Charcoal
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #1F2937
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-gray-600"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Graphite
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #4B5563
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-gray-400"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Ash
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #9CA3AF
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-gray-200"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Smoke
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #E5E7EB
                    </p>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Semantic
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <div className="h-20 bg-green-700"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Success
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #15803D
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-amber-700"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Warning
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #B45309
                    </p>
                  </div>
                  <div>
                    <div className="h-20 bg-red-700"></div>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mt-2">
                      Error
                    </p>
                    <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                      #B91C1C
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Typography
            </h2>
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h1 className="text-[40px] font-normal leading-tight tracking-tight text-black">
                  Heading 1: The Practice of Thinking
                </h1>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  40px / Regular / -0.02em
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black">
                  Heading 2: Evidence and Argument
                </h2>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  32px / Medium / -0.01em
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-2xl font-medium leading-snug text-black">
                  Heading 3: Building a Thinking Portfolio
                </h3>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  24px / Medium / 0em
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-xl font-medium leading-normal text-black">
                  Heading 4: Version History and Revision
                </h4>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  20px / Medium / 0em
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <p className="text-lg font-normal leading-relaxed text-gray-800">
                  Body: The micro-essay is a form designed for practice, not
                  performance. At 200-800 words, it forces clarity and
                  compression. Each essay is a rep in a long-term training
                  program for clearer thinking. The constraint creates the
                  craft.
                </p>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  18px / Regular / 1.7 line height
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <p className="text-base font-normal leading-normal text-gray-600">
                  Small: Supporting text and secondary information
                </p>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  16px / Regular / 1.6 line height
                </p>
              </div>
              <div>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-600">
                  CAPTION: METADATA AND LABELS
                </p>
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-400 mt-2">
                  14px / Regular / 0.01em
                </p>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Buttons
            </h2>
            <div className="space-y-8">
              {/* Primary */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Primary
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <button className="bg-[#C05A3C] text-white px-6 py-3 hover:bg-[#A04A2F] transition-colors duration-200">
                    Publish Essay
                  </button>
                  <button className="bg-[#C05A3C] text-white px-5 py-2 text-base hover:bg-[#A04A2F] transition-colors duration-200">
                    Save Draft
                  </button>
                  <button className="bg-[#C05A3C] text-white px-4 py-1.5 text-sm hover:bg-[#A04A2F] transition-colors duration-200">
                    Submit
                  </button>
                  <button className="bg-[#C05A3C] text-white px-6 py-3 opacity-40 cursor-not-allowed">
                    Disabled
                  </button>
                </div>
              </div>

              {/* Secondary */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Secondary
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <button className="border border-gray-800 text-gray-800 px-6 py-3 hover:bg-gray-800 hover:text-white transition-colors duration-200">
                    Preview
                  </button>
                  <button className="border border-gray-800 text-gray-800 px-5 py-2 text-base hover:bg-gray-800 hover:text-white transition-colors duration-200">
                    Cancel
                  </button>
                  <button className="border border-gray-800 text-gray-800 px-4 py-1.5 text-sm hover:bg-gray-800 hover:text-white transition-colors duration-200">
                    Back
                  </button>
                  <button className="border border-gray-800 text-gray-800 px-6 py-3 opacity-40 cursor-not-allowed">
                    Disabled
                  </button>
                </div>
              </div>

              {/* Ghost */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Ghost
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <button className="text-gray-800 px-6 py-3 hover:bg-gray-100 transition-colors duration-200">
                    Bold
                  </button>
                  <button className="text-gray-800 px-6 py-3 hover:bg-gray-100 transition-colors duration-200">
                    Italic
                  </button>
                  <button className="text-gray-800 px-6 py-3 hover:bg-gray-100 transition-colors duration-200">
                    Link
                  </button>
                  <button className="text-gray-800 px-6 py-3 opacity-40 cursor-not-allowed">
                    Disabled
                  </button>
                </div>
              </div>

              {/* Destructive */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Destructive
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <button className="border border-red-700 text-red-700 px-6 py-3 hover:bg-red-700 hover:text-white transition-colors duration-200">
                    Delete Essay
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Form Inputs
            </h2>
            <div className="space-y-8">
              {/* Text Input */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Text Input
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                      Essay Title
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your essay title"
                      className="w-full border-b border-gray-200 px-4 py-3 text-lg font-normal leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors duration-200 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                      Focused State
                    </label>
                    <input
                      type="text"
                      value="The Practice of Thinking"
                      className="w-full border-b border-black px-4 py-3 text-lg font-normal leading-relaxed text-gray-800 focus:border-black focus:outline-none transition-colors duration-200 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                      Error State
                    </label>
                    <input
                      type="text"
                      value=""
                      className="w-full border-b border-red-700 px-4 py-3 text-lg font-normal leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-red-700 focus:outline-none transition-colors duration-200 bg-transparent"
                    />
                    <p className="text-sm font-normal leading-normal tracking-wide text-red-700 mt-2">
                      Title is required
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-normal leading-normal tracking-wide text-gray-400 mb-2">
                      Disabled State
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Published essay"
                      className="w-full border-b border-gray-200 px-4 py-3 text-lg font-normal leading-relaxed text-gray-400 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Textarea
                </h3>
                <div>
                  <label className="block text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                    Evidence Note
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Add your notes or reflection..."
                    className="w-full border border-gray-200 px-4 py-3 text-lg font-normal leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors duration-200 bg-transparent resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Select */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Select
                </h3>
                <div>
                  <label className="block text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                    Essay Status
                  </label>
                  <select className="w-full border-b border-gray-200 px-4 py-3 text-lg font-normal leading-relaxed text-gray-800 focus:border-black focus:outline-none transition-colors duration-200 bg-transparent">
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>

              {/* Checkbox and Radio */}
              <div>
                <h3 className="text-xl font-medium leading-normal text-gray-800 mb-4">
                  Checkbox & Radio
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="check1"
                      className="mt-1 w-4 h-4 border-gray-800 text-[#C05A3C] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="check1" className="text-base font-normal leading-normal text-gray-800">
                      I have addressed the counterargument
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="check2"
                      checked
                      className="mt-1 w-4 h-4 border-gray-800 text-[#C05A3C] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="check2" className="text-base font-normal leading-normal text-gray-800">
                      Every claim links to evidence
                    </label>
                  </div>
                  <div className="flex items-start gap-3 mt-6">
                    <input
                      type="radio"
                      name="feedback"
                      id="radio1"
                      className="mt-1 w-4 h-4 border-gray-800 text-[#C05A3C] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="radio1" className="text-base font-normal leading-normal text-gray-800">
                      Request peer feedback
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="feedback"
                      id="radio2"
                      checked
                      className="mt-1 w-4 h-4 border-gray-800 text-[#C05A3C] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="radio2" className="text-base font-normal leading-normal text-gray-800">
                      Self-review only
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cards */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Cards
            </h2>
            <div className="space-y-6">
              {/* Essay Card */}
              <div className="border border-gray-200 p-8 bg-[#FDFCFA]">
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mb-3">
                  DRAFT • UPDATED 2 HOURS AGO
                </p>
                <h3 className="text-2xl font-medium leading-snug text-black mb-4">
                  The Practice of Thinking: Why Micro-Essays Build Better
                  Writers
                </h3>
                <p className="text-lg font-normal leading-relaxed text-gray-800 mb-6">
                  Most writing advice focuses on output: publish more, build an
                  audience, optimize for engagement. But writing is a skill, and
                  skills improve through deliberate practice, not performance...
                </p>
                <div className="flex items-center gap-4 text-sm font-normal leading-normal tracking-wide text-gray-600">
                  <span>487 words</span>
                  <span>•</span>
                  <span>3 evidence cards</span>
                  <span>•</span>
                  <span>1 revision</span>
                </div>
              </div>

              {/* Evidence Card */}
              <div className="border border-gray-200 border-l-4 border-l-gray-800 p-8 bg-[#FDFCFA]">
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mb-3">
                  SOURCE: DELIBERATE PRACTICE THEORY
                </p>
                <h4 className="text-xl font-medium leading-normal text-black mb-4">
                  Ericsson et al., 1993
                </h4>
                <p className="text-lg font-normal leading-relaxed text-gray-800 mb-4">
                  "Mere repetition of an activity does not automatically lead to
                  improvement... Improvement requires deliberate efforts to
                  identify weaknesses and work to overcome them."
                </p>
                <p className="text-base font-normal leading-normal text-gray-600">
                  Applied to writing: quantity alone does not build skill.
                  Targeted revision and feedback are essential.
                </p>
              </div>

              {/* Stat Card */}
              <div className="border border-gray-200 p-8 bg-[#FDFCFA]">
                <p className="text-sm font-normal leading-normal tracking-wide text-gray-600 mb-2">
                  YOUR PROGRESS
                </p>
                <p className="text-[40px] font-normal leading-tight tracking-tight text-black mb-2">
                  23
                </p>
                <p className="text-base font-normal leading-normal text-gray-600">
                  essays published this quarter
                </p>
              </div>
            </div>
          </section>

          {/* Navigation Mock */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Navigation
            </h2>
            <nav className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <span className="text-xl font-medium leading-normal text-black">
                    Microblogger
                  </span>
                  <div className="flex gap-6">
                    <a
                      href="#"
                      className="text-base font-normal leading-normal text-gray-800 hover:text-black transition-colors duration-200"
                    >
                      Editor
                    </a>
                    <a
                      href="#"
                      className="text-base font-normal leading-normal text-gray-600 hover:text-black transition-colors duration-200"
                    >
                      Evidence
                    </a>
                    <a
                      href="#"
                      className="text-base font-normal leading-normal text-gray-600 hover:text-black transition-colors duration-200"
                    >
                      Portfolio
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="text-base font-normal leading-normal text-gray-600 hover:text-black transition-colors duration-200">
                    Settings
                  </button>
                  <button className="bg-[#C05A3C] text-white px-4 py-1.5 text-sm hover:bg-[#A04A2F] transition-colors duration-200">
                    New Essay
                  </button>
                </div>
              </div>
            </nav>
          </section>

          {/* Editor Mock */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Editor (Core Screen)
            </h2>
            <div className="border border-gray-200 p-12 bg-[#FDFCFA] min-h-[600px]">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-gray-200">
                <button className="text-gray-800 px-4 py-2 hover:bg-gray-100 transition-colors duration-200 text-sm">
                  Bold
                </button>
                <button className="text-gray-800 px-4 py-2 hover:bg-gray-100 transition-colors duration-200 text-sm">
                  Italic
                </button>
                <button className="text-gray-800 px-4 py-2 hover:bg-gray-100 transition-colors duration-200 text-sm">
                  Link
                </button>
                <div className="border-l border-gray-200 h-6 mx-2"></div>
                <button className="text-gray-800 px-4 py-2 hover:bg-gray-100 transition-colors duration-200 text-sm">
                  Add Evidence
                </button>
                <button className="text-gray-800 px-4 py-2 hover:bg-gray-100 transition-colors duration-200 text-sm">
                  Request Review
                </button>
                <div className="flex-1"></div>
                <span className="text-sm font-normal leading-normal tracking-wide text-gray-400">
                  487 / 800 words
                </span>
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder="Essay title"
                value="The Practice of Thinking"
                className="w-full border-b border-transparent px-0 py-2 text-[32px] font-medium leading-tight tracking-tight text-black placeholder:text-gray-400 focus:border-gray-200 focus:outline-none transition-colors duration-200 bg-transparent mb-8"
              />

              {/* Content Area */}
              <div className="space-y-6">
                <p className="text-lg font-normal leading-relaxed text-gray-800">
                  Most writing advice focuses on output: publish more, build an
                  audience, optimize for engagement. But writing is a skill, and
                  skills improve through deliberate practice, not performance.
                </p>
                <p className="text-lg font-normal leading-relaxed text-gray-800">
                  The micro-essay is a form designed for practice. At 200-800
                  words, it forces clarity and compression. Each essay is a rep
                  in a long-term training program for clearer thinking.
                </p>
                <p className="text-lg font-normal leading-relaxed text-gray-400">
                  The constraint creates the craft...
                </p>
              </div>

              {/* Inline Comment Mock */}
              <div className="mt-8 border-l-4 border-l-[#C05A3C] pl-6 py-2 bg-[#C05A3C] bg-opacity-5">
                <p className="text-sm font-normal leading-normal tracking-wide text-[#C05A3C] mb-2">
                  COACH FEEDBACK
                </p>
                <p className="text-base font-normal leading-normal text-gray-800">
                  This claim would be stronger with evidence. Consider linking
                  to research on deliberate practice.
                </p>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200">
                <button className="text-gray-800 px-6 py-3 hover:bg-gray-100 transition-colors duration-200">
                  Save Draft
                </button>
                <div className="flex gap-4">
                  <button className="border border-gray-800 text-gray-800 px-6 py-3 hover:bg-gray-800 hover:text-white transition-colors duration-200">
                    Preview
                  </button>
                  <button className="bg-[#C05A3C] text-white px-6 py-3 hover:bg-[#A04A2F] transition-colors duration-200">
                    Request Review
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Page Layout Demo */}
          <section>
            <h2 className="text-[32px] font-medium leading-tight tracking-tight text-black mb-8">
              Responsive Layout
            </h2>
            <p className="text-lg font-normal leading-relaxed text-gray-800 mb-6">
              This entire page demonstrates the responsive layout system. Notice
              the narrow content column (max-w-2xl / 672px), generous padding
              that scales with viewport, and maximum whitespace throughout.
            </p>
            <div className="border border-gray-200 p-8 bg-[#FDFCFA]">
              <p className="text-base font-normal leading-normal text-gray-800 mb-4">
                <strong className="font-medium">Mobile:</strong> 24px horizontal
                padding, single column, stacked navigation
              </p>
              <p className="text-base font-normal leading-normal text-gray-800 mb-4">
                <strong className="font-medium">Desktop:</strong> 48px
                horizontal padding, centered content column, horizontal
                navigation
              </p>
              <p className="text-base font-normal leading-normal text-gray-600">
                The page should feel 60% empty space. Whitespace is a design
                tool, not wasted space.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 md:px-12 mt-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-normal leading-normal tracking-wide text-gray-400">
            Ink and Paper Kit • Design system for Microblogger • Near-monochrome
            with warm undertones • Brutalist minimalism softened by warmth
          </p>
        </div>
      </footer>
    </div>
  );
}
