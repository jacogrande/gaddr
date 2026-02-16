import { JetBrains_Mono, Inter } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export default function NoirTerminalKit() {
  return (
    <div className={`${jetbrainsMono.variable} ${inter.variable} font-sans`}>
      <div className="min-h-screen bg-[#0F1117] text-[#E8E6E3]">

        {/* Header */}
        <header className="border-b border-[#2A2F3F] bg-[#0F1117] px-4 py-12 md:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="font-mono text-3xl font-bold uppercase leading-tight tracking-tight md:text-4xl">
              Noir Terminal
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#A8A6A3]">
              A premium dark literary terminal. Write prose like you write code. Command-palette-driven,
              syntax-highlighted arguments, status bar. A writer&apos;s cockpit.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-12 px-4 py-12 md:px-6 lg:px-8">

          {/* Color Palette */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Color Palette
            </h2>

            <div className="space-y-6">
              {/* Surfaces */}
              <div>
                <h3 className="mb-4 font-mono text-xl font-semibold uppercase leading-snug tracking-tight">
                  Surfaces
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#0F1117]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Surface Dark</p>
                    <p className="font-mono text-xs text-[#6B6966]">#0F1117</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#1A1D28]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Surface Elevated</p>
                    <p className="font-mono text-xs text-[#6B6966]">#1A1D28</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#242938]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Surface Hover</p>
                    <p className="font-mono text-xs text-[#6B6966]">#242938</p>
                  </div>
                </div>
              </div>

              {/* Text Colors */}
              <div>
                <h3 className="mb-4 font-mono text-xl font-semibold uppercase leading-snug tracking-tight">
                  Text
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#E8E6E3]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Primary Text</p>
                    <p className="font-mono text-xs text-[#6B6966]">#E8E6E3</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#A8A6A3]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Secondary Text</p>
                    <p className="font-mono text-xs text-[#6B6966]">#A8A6A3</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#6B6966]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Tertiary Text</p>
                    <p className="font-mono text-xs text-[#6B6966]">#6B6966</p>
                  </div>
                </div>
              </div>

              {/* Syntax Highlight Colors */}
              <div>
                <h3 className="mb-4 font-mono text-xl font-semibold uppercase leading-snug tracking-tight">
                  Syntax Highlighting (Argument Structure)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#E5A84B]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Claim</p>
                    <p className="font-mono text-xs text-[#6B6966]">#E5A84B</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#4DC9B0]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Evidence</p>
                    <p className="font-mono text-xs text-[#6B6966]">#4DC9B0</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#D497A7]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Counterargument</p>
                    <p className="font-mono text-xs text-[#6B6966]">#D497A7</p>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="mb-4 font-mono text-xl font-semibold uppercase leading-snug tracking-tight">
                  Semantic
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#6B9BD2]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Info</p>
                    <p className="font-mono text-xs text-[#6B6966]">#6B9BD2</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#4EC9A0]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Success</p>
                    <p className="font-mono text-xs text-[#6B6966]">#4EC9A0</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#E5A84B]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Warning</p>
                    <p className="font-mono text-xs text-[#6B6966]">#E5A84B</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded border border-[#2A2F3F] bg-[#E85C4B]"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Error</p>
                    <p className="font-mono text-xs text-[#6B6966]">#E85C4B</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Typography
            </h2>

            <div className="space-y-6">
              <div className="space-y-6 rounded border border-[#2A2F3F] bg-[#1A1D28] p-6">
                <div>
                  <h1 className="font-mono text-3xl font-bold uppercase leading-tight tracking-tight md:text-4xl">
                    Heading 1: Terminal Precision
                  </h1>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono Bold, 30px/40px, uppercase</p>
                </div>

                <div>
                  <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
                    Heading 2: Command Palette
                  </h2>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono Bold, 24px/30px, uppercase</p>
                </div>

                <div>
                  <h3 className="font-mono text-xl font-semibold uppercase leading-snug tracking-tight">
                    Heading 3: Status Bar
                  </h3>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono Semibold, 20px, uppercase</p>
                </div>

                <div>
                  <h4 className="font-mono text-lg font-medium leading-snug">
                    Heading 4: Syntax Highlight
                  </h4>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono Medium, 18px</p>
                </div>

                <div>
                  <p className="text-lg leading-relaxed">
                    Body Large: The best writing tools borrow from the best coding tools. Command palettes,
                    status bars, syntax highlighting — these patterns make complex work feel manageable.
                  </p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">Inter Regular, 18px, 1.75 line-height</p>
                </div>

                <div>
                  <p className="text-base leading-relaxed">
                    Body: Microblogger is a platform for power users who treat writing as craft. Every UI
                    pattern signals precision and control. Claims are color-coded in amber. Evidence
                    references glow in teal. Counterarguments appear in soft pink. This is not a blog — this
                    is a cockpit for thought.
                  </p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">Inter Regular, 16px, 1.75 line-height</p>
                </div>

                <div>
                  <p className="text-sm leading-normal">
                    Body Small: Used for secondary information and metadata in cards.
                  </p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">Inter Regular, 14px</p>
                </div>

                <div>
                  <p className="font-mono text-xs uppercase leading-normal tracking-wider text-[#A8A6A3]">
                    Caption: Last saved 2 min ago
                  </p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono Regular, 12px, uppercase</p>
                </div>

                <div>
                  <code className="rounded bg-[#242938] px-2 py-1 font-mono text-sm text-[#4DC9B0]">
                    const syntax = &quot;highlighting&quot;;
                  </code>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">JetBrains Mono, 14px</p>
                </div>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Buttons
            </h2>

            <div className="space-y-6">
              {/* Primary Buttons */}
              <div className="space-y-4">
                <h3 className="font-mono text-xl font-semibold uppercase leading-snug tracking-tight">Primary</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded bg-[#E5A84B] px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-wider text-[#0F1117] transition-colors hover:bg-[#d99535]">
                    Publish ⌘⏎
                  </button>
                  <button className="rounded bg-[#E5A84B] px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#0F1117] transition-colors hover:bg-[#d99535]">
                    Save ⌘S
                  </button>
                  <button className="rounded bg-[#E5A84B] px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[#0F1117] transition-colors hover:bg-[#d99535]">
                    Add ⌘K
                  </button>
                  <button className="cursor-not-allowed rounded bg-[#2A2F3F] px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#6B6966]" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div className="space-y-4">
                <h3 className="font-mono text-xl font-semibold uppercase leading-snug tracking-tight">Secondary</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded border border-[#E5A84B] bg-transparent px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#E5A84B] transition-colors hover:bg-[#1A1D28]">
                    Preview
                  </button>
                  <button className="rounded border border-[#E5A84B] bg-transparent px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#E5A84B] transition-colors hover:bg-[#1A1D28]">
                    History
                  </button>
                  <button className="cursor-not-allowed rounded border border-[#2A2F3F] bg-transparent px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#6B6966]" disabled>
                    Disabled
                  </button>
                </div>
              </div>

              {/* Ghost Buttons */}
              <div className="space-y-4">
                <h3 className="font-mono text-xl font-semibold uppercase leading-snug tracking-tight">Ghost</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#E5A84B] transition-colors hover:bg-[#1A1D28]">
                    Cancel
                  </button>
                  <button className="rounded px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#6B9BD2] transition-colors hover:bg-[#1A1D28]">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Destructive */}
              <div className="space-y-4">
                <h3 className="font-mono text-xl font-semibold uppercase leading-snug tracking-tight">Destructive</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="rounded bg-[#E85C4B] px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#0F1117] transition-colors hover:bg-[#d54a39]">
                    Delete
                  </button>
                  <button className="rounded border border-[#E85C4B] bg-transparent px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#E85C4B] transition-colors hover:bg-[#1A1D28]">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Form Inputs
            </h2>

            <div className="space-y-6 rounded border border-[#2A2F3F] bg-[#1A1D28] p-6">
              {/* Text Input - Default */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Essay Title</label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  className="w-full rounded border border-[#2A2F3F] bg-[#0F1117] px-3 py-2 text-base leading-relaxed text-[#E8E6E3] placeholder-[#6B6966] transition-colors focus:border-[#E5A84B] focus:outline-none"
                />
              </div>

              {/* Text Input - Focus */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">With Focus State</label>
                <input
                  type="text"
                  value="This input shows the focus border"
                  readOnly
                  className="w-full rounded border-2 border-[#E5A84B] bg-[#0F1117] px-3 py-2 text-base leading-relaxed text-[#E8E6E3]"
                />
              </div>

              {/* Text Input - Error */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Title (Required)</label>
                <input
                  type="text"
                  placeholder="Title cannot be empty"
                  className="w-full rounded border border-[#E85C4B] bg-[#0F1117] px-3 py-2 text-base leading-relaxed text-[#E8E6E3] placeholder-[#E85C4B]/50 focus:border-[#E85C4B] focus:outline-none"
                />
                <p className="text-sm text-[#E85C4B]">Please enter a title for your essay</p>
              </div>

              {/* Text Input - Disabled */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider text-[#6B6966]">Disabled Input</label>
                <input
                  type="text"
                  value="This field is disabled"
                  disabled
                  className="w-full cursor-not-allowed rounded border border-[#2A2F3F] bg-[#1A1D28] px-3 py-2 text-base leading-relaxed text-[#6B6966]"
                />
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Essay Content</label>
                <textarea
                  rows={4}
                  placeholder="Write your micro-essay here..."
                  className="w-full rounded border border-[#2A2F3F] bg-[#0F1117] px-3 py-2 text-base leading-relaxed text-[#E8E6E3] placeholder-[#6B6966] transition-colors focus:border-[#E5A84B] focus:outline-none"
                />
              </div>

              {/* Select */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Essay Status</label>
                <select className="w-full rounded border border-[#2A2F3F] bg-[#0F1117] px-3 py-2 text-base leading-relaxed text-[#E8E6E3] transition-colors focus:border-[#E5A84B] focus:outline-none">
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Published</option>
                  <option>Archived</option>
                </select>
              </div>

              {/* Checkbox */}
              <div className="space-y-3">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Preferences</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="check1"
                    className="h-4 w-4 rounded border-[#2A2F3F] bg-[#0F1117] text-[#E5A84B] focus:ring-2 focus:ring-[#E5A84B] focus:ring-offset-0"
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
                    className="h-4 w-4 rounded border-[#2A2F3F] bg-[#0F1117] text-[#E5A84B] focus:ring-2 focus:ring-[#E5A84B] focus:ring-offset-0"
                  />
                  <label htmlFor="check2" className="text-base leading-relaxed">
                    Require evidence for all claims
                  </label>
                </div>
              </div>

              {/* Radio */}
              <div className="space-y-3">
                <label className="block font-mono text-xs font-medium uppercase tracking-wider">Visibility</label>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="radio1"
                    name="visibility"
                    className="h-4 w-4 border-[#2A2F3F] bg-[#0F1117] text-[#E5A84B] focus:ring-2 focus:ring-[#E5A84B] focus:ring-offset-0"
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
                    className="h-4 w-4 border-[#2A2F3F] bg-[#0F1117] text-[#E5A84B] focus:ring-2 focus:ring-[#E5A84B] focus:ring-offset-0"
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
                    className="h-4 w-4 border-[#2A2F3F] bg-[#0F1117] text-[#E5A84B] focus:ring-2 focus:ring-[#E5A84B] focus:ring-offset-0"
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
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Cards
            </h2>

            <div className="space-y-6">
              {/* Essay Card */}
              <div className="rounded border border-[#2A2F3F] bg-[#1A1D28] p-4 transition-colors hover:bg-[#242938]">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-mono text-lg font-medium leading-snug">
                    Why Constraints Create Craft
                  </h3>
                  <span className="rounded-full bg-[#4EC9A0]/20 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-[#4EC9A0]">
                    Published
                  </span>
                </div>
                <p className="mb-4 text-base leading-relaxed text-[#A8A6A3]">
                  Fixed time, variable scope. Word limits force precision. Required counterarguments build
                  intellectual honesty. This essay explores how creative constraints improve outcomes.
                </p>
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[#6B6966]">
                  <span>542 words</span>
                  <span>•</span>
                  <span>3 evidence</span>
                  <span>•</span>
                  <span>Updated 1h ago</span>
                </div>
              </div>

              {/* Evidence Card with Syntax Highlighting */}
              <div className="rounded border border-[#2A2F3F] border-l-[#4DC9B0] border-l-4 bg-[#1A1D28] p-4">
                <div className="mb-3">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#4DC9B0]">Evidence</p>
                  <p className="mt-1 text-sm font-medium">
                    Newport, &quot;Deep Work&quot; (2016)
                  </p>
                </div>
                <blockquote className="border-l-2 border-[#2A2F3F] pl-4 text-base leading-relaxed text-[#A8A6A3]">
                  &quot;The ability to perform deep work is becoming increasingly rare at exactly the same time
                  it is becoming increasingly valuable in our economy. The few who cultivate this skill will
                  thrive.&quot;
                </blockquote>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-[#E5A84B]/20 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-[#E5A84B]">
                    Claim Support
                  </span>
                  <span className="rounded-full bg-[#242938] px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">
                    Productivity
                  </span>
                </div>
              </div>

              {/* Claim Card (Syntax Highlighted) */}
              <div className="rounded border border-[#2A2F3F] border-l-[#E5A84B] border-l-4 bg-[#1A1D28] p-4">
                <div className="mb-2">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#E5A84B]">Claim</p>
                </div>
                <p className="text-base leading-relaxed">
                  Deliberate practice with immediate feedback is the primary driver of expertise across
                  domains, not innate talent or accumulated hours.
                </p>
                <div className="mt-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#6B6966]">
                  <span>2 evidence cards linked</span>
                  <span>•</span>
                  <span>1 counterargument</span>
                </div>
              </div>

              {/* Counterargument Card (Syntax Highlighted) */}
              <div className="rounded border border-[#2A2F3F] border-l-[#D497A7] border-l-4 bg-[#1A1D28] p-4">
                <div className="mb-2">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#D497A7]">Counterargument</p>
                </div>
                <p className="text-base leading-relaxed">
                  What about domains where physical attributes matter? Height in basketball, hand size in
                  piano. Doesn&apos;t this suggest innate constraints on peak performance?
                </p>
                <div className="mt-3">
                  <button className="font-mono text-xs font-medium uppercase tracking-wider text-[#6B9BD2] hover:text-[#8BB2E0]">
                    View Response →
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Total Essays</p>
                  <p className="mt-2 font-mono text-3xl font-bold leading-tight tracking-tight">
                    37
                  </p>
                </div>
                <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Evidence Cards</p>
                  <p className="mt-2 font-mono text-3xl font-bold leading-tight tracking-tight">
                    142
                  </p>
                </div>
                <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4">
                  <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Streak</p>
                  <p className="mt-2 font-mono text-3xl font-bold leading-tight tracking-tight">
                    19 days
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation: Tab Bar Pattern */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Navigation: Tab Bar
            </h2>

            <div className="overflow-hidden rounded border border-[#2A2F3F]">
              <div className="flex items-center justify-between border-b border-[#2A2F3F] bg-[#1A1D28] px-4 py-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    <button className="rounded border-b-2 border-[#E5A84B] px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#E8E6E3]">
                      Editor
                    </button>
                    <button className="rounded px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                      Evidence
                    </button>
                    <button className="rounded px-4 py-2 font-mono text-sm font-medium uppercase tracking-wider text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                      Published
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="rounded p-2 text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <div className="h-7 w-7 rounded-full bg-[#E5A84B]"></div>
                </div>
              </div>
              <div className="bg-[#0F1117] p-8 text-center text-[#6B6966]">
                Page content would appear here
              </div>
            </div>
          </section>

          {/* Command Palette Mock */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Command Palette (⌘K)
            </h2>

            <div className="relative">
              {/* Overlay backdrop */}
              <div className="rounded bg-black/60 p-12">
                {/* Command Palette Box */}
                <div className="mx-auto max-w-2xl rounded border border-[#3A405A] bg-[#1A1D28]">
                  {/* Search Input */}
                  <div className="border-b border-[#2A2F3F] p-4">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-[#E5A84B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search essays, commands, navigation..."
                        className="flex-1 border-0 bg-transparent text-base text-[#E8E6E3] placeholder-[#6B6966] focus:outline-none"
                      />
                      <span className="font-mono text-xs uppercase tracking-wider text-[#6B6966]">esc</span>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="p-2">
                    <div className="mb-2 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-[#6B6966]">
                      Recent Essays
                    </div>
                    <button className="w-full rounded bg-[#242938] px-3 py-2 text-left transition-colors hover:bg-[#2E3448]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">Why Constraints Create Craft</p>
                          <p className="font-mono text-xs text-[#6B6966]">Draft • 542 words • 1h ago</p>
                        </div>
                        <span className="font-mono text-xs text-[#E5A84B]">⏎</span>
                      </div>
                    </button>
                    <button className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-[#242938]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">Practice Beats Talent</p>
                          <p className="font-mono text-xs text-[#6B6966]">Published • 647 words • 3d ago</p>
                        </div>
                      </div>
                    </button>

                    <div className="mb-2 mt-4 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-[#6B6966]">
                      Actions
                    </div>
                    <button className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-[#242938]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">New Essay</p>
                          <p className="font-mono text-xs text-[#6B6966]">Create a new micro-essay</p>
                        </div>
                        <span className="font-mono text-xs text-[#6B6966]">⌘N</span>
                      </div>
                    </button>
                    <button className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-[#242938]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">Add Evidence Card</p>
                          <p className="font-mono text-xs text-[#6B6966]">Link a new source</p>
                        </div>
                        <span className="font-mono text-xs text-[#6B6966]">⌘E</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Editor Mock with Syntax Highlighting */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Editor with Syntax-Highlighted Arguments
            </h2>

            <div className="overflow-hidden rounded border border-[#2A2F3F]">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-[#2A2F3F] bg-[#1A1D28] px-4 py-2">
                <div className="flex items-center gap-2">
                  <button className="rounded p-2 text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button className="rounded p-2 text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <div className="mx-1 h-4 w-px bg-[#2A2F3F]"></div>
                  <button className="rounded p-2 text-[#A8A6A3] transition-colors hover:bg-[#242938] hover:text-[#E8E6E3]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#6B6966]">Saved 15s ago</span>
                  <button className="rounded border border-[#E5A84B] bg-transparent px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[#E5A84B] transition-colors hover:bg-[#1A1D28]">
                    Preview
                  </button>
                  <button className="rounded bg-[#E5A84B] px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[#0F1117] transition-colors hover:bg-[#d99535]">
                    Publish ⌘⏎
                  </button>
                </div>
              </div>

              {/* Editor Content with Syntax Highlighting */}
              <div className="bg-[#0F1117] p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                  {/* Title with Git-Style Gutter */}
                  <div className="flex gap-4">
                    <div className="flex w-8 flex-col items-center gap-2 pt-2">
                      <div className="h-2 w-2 rounded-full bg-[#4EC9A0]"></div>
                      <div className="w-px flex-1 bg-[#2A2F3F]"></div>
                    </div>
                    <input
                      type="text"
                      value="Deliberate Practice Over Innate Talent"
                      readOnly
                      className="flex-1 border-0 bg-transparent font-mono text-2xl font-bold leading-tight tracking-tight text-[#E8E6E3] focus:outline-none focus:ring-1 focus:ring-[#E5A84B]"
                    />
                  </div>

                  {/* Word Count */}
                  <div className="flex items-center gap-3 pl-12 font-mono text-xs uppercase tracking-wider text-[#6B6966]">
                    <span>423 words</span>
                    <span>•</span>
                    <span className="text-[#E5A84B]">Target: 400-600</span>
                    <span>•</span>
                    <span>2m read</span>
                  </div>

                  {/* Content with Syntax Highlighting */}
                  <div className="space-y-4 pl-12 text-base leading-relaxed">
                    {/* Paragraph with Claim Highlight */}
                    <div className="flex gap-4">
                      <div className="flex w-8 flex-col items-center gap-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-[#E5A84B]"></div>
                      </div>
                      <p className="-ml-12 flex-1 rounded border-l-2 border-[#E5A84B] bg-[#E5A84B]/10 py-2 pl-10 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="rounded bg-[#E5A84B]/30 px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-[#E5A84B]">
                            Claim
                          </span>
                        </span>
                        <br />
                        The research is clear: deliberate practice with immediate feedback — not innate
                        talent — is the primary driver of expertise across domains.
                      </p>
                    </div>

                    {/* Paragraph with Evidence Reference */}
                    <div className="flex gap-4">
                      <div className="flex w-8 flex-col items-center gap-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-[#4DC9B0]"></div>
                      </div>
                      <p className="-ml-12 flex-1 py-2 pl-10 pr-4">
                        Anders Ericsson&apos;s decades of work on expert performance shows that what we call
                        &quot;natural ability&quot; is often just accumulated practice that started early{' '}
                        <span className="rounded bg-[#4DC9B0]/20 px-1.5 py-0.5 font-mono text-xs font-medium text-[#4DC9B0]">
                          [1]
                        </span>
                        . The distinguishing feature isn&apos;t volume — it&apos;s feedback quality and adjustment speed.
                      </p>
                    </div>

                    {/* Counterargument Highlight */}
                    <div className="flex gap-4">
                      <div className="flex w-8 flex-col items-center gap-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-[#D497A7]"></div>
                      </div>
                      <div className="-ml-12 flex-1 rounded border-l-2 border-[#D497A7] bg-[#D497A7]/10 py-2 pl-10 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="rounded bg-[#D497A7]/30 px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-[#D497A7]">
                            Counterargument
                          </span>
                        </span>
                        <br />
                        But what about domains where physical attributes matter? Height in basketball, hand
                        size in piano. Don&apos;t these suggest innate constraints on peak performance?
                      </div>
                    </div>

                    {/* Response Paragraph */}
                    <div className="flex gap-4">
                      <div className="flex w-8 flex-col items-center gap-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-[#6B6966]"></div>
                      </div>
                      <p className="-ml-12 flex-1 py-2 pl-10 pr-4">
                        Yes — but the constraint operates at the extremes. For 99% of practitioners, the
                        bottleneck isn&apos;t physical traits, it&apos;s deliberate practice quality. Even in sports...
                      </p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="ml-12 rounded border border-[#2A2F3F] bg-[#1A1D28] p-4">
                    <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider">Publishing Checklist</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-[#2A2F3F] text-[#E5A84B]" />
                        <span className="text-sm text-[#6B6966] line-through">Word count 400-600</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-[#2A2F3F] text-[#E5A84B]" />
                        <span className="text-sm text-[#6B6966] line-through">At least 2 evidence cards</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-[#2A2F3F] text-[#E5A84B]" />
                        <span className="text-sm text-[#6B6966] line-through">Counterargument addressed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex h-8 items-center justify-between border-t border-[#2A2F3F] bg-[#1A1D28] px-4 font-mono text-xs uppercase tracking-wider text-[#6B6966]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#4EC9A0]"></span>
                    <span>Draft</span>
                  </span>
                  <span>423 words</span>
                  <span>2m read</span>
                  <span className="text-[#E5A84B]">3 claims</span>
                  <span className="text-[#4DC9B0]">2 evidence</span>
                  <span className="text-[#D497A7]">1 counter</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>⌘K Command</span>
                  <span>⌘S Save</span>
                  <span>⌘⏎ Publish</span>
                </div>
              </div>
            </div>
          </section>

          {/* Responsive Layout Demo */}
          <section className="space-y-6">
            <h2 className="font-mono text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
              Responsive Layout
            </h2>
            <p className="text-base leading-relaxed text-[#A8A6A3]">
              This entire page demonstrates responsive behavior. Typography scales, grids reflow, and the
              status bar adapts. The terminal aesthetic maintains its precision at all viewport sizes.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4 text-center">
                <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Mobile</p>
                <p className="mt-1 font-mono text-xs text-[#6B6966]">Single column</p>
              </div>
              <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4 text-center">
                <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Tablet</p>
                <p className="mt-1 font-mono text-xs text-[#6B6966]">Two columns</p>
              </div>
              <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4 text-center">
                <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Desktop</p>
                <p className="mt-1 font-mono text-xs text-[#6B6966]">Four columns</p>
              </div>
              <div className="rounded-none border border-[#2A2F3F] bg-[#1A1D28] p-4 text-center">
                <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#A8A6A3]">Wide</p>
                <p className="mt-1 font-mono text-xs text-[#6B6966]">Max 1536px</p>
              </div>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-[#2A2F3F] bg-[#0F1117] px-4 py-8 text-center md:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-wider text-[#6B6966]">
            Noir Terminal Design Kit — A Writer&apos;s Cockpit
          </p>
        </footer>

      </div>
    </div>
  );
}
