# Kit: Noir Terminal

## Aesthetic

A premium dark literary terminal — like writing prose in a beautifully designed IDE. Monospace headings create a sense of precision and craft. Argument structure is color-coded like syntax highlighting: claims in amber, evidence in teal, counterarguments in soft pink. Command-palette-driven UI patterns and a persistent status bar make this feel like a power user's tool, not a website. Deep charcoal-blue backgrounds with carefully calibrated contrast deliver a crisp, focused dark mode that feels like a cockpit for thought.

## Design Tokens

### Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| **Surface Dark** | `bg-[#0F1117]` | `#0F1117` | Page background — deep charcoal-blue |
| **Surface Elevated** | `bg-[#1A1D28]` | `#1A1D28` | Cards, panels, elevated surfaces |
| **Surface Hover** | `bg-[#242938]` | `#242938` | Hover states for interactive surfaces |
| **Border** | `border-[#2A2F3F]` | `#2A2F3F` | Default borders, dividers |
| **Border Bright** | `border-[#3A405A]` | `#3A405A` | Active borders, emphasized dividers |
| **Text Primary** | `text-[#E8E6E3]` | `#E8E6E3` | Body text — soft white |
| **Text Secondary** | `text-[#A8A6A3]` | `#A8A6A3` | Supporting text, captions |
| **Text Tertiary** | `text-[#6B6966]` | `#6B6966` | De-emphasized text, disabled |
| **Claim** | `bg-[#E5A84B]` / `text-[#E5A84B]` / `border-[#E5A84B]` | `#E5A84B` | Claims, arguments (syntax highlight amber) |
| **Evidence** | `bg-[#4DC9B0]` / `text-[#4DC9B0]` / `border-[#4DC9B0]` | `#4DC9B0` | Evidence, sources (syntax highlight teal) |
| **Counterargument** | `bg-[#D497A7]` / `text-[#D497A7]` / `border-[#D497A7]` | `#D497A7` | Counterarguments, objections (syntax highlight pink) |
| **Info** | `bg-[#6B9BD2]` / `text-[#6B9BD2]` / `border-[#6B9BD2]` | `#6B9BD2` | Links, info states (muted blue) |
| **Success** | `bg-[#4EC9A0]` / `text-[#4EC9A0]` | `#4EC9A0` | Success states, saved indicator |
| **Warning** | `bg-[#E5A84B]` / `text-[#E5A84B]` | `#E5A84B` | Warning states (shares claim color) |
| **Error** | `bg-[#E85C4B]` / `text-[#E85C4B]` | `#E85C4B` | Error states, destructive actions |

### Typography

**Font Families:**
- Display/Headings/UI Chrome: `JetBrains Mono` (monospace, Google Fonts) — weights 400, 500, 600, 700 — the signature "terminal" feel
- Body: `Inter` (sans-serif, Google Fonts) — weights 400, 500, 600 — comfortable for long-form reading

**Type Scale:**
- **H1:** `font-mono text-3xl md:text-4xl font-bold tracking-tight leading-tight uppercase` (30px/40px responsive, uppercase for terminal aesthetic)
- **H2:** `font-mono text-2xl md:text-3xl font-bold tracking-tight leading-tight uppercase` (24px/30px responsive)
- **H3:** `font-mono text-xl font-semibold tracking-tight leading-snug uppercase` (20px)
- **H4:** `font-mono text-lg font-medium leading-snug` (18px)
- **Body Large:** `font-sans text-lg leading-relaxed` (18px, 1.75 line height)
- **Body:** `font-sans text-base leading-relaxed` (16px, 1.75 line height)
- **Body Small:** `font-sans text-sm leading-normal` (14px)
- **Caption:** `font-mono text-xs leading-normal uppercase tracking-wider` (12px, monospace for labels)
- **Code/Inline:** `font-mono text-sm` (14px)

**Philosophy:** JetBrains Mono headings and UI labels create the precision "terminal" feel. Inter body text ensures comfortable reading. Uppercase headings and monospace captions mimic IDE chrome. The contrast between mono chrome and sans body signals "UI vs content."

### Spacing

**Base Unit:** 8px (denser than editorial kits, aligned with terminal/IDE conventions)

