# Design Kit Pipeline

You are orchestrating a multi-agent design kit generation pipeline. The user has provided an aesthetic direction via `$ARGUMENTS`. Your job is to coordinate the full pipeline: plan, build, screenshot, judge, synthesize.

## Prerequisites

Before starting, verify:
1. Dev server can run (`bun run dev` — just check it's configured, don't block on it)
2. Playwright is available (`bunx playwright --version`). If not installed, run `bun add -d @playwright/test && bunx playwright install chromium`

## Step 1: Read Product Context

Read these files to understand the product:
- `docs/product-and-design-philosophy.md` — what the product is, who it's for, the authorship rule
- `docs/architecture.md` — tech stack, the 3 core screens (editor, evidence library, publish page)
- `CLAUDE.md` — project constraints

Extract a **product context summary** (keep under 300 words) covering:
- Product purpose (micro-essay writing studio, coaching not ghostwriting)
- Target users (knowledge workers, writers building thinking portfolios)
- Core screens (editor, evidence library, publish page)
- Emotional tone (practice-oriented, trustworthy, evidence-backed, not flashy)
- Technical constraints (Next.js App Router, Tailwind CSS, responsive)

You will pass this summary to each subagent.

## Step 2: Plan 6 Aesthetic Directions

Using the user's input (`$ARGUMENTS`) and the product context, brainstorm **6 distinct aesthetic directions**. They should be diverse — not 6 variations of the same idea.

For each direction, define:
- **Name**: short, descriptive (e.g., "alpine", "editorial", "warm-minimal")
- **Description**: 2-3 sentences capturing the visual feel
- **Key characteristics**: 3-5 bullet points (color mood, typography style, spacing philosophy, corner treatment, overall energy)
- **Reference touchstones**: 1-2 existing products/sites that evoke this feel

Write the plan to `docs/kits/README.md`.

## Step 3: Build Kits (Parallel)

For each of the 6 directions, use the **Task tool** to spawn a `kit-builder` subagent **in the background**. Pass each one a prompt containing:

1. The aesthetic direction (name, description, characteristics, touchstones)
2. The product context summary from Step 1
3. The kit name (use the direction name, lowercase, hyphenated)
4. Output paths:
   - Spec: `docs/kits/{kit-name}.md`
   - Demo page: `src/app/(dev)/kit/{kit-name}/page.tsx`

Launch all 6 in parallel using `run_in_background: true`. Then wait for all to complete by checking their output files.

## Step 4: Screenshot All Kits

After all 6 kits are built:

1. Start the dev server if not running: `bun run dev &`
2. Wait a few seconds for it to be ready
3. Run: `bun scripts/screenshot-kits.ts {kit-1} {kit-2} ... {kit-6}`
   - This captures desktop (1280x720) and mobile (375x812) screenshots of each kit
   - Outputs to `test/visual/kits/{name}-{viewport}.png`
4. Verify the screenshot files exist

## Step 5: Tournament Judging

Use the **Task tool** to spawn a `kit-judge` subagent. Pass it:

1. Paths to all 6 kit spec files (`docs/kits/*.md`)
2. Paths to all screenshot files (`test/visual/kits/*.png`)
3. The product context summary
4. Instruction to write results to `docs/kits/judge-report.md`

Wait for the judge to complete. Read the judge report.

## Step 6: Synthesis

Use the **Task tool** to spawn a `kit-synthesizer` subagent. Pass it:

1. The judge report path (`docs/kits/judge-report.md`)
2. Paths to the top 2-3 kit specs (as identified by the judge)
3. The product context summary
4. Output paths:
   - Final spec: `docs/design-kit.md`
   - Final reference page: `src/app/(dev)/kit/page.tsx`

Wait for the synthesizer to complete.

## Step 7: Report to User

Summarize the results:
- Which 6 directions were explored (name + one-liner each)
- Tournament standings (1st through 6th with scores)
- What the synthesized kit took from which source kits
- Links to the final outputs (`docs/design-kit.md`, `/kit` route)
- Any issues encountered

## Error Handling

- If a kit-builder fails, note it and continue with the remaining kits (5 is fine, 4 is the minimum for a meaningful tournament)
- If the screenshot script fails, check that the dev server is running and the kit pages compile. Fix build errors if possible, skip unscreenshotable kits
- If the judge or synthesizer fails, surface the error with context and ask the user how to proceed

## File Structure Created

```
docs/
  kits/
    README.md                    # Plan: 6 aesthetic directions
    {kit-name}.md                # Spec per kit (design tokens, rules, rationale)
    judge-report.md              # Tournament results and analysis
  design-kit.md                  # Final synthesized design spec

src/app/(dev)/kit/
  {kit-name}/page.tsx            # Demo page per kit (6 total)
  page.tsx                       # Final synthesized reference page

test/visual/kits/
  {kit-name}-desktop.png         # Screenshots
  {kit-name}-mobile.png
```
