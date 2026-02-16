# Kit: Collage-Board

## Aesthetic

A mixed-media collage aesthetic inspired by designers' working walls, Bauhaus posters, and physical mood boards. Cards overlap at slight angles with hard drop shadows. Typography mixes a bold display serif, clean sans, and handwriting accents. Color-blocked sections create bold visual rhythm. Visible grid lines and construction marks peek through, suggesting the creative process itself. This kit treats the UI as a creative artifact — the design reflects the creative work happening inside it.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| **Canvas** | `bg-[#F7F5F0]` | `#F7F5F0` | Page background — warm off-white canvas |
| **Ink Black** | `text-[#1A1A1A]` / `bg-[#1A1A1A]` | `#1A1A1A` | Primary text, hard shadows, borders |
| **Navy Block** | `bg-[#1B2838]` / `text-[#1B2838]` | `#1B2838` | Deep navy color blocks, contrast sections |
| **Coral** | `bg-[#E8634A]` / `text-[#E8634A]` | `#E8634A` | Warm coral accents, action states |
| **Yellow** | `bg-[#F2C94C]` / `text-[#F2C94C]` | `#F2C94C` | Golden yellow highlights, badges |
| **Sage** | `bg-[#7BA68D]` / `text-[#7BA68D]` | `#7BA68D` | Sage green, secondary actions |
| **White** | `bg-white` / `text-white` | `#FFFFFF` | Card backgrounds, clean surfaces |
| **Text Secondary** | `text-[#4A4A4A]` | `#4A4A4A` | Secondary text on light backgrounds |
| **Text on Dark** | `text-[#F7F5F0]` | `#F7F5F0` | Text on navy/dark backgrounds |
| **Border** | `border-[#1A1A1A]` | `#1A1A1A` | Strong borders — always ink black |
| **Grid Dots** | `bg-[#D8D3C8]` | `#D8D3C8` | Subtle grid marks, construction lines |
| **Success** | `bg-[#7BA68D]` / `text-white` | `#7BA68D` | Success states (sage) |
| **Warning** | `bg-[#F2C94C]` / `text-[#1A1A1A]` | `#F2C94C` | Warning states (yellow) |
| **Error** | `bg-[#E8634A]` / `text-white` | `#E8634A` | Error states (coral) |
| **Info** | `bg-[#1B2838]` / `text-white` | `#1B2838` | Info states (navy) |

### Typography

**Font Families:**
- Display: `Fraunces` (bold display serif, Google Fonts) — weights 700, 900 for hero headings
- Body/UI: `Space Grotesk` (geometric sans, Google Fonts) — weights 400, 500, 600, 700
- Annotation: `Caveat` (handwriting, Google Fonts) — weight 400, 600 — used VERY sparingly for margin notes only

**Type Scale:**
- **H1 Display:** `font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none uppercase` (48px/60px/72px responsive, all-caps)
- **H2 Display:** `font-display text-4xl md:text-5xl font-black tracking-tighter leading-none` (36px/48px responsive)
- **H3:** `font-sans text-2xl md:text-3xl font-bold leading-tight uppercase tracking-wide` (24px/30px, all-caps)
- **H4:** `font-sans text-xl font-bold leading-tight` (20px)
- **Body Large:** `font-sans text-lg leading-relaxed font-medium` (18px, medium weight)
- **Body:** `font-sans text-base leading-relaxed` (16px, 1.6 line-height)
- **Body Small:** `font-sans text-sm leading-normal` (14px)
- **Caption/Label:** `font-sans text-xs font-bold uppercase tracking-wider` (12px, all-caps, bold)
- **Annotation:** `font-handwriting text-lg leading-loose` (18px, Caveat — margin notes only)
- **Stamp/Badge:** `font-sans text-xs font-black uppercase tracking-wider` (12px, all-caps, heavy weight)

**Philosophy:** Mixed typography IS the aesthetic. Display serif (Fraunces) for hero moments, geometric sans (Space Grotesk) for clarity and UI, handwriting (Caveat) for human annotation feel. Heavy use of uppercase and bold weights creates Bauhaus poster energy.

### Spacing

**Base Unit:** 4px (Tailwind default)

**Standard Values:**
- **Button padding:** `px-6 py-3` for primary (24px/12px), `px-5 py-2.5` for medium, `px-4 py-2` for small
- **Input padding:** `px-4 py-3` (16px/12px) — slightly taller for bold aesthetic
- **Card padding:** `p-6` (24px) standard, `p-8` (32px) for featured cards
- **Page gutters:** `px-6 md:px-10 lg:px-16` (generous responsive: 24px/40px/64px)
- **Section spacing:** `space-y-12` (48px) between major sections — extra air
- **Grid/flex gaps:** `gap-8` (32px) for card grids with rotation, `gap-4` (16px) for tight layouts

**Irregular Spacing Philosophy:** Some elements intentionally overlap (negative margins), others have extra air. The grid is visible but broken — this is a feature, not a bug.

### Borders & Corners

**Border Radius:**
- **Sharp Default:** `rounded-none` (0px) — most cards, buttons, inputs. Angular Bauhaus aesthetic.
- **Pill Accents:** `rounded-full` — avatars, small badges, tags, status indicators ONLY. No middle ground.

**Border Width:**
- **Default:** `border-2` (2px) — strong borders everywhere
- **Heavy:** `border-4` (4px) — section dividers, emphasis
- **Stamp Border:** `border-[3px]` — rubber stamp badges

