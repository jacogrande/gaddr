# Agentic UX Testing Plan

## 1. Goal

Verify the writing loop with enough rigor that UI and workflow regressions are caught early.

The product loop we need to protect is:

1. uninterrupted freewrite
2. constellation review
3. auto-annotated first draft
4. uninterrupted final draft

The testing system should reflect that loop directly.

## 2. Current Harness

The repo already has a practical workflow harness:

- `eval/*.json` contains human-readable workflow specs
- `test/e2e/*.pw.ts` contains executable Playwright tests
- `playwright.config.ts` boots the app in test mode
- `E2E_BYPASS_AUTH=true` allows protected-flow coverage without real OAuth

This is the current source of truth for product workflow verification.

## 3. What Is Covered Today

Current E2E coverage exists for:

- auth redirects, sign-in screen, sign-out wiring, stale cookies
- editor persistence and hotkeys
- slash menu and command palette
- glyph replacement and modifier badges
- sprint timing and the board transition shell
- theme behavior
- navigation and health endpoint behavior

That means the current harness is strongest on the freewrite shell, not yet on the constellation and annotation layers.

## 4. What Needs Coverage Next

As the product evolves, the next E2E additions should be:

### 4.1 Constellation flows

- sprint completion triggers a constellation run
- loading and failure states are understandable
- citations appear with provenance
- counterarguments and issues are linked to the right claims
- users can accept, ignore, or defer findings

### 4.2 Annotation flows

- accepted findings become annotations
- annotations anchor to the correct text
- users can jump from annotation to underlying finding or source
- annotations can be resolved or ignored

### 4.3 Final draft flows

- the user can enter a cleaner final-draft mode
- AI chrome is reduced
- annotations remain accessible without dominating the page
- revision continues without interruption

## 5. Workflow Contract Design

Each meaningful product behavior should exist in two places:

1. a plain-language workflow in `eval/*.json`
2. an executable Playwright test in `test/e2e/*.pw.ts`

That gives us:

- readable product intent
- runnable regression coverage

When a new feature ships, both should be updated together.

## 6. Authoring Rules for New Flows

When adding a new user flow:

1. Add or update a workflow spec in `eval/*.json`.
2. Add stable `data-testid` hooks where needed.
3. Write a Playwright test that matches the workflow language closely.
4. Prefer deterministic fixtures over live external dependencies.
5. Keep auth bypass support where possible so protected flows remain easy to run in CI.

## 7. Test Priorities

### Priority 1: Protect the typing path

We should aggressively test:

- editor boot
- persistence
- hotkeys
- sprint controls
- mode transitions

If the freewrite or final-draft experience becomes sluggish or noisy, the product is regressing.

### Priority 2: Protect trust

We should test:

- citation provenance visibility
- distinction between sourced evidence and model inference
- clear failure states when no usable sources are found
- absence of ghostwritten replacement prose in annotations

### Priority 3: Protect mode boundaries

We should test:

- freewrite is quiet
- constellation is exploratory
- annotation mode is legible
- final draft returns to a calmer writing surface

If those modes start collapsing into one another, the UX is drifting.

## 8. Stability Rules

To keep tests reliable:

- use fixed test data when possible
- avoid asserting on incidental styling details unless a visual test is the point
- wait for explicit UI states, not arbitrary timing, where possible
- isolate async review flows behind deterministic fixtures or adapter stubs in test mode

The only place where timing-based waits are acceptable is when we are explicitly testing timed behavior like the sprint transition.

## 9. Visual QA Roadmap

The repo does not yet have a full visual regression system for the new writing loop. Once the constellation and annotation surfaces stabilize, add:

- screenshot baselines for freewrite, constellation, annotated first draft, and final draft
- desktop and mobile coverage
- accessibility scans for each major state

Optional future layer:

- an LLM-assisted design review step for triage and prioritization

That should be additive. It should not replace deterministic Playwright coverage.

## 10. Suggested Test Layout

As the next product surfaces land, the suite should trend toward:

```text
eval/
  auth.json
  editor.json
  sprint.json
  constellation.json
  annotation.json
  final-draft.json

test/e2e/
  auth-eval.pw.ts
  editor-eval.pw.ts
  sprint-eval.pw.ts
  constellation-eval.pw.ts
  annotation-eval.pw.ts
  final-draft-eval.pw.ts
```

Not every file needs to exist immediately, but this is the shape we should be growing toward.

## 11. Definition of Done for UX Work

A UI change is not done when it merely looks right locally.

It is done when:

- the workflow is described in `eval/*.json`
- the behavior is covered in Playwright
- selectors and states are stable enough for future agents to reuse
- the result preserves the intended product mode

The testing harness should make it hard to accidentally turn a disciplined writing tool into an interruptive AI editor.
