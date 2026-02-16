# Design Kit

A serious editorial workspace with tangible, physical-feeling UI elements. Playfair Display typography and high-contrast black-and-white create structural authority. Hard drop shadows, heavy borders, and handwritten coaching annotations add substance and personality. This is a letterpress broadsheet you can touch — graphic and disciplined, yet crafted and human.

## Sources

This design system synthesizes **Pressed Type** (foundation) with selective personality elements from **Collage Board**:

### FROM PRESSED TYPE (the foundation — retained in full):
- Typography: Playfair Display (headings, 600/700 weight) + Inter (body/UI)
- Color palette: High-contrast black/white + single warm accent (brick red #B74134)
- Warm white background: #FAFAF8 for page, true white for cards
- Sharp containers: `rounded-none` on cards and major structural elements
- Pill primary buttons: `rounded-full` for primary CTAs, `rounded-md` for secondary
- `border-t-4` structural pattern on essay cards
- Tight grid discipline and strong vertical rhythm
- Editorial restraint — the type does the heavy lifting
- H1 at 48px, weight 700 (not the original 60px/900 — already refined)

### FROM COLLAGE BOARD (cherry-picked personality elements):
1. **Hard drop shadows** — The BIG addition: `shadow-[4px_4px_0px_#1A1A1A]` on cards and interactive elements (hover: `shadow-[6px_6px_0px_#1A1A1A]`). Makes everything feel tangible — like paper on a surface.
2. **Rubber stamp badges** for essay status — Rotated stamp badges (DRAFT, PUBLISHED, IN REVIEW) with heavy 3px borders and slight rotation (2-3 degrees). Used ONLY for status indicators.
3. **Caveat handwriting font** for coaching annotations ONLY — Creates a "professor's red pen" feeling. Used exclusively for inline coaching margin notes. NEVER for UI elements, headings, or body text.
4. **Heavy 2px borders** — `border-2` (2px) as default instead of `border` (1px). Makes everything feel more substantial and graphic.

### EXPLICITLY EXCLUDED from Collage Board:
- NO rotated/angled cards — No `rotate-1`, `-rotate-1` etc. All cards stay perfectly aligned on the grid
- NO pushpin accents — No fake pushpin dots on cards
- NO multi-color palette — No navy/coral/yellow/sage. Keep the single brick-red accent
- NO Fraunces font — Keep Playfair Display, not Fraunces
- NO all-caps headings — Keep sentence case/title case, not Bauhaus all-caps
- NO grid construction marks (background dots) — Too playful
- NO overlapping cards with negative margins — Too chaotic
- NO color block sections — Keep the restrained black/white approach

## Color Palette

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| primary | `bg-[#B74134]` / `text-[#B74134]` | #B74134 | Main actions, links, active states — brick red (warm, editorial, not urgent) |
| primary-hover | `bg-[#9A3329]` / `hover:bg-[#9A3329]` | #9A3329 | Hover state for primary elements |
| primary-light | `bg-[#FFF5F3]` / `text-[#FFF5F3]` | #FFF5F3 | Subtle accent backgrounds, coaching annotation backgrounds |
| surface | `bg-[#FAFAF8]` | #FAFAF8 | Page background — very subtle warm white |
| surface-raised | `bg-white` | #FFFFFF | Card backgrounds, elevated elements — true white for contrast |
| neutral-900 | `text-black` / `bg-black` | #000000 | Primary text, headings — pure black for maximum contrast |
| neutral-950 | `text-[#1A1A1A]` / `bg-[#1A1A1A]` | #1A1A1A | Hard drop shadows (ink black from Collage Board) |
| neutral-800 | `text-zinc-800` | #27272a | Secondary headings, strong labels |
| neutral-600 | `text-zinc-600` | #52525b | Body text in UI contexts, captions |
| neutral-400 | `text-zinc-400` | #a1a1aa | Placeholder text, deemphasized text |
| neutral-200 | `border-zinc-200` | #e4e4e7 | Borders, dividers |
| neutral-100 | `bg-zinc-100` | #f4f4f5 | Subtle backgrounds, disabled states |
| success | `bg-emerald-50` / `text-emerald-800` / `border-emerald-200` | #ecfdf5 / #065f46 / #a7f3d0 | Success states, published status |
| warning | `bg-amber-50` / `text-amber-900` / `border-amber-200` | #fffbeb / #78350f / #fde68a | Warning states, draft reminders |
| error | `bg-red-50` / `text-red-800` / `border-red-200` | #fef2f2 / #991b1b / #fecaca | Error states, destructive actions |
| info | `bg-sky-50` / `text-sky-800` / `border-sky-200` | #f0f9ff / #075985 / #bae6fd | Informational states, tips |

**Philosophy:** High-contrast black-and-white foundation preserves Pressed Type's graphic quality. Brick red (#B74134) for actions — warm, editorial, and confident without signaling urgency. Ink black (#1A1A1A) for hard drop shadows adds physicality borrowed from Collage Board.

## Typography

### Font Stack
- **Headings/Display:** Playfair Display (serif, Google Fonts) — weights 600, 700
- **Body/UI:** Inter (sans-serif, Google Fonts) — weights 400, 500, 600
- **Coaching Annotations:** Caveat (handwriting, Google Fonts) — weight 400, 600 — used ONLY for margin notes, never for UI
- **Code:** System monospace stack (`font-mono`)

Loaded via `next/font/google` with CSS variables:
```typescript
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-serif' })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' })
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-handwriting' })
```

### Type Scale

| Level | Tailwind Classes | Usage |
|-------|-----------------|-------|
| Display | `[font-family:var(--font-serif)] text-5xl md:text-6xl font-bold tracking-tight leading-tight` | Hero headlines, landing page (48px/60px responsive) |
| H1 | `[font-family:var(--font-serif)] text-4xl md:text-5xl font-bold tracking-tight leading-tight` | Page titles (36px/48px responsive) |
| H2 | `[font-family:var(--font-serif)] text-3xl font-bold tracking-tight leading-tight` | Section headers (30px) |
| H3 | `[font-family:var(--font-serif)] text-2xl font-bold tracking-tight leading-snug` | Subsection headers, card titles (24px) |
| H4 | `text-xl font-semibold leading-snug` | Minor headers, labels (20px) |
| Body (Editor) | `text-lg leading-relaxed` | Editor content area (18px, 1.7 line height) |
| Body | `text-base leading-relaxed` | Default paragraph text (16px, 1.625 line height) |
| Body Small | `text-sm leading-normal` | Captions, helper text (14px) |
| Caption | `text-xs tracking-wide leading-normal` | Metadata, timestamps (12px) |
| Code | `font-mono text-sm` | Inline code, technical content (14px) |
| Coaching Annotation | `[font-family:var(--font-handwriting)] text-lg leading-relaxed` | Inline coaching margin notes ONLY (18px, Caveat) |
| Stamp Text | `text-xs font-black uppercase tracking-wider` | Rubber stamp badges (12px, all-caps, heavy weight) |

**Key refinements:** H1 at 48px (not 60px), weight 700 (not 900). Caveat handwriting font added for coaching annotations only — creates "professor's red pen" effect in brick red.

### Reading Comfort

- **Line length target:** 65ch max-width for long-form content (`max-w-prose` or `max-w-2xl`)
- **Editor line height:** 1.7 (leading-relaxed) — superior for sustained writing
- **Paragraph spacing:** `space-y-4` (16px) for body text blocks
- **Heading margins:** `mb-4` after headings, `mt-8` before section headings

## Spacing

### Base Unit
4px (Tailwind default)

### Component Spacing

| Context | Tailwind Class | Value | Usage |
|---------|---------------|-------|-------|
| Button padding (sm) | `px-4 py-2` | 16px × 8px | Small buttons, tags |
| Button padding (md) | `px-6 py-3` | 24px × 12px | Default buttons |
| Button padding (lg) | `px-8 py-4` | 32px × 16px | Hero CTAs, primary actions |
| Input padding | `px-4 py-3` | 16px × 12px | Text inputs, selects |
| Textarea padding | `px-4 py-3` | 16px × 12px | Multi-line inputs |
| Card padding (standard) | `p-6` | 24px | Default cards |
| Card padding (featured) | `p-8` | 32px | Featured cards, editor surface |
| Section gap | `space-y-12` | 48px | Between major sections |
| Element gap | `space-y-4` | 16px | Between related elements |
| Tight gap | `space-y-2` / `gap-2` | 8px | Form field groups |
| Comfortable gap | `gap-6` | 24px | Card grids, flex layouts |
| Page gutter | `px-6 md:px-12 lg:px-24` | 24px/48px/96px | Page edge padding (responsive) |
| Max content width | `max-w-2xl` | 672px | Editor and long-form content |
| Max layout width | `max-w-7xl` | 1280px | Page container |

## Borders & Corners

| Element | Border Radius | Border | Shadow |
|---------|--------------|--------|--------|
| Containers/Cards | `rounded-none` (sharp) | `border-2 border-zinc-200` (heavy 2px from Collage Board) | Hard drop shadow: `shadow-[4px_4px_0px_#1A1A1A]` |
| Buttons (primary) | `rounded-full` (pill) | none | Hard shadow: `shadow-[4px_4px_0px_#1A1A1A]` hover: `shadow-[6px_6px_0px_#1A1A1A]` |
| Buttons (secondary) | `rounded-md` (6px) | `border-2 border-black` (heavy 2px) | none |
| Inputs | `rounded-md` (6px) | `border-2 border-zinc-200` (heavy 2px) | Focus: hard shadow `shadow-[4px_4px_0px_#1A1A1A]` |
| Form elements | `rounded-md` (6px) | varies | none |
| Modals | `rounded-lg` (8px) | none | Hard shadow: `shadow-[8px_8px_0px_#1A1A1A]` |
| Avatars | `rounded-full` | none | none |
| Stamp Badges | `rounded` (4px) | `border-[3px]` (3px from Collage Board) | Hard shadow: `shadow-[3px_3px_0px_#1A1A1A]` |
| Tags (standard) | `rounded-full` | `border` | none |
| Code inline | `rounded` (4px) | none | none |

**Three-tier corner system:**
1. **Sharp corners (rounded-none):** Major containers, cards, structural elements — signature brutalist element
2. **Rounded-md (6px):** Inputs and form elements — adds comfort for daily use
3. **Pill shape (rounded-full):** Primary CTAs only — creates deliberate contrast and hierarchy

**Border philosophy:** Default to `border-2` (2px) instead of `border` (1px) — borrowed from Collage Board. Makes everything feel more substantial and graphic.

**Shadow philosophy:** Hard drop shadows `shadow-[4px_4px_0px_#1A1A1A]` make UI elements feel tangible — like paper on a surface. This is THE defining visual addition from Collage Board. Hover states increase shadow to `shadow-[6px_6px_0px_#1A1A1A]`.

## Interactive States

| State | Pattern | Example |
|-------|---------|---------|
| Hover | Background color change or shadow increase | Primary buttons: `hover:bg-[#9A3329]`, Cards: `hover:shadow-[6px_6px_0px_#1A1A1A]` |
| Focus | Brick red ring with offset OR hard shadow | Inputs: `focus:border-[#B74134] focus:shadow-[4px_4px_0px_#1A1A1A]` |
| Focus (editor) | Subtle border change only | `focus:border-[#B74134]` (no ring — less distracting during writing) |
| Active | Darker color, shadow flattens | `active:bg-[#7F2619] active:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px]` |
| Disabled | 40% opacity, no hover | `disabled:opacity-40 disabled:cursor-not-allowed` |
| Loading | Brick spinner | Brick red `animate-spin` border on transparent background |
| Error | Red border and hard shadow | `border-red-200 focus:border-red-500 focus:shadow-[4px_4px_0px_#1A1A1A]` |

**Transitions:**
- Color changes: `transition-colors duration-200 ease-out`
- Shadow changes: `transition-shadow duration-200 ease-out` (for card hovers)
- Layout shifts: `transition-all duration-200 ease-in-out`

## Component Patterns

### Buttons

**Primary (pill shape, brick red, hard shadow):**
```
rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white
shadow-[4px_4px_0px_#1A1A1A] hover:bg-[#9A3329] hover:shadow-[6px_6px_0px_#1A1A1A]
active:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px]
transition-all duration-200
```

**Secondary (rounded-md, black outline, heavy border):**
```
rounded-md border-2 border-black bg-white px-6 py-3 text-sm font-semibold
text-black hover:bg-black hover:text-white transition-colors duration-200
```

**Ghost:**
```
rounded-md px-6 py-3 text-sm font-semibold text-zinc-800
hover:bg-zinc-100 transition-colors duration-200
```

**Destructive:**
```
rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white
shadow-[4px_4px_0px_#1A1A1A] hover:bg-red-700 hover:shadow-[6px_6px_0px_#1A1A1A]
transition-all duration-200
```

### Form Inputs

**Text input (heavy border, hard shadow on focus):**
```
w-full rounded-md border-2 border-zinc-200 bg-white px-4 py-3
text-base text-black placeholder:text-zinc-400
focus:border-[#B74134] focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A]
transition-all duration-200
```

**Textarea:**
```
Same as text input, add: resize-none min-h-[120px]
```

**Title input (editor — underline only):**
```
w-full border-0 border-b-2 border-zinc-200 bg-transparent
px-0 py-3 [font-family:var(--font-serif)] text-3xl font-bold text-black
placeholder:text-zinc-400 focus:border-[#B74134] focus:outline-none
focus:ring-0 transition-colors duration-200
```

**Label:**
```
text-sm font-semibold text-black mb-2 block
```

**Helper text:**
```
text-sm text-zinc-600 mt-1.5
```

**Error message:**
```
text-sm text-red-800 mt-1.5
```

### Cards

**Standard card (sharp corners, heavy border, hard shadow):**
```
border-2 border-zinc-200 bg-white p-6
shadow-[4px_4px_0px_#1A1A1A]
hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200
```

**Featured card (editor surface, generous padding):**
```
border-2 border-zinc-200 bg-white p-8
shadow-[6px_6px_0px_#1A1A1A]
```

**Evidence card (thick left border, NO rotation):**
```
border-2 border-zinc-200 border-l-4 border-l-[#B74134]
bg-white p-6 shadow-[4px_4px_0px_#1A1A1A]
hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200
```

**Essay card (with top border, Pressed Type pattern):**
```
border-t-4 border-t-black bg-white p-6
shadow-[4px_4px_0px_#1A1A1A]
hover:shadow-[6px_6px_0px_#1A1A1A] transition-shadow duration-200
```

**Stamp Badge (rotated, heavy border, hard shadow):**
```html
<div class="inline-block rotate-2">
  <span class="inline-block border-[3px] border-black px-3 py-1 rounded
    text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-900
    shadow-[3px_3px_0px_#1A1A1A]">
    DRAFT
  </span>
</div>
```

Variants:
- DRAFT: `bg-amber-50 text-amber-900 border-amber-900 rotate-2`
- PUBLISHED: `bg-emerald-50 text-emerald-900 border-emerald-900 -rotate-2`
- IN REVIEW: `bg-sky-50 text-sky-900 border-sky-900 rotate-3`

### Navigation

**Top nav:**
```
bg-[#FAFAF8] border-b-2 border-black
Container: max-w-7xl mx-auto px-6 md:px-12 lg:px-24
Height: h-16 (64px)
```

**Logo/site name:**
```
[font-family:var(--font-serif)] text-xl font-bold text-black tracking-tight
```

**Nav links:**
```
Default: text-sm font-semibold text-zinc-800 hover:text-black
Active: text-black underline decoration-2 underline-offset-4
Transition: transition-colors duration-150
```

### Editor-Specific

**Editor container (hard shadow):**
```
border-2 border-zinc-200 bg-white p-8
shadow-[6px_6px_0px_#1A1A1A]
min-h-[600px]
```

**Editor content area (where user types):**
```
text-lg leading-relaxed text-black
max-w-prose mx-auto
Focus: focus:outline-none (no visible focus ring during writing)
```

**Toolbar:**
```
bg-white border-b-2 border-zinc-200 px-6 py-3
Buttons: ghost style, grouped with gap-2, vertical dividers between groups
Icons: text-zinc-600, active state text-[#B74134]
```

**Inline comment (LLM coaching annotation with handwriting):**
```html
<!-- Highlighted text in content -->
<mark class="bg-[#FFF5F3] border-b-2 border-[#B74134]">
  {user's text being commented on}
</mark>

<!-- Margin annotation with handwriting font -->
<div class="border-l-4 border-[#B74134] bg-[#FFF5F3] p-4
  shadow-[4px_4px_0px_#1A1A1A]">
  <div class="flex items-start gap-2">
    <CommentIcon class="h-5 w-5 text-[#B74134] flex-shrink-0" />
    <div class="text-sm">
      <p class="[font-family:var(--font-handwriting)] text-lg text-[#B74134] mb-1">
        Coach feedback
      </p>
      <p class="text-zinc-800">{comment content}</p>
    </div>
  </div>
</div>
```

**Checklist panel:**
```
border-l-2 border-zinc-200 bg-zinc-50 p-6
Checkbox: completed items text-zinc-500 line-through
Active item: bg-[#FFF5F3] border-l-2 border-l-[#B74134]
```

**Word count / metadata display:**
```
text-sm text-zinc-600 font-medium
Separator between items: " · " (middot)
Example: "347 words · 2 min read · Draft"
```

### Structural Elements

**Page container:**
```
max-w-7xl mx-auto px-6 md:px-12 lg:px-24
```

**Content column (editor, essays):**
```
max-w-2xl mx-auto
```

**Section header with border-top (from Pressed Type):**
```
border-t-4 border-black pt-6
```

**Code/monospace:**
```
Inline: font-mono text-sm bg-zinc-100 text-black px-2 py-0.5 rounded
Block: font-mono text-sm bg-zinc-50 border-2 border-zinc-200 p-4
```

## Layout

### Breakpoints
Mobile-first responsive strategy using Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Page Layouts

**Editor (core screen):**
```
Desktop: sidebar (250px fixed) + main content (flex-1, max-w-4xl)
Tablet: collapsible sidebar, full-width content when collapsed
Mobile: stacked, sidebar becomes bottom sheet or separate view
```

**Library (essay grid):**
```
Desktop: 3-column grid (grid-cols-3, gap-6)
Tablet: 2-column grid (md:grid-cols-2)
Mobile: single column (grid-cols-1)
```

**Publish (reading view):**
```
Single column, max-w-2xl, centered
Evidence and objections: expandable sections or sidebar on desktop
Mobile: linear stacked layout
```

### Grid System
- **Card grids:** CSS Grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`)
- **Form layouts:** Flexbox with vertical stacking and gap-4
- **Two-column splits:** CSS Grid (`grid grid-cols-1 lg:grid-cols-2 gap-8`)
- **Sidebar + content:** Flexbox or Grid with fixed sidebar and flexible content area

## Design Principles (for LLM Judge Reference)

These principles guide the aesthetic and should be used to evaluate design consistency:

1. **Typographic authority without aggression:** Playfair Display creates clear hierarchy and editorial confidence, but scaled to 48px (not 60px) and weight 700 (not 900) to avoid performance pressure.

2. **High contrast for focus:** Black text on white surfaces with minimal color creates absolute clarity. The design doesn't whisper — it speaks clearly and directly.

3. **Tangible UI elements:** Hard drop shadows (`shadow-[4px_4px_0px_#1A1A1A]`) make every element feel physical — like paper on a surface. This is the signature visual element borrowed from Collage Board.

4. **Heavy borders for substance:** 2px borders by default (instead of 1px) make everything feel more graphic and substantial. Borrowed from Collage Board's bold approach.

5. **Brick red, not alarm red:** The accent color (#B74134) is warm and editorial (think literary journals, not error messages). It signals action without urgency.

6. **Sharp corners with intentional exceptions:** Containers and cards stay sharp (signature brutalist element), but inputs get rounded-md for daily comfort, and primary buttons get pill shape for hierarchy.

7. **Handwritten coaching annotations:** Caveat font in brick red for margin notes ONLY — creates "professor's red pen" effect. This adds humanity to the coaching model without undermining the editorial discipline.

8. **Stamp badges for status:** Rubber stamp badges (rotated 2-3 degrees, 3px border, hard shadow) for essay status — small, contained, memorable. Used sparingly for status markers only.

9. **Generous breathing room for practice:** Despite the tight grid discipline, generous padding (p-8 for editor, p-6 for cards) and larger editor text (18px, 1.7 line height) create comfort for sustained work.

10. **Graphic boldness with warmth:** The warm off-white background (#FAFAF8) prevents clinical coldness while preserving the high-contrast graphic aesthetic. Cards remain true white for maximum clarity.

## Conflict Resolutions

When synthesizing Pressed Type with selective Collage Board elements, these conflicts were resolved:

1. **Shadows vs. flat aesthetic:** Pressed Type was completely flat. Added Collage Board's hard drop shadows (`shadow-[4px_4px_0px_#1A1A1A]`) because they add physicality and substance WITHOUT soft/blurred decoration. The shadows are architectural, not ornamental.

2. **Border weight:** Collage Board uses 2px borders everywhere; Pressed Type uses 1px. Adopted 2px as default — makes everything more graphic and substantial without overwhelming the layout.

3. **Typography mix:** Collage Board uses Fraunces (display serif) + Space Grotesk (sans) + Caveat (handwriting). Kept Pressed Type's Playfair Display + Inter foundation, but added Caveat for coaching annotations only. This preserves typographic consistency while adding human warmth where it matters.

4. **Rotated elements:** Collage Board rotates evidence cards (`rotate-1`, `-rotate-1`). EXCLUDED this — the user explicitly said angled evidence is too playful. Instead, kept all cards grid-aligned. Only stamp badges get rotation (2-3 degrees) because they're small, contained status markers.

5. **Color palette:** Collage Board uses navy/coral/yellow/sage multi-color palette. EXCLUDED — kept Pressed Type's single brick-red accent (#B74134) for simplicity and restraint. Used semantic colors (emerald/amber/red/sky) only for status badges.

6. **Button shadows:** Primary buttons get hard shadows (`shadow-[4px_4px_0px_#1A1A1A]`) from Collage Board. Hover state increases shadow to `shadow-[6px_6px_0px_#1A1A1A]` and active state flattens shadow with translate — creates physical "press" feeling.

7. **Input focus states:** Pressed Type uses ring-based focus (standard). Added option for hard shadow focus (`focus:shadow-[4px_4px_0px_#1A1A1A]`) on inputs — creates consistency with the card shadow system.

8. **Handwriting placement:** Collage Board uses Caveat for various UI elements. Limited it strictly to coaching annotations in the editor — this makes it a meaningful signal of "human feedback" rather than decorative typography.

9. **Stamp badge use case:** Collage Board uses stamp badges broadly. Limited to essay status only (DRAFT, PUBLISHED, IN REVIEW) — small, functional, memorable. Not used for tags, labels, or other UI elements.

10. **Corner system:** Both kits use sharp corners, but Collage Board is more absolute. Maintained Pressed Type's three-tier system (sharp containers, rounded-md inputs, pill primary buttons) — this creates more usable hierarchy for daily use.

## Summary: The Hybrid Identity

**The concept:** A letterpress broadsheet you can touch.

This synthesis creates a visual identity that feels like a tool for serious intellectual work that also feels crafted and substantial. Not flat and lifeless. Not chaotic and playful. The hard shadows and heavy borders give physicality. The stamp badges give personality. The handwriting annotations give humanity. Everything else is Pressed Type's editorial discipline.

**The signature elements:**
- Playfair Display typography (editorial authority)
- High-contrast black/white palette (focus and clarity)
- Brick red accent (action without urgency)
- Sharp containers (graphic discipline)
- Hard drop shadows (tangible physicality) — THE defining visual addition
- Heavy 2px borders (substance and weight)
- Stamp badges (memorable status markers)
- Handwritten coaching notes (human feedback signal)

**The emotional tone:** Trustworthy, practice-oriented, evidence-backed, intellectually warm, crafted, substantial — not flashy, not corporate, not gamified, not playful.
