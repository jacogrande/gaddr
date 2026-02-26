# Agentic UX Testing Plan

How the development agent verifies its own UI/UX work using screenshots, structured judgment, and automated regression — without relying on a human to eyeball every change.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| When it runs | Local dev loop + CI on PR | Agent self-corrects during development; CI provides a second pass with artifacts posted to PR |
| Primary oracle | Hybrid: pixel-diff baselines + LLM-as-judge | Pixel-diff catches regressions deterministically. LLM judge evaluates new UI and subjective quality |
| "Looks good" reference | Design kit (text spec + live page) + UX heuristics | Agent compares against the project's design kit AND general UX quality standards |
| Browser interaction | Scripted Playwright for known flows; agent-driven browser for new/exploratory UI | Deterministic replay where possible, exploratory navigation for new work |
| Agent response to issues | Auto-fix + re-check, max 3 attempts, then escalate to human | Keeps the agent productive without infinite loops on design decisions |
| CI strictness | Advisory: results posted as PR comments, no merge blocking | Visual/UX feedback is informational. Humans decide whether to act on it |
| Judge output format | Structured JSON (Zod-validated) + freeform summary | Fits the project's schema-first approach. Machine-parseable for automation, summary for human context |
| Scope | Core flows only: editor, evidence library, publish page, auth | Keeps baseline maintenance manageable. Expand later |
| Trigger | Dedicated `/ux-check` slash command | Explicit invocation. No noise during rapid iteration |
| Design reference format | Markdown spec with tokens/rules + rendered `/kit` demo page | Agent reasons from text spec AND compares visually against the live reference page |

---

## Architecture Overview

```
Developer/Agent invokes /ux-check
        │
        ▼
┌─────────────────────────────┐
│  1. Start dev server        │
│     (if not running)        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  2. Capture screenshots     │
│     - Playwright scripts    │
│       for known flows       │
│     - Agent-driven browser  │
│       for new UI            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐     ┌────────────────────────┐
│  3. Evaluate                │────▶│  Pixel-diff engine     │
│     (parallel oracles)      │     │  (Playwright baselines)│
│                             │     └────────────────────────┘
│                             │     ┌────────────────────────┐
│                             │────▶│  LLM judge             │
│                             │     │  (screenshot + design  │
│                             │     │   kit + heuristics)    │
│                             │     └────────────────────────┘
│                             │     ┌────────────────────────┐
│                             │────▶│  Accessibility scan    │
│                             │     │  (axe-core via         │
│                             │     │   Playwright)          │
└──────────┬──────────────────┘     └────────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  4. Aggregate results       │
│     - Structured report     │
│     - Pass / issues found   │
└──────────┬──────────────────┘
           │
       ┌───┴───┐
       │Issues?│
       └───┬───┘
      no   │   yes
       │   │    │
       ▼   │    ▼
    Done    │  ┌──────────────────────┐
            │  │  5. Auto-fix attempt │
            │  │     (up to 3x)       │
            │  └──────────┬───────────┘
            │             │
            │         ┌───┴───┐
            │         │Fixed? │
            │         └───┬───┘
            │        yes  │  no
            │         │   │   │
            │         ▼   │   ▼
            │      Done   │  Escalate to human
            │             │  with report +
            │             │  screenshots
            └─────────────┘
```

---

## Two Oracles, Two Jobs

### Oracle 1: Pixel-Diff Baselines (Regression)

**Job:** Catch unintended visual changes to existing UI.

Uses Playwright's built-in `toHaveScreenshot()`. On first run, generates baseline images. On subsequent runs, diffs current render against baselines. Fails if diff exceeds threshold.

**When it's useful:**
- After refactoring CSS/layout
- After dependency upgrades
- After changing shared components that affect multiple pages

**When it's NOT useful:**
- Building new UI that has no baseline yet
- Making intentional design changes (baselines need updating)

**Stability tactics:**
- Mask dynamic content (timestamps, user names, generated IDs)
- Use deterministic test data / fixtures
- Wait for network idle + animation completion before capture
- Fixed viewport sizes (desktop: 1280x720, mobile: 375x812)

