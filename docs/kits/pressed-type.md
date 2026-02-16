# Kit: Pressed Type

## Aesthetic

Bold typographic confidence inspired by letterpress printing and editorial design. High-contrast black and white foundation with a single strong accent. The type itself is the design — large, assertive serifs and a rigid grid create a visual language that feels like a broadsheet newspaper's opinion section: confident, graphic, editorial.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| Pure White | `bg-white` | `#FFFFFF` | Page background, card surfaces |
| True Black | `bg-zinc-950` | `#09090b` | Primary text, headings, borders |
| Ink Gray | `text-zinc-800` | `#27272a` | Body text, secondary headings |
| Mid Gray | `text-zinc-600` | `#52525b` | Captions, metadata, deemphasized text |
| Light Gray | `bg-zinc-100` | `#f4f4f5` | Subtle backgrounds, disabled states |
| Border Gray | `border-zinc-200` | `#e4e4e7` | Dividers, input borders, card edges |
| Vermillion | `bg-red-600` | `#dc2626` | Primary accent, CTA buttons, active states |
| Vermillion Hover | `hover:bg-red-700` | `#b91c1c` | Hover state for accent elements |
| Vermillion Muted | `bg-red-50` | `#fef2f2` | Subtle accent backgrounds |
| Success Green | `text-emerald-600` | `#059669` | Success states, positive feedback |
| Warning Amber | `text-amber-600` | `#d97706` | Warnings, caution states |
| Error Red | `text-red-700` | `#b91c1c` | Error states, destructive actions |

### Typography

**Font Families:**
- Display/Headings: **Playfair Display** (700, 900) — loaded via `next/font/google`
- Body/UI: **Inter** (400, 500, 600) — loaded via `next/font/google`

**Type Scale:**
- H1: `text-6xl font-black` (3.75rem / 60px) — Playfair Display 900
- H2: `text-4xl font-bold` (2.25rem / 36px) — Playfair Display 700
- H3: `text-2xl font-bold` (1.5rem / 24px) — Playfair Display 700
- H4: `text-xl font-semibold` (1.25rem / 20px) — Inter 600
- Body: `text-base` (1rem / 16px) — Inter 400, `leading-relaxed` (1.625)
- Small: `text-sm` (0.875rem / 14px) — Inter 500
- Caption: `text-xs` (0.75rem / 12px) — Inter 500, `tracking-wide` (0.025em)

**Line Height:**
- Headings: `leading-tight` (1.25)
- Body: `leading-relaxed` (1.625)
- UI elements: `leading-normal` (1.5)

### Spacing

**Base Unit:** 4px (Tailwind default)

**Standard Values:**
- Buttons: `px-6 py-3` (small: `px-4 py-2`, large: `px-8 py-4`)
- Inputs: `px-4 py-3`
- Cards: `p-6` (small: `p-4`, large: `p-8`)
- Page gutters: `px-6 md:px-12 lg:px-24`
- Section vertical spacing: `py-12 md:py-16`
- Gap (flex/grid): `gap-4` (tight), `gap-6` (standard), `gap-8` (generous)

**Grid Philosophy:** Tight, columnar layout with strong vertical rhythm. Generous line-height for body text creates natural breathing room without needing large vertical gaps.

### Borders & Corners

**Border Radius:**
- Containers/Cards: `rounded-none` (sharp, editorial feel)
- Buttons: `rounded-full` (deliberate contrast — pills against sharp containers)
- Inputs: `rounded-md` (subtle, 0.375rem)
- Tags/Badges: `rounded-full`

**Border Width:**
- Standard: `border` (1px)
- Emphasis: `border-2` (2px)
- Heavy: `border-4` (4px) — used sparingly for visual anchors

**Shadows:**
- None for cards/containers (flat, graphic)
- Subtle for floating elements: `shadow-sm` (0 1px 2px rgba(0,0,0,0.05))
- Interactive states: no shadow, use border or background color change instead

### Motion

**Transitions:**
- Duration: `transition-colors duration-200` (fast, crisp)
- Easing: default (ease) — no custom easing curves needed
- Hover states: color shifts only, no scale or shadow transforms

**Interactive Feedback:**
- Buttons: background color change + slight opacity shift
- Links: underline on hover (`hover:underline`)
- Inputs: border color change on focus (`focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950`)

## Component Patterns

### Buttons

**Primary (Vermillion):** `rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors`

**Secondary (Black outline):** `rounded-full border-2 border-zinc-950 bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-950 hover:text-white transition-colors`

**Ghost:** `rounded-full px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors`

**Destructive:** `rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 transition-colors`

### Inputs

**Text Input:** `w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950`

**Textarea:** Same as text input with `resize-none min-h-[120px]`

**Label:** `text-sm font-semibold text-zinc-950 mb-2 block`

### Cards

**Essay Card:** Sharp container with tight internal padding, heavy top border as visual anchor.
```
border-t-4 border-zinc-950 bg-white p-6
```

**Evidence Card:** Clean white box with standard border, no radius.
```
border border-zinc-200 bg-white p-6
```

**Stat Card:** Minimal, text-focused, no container — just typography.
```
No border, no background, pure type hierarchy
```

### Navigation

Top bar with sharp contrast: white background, black text, vermillion accent for active state. Tight horizontal layout with deliberate spacing.

### Editor

Large serif title input (Playfair Display), generous body textarea (Inter), toolbar with pill buttons. The editor feels like a blank broadsheet page — maximum contrast, maximum clarity.

## Rationale

The "pressed-type" aesthetic serves Microblogger's core identity as a writing practice tool for knowledge workers by emphasizing **clarity, authority, and editorial craft**. The bold serif headings (Playfair Display) signal intellectual seriousness and literary tradition — this is a tool for building arguments, not casual posts. The high-contrast black-and-white palette reduces visual noise, keeping focus on the written word itself, while the single vermillion accent provides decisive wayfinding without becoming playful or distracting.

The sharp corners on containers paired with pill-shaped buttons create a deliberate visual tension that mirrors the product's philosophy: **structure with confidence**. The rigid grid and tight spacing reflect the constrained, practice-oriented nature of micro-essays (200-800 words, fixed time, deliberate revision). The flat, shadow-free design language avoids decoration and skeuomorphism — there's no attempt to soften or gamify the experience. This is a serious tool for serious work.

Finally, the typographic hierarchy does the heavy lifting. Large, assertive headings establish clear information architecture without needing icons, colors, or visual cues. Body text in Inter provides excellent readability with generous line-height, respecting the user's time and cognitive load. The design communicates: **your words matter, we won't distract you from them**.
