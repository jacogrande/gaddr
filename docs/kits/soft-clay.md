# Kit: Soft Clay

## Aesthetic

Warm, tactile, and grounded — like a pottery studio for ideas. Earthy terracotta, sage, and sandstone tones create an approachable craft-workshop feeling. Generous rounded corners and soft shadows make the interface feel handmade and human. This aesthetic supports the "writing gym" philosophy by evoking practice, process, and patient iteration rather than polished performance.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| **Primary** | `bg-[#C47D5E]` `text-[#C47D5E]` | #C47D5E | Soft terracotta — primary actions, links, active states |
| **Primary Dark** | `bg-[#A86A4D]` `text-[#A86A4D]` | #A86A4D | Hover/pressed state for primary elements |
| **Secondary** | `bg-[#7D8E74]` `text-[#7D8E74]` | #7D8E74 | Sage green — secondary actions, supporting elements |
| **Accent** | `bg-[#C4919B]` `text-[#C4919B]` | #C4919B | Dusty rose — highlights, emphasis (used sparingly) |
| **Surface Base** | `bg-[#F5EDE4]` | #F5EDE4 | Warm sand — page background |
| **Surface Raised** | `bg-white` | #FFFFFF | Card and elevated element background |
| **Neutral 900** | `text-[#2D2520]` | #2D2520 | Primary text — dark warm brown |
| **Neutral 700** | `text-[#5A4F47]` | #5A4F47 | Secondary text |
| **Neutral 500** | `text-[#8A7F76]` | #8A7F76 | Tertiary text, subtle labels |
| **Neutral 300** | `border-[#D4CCC3]` | #D4CCC3 | Borders, dividers |
| **Neutral 100** | `bg-[#EBE5DD]` | #EBE5DD | Subtle backgrounds, disabled states |
| **Success** | `bg-emerald-600` `text-emerald-600` | #059669 | Success states, confirmation |
| **Warning** | `bg-amber-600` `text-amber-600` | #D97706 | Warning states, caution |
| **Error** | `bg-red-600` `text-red-600` | #DC2626 | Error states, destructive actions |
| **Info** | `bg-blue-600` `text-blue-600` | #2563EB | Informational messages |

### Typography

**Fonts:**
- **Headings:** Bitter (rounded serif) — loaded via Google Fonts
- **Body:** DM Sans (humanist sans-serif) — loaded via Google Fonts

**Type Scale:**

| Element | Size | Weight | Line Height | Letter Spacing | Class |
|---------|------|--------|-------------|----------------|-------|
| H1 | 2.25rem (36px) | 600 | 1.2 | -0.02em | `text-4xl font-semibold tracking-tight` |
| H2 | 1.875rem (30px) | 600 | 1.3 | -0.01em | `text-3xl font-semibold tracking-tight` |
| H3 | 1.5rem (24px) | 600 | 1.3 | -0.01em | `text-2xl font-semibold tracking-tight` |
| H4 | 1.25rem (20px) | 600 | 1.4 | 0 | `text-xl font-semibold` |
| Body Large | 1.125rem (18px) | 400 | 1.6 | 0 | `text-lg` |
| Body | 1rem (16px) | 400 | 1.6 | 0 | `text-base` |
| Body Small | 0.875rem (14px) | 400 | 1.5 | 0 | `text-sm` |
| Caption | 0.75rem (12px) | 500 | 1.4 | 0.01em | `text-xs font-medium tracking-wide` |
| Code | 0.875rem (14px) | 400 | 1.5 | 0 | `text-sm font-mono` |

**Usage:**
- Headings use `font-serif` (Bitter)
- All other text uses default `font-sans` (DM Sans)

### Spacing

**Base unit:** 4px (Tailwind default)

