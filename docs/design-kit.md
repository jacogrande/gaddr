# Design Kit: Warm Editorial Craft

A serious editorial workspace with warmth and texture. Typography creates authority. Warm shadows add tactile depth on interaction. Paper grain gives physical craft. Choreographed motion brings it to life.

## Identity

**Name:** Warm Editorial Craft

**Concept:** An editorial workspace that feels both serious and welcoming. Newsreader typography provides distinctive authority. Stone-scale neutrals bring warmth. Hard shadows appear on interaction as a tactile reward. Subtle paper grain adds craft. Entrance animations create delight without distraction.

**Evolution from previous:** The "neobrutalist letterpress" foundation remains, but with modernization. Clinical greys become warm stone tones. Static shadows become interaction rewards. Flat surfaces gain paper texture. Instant rendering becomes choreographed entrance. Same editorial soul, more refined execution.

## Color Palette

Warm stone scale replaces cold zinc. Warm black replaces pure black. Warm ink shadows replace neutral shadows.

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| primary | `bg-[#B74134]` | #B74134 | Main actions, links, active states — brick red (warm, editorial, not urgent) |
| primary-hover | `bg-[#9A3329]` | #9A3329 | Hover state for primary elements |
| primary-light | `bg-[#FFF5F3]` | #FFF5F3 | Coaching annotation backgrounds, subtle accents |
| surface | `bg-[#FAFAF8]` | #FAFAF8 | Page background — warm white |
| surface-raised | `bg-white` | #FFFFFF | Card backgrounds — true white for contrast |
| ink | `text-stone-900` | #1C1917 | Primary text — warm black, not pure black |
| shadow-ink | shadow color | #2C2416 | Hard shadows — warm brown-black |
| stone-800 | `text-stone-800` | #292524 | Strong labels, secondary headings |
| stone-600 | `text-stone-600` | #57534e | Body text in UI contexts |
| stone-500 | `text-stone-500` | #78716c | Tertiary text, captions |
| stone-400 | `text-stone-400` | #a8a29e | Placeholder text, deemphasis |
| stone-300 | `text-stone-300` | #d6d3d1 | Separator dots in metadata |
| stone-200 | `border-stone-200` | #e7e5e4 | Borders, dividers |
| stone-100 | `bg-stone-100` | #f5f5f4 | Code backgrounds, subtle fills |
| success | `bg-emerald-50` / `text-emerald-800` / `border-emerald-800` | #ecfdf5 / #065f46 / #065f46 | Success states, published status |
| warning | `bg-amber-50` / `text-amber-800` / `border-amber-800` | #fffbeb / #92400e / #92400e | Warning states, draft reminders |
| error | `bg-red-50` / `text-red-800` / `border-red-200` | #fef2f2 / #991b1b / #fecaca | Error states, destructive actions |
| info | `bg-sky-50` / `text-sky-800` / `border-sky-800` | #f0f9ff / #075985 / #075985 | Informational states, tips |