**Standard Values:**
- **Button padding:** `px-4 py-2` (16px horizontal, 8px vertical) for medium, `px-3 py-1.5` for small, `px-5 py-2.5` for large
- **Input padding:** `px-3 py-2` (12px horizontal, 8px vertical)
- **Card padding:** `p-4` (16px) for standard cards, `p-6` (24px) for featured content
- **Page gutters:** `px-4 md:px-6 lg:px-8` (responsive: 16px/24px/32px)
- **Section spacing:** `space-y-6` (24px between major sections), `space-y-3` (12px within sections)
- **Grid/flex gaps:** `gap-4` (16px) for card grids, `gap-3` (12px) for form fields
- **Status bar height:** `h-8` (32px) — compact like VS Code

**Philosophy:** Tighter spacing reflects terminal density. 8px base grid creates rhythm without waste. More compact than editorial kits but never cramped.

### Borders & Corners

**Border Radius:**
- **Default:** `rounded` (4px) — buttons, inputs, cards (subtle)
- **None:** `rounded-none` (0px) — main layout containers, panels (sharp, terminal-like)
- **Pill:** `rounded-full` — badges, tags, status indicators only

**Border Width:**
- **Default:** `border` (1px)
- **None:** `border-0` — borderless elements communicate via background color shifts

**Shadows:**
- **None:** No shadows. Depth is communicated through layered backgrounds and border color, not elevation.

**Philosophy:** Sharp corners on layout, subtle rounds on interactive elements. No shadows — depth comes from color, not light. This reinforces the "digital precision" aesthetic.

## Component Patterns

### Buttons
- **Primary:** Claim amber (`bg-[#E5A84B]`) with dark text (`text-[#0F1117]`), uppercase mono label, no shadow
- **Secondary:** Transparent with border and claim amber text/border, hover adds elevated surface background
- **Ghost:** Text-only, hover adds subtle surface elevated background
- **Destructive:** Error red background, dark text

### Inputs
- **Default:** Elevated surface background, border color, soft white text, monospace placeholder labels
- **Focus:** Border changes to claim amber, no ring (cleaner)
- **Error:** Error red border, error text color for messages

### Cards
- **Content Card:** Elevated surface background, border, sharp or subtle corners, no shadow
- **Evidence Card:** Left border-l-4 in evidence teal to signal sourced content
- **Syntax-highlighted card:** Border-l-4 in claim/evidence/counterargument colors with corresponding background tint

### Navigation (Tab Bar Pattern)
- **Tab bar:** Elevated surface, tabs with active indicator (border-b-2 in claim amber), monospace uppercase labels
- **Active tab:** Claim amber bottom border, soft white text
- **Inactive tabs:** Secondary text, hover adds tertiary text color

### Status Bar
- **Fixed bottom bar:** Surface elevated background, border-top, 32px height
- **Content:** Monospace labels (word count, reading time, status, keyboard hints), left/right justified sections

### Command Palette
- **Modal overlay:** Semi-transparent dark overlay (`bg-black/60`)
- **Palette box:** Elevated surface, border, centered, contains search input + action list
- **Search input:** Borderless, claim amber placeholder/icon
- **Results:** Hover state changes background to surface hover

### Editor (Syntax-Highlighted Argument Structure)
- **Title input:** Large mono font, borderless, soft white text
- **Content area:** Inter body text, comfortable line-height
- **Syntax highlighting:** Inline badges or background tints for claims (amber), evidence refs (teal), counterarguments (pink)
- **Gutter marks:** Small colored indicators (like git diff) for revisions

## Rationale

Noir-terminal directly expresses Microblogger's "power user writing tool" positioning. The monospace headings and tab-based navigation signal "this is a platform for craft, not a blog." Syntax-highlighting argument structure makes intellectual rigor visible and actionable — claims, evidence, and counterarguments are color-coded like code, reinforcing evidence-backed thinking. The command palette and status bar borrow from Linear, VS Code, and Warp — tools knowledge workers already love. Deep charcoal-blue backgrounds with carefully tuned contrast create a dark mode that feels premium, not gloomy. No shadows — just crisp layers — keeps the aesthetic sharp and focused. The overall effect is a writer's cockpit: precise, powerful, and deeply respectful of the craft.

