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

The repo runs an **agent-driven eval harness**:

- `eval/*.json` contains human-readable workflow specs — the source of truth.
- Workflows are executed via the `agent-browser` skill (Vercel Labs). The skill drives Chrome over CDP, takes accessibility-tree snapshots, and walks the steps using compact `@eN` element refs.
- `E2E_BYPASS_AUTH=true bun run dev` boots the app in a mode that lets the agent reach protected routes without OAuth.

There is no headless CI runner for workflow evals. Workflow verification is an agent-time activity: when a change ships, you ask the agent to walk the relevant eval, and it reports back.

Why this shape:

- evals stay readable; product intent is the artifact, not Playwright code
- the same specs serve future agents that may handle constellation or annotation review
- the writing surface itself uses agent intelligence — testing it agent-side keeps the substrate consistent
- avoids the maintenance cost of keeping a parallel codified test suite in lockstep with rapidly changing UX

The tradeoff is honest: regression coverage runs at agent time, not commit time. CI catches typecheck/lint and pure-domain unit tests (`bun test`), but not user workflows.

## 3. What Is Covered Today

Workflow specs exist for:

- auth redirects, sign-in screen, sign-out wiring, stale cookies
- editor persistence and hotkeys
- slash menu and command palette
- glyph replacement and modifier badges
- sprint timing and the board transition
- theme behavior
- navigation and health endpoint behavior

That means the current coverage is strongest on the freewrite shell, not yet on the constellation and annotation layers.

## 4. What Needs Coverage Next

As the product evolves, the next eval additions should be:

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

Each meaningful product behavior lives as a single artifact:

- a plain-language workflow in `eval/*.json` with stable `data-testid` hooks referenced in the steps

That gives us readable product intent that the agent can execute. When a new feature ships, the eval should be authored or updated alongside the code.

## 6. Authoring Rules for New Flows

When adding a new user flow:

1. Add or update a workflow spec in `eval/*.json` with the steps in writer-readable language.
2. Add stable `data-testid` hooks where the steps reference specific affordances. Prefer those over CSS selectors so a UI redesign doesn't silently break the eval.
3. Mention the relevant URLs and any `E2E_BYPASS_AUTH=true` requirements in the spec preamble.
4. Prefer deterministic fixtures over live external dependencies — the agent should not need flaky third-party state.
5. Keep auth bypass support so protected flows are easy to run without manual OAuth.

## 7. Test Priorities

### Priority 1: Protect the typing path

We should aggressively verify:

- editor boot
- persistence
- hotkeys
- sprint controls
- mode transitions

If the freewrite or final-draft experience becomes sluggish or noisy, the product is regressing.

### Priority 2: Protect trust

We should verify:

- citation provenance visibility
- distinction between sourced evidence and model inference
- clear failure states when no usable sources are found
- absence of ghostwritten replacement prose in annotations

### Priority 3: Protect mode boundaries

We should verify:

- freewrite is quiet
- constellation is exploratory
- annotation mode is legible
- final draft returns to a calmer writing surface

If those modes start collapsing into one another, the UX is drifting.

## 8. Stability Rules

To keep the evals reliable when the agent runs them:

- use fixed test data when possible
- avoid asserting on incidental styling details unless a visual check is the point
- wait for explicit UI states, not arbitrary timing, where possible
- isolate async review flows behind deterministic fixtures or adapter stubs in test mode
- prefer `data-testid` over text matching for stability across copy edits

The only place where timing-based waits are acceptable is when we are explicitly testing timed behavior like the sprint transition.

## 9. Visual QA Roadmap

Visual regression is not yet automated for the new writing loop. The agent-browser skill can take screenshots inline during a walkthrough; once the constellation and annotation surfaces stabilize we should add:

- screenshot baselines for freewrite, constellation, annotated first draft, and final draft
- desktop and mobile coverage
- accessibility scans for each major state

## 10. Suggested Workflow Layout

As the next product surfaces land, the eval suite should trend toward:

```text
eval/
  auth.json
  editor.json
  sprint.json
  constellation.json
  annotation.json
  final-draft.json
```

Not every file needs to exist immediately, but this is the shape we should be growing toward.

## 11. Definition of Done for UX Work

A UI change is not done when it merely looks right locally.

It is done when:

- the workflow is described in `eval/*.json`
- `data-testid` hooks exist for the affordances the eval references
- the agent can walk the workflow start-to-finish without manual intervention
- the result preserves the intended product mode

The harness should make it hard to accidentally turn a disciplined writing tool into an interruptive AI editor.