### Oracle 2: LLM-as-Judge (Quality + Conformance)

**Job:** Evaluate whether UI looks good, conforms to the design kit, and follows UX heuristics.

The agent sends screenshots to the LLM along with:
1. The design kit text spec (tokens, component rules, layout policies)
2. A screenshot of the `/kit` reference page for visual comparison
3. A UX heuristics checklist (contrast, hierarchy, spacing, readability, consistency)

The judge returns structured output (see schema below).

**When it's useful:**
- New UI with no baseline yet
- Subjective quality assessment (does this "feel" right?)
- Checking design kit conformance after building new components
- Evaluating responsive behavior across viewports

**When it's NOT useful:**
- Detecting subtle pixel-level regressions (pixel-diff is better)
- Anything requiring perfect determinism (LLM judgments vary)

---

## LLM Judge Output Schema

```typescript
// domain/review/ux-review.schemas.ts

import { z } from "zod";

const UxIssueSeverity = z.enum(["critical", "major", "minor", "suggestion"]);

const UxIssueType = z.enum([
  "design_kit_deviation",   // Doesn't match design tokens/components
  "layout_broken",          // Overlapping, clipped, or misaligned elements
  "contrast_insufficient",  // Text/background contrast too low
  "hierarchy_unclear",      // Visual hierarchy doesn't communicate importance
  "spacing_inconsistent",   // Padding/margin doesn't match design kit policy
  "responsive_broken",      // Layout breaks at tested viewport
  "interaction_broken",     // Button/link/form doesn't behave as expected
  "accessibility_issue",    // Flagged by axe or visually apparent a11y problem
  "general_ux",             // Catch-all for other UX concerns
]);

const UxIssue = z.object({
  type: UxIssueType,
  severity: UxIssueSeverity,
  location: z.string(),          // e.g. "editor page > toolbar > publish button"
  description: z.string(),       // What's wrong
  designKitRule: z.string().optional(), // Which design kit rule is violated
  suggestedFix: z.string(),      // Concrete action to resolve
});

const UxReviewResult = z.object({
  page: z.string(),              // Which page/flow was evaluated
  viewport: z.string(),          // e.g. "1280x720" or "375x812"
  overallScore: z.number().min(1).max(10),
  issues: z.array(UxIssue),
  summary: z.string(),           // Freeform 2-3 sentence assessment
  designKitConformance: z.enum(["full", "minor_deviations", "major_deviations"]),
});
```

This schema lives in the domain layer (pure types, Zod validation) and is used both by the local `/ux-check` command and the CI reviewer.

---

## Screenshot Capture Strategy

### Known Flows (Scripted Playwright)

Pre-authored test scripts that navigate deterministic paths and capture at defined checkpoints. These scripts live in `test/visual/` and mirror the core flows.

```
test/visual/
  auth.visual.ts          # Sign-in page, OAuth buttons, redirect
  editor.visual.ts        # Empty editor, editor with content, editor with feedback
  publish.visual.ts       # Published essay page, evidence expanded, 404 state
  library.visual.ts       # Evidence library empty, with cards, card detail
```

Each script:
1. Seeds the page with known test data (fixtures)
2. Navigates to the target state
3. Waits for stability (network idle, animations complete)
4. Captures at multiple viewports (desktop + mobile)
5. Runs axe accessibility scan at each checkpoint

### New/Exploratory UI (Agent-Driven Browser)

When the agent builds new UI that doesn't have a pre-authored visual test yet, it uses Playwright's API directly (or via an MCP browser tool) to:

1. Navigate to the new page/component
2. Interact with it (click buttons, fill forms, trigger states)
3. Screenshot at each meaningful state
4. Send screenshots to the LLM judge

This is less reproducible but catches issues during development before scripted tests exist. Once the UI stabilizes, the agent should write a scripted visual test to make the check permanent.

**The expectation:** every new UI surface eventually gets a scripted visual test. Agent-driven exploration is the bootstrapping mechanism, not a permanent substitute.

---

## Local Development Flow (`/ux-check`)

