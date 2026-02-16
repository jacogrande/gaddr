# Kit: Ink and Paper

## Aesthetic

Stripped to the absolute essentials, like writing with a good pen on quality paper. Near-monochrome with a barely-there warm undertone. The interface disappears so the writing can breathe. Brutalist minimalism softened by warmth.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex Value | Usage |
|-------|---------------|-----------|--------|
| Paper | `bg-[#FDFCFA]` | #FDFCFA | Page background, surface |
| Ink | `text-black` | #000000 | Primary text, headings |
| Charcoal | `text-gray-800` | #1F2937 | Body text, slightly softer than ink |
| Graphite | `text-gray-600` | #4B5563 | Secondary text, labels |
| Ash | `text-gray-400` | #9CA3AF | Tertiary text, placeholders |
| Smoke | `border-gray-200` | #E5E7EB | Borders, dividers |
| Terracotta | `text-[#C05A3C]` | #C05A3C | Primary action, accent (used sparingly) |
| Terracotta Dark | `text-[#A04A2F]` | #A04A2F | Hover state for terracotta |
| Success | `text-green-700` | #15803D | Semantic success |
| Warning | `text-amber-700` | #B45309 | Semantic warning |
| Error | `text-red-700` | #B91C1C | Semantic error |

### Typography

**Font:** Newsreader (Google Font, serif) for all text. Weight variation creates hierarchy.

**Type Scale:**

| Element | Size | Weight | Line Height | Letter Spacing | Classes |
|---------|------|--------|-------------|----------------|---------|
| H1 | 2.5rem (40px) | 400 (Regular) | 1.2 | -0.02em | `text-[40px] font-normal leading-tight tracking-tight` |
| H2 | 2rem (32px) | 500 (Medium) | 1.25 | -0.01em | `text-[32px] font-medium leading-tight tracking-tight` |
| H3 | 1.5rem (24px) | 500 (Medium) | 1.3 | 0 | `text-2xl font-medium leading-snug` |
| H4 | 1.25rem (20px) | 500 (Medium) | 1.4 | 0 | `text-xl font-medium leading-normal` |
| Body | 1.125rem (18px) | 400 (Regular) | 1.7 | 0 | `text-lg font-normal leading-relaxed` |
| Small | 1rem (16px) | 400 (Regular) | 1.6 | 0 | `text-base font-normal leading-normal` |
| Caption | 0.875rem (14px) | 400 (Regular) | 1.5 | 0.01em | `text-sm font-normal leading-normal tracking-wide` |

**Philosophy:** Larger base text (18px body) for comfortable long-form reading. Generous line height (1.7) mimics well-typeset print. Minimal weight variation — let size and spacing do the work.

### Spacing

**Base unit:** 4px (Tailwind default)

**Component spacing:**
- Button padding: `px-6 py-3` (24px horizontal, 12px vertical)
- Input padding: `px-4 py-3` (16px horizontal, 12px vertical)
- Card padding: `p-8` (32px all sides)
- Page gutter: `px-6 md:px-12` (24px mobile, 48px desktop)
- Content max-width: `max-w-2xl` (672px) — narrow column for focused reading
- Section gap: `space-y-16` (64px between major sections)
- Element gap: `space-y-4` (16px between related elements)

**Philosophy:** Maximum whitespace. Content breathes. The page should feel 60% empty space.

### Borders & Corners

**Radius:** `rounded-none` everywhere. Sharp, honest, direct.

**Borders:**
- Default width: 1px
- Color: `border-gray-200` (smoke)
- Style: Underlines for inputs, top/bottom for dividers, full for cards

**Shadows:** None. Depth through spacing and borders only.

**Philosophy:** Brutalist honesty. No soft edges, no faux depth. The interface is what it is.

## Component Patterns

### Buttons

**Primary (Terracotta):**
- `bg-[#C05A3C] text-white px-6 py-3 hover:bg-[#A04A2F] transition-colors duration-200`
- Used for main actions: Publish, Save, Submit

**Secondary (Outlined):**
- `border border-gray-800 text-gray-800 px-6 py-3 hover:bg-gray-800 hover:text-white transition-colors duration-200`
- Used for secondary actions: Cancel, Back, Preview

**Ghost:**
- `text-gray-800 px-6 py-3 hover:bg-gray-100 transition-colors duration-200`
- Used for tertiary actions in toolbars

**Disabled:**
- Reduce opacity to 40%, no hover state

### Form Inputs

**Text input / Textarea:**
- `border-b border-gray-200 px-4 py-3 focus:border-black focus:outline-none transition-colors duration-200`
- Underline only — minimal, paper-like
- Placeholder in `text-gray-400`

**Focus state:** Border changes from smoke to ink

**Error state:** Border changes to `border-red-700`, helper text in red

**Disabled:** Background in `bg-gray-50`, text in `text-gray-400`

### Cards

**Default:**
- `border border-gray-200 p-8 bg-[#FDFCFA]`
- Sharp corners, single-pixel border, generous padding

**Evidence card:**
- Same border, add `border-l-4 border-l-gray-800` for emphasis
- Source in caption size, quote in body size

### Navigation

**Top nav:**
- Minimal horizontal bar
- Logo/name on left (black text)
- Nav links in graphite, hover to ink
- User actions on right
- Thin bottom border in smoke

**Philosophy:** Navigation should be invisible until needed. No background color, no shadow, just a whisper of structure.

### Editor (Core Screen)

**Layout:**
- Full-height single column
- Title input: Larger text (32px), no visible border until focus
- Content area: 18px body text, 1.7 line height, grows with content
- Toolbar: Top or side, ghost buttons, icons + labels
- Checklist/feedback: Right sidebar on desktop, collapsible on mobile

**Philosophy:** The editor is the soul of the product. It should feel like opening a notebook — no chrome, no distraction, just you and the page.

## Rationale

This aesthetic embodies the product's core philosophy: writing gym, not writing machine. The near-monochrome palette and serif typography evoke timeless tools for thinking — the notebook, the broadsheet, the manuscript. Sharp corners and minimal decoration signal honesty: no gamification, no faux reward animations, just the work. Generous spacing and a narrow content column create focus and reduce cognitive load, critical for a tool designed for continuous learning and deliberate practice. The single warm accent (terracotta) provides just enough energy to signal action without breaking the meditative quality. This kit doesn't try to wow or entertain — it gets out of the way so the user's thinking can take center stage. It's a digital writing desk: sturdy, functional, and quietly beautiful.