**Standard spacing:**
- Button padding: `px-5 py-2.5` (20px × 10px) for medium, `px-4 py-2` for small, `px-6 py-3` for large
- Input padding: `px-4 py-3` (16px × 12px)
- Card padding: `p-6` (24px) for content cards, `p-5` (20px) for compact cards
- Page gutters: `px-4 sm:px-6 lg:px-8` (responsive horizontal padding)
- Section spacing: `space-y-8` (32px) between major sections
- Component spacing: `space-y-4` (16px) between related elements, `space-y-2` (8px) for tight groups
- Gap in flex/grid: `gap-3` (12px) for comfortable density, `gap-6` (24px) for visual breathing room

### Borders & Corners

**Border Radius:**
- Buttons: `rounded-lg` (8px) — friendly softness
- Inputs: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px) — generous rounding
- Small elements (badges, tags): `rounded-full` (pill shape)
- Modal/dialog: `rounded-2xl` (16px)

**Borders:**
- Default width: `border` (1px)
- Color: `border-[#D4CCC3]` (Neutral 300)
- Focus ring: `ring-2 ring-[#C47D5E] ring-offset-2` (terracotta primary)

**Shadows:**
- Subtle: `shadow-sm` — for inputs, subtle elevation
- Default: `shadow` — for cards, raised elements
- Pronounced: `shadow-lg` — for modals, popovers, important elevations
- Soft custom shadow for cards: `shadow-[0_2px_12px_rgba(125,142,116,0.08)]` (sage-tinted shadow)

### Motion

**Transitions:**
- Duration: `duration-200` (200ms) — quick and responsive
- Easing: `ease-out` for entrances, `ease-in-out` for state changes
- Hover: `transition-colors` for color changes, `transition-all` when multiple properties change

**States:**
- Hover: slight color darkening + subtle shadow increase
- Focus: ring indicator (terracotta) + no color change
- Active/pressed: darker color, no shadow
- Disabled: reduced opacity (60%), no hover effects

## Component Patterns

### Buttons
- **Primary:** Terracotta background (`bg-[#C47D5E]`), white text, `rounded-lg`, hover darkens to `#A86A4D`, medium shadow
- **Secondary:** Sage background (`bg-[#7D8E74]`), white text, `rounded-lg`, same hover pattern
- **Outline:** White background, terracotta border and text, hover fills with terracotta
- **Ghost:** No background, terracotta text, hover adds subtle terracotta background at 10% opacity
- **Destructive:** Red-600 background, white text, hover darkens

### Form Inputs
- White background, neutral-300 border, `rounded-lg`, comfortable padding (`px-4 py-3`)
- Placeholder: neutral-500
- Focus: terracotta ring, border remains neutral (avoid double-emphasis)
- Error: red-600 border, red-600 ring on focus
- Disabled: neutral-100 background, neutral-500 text

### Cards
- White background, subtle sage-tinted shadow, `rounded-xl`, generous padding (`p-6`)
- Hover state for interactive cards: slight shadow increase, no color change
- Border optional (use for visual separation when needed)

### Navigation
- Surface base background (`bg-[#F5EDE4]`), white raised bar for actual nav
- Active/current link: terracotta text + subtle terracotta underline or background pill
- Hover: sage text color

### Editor
- Clean white writing surface, neutral-300 borders for separation
- Toolbar: white background with subtle shadow, sage icons, terracotta active states
- Inline comments: dusty rose accent for highlights
- Checklist: sage checkboxes, terracotta progress indicators

## Rationale

The soft-clay aesthetic balances warmth with clarity, creating an environment that feels like a practice space rather than a performance stage. The earthy palette (terracotta, sage, sandstone) grounds the interface in the physical and tactile, reinforcing the "writing gym" metaphor — this is a place for repetition, iteration, and gradual improvement. Generous rounded corners and soft shadows make the interface approachable and human-scaled, never intimidating. The combination of Bitter's rounded serifs for headings and DM Sans's open letterforms for body text creates a friendly hierarchy that's still highly readable for long-form writing. This aesthetic directly supports the product values: practice-oriented (warm, non-judgmental tones), evidence-backed (clear structure and typography), intellectually warm (handmade feel, not sterile), and trustworthy (grounded earth tones, consistent system).