### What it does

1. Ensures the dev server is running (`bun run dev`)
2. Runs all scripted visual tests in `test/visual/`
3. For any new/changed pages without visual tests, does agent-driven exploration
4. Runs both oracles in parallel:
   - Pixel-diff against existing baselines
   - LLM judge against design kit + heuristics
5. Runs axe accessibility scans
6. Aggregates results into a structured report
7. If issues found: attempts auto-fix (up to 3 iterations)
8. If still failing after 3 attempts: reports to developer with screenshots and structured issues

### What auto-fix looks like

On each iteration:
1. Agent reads the structured issue list
2. Identifies the source files responsible (component, CSS, layout)
3. Makes targeted edits to address the highest-severity issues first
4. Re-runs the failing checks (not the full suite — just the failing pages)
5. Re-evaluates with the same oracle that flagged the issue

**What the agent should NOT do during auto-fix:**
- Change the design kit to match the broken UI
- Suppress or relax test thresholds
- Make unrelated changes to "improve" things
- Loop more than 3 times

### Example invocation

```
> /ux-check

Running UX checks on core flows...

Pixel-diff baselines:
  ✓ auth sign-in (desktop)
  ✓ auth sign-in (mobile)
  ✗ editor page (desktop) — 2.3% diff detected
  ✓ editor page (mobile)
  ✓ publish page (desktop)

LLM judge:
  ✓ auth sign-in — 9/10, full design kit conformance
  ⚠ editor page — 6/10, minor deviations
    - [major] spacing_inconsistent: toolbar button gap is 8px, design kit specifies 12px
    - [minor] hierarchy_unclear: save button same weight as secondary actions
  ✓ publish page — 8/10, full conformance

Accessibility:
  ✓ auth sign-in — 0 violations
  ⚠ editor page — 1 violation
    - [serious] button "Publish" missing accessible name
  ✓ publish page — 0 violations

3 issues found. Attempting auto-fix (1/3)...
```

---

## CI Flow (PR Advisory)

### What it does

On every PR that touches UI files (`src/app/**`, `*.tsx`, `*.css`):

1. Starts the app in preview mode
2. Runs all scripted visual tests
3. Runs pixel-diff against baselines committed in the repo
4. Runs LLM judge on affected pages
5. Runs axe accessibility scans
6. Posts results as a PR comment with:
   - Summary table (pass/fail per page per oracle)
   - Diff images (before/after) for any pixel-diff failures
   - Structured issues from LLM judge
   - Accessibility violations
   - Screenshots of each tested page at each viewport

### What it does NOT do

- Block merge (advisory only)
- Auto-fix anything (CI is read-only; fixes happen in the development loop)
- Run on PRs that don't touch UI files (skip unnecessary work)

### PR comment format

```markdown
## UX Review

| Page | Pixel-Diff | LLM Judge | A11y | Score |
|------|-----------|-----------|------|-------|
| Editor (desktop) | ⚠ 2.3% diff | 6/10 minor deviations | 1 violation | ⚠ |
| Editor (mobile) | ✓ | 8/10 | 0 violations | ✓ |
| Publish (desktop) | ✓ | 9/10 | 0 violations | ✓ |
| Auth (desktop) | ✓ | 9/10 | 0 violations | ✓ |

### Issues (2)

**[major] editor page > toolbar**: Button spacing is 8px, design kit specifies 12px.
Fix: Update gap in toolbar flex container.

**[serious] editor page > publish button**: Missing accessible name.
Fix: Add aria-label or visible text.

### Diff Images
[editor-desktop-diff.png attached]

### Screenshots
[editor-desktop.png] [editor-mobile.png] [publish-desktop.png] [auth-desktop.png]
```

---

## Design Kit as Reference

The LLM judge needs two forms of the design kit:

### 1. Text Spec (`docs/design-kit.md`)

A markdown document containing:

