# Kit: Library Study

## Aesthetic

Rich and layered, like writing at a mahogany desk in a private study. This kit creates an immersive, scholarly atmosphere with warm dark backgrounds, classic serif typography, and subtle depth through layering. The design language evokes evening writing sessions in a personal library — intimate, focused, and intellectually inviting without being austere.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex Value | Usage |
|-------|---------------|-----------|--------|
| **Surfaces** |
| Background Primary | `bg-[#2C2520]` | #2C2520 | Main page background (warm walnut dark) |
| Background Secondary | `bg-[#3A3430]` | #3A3430 | Cards, panels, elevated surfaces |
| Background Tertiary | `bg-[#443E38]` | #443E38 | Hover states, nested elements |
| **Text** |
| Text Primary | `text-[#F5F1E8]` | #F5F1E8 | Main body text (warm cream) |
| Text Secondary | `text-[#C4BDB0]` | #C4BDB0 | Supporting text, metadata |
| Text Tertiary | `text-[#9A9388]` | #9A9388 | Disabled, deemphasized text |
| **Accent Colors** |
| Primary (Forest) | `bg-[#3D6B50]` | #3D6B50 | Primary actions, links, focus states |
| Primary Hover | `bg-[#4D7B60]` | #4D7B60 | Primary button hover |
| Gold Accent | `bg-[#C9A84C]` | #C9A84C | Special emphasis, success states |
| Gold Hover | `bg-[#D4B85F]` | #D4B85F | Gold interactive hover |
| **Semantic** |
| Success | `bg-[#4A7C59]` | #4A7C59 | Success messages, completed states |
| Warning | `bg-[#C9954C]` | #C9954C | Warning messages, amber tone |
| Error | `bg-[#C05A4A]` | #C05A4A | Error states, destructive actions |
| Info | `bg-[#5A7EA3]` | #5A7EA3 | Info messages, slate blue tone |
| **Borders** |
| Border Default | `border-[#554D45]` | #554D45 | Standard borders (lighter than bg) |
| Border Subtle | `border-[#433C35]` | #433C35 | Subtle dividers |
| Border Accent | `border-[#3D6B50]` | #3D6B50 | Active/focused borders |

### Typography

**Font Families:**
- **Serif (Merriweather):** Headings, titles, emphasis — classic, readable, scholarly
- **Sans-serif (Source Sans 3):** UI elements, labels, buttons, metadata — structured, neutral

**Type Scale:**

| Element | Font | Size (Tailwind) | Weight | Line Height | Letter Spacing |
|---------|------|-----------------|---------|-------------|----------------|
| H1 | Merriweather | `text-4xl` (36px) | 700 | `leading-tight` | `tracking-tight` |
| H2 | Merriweather | `text-3xl` (30px) | 600 | `leading-snug` | `tracking-tight` |
| H3 | Merriweather | `text-2xl` (24px) | 600 | `leading-snug` | `tracking-normal` |
| H4 | Merriweather | `text-xl` (20px) | 600 | `leading-normal` | `tracking-normal` |
| Body | Source Sans 3 | `text-base` (16px) | 400 | `leading-relaxed` | `tracking-normal` |
| Body Small | Source Sans 3 | `text-sm` (14px) | 400 | `leading-relaxed` | `tracking-normal` |
| Label | Source Sans 3 | `text-sm` (14px) | 600 | `leading-normal` | `tracking-wide` |
| Caption | Source Sans 3 | `text-xs` (12px) | 500 | `leading-normal` | `tracking-wide` |
| Code/Mono | `font-mono` | `text-sm` (14px) | 400 | `leading-normal` | `tracking-normal` |

**Implementation:**
```typescript
import { Merriweather, Source_Sans_3 } from 'next/font/google';

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-merriweather'
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-sans'
});
```

### Spacing

**Base Unit:** 4px (Tailwind default)

**Standard Spacing Values:**
- Extra tight: `space-y-1` (4px) — list items, form groups
- Tight: `space-y-2` (8px) — related content
- Default: `space-y-4` (16px) — sections within cards
- Comfortable: `space-y-6` (24px) — major sections
- Generous: `space-y-8` (32px) — page-level sections
- Spacious: `space-y-12` (48px) — distinct page areas

**Component Padding:**
- Button: `px-5 py-2.5` (20px horizontal, 10px vertical)
- Button Large: `px-6 py-3` (24px horizontal, 12px vertical)
- Button Small: `px-4 py-2` (16px horizontal, 8px vertical)
- Input: `px-4 py-2.5` (16px horizontal, 10px vertical)
- Card: `p-6` (24px all sides)
- Card Compact: `p-4` (16px all sides)
- Page Gutter: `px-6 md:px-8 lg:px-12` (responsive)

**Layout Gaps:**
- Grid/Flex Tight: `gap-3` (12px)
- Grid/Flex Default: `gap-4` (16px)
- Grid/Flex Comfortable: `gap-6` (24px)

### Borders & Corners

**Border Radius:**
- None: `rounded-none` (0px) — not used in this kit
- Subtle: `rounded-md` (6px) — inputs, small cards
- Standard: `rounded-lg` (8px) — cards, panels, buttons
- Generous: `rounded-xl` (12px) — major containers
- Pill: `rounded-full` — tags, badges, icon buttons

