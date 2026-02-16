# Kit: Warm Editorial

## Aesthetic

A cream-and-ink editorial workspace inspired by premium literary magazines. Warm off-white surfaces, rich charcoal text, and cognac amber accents create a reading-room atmosphere that feels calm, literate, and focused — like working in a quiet bookshop with natural light filtering through.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| **Primary** | `bg-amber-700` / `text-amber-700` | `#b45309` | Primary actions, links, active states |
| **Primary Hover** | `bg-amber-800` / `text-amber-800` | `#92400e` | Hover state for primary actions |
| **Accent** | `bg-amber-600` / `text-amber-600` | `#d97706` | Highlights, badges, emphasis |
| **Surface** | `bg-[#FAF8F5]` | `#FAF8F5` | Page background — warm ivory |
| **Card** | `bg-[#FFFEFB]` | `#FFFEFB` | Elevated surfaces, cards, modals |
| **Text Primary** | `text-[#2D2A26]` | `#2D2A26` | Body text, headings — deep charcoal |
| **Text Secondary** | `text-stone-600` | `#57534e` | Supporting text, captions |
| **Text Tertiary** | `text-stone-500` | `#78716c` | Disabled text, de-emphasized |
| **Border Default** | `border-stone-200` | `#e7e5e4` | Default borders, dividers |
| **Border Subtle** | `border-stone-100` | `#f5f5f4` | Very subtle dividers |
| **Border Focus** | `border-amber-500` | `#f59e0b` | Focus rings, active borders |
| **Success** | `bg-emerald-50` / `text-emerald-800` / `border-emerald-200` | `#ecfdf5` / `#065f46` / `#a7f3d0` | Success states |
| **Warning** | `bg-amber-50` / `text-amber-900` / `border-amber-200` | `#fffbeb` / `#78350f` / `#fde68a` | Warning states |
| **Error** | `bg-red-50` / `text-red-800` / `border-red-200` | `#fef2f2` / `#991b1b` / `#fecaca` | Error states |
| **Info** | `bg-sky-50` / `text-sky-800` / `border-sky-200` | `#f0f9ff` / `#075985` / `#bae6fd` | Informational states |

### Typography

**Font Families:**
- Display/Headings: `Lora` (serif, Google Fonts) — weights 400, 500, 600
- Body: `Inter` (sans-serif, Google Fonts) — weights 400, 500, 600

**Type Scale:**
- **H1:** `font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-tight` (36px/48px responsive)
- **H2:** `font-serif text-3xl md:text-4xl font-semibold tracking-tight leading-tight` (30px/36px responsive)
- **H3:** `font-serif text-2xl font-semibold tracking-tight leading-snug` (24px)
- **H4:** `font-serif text-xl font-medium leading-snug` (20px)
- **Body Large:** `font-sans text-lg leading-relaxed` (18px, 1.75 line height)
- **Body:** `font-sans text-base leading-relaxed` (16px, 1.75 line height)
- **Body Small:** `font-sans text-sm leading-relaxed` (14px)
- **Caption:** `font-sans text-xs leading-normal text-stone-600` (12px)
- **Code:** `font-mono text-sm` (14px monospace)

**Philosophy:** Serif headings provide editorial warmth and authority; Inter body text ensures comfortable reading at length. Generous line-height (1.75) mimics editorial layouts.

### Spacing

**Base Unit:** 4px (Tailwind default)

**Standard Values:**
- **Button padding:** `px-5 py-2.5` (20px horizontal, 10px vertical) for medium, `px-4 py-2` for small, `px-6 py-3` for large
- **Input padding:** `px-4 py-2.5` (16px horizontal, 10px vertical)
- **Card padding:** `p-6` (24px) for standard cards, `p-8` (32px) for featured content
- **Page gutters:** `px-4 md:px-6 lg:px-8` (responsive: 16px/24px/32px)
- **Section spacing:** `space-y-8` (32px between major sections), `space-y-4` (16px within sections)
- **Grid/flex gaps:** `gap-6` (24px) for card grids, `gap-4` (16px) for form fields

**Philosophy:** Generous spacing reflects editorial breathing room. Content should never feel cramped.

### Borders & Corners

**Border Radius:**
- **Default:** `rounded-md` (6px) — cards, buttons, inputs
- **Subtle:** `rounded` (4px) — badges, small UI elements
- **Large:** `rounded-lg` (8px) — modals, featured cards
- **Pill:** `rounded-full` — avatars, status indicators

**Border Width:**
- **Default:** `border` (1px)
- **Thick:** `border-2` (2px) — focus states
- **None:** `border-0` — borderless buttons

**Shadows:**
- **Subtle:** `shadow-sm` — default card elevation
- **Medium:** `shadow-md` — hover states, active cards
- **Large:** `shadow-lg` — modals, dropdowns
- **Focus:** `ring-2 ring-amber-500 ring-offset-2 ring-offset-[#FAF8F5]` — keyboard focus

**Philosophy:** Understated rounding (4-6px) maintains sophistication. Shadows are minimal — just enough to suggest depth without distraction.

## Component Patterns

### Buttons
- **Primary:** Amber-700 background, white text, subtle shadow, hover darkens to amber-800
- **Secondary:** Transparent with amber-700 text and border, hover adds light amber background
- **Ghost:** Text-only amber-700, hover adds subtle background
- **Destructive:** Red-600 background for dangerous actions

### Inputs
- **Default:** White background, stone-200 border, charcoal text, rounded-md
- **Focus:** Amber-500 border, amber focus ring
- **Error:** Red-200 border, red-50 background, red-800 text for error message below

### Cards
- **Content Card:** White (#FFFEFB) background, stone-100 border, rounded-md, shadow-sm, p-6
- **Evidence Card:** Same styling, but with amber-100 left border-l-4 to signal sourced content
- **Stat Card:** Minimal — just background and padding, no border

### Navigation
- **Top Nav:** Cream surface background, stone-200 bottom border, medium height (64px)
- **Nav Links:** Stone-600 default, amber-700 active, hover underline decoration-2

### Editor
- **Title Input:** Large serif font, borderless, focus ring only
- **Content Area:** Relaxed line-height, comfortable max-width (prose container ~65ch)
- **Toolbar:** Cream background, grouped button clusters with dividers

## Rationale

The warm-editorial aesthetic directly supports Microblogger's "writing gym, not writing machine" philosophy. Cream and ink evoke premium publishing — signaling that writing here is a craft worth practicing, not content to churn out. The serif headings add editorial authority while remaining approachable (Lora is warmer than Playfair). Generous spacing and line-height honor the product's evidence-backed, thoughtful approach: this is a place to think slowly and carefully. Cognac amber accents add warmth without distraction, reinforcing the "intellectually warm" emotional tone. The overall effect is a reading room where knowledge workers feel invited to stay, think, and refine their ideas — trustworthy, calm, and focused.