- **Color palette:** hex values, semantic names (primary, surface, error, etc.)
- **Typography:** font families, size scale, weight rules, line height
- **Spacing:** base unit, padding/margin scale, gap policy
- **Corners:** border-radius policy (e.g. "4px for inputs, 8px for cards, full-round for avatars")
- **Shadows:** levels and usage rules
- **Component specs:** button variants, card styles, input states, modal behavior
- **Layout rules:** max-width, grid/flex patterns, responsive breakpoints
- **Tone:** overall aesthetic description (what "on-brand" looks like)

The agent reads this document as text context when judging screenshots. It enables reasoning like "the design kit says buttons use 12px padding, but this button appears to use 8px."

### 2. Live Reference Page (`/kit`)

A rendered page in the app (dev-only route, excluded from production build) that displays all design kit components in their canonical state:

- Color swatches
- Typography samples at every scale
- Button variants (primary, secondary, ghost, disabled, loading)
- Input states (empty, filled, error, disabled)
- Card layouts
- Spacing demonstration

The agent screenshots this page and includes it alongside the page-under-test screenshot when sending to the LLM judge. This gives the judge a visual ground truth to compare against, not just text descriptions.

---

## Heuristics Checklist

The LLM judge evaluates each screenshot against these heuristics (included in the judge prompt):

1. **Contrast:** Text readable against background? Interactive elements distinguishable?
2. **Hierarchy:** Most important element draws attention first? Clear primary/secondary/tertiary levels?
3. **Spacing:** Consistent margins/padding? Related elements grouped? Unrelated elements separated?
4. **Alignment:** Elements on a grid? No orphaned or floating items?
5. **Responsiveness:** Nothing clipped, overlapping, or unreachable at this viewport?
6. **Consistency:** Same patterns used for same concepts? No one-off styling?
7. **Readability:** Line length comfortable (50-75 chars)? Font size adequate? Sufficient line height?
8. **Feedback:** Interactive elements look interactive? States (hover, active, disabled) communicated?
9. **Design kit conformance:** Colors, typography, spacing, corners match the spec?
10. **Accessibility (visual):** Focus indicators visible? Error states communicated beyond color?

---

## File Layout

```
test/
  visual/
    auth.visual.ts
    editor.visual.ts
    publish.visual.ts
    library.visual.ts
    baselines/              # Committed pixel-diff reference images
      auth-signin-desktop.png
      auth-signin-mobile.png
      editor-desktop.png
      ...
    fixtures/               # Deterministic test data for seeding pages

src/
  domain/
    review/
      ux-review.schemas.ts  # UxReviewResult, UxIssue Zod schemas

docs/
  design-kit.md             # Text spec: tokens, components, rules

src/app/
  (dev)/
    kit/
      page.tsx              # Live design kit reference page (dev only)

.agents/skills/
  ux-check/
    SKILL.md                # Slash command definition + judge prompt
```

---

## Implementation Sequence

This doesn't need its own sprint. It layers on top of the existing sprint plan:

1. **Sprint 1-2 timeframe:** Set up Playwright for visual tests. Create `test/visual/` structure. Write first baseline for auth pages. No LLM judge yet — just pixel-diff.

2. **Sprint 2-3 timeframe:** Build the `/kit` reference page alongside the first real UI components. Write `docs/design-kit.md` as design decisions are made.

3. **Sprint 3-4 timeframe:** Implement the LLM judge. Create the `/ux-check` skill. Wire up the structured output schema. Run against editor + publish pages.

4. **Sprint 4+ timeframe:** Add CI workflow. Expand visual test coverage as new pages are built. Refine the judge prompt based on false positive/negative patterns.

---

## Open Questions

- **LLM cost:** Each judge call sends screenshots + design kit context. Need to monitor token usage and decide whether to use a cheaper model (Haiku) for initial triage vs a capable model (Sonnet/Opus) for final judgment.
- **Baseline management:** Who updates baselines when intentional design changes happen? The agent during `/ux-check`? A dedicated command? Manual commit?
- **Flake tolerance:** What pixel-diff threshold is too noisy vs too loose? Start at 0.5% and adjust based on experience.
- **Cross-browser:** MVP is Chromium only. Add Firefox/WebKit when the team has bandwidth for the additional baselines.
