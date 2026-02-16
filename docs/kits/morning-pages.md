# Kit: Morning Pages

## Aesthetic

Light, airy, and gentle — like writing in a sunlit room at dawn. This kit prioritizes emotional comfort during the writing process through soft warm gradients, cream and blush tones, and generous whitespace. The design feels like a journaling sanctuary: serene, encouraging, and wrapped in dawn-light warmth.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex Value | Usage |
|-------|---------------|-----------|-------|
| **Primary** | `text-amber-700` / `bg-amber-700` | #B45309 | Primary actions, key interactive elements |
| **Primary Hover** | `bg-amber-800` | #92400E | Hover state for primary buttons |
| **Accent** | `text-rose-400` / `bg-rose-400` | #FB7185 | Gentle highlights, warm accents (used sparingly) |
| **Surface Base** | `bg-[#FBF9F6]` | #FBF9F6 | Page background — soft cream |
| **Surface Elevated** | `bg-white` | #FFFFFF | Card backgrounds, input fields |
| **Border** | `border-[#EEDAD0]` | #EEDAD0 | Default borders — warm blush |
| **Border Subtle** | `border-amber-100` | #FEF3C7 | Very subtle dividers |
| **Text Primary** | `text-stone-900` | #1C1917 | Headings, primary content |
| **Text Secondary** | `text-stone-600` | #57534E | Body text, secondary content |
| **Text Muted** | `text-stone-400` | #A8A29E | Captions, hints, placeholders |
| **Lavender Accent** | `bg-[#D6CFE6]` | #D6CFE6 | Subtle info/neutral highlights |
| **Success** | `text-emerald-600` / `bg-emerald-50` | #059669 / #ECFDF5 | Success states |
| **Warning** | `text-amber-600` / `bg-amber-50` | #D97706 / #FFFBEB | Warning states |
| **Error** | `text-red-600` / `bg-red-50` | #DC2626 / #FEF2F2 | Error states |

### Typography

**Font Families:**
- Headings: Libre Baskerville (serif) — elegant, literary, warm
- Body: Plus Jakarta Sans (sans-serif) — soft, readable, contemporary

**Type Scale:**
- **H1**: `text-5xl` (48px), `font-serif`, `font-normal`, `leading-tight`, `tracking-tight`
- **H2**: `text-3xl` (30px), `font-serif`, `font-normal`, `leading-snug`
- **H3**: `text-2xl` (24px), `font-serif`, `font-normal`, `leading-snug`
- **H4**: `text-xl` (20px), `font-sans`, `font-semibold`, `leading-relaxed`
- **Body**: `text-base` (16px), `font-sans`, `font-normal`, `leading-relaxed` (1.625)
- **Body Large**: `text-lg` (18px), `font-sans`, `font-normal`, `leading-relaxed`
- **Small**: `text-sm` (14px), `font-sans`, `leading-relaxed`
- **Caption**: `text-xs` (12px), `font-sans`, `leading-relaxed`, `text-stone-400`

**Line Height Philosophy:** All line heights are relaxed to generous — encouraging slow, mindful reading.

### Spacing

**Base Unit:** 4px (Tailwind default), but spacing is applied very generously.

**Component Spacing:**
- **Buttons:** `px-6 py-3` (medium), `px-8 py-4` (large), `px-4 py-2` (small)
- **Inputs:** `px-4 py-3`, generous internal padding
- **Cards:** `p-8` (desktop), `p-6` (mobile)
- **Page Gutters:** `px-6` (mobile), `px-8` (tablet), `px-12` (desktop)
- **Section Gaps:** `space-y-16` (large sections), `space-y-8` (component groups), `space-y-4` (tight groupings)
- **Layout Gaps:** `gap-8` for grids, `gap-6` for flex groups

**Vertical Rhythm:** Prioritize lots of breathing room between sections. Err on the side of more space.

### Borders & Corners

**Border Radius:**
- Buttons: `rounded-lg` (8px) — soft but not pill-shaped
- Inputs: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px) — gentle, inviting
- Small elements (badges, chips): `rounded-md` (6px)

**Shadows:**
- Default card shadow: `shadow-sm` — barely-there, just enough for depth
- Elevated/hover state: `shadow-md` — still subtle
- Focus rings: `ring-2 ring-amber-200 ring-offset-2` — soft, warm

**Border Style:**
- Default: `border border-[#EEDAD0]` — warm blush, 1px
- Subtle dividers: `border-amber-100` — almost invisible
- No bold or dark borders — everything stays soft

### Motion

**Transitions:**
- Duration: `transition-all duration-200 ease-out`
- Hover states: subtle scale or opacity shifts, never jarring
- Focus states: gentle ring appearance

**Interaction Philosophy:** All state changes should feel gentle and supportive, never aggressive.

## Component Patterns

### Buttons
- **Primary:** Warm amber background (`bg-amber-700`), white text, `rounded-lg`, generous padding, subtle hover darkening
- **Secondary:** Outlined style with warm blush border, amber text, transparent background
- **Ghost:** No border, amber text, hover background of `bg-amber-50`
- **Disabled:** Reduced opacity (40%), cursor-not-allowed

### Inputs
- White background, warm blush border, `rounded-lg`, generous padding
- Focus state: soft amber ring, no jarring color shifts
- Placeholder text: muted stone-400
- Error state: soft red ring, not harsh

### Cards
- White background on cream page surface
- Warm blush border or barely-there shadow
- `rounded-xl`, generous internal padding (p-8)
- Subtle hover state: very light shadow increase

### Navigation
- Minimal, clean, lots of horizontal breathing room
- Text-based navigation with subtle hover states
- Active state: warm amber underline or text color

### Editor (Core Screen)
- Maximum whitespace around writing area
- Serif typography for the essay content
- Toolbar with soft, non-intrusive iconography
- Inline comments appear as gentle margin annotations with lavender accent background
- Checklist rendered as soft badges or checkboxes with warm color accents

## Rationale

This aesthetic directly supports Microblogger's "writing gym, not writing machine" philosophy by creating an emotionally safe space for practice. The soft cream and blush palette reduces visual stress during long writing sessions, while the serif headings add literary warmth appropriate for knowledge workers building a thinking portfolio. Generous spacing mirrors the product's emphasis on deliberate, mindful practice over rushed output. The gentle colors and minimal shadows create a calm environment that encourages users to focus on their ideas rather than the interface — exactly what a coaching-focused tool needs. This is the most serene direction, designed to make daily writing practice feel like a comforting ritual rather than a productivity obligation.