**Border Width:**
- Default: `border` (1px)
- Thick: `border-2` (2px) — focus states
- None: `border-0` — borderless variants

**Shadow Policy:**
The library-study aesthetic uses deeper, more pronounced shadows to create layered depth and ambient lighting effects.

- Subtle: `shadow-md` — slight elevation (cards at rest)
- Standard: `shadow-lg` — clear elevation (modals, dropdowns)
- Deep: `shadow-xl` — strong elevation (overlays, popovers)
- Inner: `shadow-inner` — inset for inputs
- Focus Ring: `ring-2 ring-[#3D6B50] ring-offset-2 ring-offset-[#2C2520]`

## Component Patterns

### Buttons

**Primary (Forest Green):**
- Base: `bg-[#3D6B50] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold`
- Hover: `hover:bg-[#4D7B60]`
- Focus: `focus:ring-2 focus:ring-[#3D6B50] focus:ring-offset-2 focus:ring-offset-[#2C2520]`
- Disabled: `disabled:bg-[#443E38] disabled:text-[#9A9388] disabled:cursor-not-allowed`

**Secondary (Outlined):**
- Base: `border-2 border-[#554D45] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold bg-transparent`
- Hover: `hover:bg-[#3A3430] hover:border-[#C4BDB0]`

**Gold (Special Actions):**
- Base: `bg-[#C9A84C] text-[#2C2520] px-5 py-2.5 rounded-lg font-semibold`
- Hover: `hover:bg-[#D4B85F]`

**Destructive:**
- Base: `bg-[#C05A4A] text-[#F5F1E8] px-5 py-2.5 rounded-lg font-semibold`
- Hover: `hover:bg-[#CA6A5A]`

### Form Inputs

**Text Input:**
- Base: `bg-[#3A3430] border border-[#554D45] text-[#F5F1E8] px-4 py-2.5 rounded-md w-full`
- Placeholder: `placeholder:text-[#9A9388]`
- Focus: `focus:outline-none focus:ring-2 focus:ring-[#3D6B50] focus:border-transparent`
- Error: `border-[#C05A4A] focus:ring-[#C05A4A]`
- Disabled: `disabled:bg-[#2C2520] disabled:text-[#9A9388] disabled:cursor-not-allowed`

**Textarea:**
- Inherits text input styles
- Add: `min-h-[120px] resize-y leading-relaxed`

**Select:**
- Same as text input
- Add: `appearance-none bg-[url('data:...chevron')] bg-no-repeat bg-right pr-10`

**Checkbox/Radio:**
- Custom styled with `accent-[#3D6B50]`
- Label: `text-sm text-[#F5F1E8] font-medium`

### Cards

**Standard Content Card:**
- Base: `bg-[#3A3430] border border-[#554D45] rounded-lg p-6 shadow-lg`
- Hover: `hover:shadow-xl hover:border-[#C4BDB0] transition-all duration-200`

**Evidence Card:**
- Base: `bg-[#3A3430] border-l-4 border-l-[#C9A84C] rounded-lg p-5`
- Includes: quote in serif italic, source metadata in small sans

**Stat/Metric Card:**
- Base: `bg-[#443E38] rounded-lg p-4 border border-[#554D45]`
- Large number in Merriweather, label in Source Sans 3

### Navigation

**Top Nav Bar:**
- Base: `bg-[#3A3430] border-b border-[#554D45] px-6 py-4`
- Links: `text-[#C4BDB0] hover:text-[#F5F1E8] font-medium text-sm`
- Active: `text-[#C9A84C] border-b-2 border-[#C9A84C]`

### Editor Component

**Title Input:**
- Large serif input: `text-3xl font-merriweather font-semibold bg-transparent border-none text-[#F5F1E8]`
- Placeholder: `placeholder:text-[#9A9388]`

**Content Area:**
- Prose styling: serif body text at `text-lg leading-relaxed`
- Background: subtle card `bg-[#3A3430]`
- Padding: generous `p-8`

**Toolbar:**
- Horizontal button group with icon buttons
- `bg-[#443E38] rounded-lg p-2 flex gap-1`

## Rationale

The library-study aesthetic directly serves Microblogger's product philosophy of being a "writing gym, not a writing machine." The warm dark palette creates an intimate, focused environment that encourages deep work — the kind of atmosphere where serious thinking happens, not performative content creation.

The classic serif typography (Merriweather) paired with structured sans-serif UI elements (Source Sans 3) reinforces the scholarly, evidence-backed nature of the platform. This is intentionally not a slick, modern SaaS dashboard — it's a tool for knowledge workers who value substance over flash.

The deeper shadows and layered surfaces create ambient depth that feels cozy rather than stark, supporting the "practice-oriented" emotional tone. The forest green primary color and aged gold accent evoke traditional library materials (leather, brass, aged paper) without being nostalgic or retro — they ground the interface in trustworthiness and intellectual warmth.

This kit is ideal for users who want their writing environment to feel like a dedicated thinking space, separate from the noise of social media and productivity dashboards. It respects the craft of writing and the seriousness of the user's intellectual work.