**Key changes:** Pure black (#000) → warm black stone-900 (#1C1917). Zinc scale → stone scale throughout. Shadow color #1A1A1A → #2C2416 (warm ink).

**Philosophy:** Warm neutrals prevent clinical coldness while maintaining high contrast. Brick red signals action without urgency. Stone tones have subtle brown undertones that feel organic and editorial.

## Typography

### Font Stack

- **Display/Headings:** Newsreader (serif, Google Fonts) — weights 400, 600
- **Body/UI:** DM Sans (sans-serif, Google Fonts) — weights 400, 500, 600
- **Coaching:** Caveat (handwriting, Google Fonts) — weights 400, 600 — used ONLY for margin coaching annotations
- **Code:** System monospace stack (`font-mono`)

Loaded via `next/font/google` with CSS variables:

```typescript
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-serif' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' })
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-handwriting' })
```

**Why these fonts:**
- **Newsreader:** Designed by Production Type for on-screen reading. Distinctive, underused, editorial. More refined and modern than Playfair Display.
- **DM Sans:** Geometric with humanist touches. More character than Inter, warmer feel.
- **Caveat:** Retained for "professor's red pen" coaching effect.

### Type Scale

| Level | Tailwind Classes | Usage |
|-------|-----------------|-------|
| Display | `font-serif text-5xl md:text-6xl font-semibold tracking-tight` | Hero headlines (48px/60px responsive) |
| H1 | `font-serif text-4xl md:text-5xl font-semibold tracking-tight` | Page titles (36px/48px responsive) |
| H2 | `font-serif text-3xl font-semibold tracking-tight` | Section headers (30px) |
| H3 | `font-serif text-2xl font-semibold tracking-tight` | Subsection headers, card titles (24px) |
| H4 | `text-xl font-semibold` | Minor headers, labels (20px, DM Sans) |
| Body (Editor) | `text-lg leading-relaxed` | Editor content area (18px, 1.75 line height) |
| Body | `text-base leading-relaxed` | Default paragraph text (16px, 1.625 line height) |
| Body Small | `text-sm leading-normal` | Captions, helper text (14px) |
| Caption | `text-xs tracking-wide` | Metadata, timestamps (12px) |
| Coaching | `font-handwriting text-lg leading-relaxed text-[#B74134]` | Coaching margin notes ONLY (18px, Caveat) |
| Stamp | `text-xs font-black uppercase tracking-wider` | Rubber stamp badges (12px) |
| Code | `font-mono text-sm` | Inline code, technical content (14px) |

**Key change:** `font-semibold` (600) replaces `font-bold` (700) on serif headings. Newsreader looks more refined and less heavy at 600 weight.

### Reading Comfort

- **Line length target:** 65ch max-width for long-form content (`max-w-prose` or `max-w-2xl`)
- **Editor line height:** 1.75 (`leading-relaxed`) — superior for sustained writing
- **Paragraph spacing:** `space-y-4` (16px) for body text blocks
- **Heading margins:** `mb-4` after headings, `mt-8` before section headings

## Shadow Hierarchy

The biggest conceptual change: shadows are now a REWARD for interaction, not a default state.

| Level | Tailwind | Usage |
|-------|----------|-------|
| None | (none) | Background elements, passive UI |
| Rest | `shadow-sm` | Cards and interactive elements at rest (subtle elevation) |
| Hover/Focus | `shadow-[3px_3px_0px_#2C2416]` | Cards on hover, inputs on focus (tactile reward) |
| Emphasis | `shadow-[5px_5px_0px_#2C2416]` | Featured cards, buttons on hover (strong presence) |

**Philosophy:** "Shadow as emphasis, not wallpaper." At rest, cards use subtle elevation (`shadow-sm`). The hard ink shadow appears on hover/focus as a tactile reward. This creates delight through interaction.

**Exceptions (always have hard shadow):**
- **Primary CTA buttons:** `shadow-[3px_3px_0px_#2C2416]` at rest (must feel pressable)
- **Stamp badges:** `shadow-[2px_2px_0px_#2C2416]` (contained personality)
- **Coaching annotations:** `shadow-[3px_3px_0px_#2C2416]` (tangible coaching note)
- **Error banners:** `shadow-[3px_3px_0px_#2C2416]` (demands attention)

**Transitions:** `transition-all duration-300` for smooth shadow reveal on hover.

## Paper Grain Texture

CSS-only paper grain overlay creates subconscious "paper craft" feeling:

```css
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.018;
  z-index: 9999;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
```

1.8% opacity. Fixed position. Subtle texture across entire viewport.

## Motion System

Choreographed entrance animations and smooth transitions create delight without distraction.

### Entrance Animations

**Fade up (primary entrance):**
```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
```

**Fade in (subtle entrance):**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 0.35s ease-out;
}
```

**Stagger (sequential reveal):**
```css
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.06s; }
.stagger > *:nth-child(3) { animation-delay: 0.12s; }
.stagger > *:nth-child(4) { animation-delay: 0.18s; }
.stagger > *:nth-child(5) { animation-delay: 0.24s; }
/* etc. */
```

Apply `.stagger` to parent container. Children with `animate-fade-up` will reveal sequentially.

### Transitions

| Element | Duration | Easing | Usage |
|---------|----------|--------|-------|
| Card shadow | 300ms | default | `transition-all duration-300` for hover shadow reveal |
| Color changes | 200ms | default | `transition-colors duration-200` for text/bg changes |
| Button press | 150ms | default | `transition-all duration-150` for fast tactile feedback |
| Word progress bar | 700ms | ease-out | `transition-all duration-700 ease-out` for satisfying fill |

### Word Count Progress Bar (Signature Interaction)

Thin bar below editor status. Smooth fill as user types. Color changes based on word count range.

```html
<div class="h-0.5 w-full rounded-full bg-stone-100">
  <div
    class="h-full rounded-full transition-all duration-700 ease-out"
    style="width: 65%"
    class:bg-stone-400={wordCount < targetMin}
    class:bg-[#B74134]={wordCount >= targetMin && wordCount <= targetMax}
    class:bg-red-900={wordCount > targetMax}
  ></div>
</div>
```

- Below target: `bg-stone-400` (neutral)
- In target range (200-800 words): `bg-[#B74134]` (brick red)
- Over target: `bg-red-900` (dark red warning)

700ms transition creates smooth, satisfying fill.

## Spacing

### Base Unit
4px (Tailwind default)

### Component Spacing

| Context | Tailwind | Value | Usage |
|---------|----------|-------|-------|
| Button (sm) | `px-4 py-2` | 16px × 8px | Small buttons, tags |
| Button (md) | `px-6 py-3` | 24px × 12px | Default buttons |
| Button (lg) | `px-8 py-4` | 32px × 16px | Hero CTAs |
| Input | `px-4 py-3` | 16px × 12px | Text inputs, selects |
| Card (standard) | `p-6` | 24px | Default cards |
| Card (featured) | `p-8` | 32px | Editor surface, featured cards |
| Section gap | `space-y-12` | 48px | Between major sections |
| Element gap | `space-y-4` | 16px | Between related elements |
| Tight gap | `space-y-2` / `gap-2` | 8px | Form field groups |
| Card grid gap | `gap-6` | 24px | Card grids, flex layouts |
| Page gutter | `px-6 md:px-12 lg:px-24` | 24px/48px/96px | Page edge padding (responsive) |
| Max content width | `max-w-2xl` | 672px | Editor, long-form content |
| Max layout width | `max-w-7xl` | 1280px | Page container |

## Borders & Corners

| Element | Radius | Border | Shadow |
|---------|--------|--------|--------|
| Cards | none (sharp) | none | `shadow-sm` at rest, `hover:shadow-[4px_4px_0px_#2C2416]` |
| Primary buttons | `rounded-full` (pill) | none | `shadow-[3px_3px_0px_#2C2416]` always |
| Secondary buttons | `rounded-full` (pill) | `border-2 border-stone-900` | none |
| Ghost buttons | `rounded-full` (pill) | none | none |
| Toolbar buttons | none (sharp) | `border-2` | `shadow-[2px_2px_0px_#2C2416]` |
| Inputs | `rounded-lg` (8px) | `border border-stone-200` | `focus:shadow-[3px_3px_0px_#2C2416]` |
| Stamp badges | `rounded` (4px) | `border-[3px]` | `shadow-[2px_2px_0px_#2C2416]` |
| Error banner | none (sharp) | `border border-red-200` | `shadow-[3px_3px_0px_#2C2416]` |
| Modals | `rounded-lg` (8px) | none | `shadow-[8px_8px_0px_#2C2416]` |
| Avatars | `rounded-full` | none | none |
| Tags | `rounded-full` | `border` | none |
| Code inline | `rounded` (4px) | none | none |

**Key changes:**
- Inputs now `rounded-lg` (8px) instead of `rounded-md` (6px)
- Cards have no border — shadow provides the edge
- Default border weight is `border` (1px), not `border-2` (2px), except for toolbar buttons, stamp badges, and secondary buttons

**Three-tier corner system:**
1. **Sharp (none):** Cards, structural elements — signature brutalist element
2. **Rounded-lg (8px):** Inputs, modals — comfortable for interaction
3. **Pill (rounded-full):** Buttons, tags — deliberate hierarchy

## Navigation

**Sticky glassmorphism nav:**

```html
<nav class="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
  <div class="mx-auto max-w-7xl px-6 md:px-12 lg:px-24">
    <div class="flex h-16 items-center justify-between">
      <!-- Logo -->
      <a href="/" class="font-serif text-xl font-semibold tracking-tight text-stone-900">
        Microblogger
      </a>

      <!-- Nav links -->
      <div class="flex items-center gap-6">
        <a href="/dashboard" class="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
          Dashboard
        </a>
        <a href="/library" class="text-sm font-medium text-stone-900 underline decoration-2 underline-offset-4">
          Library
        </a>

        <!-- Avatar -->
        <img
          src="/avatar.jpg"
          alt="User"
          class="h-8 w-8 rounded-full ring-2 ring-stone-200"
        />
      </div>
    </div>
  </div>
</nav>
```

**Elements:**
- Logo: `font-serif text-xl font-semibold tracking-tight text-stone-900`
- Links: `text-sm font-medium text-stone-500 hover:text-stone-900`
- Active link: `text-stone-900 underline decoration-2 underline-offset-4`
- Avatar: `ring-2 ring-stone-200` (not border)

## Component Patterns

### Buttons

**Primary (pill, brick red, hard shadow always):**
```html
<button class="rounded-full bg-[#B74134] px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] hover:bg-[#9A3329] hover:shadow-[5px_5px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] transition-all duration-200">
  Start Writing
</button>
```

**Secondary (pill, outline):**
```html
<button class="rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-200">
  Learn More
</button>
```

**Ghost:**
```html
<button class="rounded-full px-6 py-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors duration-200">
  Cancel
</button>
```

**Destructive:**
```html
<button class="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#2C2416] hover:bg-red-700 hover:shadow-[5px_5px_0px_#2C2416] transition-all duration-200">
  Delete Essay
</button>
```

**Toolbar button:**
```html
<!-- Active -->
<button class="border-2 border-[#B74134] bg-[#B74134] px-2.5 py-1 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416]">
  B
</button>

<!-- Inactive -->
<button class="border-2 border-stone-300 bg-white px-2.5 py-1 text-sm font-bold text-stone-500 shadow-[2px_2px_0px_#2C2416] hover:border-stone-900 hover:text-stone-900 transition-colors">
  B
</button>
```

### Cards

**Standard card (sharp corners, subtle shadow at rest, hard shadow on hover):**
```html
<div class="bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
  <h3 class="font-serif text-2xl font-semibold tracking-tight text-stone-900">
    Card Title
  </h3>
  <p class="mt-2 text-sm text-stone-600">
    Card content goes here.
  </p>
</div>
```

**Essay card (with top border, title color change on hover):**
```html
<a href="/essay/123" class="group block border-t-4 border-t-stone-900 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
  <h3 class="font-serif text-2xl font-semibold tracking-tight text-stone-900 group-hover:text-[#B74134] transition-colors">
    The Attention Economy is Backwards
  </h3>
  <p class="mt-2 text-sm text-stone-600">
    347 words · 2 min read · Draft
  </p>
</a>
```

**Evidence card (thick left border):**
```html
<div class="border-l-4 border-l-[#B74134] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-[4px_4px_0px_#2C2416]">
  <blockquote class="text-sm text-stone-700">
    "Citation or evidence text goes here."
  </blockquote>
  <cite class="mt-2 block text-xs text-stone-500">
    Source Name, 2024
  </cite>
</div>
```

**Featured card (always has hard shadow):**
```html
<div class="bg-white p-8 shadow-[3px_3px_0px_#2C2416]">
  <h2 class="font-serif text-3xl font-semibold tracking-tight text-stone-900">
    Featured Content
  </h2>
  <p class="mt-4 text-base text-stone-600">
    Featured content with permanent hard shadow for emphasis.
  </p>
</div>
```

### Stamp Badges

**Draft:**
```html
<span class="inline-block rotate-2 rounded border-[3px] border-amber-800 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 shadow-[2px_2px_0px_#2C2416]">
  DRAFT
</span>
```

**Published:**
```html
<span class="inline-block -rotate-2 rounded border-[3px] border-emerald-800 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 shadow-[2px_2px_0px_#2C2416]">
  PUBLISHED
</span>
```

**In Review:**
```html
<span class="inline-block rotate-3 rounded border-[3px] border-sky-800 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-800 shadow-[2px_2px_0px_#2C2416]">
  IN REVIEW
</span>
```

### Inputs

**Text input (rounded-lg, hard shadow on focus):**
```html
<input
  type="text"
  placeholder="Enter title..."
  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-[#B74134] focus:shadow-[3px_3px_0px_#2C2416] focus:outline-none transition-all duration-200"
/>
```

**Title input (editor — no visible container):**
```html
<input
  type="text"
  placeholder="Untitled Essay"
  class="w-full border-0 bg-transparent px-0 py-2 font-serif text-4xl font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none"
/>
```

**Label:**
```html
<label class="mb-2 block text-sm font-semibold text-stone-900">
  Essay Title
</label>
```

**Helper text:**
```html
<p class="mt-1.5 text-sm text-stone-600">
  A clear, specific title helps readers understand your argument.
</p>
```

**Error message:**
```html
<p class="mt-1.5 text-sm text-red-800">
  Title is required.
</p>
```

### Coaching Annotation

Handwritten label + structured feedback. Always has hard shadow.

```html
<div class="border-l-4 border-[#B74134] bg-[#FFF5F3] p-4 shadow-[3px_3px_0px_#2C2416]">
  <p class="font-handwriting text-lg text-[#B74134]">
    Coach feedback
  </p>
  <p class="mt-1 text-sm text-stone-700">
    This claim needs evidence. What study or source supports this statement?
  </p>
</div>
```

### Error Banner

Sharp corners, hard shadow, demands attention.

```html
<div class="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-[3px_3px_0px_#2C2416]">
  <strong class="font-semibold">Error:</strong> Unable to save essay. Please try again.
</div>
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
- Desktop: Sidebar (250px fixed) + main content (flex-1, max-w-4xl)
- Tablet: Collapsible sidebar, full-width content when collapsed
- Mobile: Stacked, sidebar becomes bottom sheet or separate view

**Library (essay grid):**
- Desktop: 3-column grid (`grid-cols-3 gap-6`)
- Tablet: 2-column grid (`md:grid-cols-2`)
- Mobile: Single column (`grid-cols-1`)

**Published essay (reading view):**
- Single column, `max-w-2xl`, centered
- Evidence and objections: Expandable sections or sidebar on desktop
- Mobile: Linear stacked layout

### Grid System

- **Card grids:** CSS Grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`)
- **Form layouts:** Flexbox with vertical stacking and `gap-4`
- **Two-column splits:** CSS Grid (`grid grid-cols-1 lg:grid-cols-2 gap-8`)
- **Sidebar + content:** Flexbox or Grid with fixed sidebar and flexible content area

### Structural Elements

**Page container:**
```html
<div class="mx-auto max-w-7xl px-6 md:px-12 lg:px-24">
  <!-- Page content -->
</div>
```

**Content column (editor, essays):**
```html
<div class="mx-auto max-w-2xl">
  <!-- Centered content -->
</div>
```

**Section header with top border:**
```html
<div class="border-t-4 border-stone-900 pt-6">
  <h2 class="font-serif text-3xl font-semibold tracking-tight text-stone-900">
    Section Title
  </h2>
</div>
```

**Code (inline):**
```html
<code class="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm text-stone-900">
  const example = true
</code>
```

**Code (block):**
```html
<pre class="rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-sm text-stone-900">
  <code>
    function example() {
      return true;
    }
  </code>
</pre>
```

## Design Principles

These principles guide the aesthetic and should be used to evaluate design consistency:

1. **Shadow as emphasis, not wallpaper:** Cards rest with subtle elevation. Hard ink shadows appear on hover as a tactile reward. This creates delight through interaction.

2. **Warm neutrals, not clinical greys:** Stone-scale neutrals with brown undertones. Warm black (#1C1917) instead of pure black (#000). Ink shadows (#2C2416) instead of neutral grey.

3. **Typography does the heavy lifting:** Newsreader creates authority without aggression. DM Sans provides warmth and clarity. Hierarchy comes from type, not decoration.

4. **Contained personality:** Stamp badges, handwritten coaching, brick red accents — personality exists in specific, intentional places. Not sprinkled everywhere.

5. **Brick red signals action, not alarm:** The accent color (#B74134) is warm and editorial. Think literary journals, not error messages. Confidence without urgency.

6. **Entrance, not arrival:** Fade-up animations with stagger. Smooth shadow reveals. Word progress bar fill. Motion creates delight without distraction.

7. **Paper texture adds craft:** Subtle grain overlay (1.8% opacity) creates subconscious feeling of physical material. Digital, but tangible.

8. **Generous breathing room for practice:** Despite tight grid discipline, generous padding (p-8 for editor, p-6 for cards) and larger editor text (18px, 1.75 line height) create comfort for sustained work.

9. **Sharp corners with intentional exceptions:** Cards and structural elements stay sharp (signature brutalist element). Inputs get rounded-lg for comfort. Buttons get pill shape for hierarchy.

10. **Graphic boldness with warmth:** High-contrast foundation (white cards on warm-white background) preserves graphic quality while preventing clinical coldness.

## What Changed from Previous Kit

Evolution from "neobrutalist letterpress" to "Warm Editorial Craft":

### Typography
- Playfair Display → Newsreader (more distinctive, less overused, refined at 600 weight)
- Inter → DM Sans (more character, geometric warmth, humanist touches)
- Weight: font-bold (700) → font-semibold (600) on serif headings

### Color
- Zinc → Stone (warm brown undertones throughout)
- Pure black (#000) → Warm black stone-900 (#1C1917)
- Shadow #1A1A1A → Shadow #2C2416 (warm ink)

### Shadows (MAJOR EVOLUTION)
- Hard shadows everywhere → Shadow hierarchy (rest: subtle, hover: hard)
- Static depth → Interactive reward
- "Shadow as wallpaper" → "Shadow as emphasis"

### Texture
- No texture → Paper grain overlay (1.8% opacity, CSS-only)
- Flat surfaces → Subtle craft feeling

### Motion
- No animations → Fade-up entrances with stagger
- Static rendering → Choreographed entrance
- No feedback → Word count progress bar (signature interaction, 700ms smooth fill)

### Borders
- border-2 default → border default (lighter borders, shadows do the work)
- Heavy borders everywhere → Selective use (toolbar buttons, stamps, secondary buttons)

### Corners
- rounded-md inputs → rounded-lg inputs (8px, more comfortable)

### Navigation
- Heavy solid bar → Glassmorphism sticky nav (bg-white/80, backdrop-blur-md)

### Cards
- Static with hard shadows → Rest with shadow-sm, reveal hard shadow on hover
- Fixed title color → Title changes to brick red on hover
- Instant render → Fade-up entrance with stagger

### Interactive Feedback
- None → Word progress bar with color changes (stone-400 → brick red → dark red)
- Static → Smooth 700ms transition on type

## Summary

**The concept:** A serious editorial workspace with warmth and texture.

**The emotional tone:** Trustworthy, practice-oriented, evidence-backed, intellectually warm, crafted, substantial — not flashy, not corporate, not gamified, not playful.

**The signature elements:**
- Newsreader typography (distinctive editorial authority)
- Stone-scale warmth (organic, not clinical)
- Shadow hierarchy (emphasis through interaction)
- Paper grain texture (subtle craft feeling)
- Entrance animations (choreographed delight)
- Brick red accent (action without urgency)
- Word progress bar (satisfying visual feedback)
- Handwritten coaching (human feedback signal)

**The difference:** Same editorial soul, more refined execution. Warmth without sacrificing authority. Delight without distraction. Craft without clutter.
