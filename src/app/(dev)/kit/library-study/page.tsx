import { Merriweather, Source_Sans_3 } from 'next/font/google';

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function LibraryStudyKit() {
  return (
    <div className={`${sourceSans.className} bg-[#2C2520] min-h-screen text-[#F5F1E8]`}>
      {/* Header */}
      <header className="border-b border-[#554D45] bg-[#3A3430] px-6 py-8 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <h1 className={`${merriweather.className} text-4xl font-bold text-[#F5F1E8] tracking-tight mb-3`}>
            Library Study
          </h1>
          <p className="text-lg text-[#C4BDB0] leading-relaxed max-w-3xl">
            Rich and layered, like writing at a mahogany desk in a private study. This kit creates an immersive, scholarly atmosphere with warm dark backgrounds, classic serif typography, and subtle depth through layering.
          </p>
        </div>
      </header>

      <main className="px-6 py-12 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-12">

          {/* Color Palette Section */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Color Palette
            </h2>

            <div className="space-y-8">
              {/* Surfaces */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Surfaces
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#2C2520] rounded-md mb-3 border border-[#554D45]"></div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Background Primary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#2C2520</p>
                    <p className="text-xs text-[#C4BDB0] mt-2">Main page background</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#3A3430] rounded-md mb-3 border border-[#554D45]"></div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Background Secondary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#3A3430</p>
                    <p className="text-xs text-[#C4BDB0] mt-2">Cards, panels</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#443E38] rounded-md mb-3 border border-[#554D45]"></div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Background Tertiary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#443E38</p>
                    <p className="text-xs text-[#C4BDB0] mt-2">Hover, nested elements</p>
                  </div>
                </div>
              </div>

              {/* Text Colors */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Text
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#2C2520] rounded-md mb-3 border border-[#554D45] flex items-center justify-center">
                      <span className="text-[#F5F1E8] text-2xl font-bold">Aa</span>
                    </div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Text Primary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#F5F1E8</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#2C2520] rounded-md mb-3 border border-[#554D45] flex items-center justify-center">
                      <span className="text-[#C4BDB0] text-2xl font-bold">Aa</span>
                    </div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Text Secondary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#C4BDB0</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#2C2520] rounded-md mb-3 border border-[#554D45] flex items-center justify-center">
                      <span className="text-[#9A9388] text-2xl font-bold">Aa</span>
                    </div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Text Tertiary</p>
                    <p className="text-xs text-[#9A9388] font-mono">#9A9388</p>
                  </div>
                </div>
              </div>

              {/* Accent Colors */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Accent Colors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#3D6B50] rounded-md mb-3 shadow-md"></div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Forest Green (Primary)</p>
                    <p className="text-xs text-[#9A9388] font-mono">#3D6B50</p>
                    <p className="text-xs text-[#C4BDB0] mt-2">Actions, links, focus</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-6 border border-[#554D45] shadow-lg">
                    <div className="w-full h-20 bg-[#C9A84C] rounded-md mb-3 shadow-md"></div>
                    <p className="text-sm font-semibold text-[#F5F1E8] mb-1">Aged Gold (Accent)</p>
                    <p className="text-xs text-[#9A9388] font-mono">#C9A84C</p>
                    <p className="text-xs text-[#C4BDB0] mt-2">Special emphasis, success</p>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Semantic
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#3A3430] rounded-lg p-4 border border-[#554D45] shadow-lg">
                    <div className="w-full h-16 bg-[#4A7C59] rounded-md mb-2"></div>
                    <p className="text-xs font-semibold text-[#F5F1E8] mb-1">Success</p>
                    <p className="text-xs text-[#9A9388] font-mono">#4A7C59</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-4 border border-[#554D45] shadow-lg">
                    <div className="w-full h-16 bg-[#C9954C] rounded-md mb-2"></div>
                    <p className="text-xs font-semibold text-[#F5F1E8] mb-1">Warning</p>
                    <p className="text-xs text-[#9A9388] font-mono">#C9954C</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-4 border border-[#554D45] shadow-lg">
                    <div className="w-full h-16 bg-[#C05A4A] rounded-md mb-2"></div>
                    <p className="text-xs font-semibold text-[#F5F1E8] mb-1">Error</p>
                    <p className="text-xs text-[#9A9388] font-mono">#C05A4A</p>
                  </div>
                  <div className="bg-[#3A3430] rounded-lg p-4 border border-[#554D45] shadow-lg">
                    <div className="w-full h-16 bg-[#5A7EA3] rounded-md mb-2"></div>
                    <p className="text-xs font-semibold text-[#F5F1E8] mb-1">Info</p>
                    <p className="text-xs text-[#9A9388] font-mono">#5A7EA3</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Typography
            </h2>

            <div className="bg-[#3A3430] rounded-lg p-8 border border-[#554D45] shadow-lg space-y-6">
              <div>
                <h1 className={`${merriweather.className} text-4xl font-bold text-[#F5F1E8] tracking-tight`}>
                  Heading 1 - Merriweather Bold
                </h1>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-4xl · font-bold · tracking-tight</p>
              </div>

              <div>
                <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] tracking-tight`}>
                  Heading 2 - Merriweather Semibold
                </h2>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-3xl · font-semibold · tracking-tight</p>
              </div>

              <div>
                <h3 className={`${merriweather.className} text-2xl font-semibold text-[#F5F1E8]`}>
                  Heading 3 - Merriweather Semibold
                </h3>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-2xl · font-semibold</p>
              </div>

              <div>
                <h4 className={`${merriweather.className} text-xl font-semibold text-[#F5F1E8]`}>
                  Heading 4 - Merriweather Semibold
                </h4>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-xl · font-semibold</p>
              </div>

              <div>
                <p className="text-base text-[#F5F1E8] leading-relaxed">
                  Body text uses Source Sans 3 at 16px with relaxed line height. This creates comfortable reading for longer passages. The font is neutral and structured, allowing the serif headings to provide visual hierarchy while maintaining excellent readability for interface elements and body content.
                </p>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-base · leading-relaxed · Source Sans 3</p>
              </div>

              <div>
                <p className="text-sm text-[#C4BDB0] leading-relaxed">
                  Small body text for secondary information, metadata, and supporting details.
                </p>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-sm · Source Sans 3</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#F5F1E8] uppercase tracking-wide">
                  Label Text
                </p>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-sm · font-semibold · uppercase · tracking-wide</p>
              </div>

              <div>
                <p className="text-xs text-[#9A9388] uppercase tracking-wide font-medium">
                  Caption Text
                </p>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-xs · font-medium · uppercase · tracking-wide</p>
              </div>

              <div>
                <code className="text-sm font-mono text-[#C9A84C] bg-[#443E38] px-2 py-1 rounded">
                  const evidence = &quot;inline code&quot;;
                </code>
                <p className="text-xs text-[#9A9388] mt-1 font-mono">text-sm · font-mono · gold accent</p>
              </div>
            </div>
          </section>

          {/* Buttons Section */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Buttons
            </h2>

            <div className="space-y-8">
              {/* Button Variants */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Variants
                </h3>
                <div className="bg-[#3A3430] rounded-lg p-8 border border-[#554D45] shadow-lg">
                  <div className="flex flex-wrap gap-4">
                    <button className="bg-[#3D6B50] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold hover:bg-[#4D7B60] focus:ring-2 focus:ring-[#3D6B50] focus:ring-offset-2 focus:ring-offset-[#2C2520] transition-colors">
                      Primary Button
                    </button>
                    <button className="border-2 border-[#554D45] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold bg-transparent hover:bg-[#3A3430] hover:border-[#C4BDB0] transition-colors">
                      Secondary Button
                    </button>
                    <button className="bg-[#C9A84C] text-[#2C2520] px-5 py-2.5 rounded-lg font-semibold hover:bg-[#D4B85F] transition-colors">
                      Gold Accent
                    </button>
                    <button className="bg-[#C05A4A] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold hover:bg-[#CA6A5A] transition-colors">
                      Destructive
                    </button>
                    <button className="bg-[#443E38] text-[#9A9388] px-5 py-2.5 rounded-lg font-semibold cursor-not-allowed" disabled>
                      Disabled
                    </button>
                  </div>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h3 className={`${merriweather.className} text-xl font-semibold text-[#C4BDB0] mb-4`}>
                  Sizes
                </h3>
                <div className="bg-[#3A3430] rounded-lg p-8 border border-[#554D45] shadow-lg">
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="bg-[#3D6B50] text-[#F5F1E8] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#4D7B60] transition-colors">
                      Small
                    </button>
                    <button className="bg-[#3D6B50] text-[#F5F1E8] px-5 py-2.5 rounded-lg text-base font-semibold hover:bg-[#4D7B60] transition-colors">
                      Medium
                    </button>
                    <button className="bg-[#3D6B50] text-[#F5F1E8] px-6 py-3 rounded-lg text-base font-semibold hover:bg-[#4D7B60] transition-colors">
                      Large
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs Section */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Form Inputs
            </h2>

            <div className="bg-[#3A3430] rounded-lg p-8 border border-[#554D45] shadow-lg space-y-6">
              {/* Text Input */}
              <div>
                <label htmlFor="text-input" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Text Input
                </label>
                <input
                  id="text-input"
                  type="text"
                  placeholder="Enter your essay title..."
                  className="bg-[#443E38] border border-[#554D45] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#3D6B50] focus:border-transparent"
                />
              </div>

              {/* Text Input - Focus State */}
              <div>
                <label htmlFor="text-focus" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Focus State
                </label>
                <input
                  id="text-focus"
                  type="text"
                  value="This input shows the focus ring"
                  className="bg-[#443E38] border border-[#554D45] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full ring-2 ring-[#3D6B50] border-transparent"
                  readOnly
                />
              </div>

              {/* Text Input - Error State */}
              <div>
                <label htmlFor="text-error" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Error State
                </label>
                <input
                  id="text-error"
                  type="text"
                  value="This field has an error"
                  className="bg-[#443E38] border border-[#C05A4A] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#C05A4A] focus:border-transparent"
                  readOnly
                />
                <p className="text-sm text-[#C05A4A] mt-2">This field is required</p>
              </div>

              {/* Textarea */}
              <div>
                <label htmlFor="textarea" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Textarea
                </label>
                <textarea
                  id="textarea"
                  placeholder="Write your micro-essay here..."
                  rows={4}
                  className="bg-[#443E38] border border-[#554D45] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#3D6B50] focus:border-transparent resize-y leading-relaxed"
                ></textarea>
              </div>

              {/* Select */}
              <div>
                <label htmlFor="select" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Select
                </label>
                <select
                  id="select"
                  className="bg-[#443E38] border border-[#554D45] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#3D6B50] focus:border-transparent"
                >
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Published</option>
                </select>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="checkbox"
                  className="mt-1 w-4 h-4 rounded border-[#554D45] bg-[#443E38] accent-[#3D6B50]"
                />
                <label htmlFor="checkbox" className="text-sm text-[#F5F1E8] leading-relaxed">
                  I have attached at least two pieces of evidence to support my claims
                </label>
              </div>

              {/* Radio Buttons */}
              <div>
                <p className="text-sm font-semibold text-[#F5F1E8] mb-3 uppercase tracking-wide">
                  Essay Type
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="argument"
                      name="essay-type"
                      className="w-4 h-4 border-[#554D45] bg-[#443E38] accent-[#3D6B50]"
                    />
                    <label htmlFor="argument" className="text-sm text-[#F5F1E8]">
                      Argument
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="analysis"
                      name="essay-type"
                      className="w-4 h-4 border-[#554D45] bg-[#443E38] accent-[#3D6B50]"
                    />
                    <label htmlFor="analysis" className="text-sm text-[#F5F1E8]">
                      Analysis
                    </label>
                  </div>
                </div>
              </div>

              {/* Disabled Input */}
              <div>
                <label htmlFor="disabled" className="block text-sm font-semibold text-[#F5F1E8] mb-2 uppercase tracking-wide">
                  Disabled State
                </label>
                <input
                  id="disabled"
                  type="text"
                  value="This field is disabled"
                  disabled
                  className="bg-[#2C2520] border border-[#554D45] text-[#9A9388] px-4 py-2.5 rounded-md w-full cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Cards Section */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Cards
            </h2>

            <div className="space-y-6">
              {/* Content Card */}
              <div className="bg-[#3A3430] border border-[#554D45] rounded-lg p-6 shadow-lg hover:shadow-xl hover:border-[#C4BDB0] transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`${merriweather.className} text-2xl font-semibold text-[#F5F1E8]`}>
                    The Practice of Deep Work
                  </h3>
                  <span className="text-xs text-[#9A9388] uppercase tracking-wide font-medium bg-[#443E38] px-3 py-1 rounded-full">
                    Draft
                  </span>
                </div>
                <p className="text-sm text-[#9A9388] mb-4">Last edited 2 hours ago · 487 words</p>
                <p className="text-base text-[#C4BDB0] leading-relaxed mb-4">
                  Modern knowledge work demands sustained attention, yet our digital environments are optimized for distraction. This essay explores how constraint-based writing practices can rebuild our capacity for focused thought...
                </p>
                <div className="flex gap-2">
                  <span className="text-xs bg-[#443E38] text-[#C4BDB0] px-3 py-1 rounded-full">productivity</span>
                  <span className="text-xs bg-[#443E38] text-[#C4BDB0] px-3 py-1 rounded-full">attention</span>
                </div>
              </div>

              {/* Evidence Card */}
              <div className="bg-[#3A3430] border-l-4 border-l-[#C9A84C] rounded-lg p-5 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-[#9A9388] uppercase tracking-wide font-medium">Evidence</p>
                  <span className="text-xs text-[#C9A84C] font-medium">Supports claim</span>
                </div>
                <blockquote className={`${merriweather.className} text-base text-[#F5F1E8] italic leading-relaxed mb-4 border-l-2 border-[#554D45] pl-4`}>
                  &quot;The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy. As a consequence, the few who cultivate this skill, and then make it the core of their working life, will thrive.&quot;
                </blockquote>
                <div className="space-y-1">
                  <p className="text-sm text-[#C4BDB0] font-semibold">Cal Newport, Deep Work (2016)</p>
                  <p className="text-xs text-[#9A9388]">
                    <a href="#" className="text-[#3D6B50] hover:text-[#4D7B60] underline">
                      View source
                    </a>
                  </p>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#443E38] rounded-lg p-4 border border-[#554D45] shadow-md">
                  <p className="text-xs text-[#9A9388] uppercase tracking-wide font-medium mb-2">Essays Published</p>
                  <p className={`${merriweather.className} text-3xl font-bold text-[#F5F1E8]`}>23</p>
                </div>
                <div className="bg-[#443E38] rounded-lg p-4 border border-[#554D45] shadow-md">
                  <p className="text-xs text-[#9A9388] uppercase tracking-wide font-medium mb-2">Current Streak</p>
                  <p className={`${merriweather.className} text-3xl font-bold text-[#C9A84C]`}>7 days</p>
                </div>
                <div className="bg-[#443E38] rounded-lg p-4 border border-[#554D45] shadow-md">
                  <p className="text-xs text-[#9A9388] uppercase tracking-wide font-medium mb-2">Evidence Cards</p>
                  <p className={`${merriweather.className} text-3xl font-bold text-[#F5F1E8]`}>64</p>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Mock */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Navigation
            </h2>

            <nav className="bg-[#3A3430] border border-[#554D45] rounded-lg shadow-lg">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-8">
                  <span className={`${merriweather.className} text-xl font-bold text-[#C9A84C]`}>
                    Microblogger
                  </span>
                  <div className="flex gap-6">
                    <a href="#" className="text-sm font-semibold text-[#C9A84C] border-b-2 border-[#C9A84C] pb-1">
                      Editor
                    </a>
                    <a href="#" className="text-sm font-semibold text-[#C4BDB0] hover:text-[#F5F1E8] transition-colors">
                      Evidence
                    </a>
                    <a href="#" className="text-sm font-semibold text-[#C4BDB0] hover:text-[#F5F1E8] transition-colors">
                      Publish
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="text-sm font-semibold text-[#C4BDB0] hover:text-[#F5F1E8]">
                    View Portfolio
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#3D6B50] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F5F1E8]">JD</span>
                  </div>
                </div>
              </div>
            </nav>
          </section>

          {/* Editor Mock */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Editor Mock
            </h2>

            <div className="bg-[#3A3430] border border-[#554D45] rounded-xl shadow-xl">
              {/* Editor Toolbar */}
              <div className="border-b border-[#554D45] px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-[#443E38] rounded-lg p-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#554D45] transition-colors" title="Bold">
                      <span className="text-[#C4BDB0] font-bold text-sm">B</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#554D45] transition-colors" title="Italic">
                      <span className="text-[#C4BDB0] italic text-sm">I</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#554D45] transition-colors" title="Link">
                      <span className="text-[#C4BDB0] text-sm">🔗</span>
                    </button>
                    <div className="w-px h-6 bg-[#554D45]"></div>
                    <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#554D45] transition-colors" title="Add Evidence">
                      <span className="text-[#C9A84C] text-sm">📚</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#9A9388]">487 words</span>
                    <button className="bg-[#3D6B50] text-[#F5F1E8] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#4D7B60] transition-colors">
                      Request Review
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="p-8 space-y-6">
                <input
                  type="text"
                  value="The Practice of Deep Work"
                  className={`${merriweather.className} text-3xl font-semibold bg-transparent border-none text-[#F5F1E8] w-full focus:outline-none placeholder:text-[#9A9388]`}
                  readOnly
                />

                <div className={`${merriweather.className} text-lg text-[#F5F1E8] leading-relaxed space-y-4`}>
                  <p>
                    Modern knowledge work demands sustained attention, yet our digital environments are optimized for distraction. Social media feeds, notification systems, and always-on communication channels fragment our cognitive capacity into ever-smaller pieces.
                  </p>
                  <p>
                    Research suggests that it takes an average of 23 minutes to fully return to a task after an interruption. When we consider how frequently the average knowledge worker switches contexts—checking email, responding to messages, browsing social media—we begin to understand why deep, focused work has become so rare.
                  </p>
                  <p className="relative">
                    The solution isn't simply &quot;try harder&quot; or &quot;use more willpower.&quot; Instead, we need to redesign our work environments and habits to protect attention as the scarce resource it has become.
                    <span className="absolute -right-8 top-0 w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs text-[#2C2520] font-bold shadow-md">
                      1
                    </span>
                  </p>
                </div>

                {/* Inline Comment */}
                <div className="bg-[#443E38] border-l-4 border-l-[#5A7EA3] rounded-lg p-4 ml-8">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#5A7EA3] flex items-center justify-center text-xs text-[#F5F1E8] font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-sm text-[#F5F1E8] font-semibold mb-2">Coach Comment</p>
                      <p className="text-sm text-[#C4BDB0] leading-relaxed mb-2">
                        This claim about redesigning work environments is promising. What specific evidence supports the idea that environmental changes are more effective than willpower-based approaches?
                      </p>
                      <p className="text-xs text-[#9A9388]">Consider adding research on habit formation or environmental design.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Section */}
              <div className="border-t border-[#554D45] px-8 py-6">
                <h4 className={`${merriweather.className} text-lg font-semibold text-[#F5F1E8] mb-4`}>
                  Pre-Publish Checklist
                </h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 text-sm text-[#C4BDB0] cursor-pointer">
                    <input type="checkbox" checked className="mt-0.5 w-4 h-4 rounded border-[#554D45] bg-[#443E38] accent-[#3D6B50]" readOnly />
                    <span>Essay is between 200-800 words</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-[#C4BDB0] cursor-pointer">
                    <input type="checkbox" checked className="mt-0.5 w-4 h-4 rounded border-[#554D45] bg-[#443E38] accent-[#3D6B50]" readOnly />
                    <span>At least two evidence cards attached</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-[#C4BDB0] cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-[#554D45] bg-[#443E38] accent-[#3D6B50]" readOnly />
                    <span>Addressed at least one counterargument</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-[#C4BDB0] cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-[#554D45] bg-[#443E38] accent-[#3D6B50]" readOnly />
                    <span>Resolved all coach comments</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Page Layout Demo */}
          <section>
            <h2 className={`${merriweather.className} text-3xl font-semibold text-[#F5F1E8] mb-6 tracking-tight`}>
              Page Layout
            </h2>

            <div className="bg-[#3A3430] border border-[#554D45] rounded-lg p-6 shadow-lg">
              <p className="text-base text-[#C4BDB0] leading-relaxed mb-4">
                This entire page demonstrates responsive layout principles with the library-study aesthetic. The design uses:
              </p>
              <ul className="space-y-2 text-sm text-[#C4BDB0] leading-relaxed list-disc list-inside">
                <li>A maximum content width of 6xl (1152px) for comfortable reading</li>
                <li>Responsive padding that scales from mobile (px-6) to desktop (lg:px-12)</li>
                <li>Grid layouts that collapse to single column on mobile</li>
                <li>Consistent vertical spacing rhythm (space-y-12 between major sections)</li>
                <li>Shadow depth that creates layered hierarchy without being heavy</li>
                <li>Color contrast ratios that ensure readability on dark backgrounds</li>
              </ul>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#554D45] bg-[#3A3430] px-6 py-8 mt-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-[#9A9388] text-center">
            Library Study Design Kit · Built for Microblogger · A writing gym, not a writing machine
          </p>
        </div>
      </footer>
    </div>
  );
}