**Shadows:**
- **Hard Drop Shadow (Signature):** `shadow-[4px_4px_0px_#1A1A1A]` — like paper on a board. This is THE defining visual element.
- **Heavy Drop Shadow:** `shadow-[6px_6px_0px_#1A1A1A]` — hover states, emphasis
- **Colored Shadow:** `shadow-[4px_4px_0px_#1B2838]` — navy shadow for coral elements
- **No soft shadows** — only hard, offset shadows

**Rotations:**
- **Slight Tilt:** `rotate-1` (1deg), `-rotate-1`, `rotate-2` (2deg), `-rotate-2` — cards on pinboard
- **Stamp Angle:** `rotate-3`, `-rotate-3` (3deg) — badge/stamp elements

**Philosophy:** Sharp corners (Bauhaus grid) + pill badges (human touch) + hard shadows (paper collage) + slight rotations (creative pinboard). No gradient, no blur, no subtlety — bold geometry only.

## Component Patterns

### Buttons
- **Primary:** Coral background, white text, 2px black border, hard shadow `shadow-[4px_4px_0px_#1A1A1A]`, uppercase bold. Hover increases shadow to 6px.
- **Secondary:** White background, coral text, 2px coral border, hard shadow, uppercase bold.
- **Navy Action:** Navy background, canvas text, 2px black border, hard shadow.
- **Ghost:** Text-only coral, uppercase bold, no border. Hover adds coral underline (thick, 3px).
- **Destructive:** Coral background (same as primary — coral is the action color)

### Inputs
- **Default:** White background, 2px black border, sharp corners (rounded-none), bold labels (all-caps, small)
- **Focus:** Border stays black, add hard shadow `shadow-[4px_4px_0px_#1A1A1A]`
- **Error:** 2px coral border, yellow background tint `bg-[#FFFBF0]`, error text in coral

### Cards
- **Essay Card:** White background, 2px black border, `shadow-[4px_4px_0px_#1A1A1A]`, p-6, sharp corners. No rotation by default (grid alignment).
- **Evidence Card (Pinboard Style):** White background, 2px black border, hard shadow, p-6, **slight rotation** (`rotate-1`, `-rotate-1`, `rotate-2`), appears "pinned" with subtle pushpin visual accent (yellow circle with shadow).
- **Color Block Card:** Bold color background (navy, coral, yellow, sage), white/canvas text, 2px border (black or same color), hard shadow, uppercase headings.
- **Stamp Badge:** Small, rotated (`rotate-3`), 3px border, uppercase font-black text, hard shadow. Like a rubber stamp impression.

### Navigation
- **Top Nav:** Canvas background, 4px bottom border (black), height ~72px (taller, bolder)
- **Nav Links:** Ink black default, coral active (thick 3px underline), uppercase font-bold, tracking-wide
- **Logo/Wordmark:** Display font (Fraunces), font-black, ink black

### Editor
- **Title Input:** Display serif (Fraunces) font, font-black, borderless until focus, focus adds black underline (4px)
- **Content Area:** Generous max-width (~70ch), Space Grotesk body text
- **Toolbar:** Canvas background, button clusters with dividers (4px black lines)
- **Margin Annotations:** Handwriting font (Caveat), coral color, positioned in right margin with thin connecting line (2px dashed coral)

### Special Patterns

**Pinboard Layout:**
Cards in evidence library have:
- Slight rotations (alternating 1-2 degrees)
- Hard drop shadows
- Overlapping with negative margins (`-mt-4`, `-ml-4` on alternate items)
- Small circular "pushpin" accents (yellow or coral, 12px circle with shadow) positioned at top edge

**Rubber Stamp Badges:**
Status indicators styled as stamp impressions:
- Rotated 2-3 degrees
- All-caps, font-black, tight letter-spacing
- 3px border
- Hard shadow
- Examples: "DRAFT", "PUBLISHED", "IN REVIEW"

**Color Block Sections:**
Major sections can have full bold color backgrounds (navy, coral, yellow):
- Full-bleed or contained in bordered blocks
- White/canvas text
- Hard shadows on contained blocks
- Creates visual rhythm and energy

**Grid Construction Marks:**
Subtle grid dots or crosshair marks in background:
- `bg-[#D8D3C8]` color (light taupe)
- Positioned with pseudo-elements or SVG pattern
- Visible but not distracting — suggests the design workspace

**Connected Thinking (Claim-Evidence Links):**
Visual connections between elements:
- 2px dashed lines connecting essay cards to evidence cards
- Small circular nodes at connection points
- Coral or sage color for connection lines
- Makes spatial relationships visible

## Rationale

The collage-board aesthetic directly embodies Microblogger's "creative workspace" positioning. This isn't a polished publishing platform — it's a thinking studio where ideas are assembled, rearranged, and connected. The Bauhaus-inspired geometry (sharp corners, bold color blocks, grid consciousness) signals intellectual rigor and craft. The handwriting annotations and slight card rotations add human warmth and creative energy — this is where a real person is thinking and making. The hard drop shadows are the signature: every element feels tangible, like paper pinned to a board, reinforcing that writing is a physical, iterative practice. The mixed typography (display serif + geometric sans + handwriting) creates visual hierarchy and personality without feeling chaotic. This aesthetic says: "serious creative work happens here, but it's also joyful and exploratory." Perfect for knowledge workers who want a tool that reflects their creative process, not just displays their output. The bold color palette (navy/coral/yellow/sage) is memorable and ownable — not corporate blue, not startup purple, not generic neutral. This is a design system with point of view.

