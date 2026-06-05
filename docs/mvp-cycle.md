# MVP Cycle Plan

Break the product into small, testable increments. Each sprint should end with a user-visible workflow, not just backend scaffolding.

## Scope

Prove that users can move through the full writing loop:

1. uninterrupted freewrite
2. source-grounded constellation review
3. auto-annotated first draft
4. uninterrupted final draft

The MVP is successful if people reach a stronger finished draft without feeling like AI took authorship away from them.

## Product Constraints

- The typing path is sacred. No blocking AI work during active drafting.
- All citations and factual pushback need provenance.
- Counterarguments should be steelmanned.
- Annotations should guide revision, not write replacement prose.
- Final draft mode should be calmer than review mode, not noisier.

## What Is Done Today

### Sprint 0: Core App Setup [DONE]

Shipped:

- Next.js app shell
- Bun-based toolchain
- Drizzle + Postgres wiring
- Better Auth integration
- CI running `bun run check` and `bun test`
- agent-driven eval harness (`agent-browser` skill) bootstrapping

Testable:

- the app boots locally
- auth routes exist
- health endpoint responds

### Sprint 1: Protected Freewrite Shell [DONE]

Shipped:

- protected `/editor` route
- TipTap editor
- local-first persistence
- hotkeys, slash menu, command palette, glyph replacement
- sprint timer and board transition shell
- theme support
- E2E coverage for auth, editor, sprint, theme, and navigation

Testable:

- a signed-in user can write, reload, and keep their draft
- sprint controls work
- the post-sprint transition shell appears

### Sprint 1.5: Trigger Substrate [IN PROGRESS]

Groundwork for the intelligence layer, built ahead of the constellation pipeline so the keystroke-path plumbing is settled before any model is wired.

Shipped:

- pure trigger detector (`src/domain/editor/trigger-detector.ts`) emitting pause-bounded P-burst triggers (`production-pause`, `question-posed`, `max-quiet-time`) with boundary / pause / threshold metadata
- editor hook (`use-trigger-detector.ts`) that observes TipTap and fires triggers during typing, off the keystroke path
- two delivery seams for the future gadfly call: an `observer` callback and an async `semanticCompletionCheck` gate
- unit coverage for the detector across boundaries, reasons, and adaptive thresholds

Not yet done:

- **the gadfly call is stubbed** — the default observer only console-logs (behind `NEXT_PUBLIC_DEBUG_TRIGGERS`). No model is invoked yet. Wiring a real background inference call into the observer seam is the first move of Sprint 2.

## The Next Sprints

> **Canonical sources.** Intelligence-feature detail (what findings exist, in what dependency order, with the "guide, not critic" framing) lives in [intelligence-roadmap.md](./intelligence-roadmap.md) — treat it as authoritative for the *content* of the constellation. This file owns *delivery sequencing* across the whole loop. Where the two describe the same layer, intelligence-roadmap's vocabulary (themes / tentative-positions / tensions) wins over the older constellation vocabulary (claims / counterarguments / issues).

### Sprint 2: Constellation Research Pipeline [NEXT]

Goal:

Turn a completed freewrite into a structured constellation run. This sprint delivers **Intelligence Phase 1: Discovery Substrate** — see [intelligence-roadmap.md](./intelligence-roadmap.md) for the feature detail and provenance-tier rules.

Domain:

- draft snapshot model
- discovery-substrate result types: theme extraction, tentative-position detection (intent axis: asserting / testing / wondering), internal-tension map
- a claim graph as the secondary output for positions sharp enough to act as claims
- three-tier provenance model (`sourced` / `inferred` / `heuristic`) and provenance rules
- no-ghostwriting validation for all constellation output

Infra:

- background inference adapter wired into the trigger observer seam (Sprint 1.5), with a **deterministic stub** so evals never depend on live model/retrieval state
- hallucination-defense infrastructure: retrieval, span verification, confidence thresholds, graceful decline (Phase 2 depends on this maturing early)
- persistence for constellation runs and findings

App:

- trigger constellation generation after sprint completion
- loading/progress state for a run
- recoverable failure states when retrieval or inference fails

Tests:

- unit tests for provenance validation, tier classification, and tension mapping
- contract tests for the inference / retrieval adapters against their stubs
- agent-driven eval proving sprint completion launches a constellation run

Testable:

- finish a sprint
- see a constellation run start
- see a ranked theme list, position list with intent labels, and an internal-tension map return for the written draft

### Sprint 3: Constellation View [NEXT]

Goal:

Make the post-sprint board useful, not just decorative.

Domain:

- grouping / ranking rules for findings
- claim-to-finding relationships
- support / complication / contradiction semantics
- issue severity model

App:

- board UI showing claims, citations, counterarguments, and issues
- source cards with provenance
- clear distinction between sourced evidence and heuristic feedback
- actions to accept, ignore, or defer findings

Tests:

- E2E coverage for board rendering and interaction
- visual QA for the board at desktop and mobile viewports

Testable:

- after freewrite, the user can inspect claim-linked findings
- the user can open source details and understand why each finding appeared

### Sprint 4: Auto-Annotated First Draft [NEXT]

Goal:

Convert accepted constellation findings into anchored annotations on the draft.

Domain:

- annotation type and severity
- annotation anchors
- annotation generation rules
- accepted vs ignored finding state

Infra:

- annotation persistence
- idempotent generation / regeneration rules

App:

- annotated first-draft surface
- ability to jump from annotation to source-backed finding
- resolve / ignore / revisit controls

Tests:

- unit tests for annotation application and anchor recovery
- E2E coverage for generating and browsing annotations

Testable:

- accept a constellation finding
- return to the draft
- see a clear, anchored annotation explaining what needs revision and why

### Sprint 5: Final Draft Mode [NEXT]

Goal:

Return the writer to a calm revision surface.

Domain:

- final-draft session state
- annotation resolution rules
- draft versioning rules

App:

- dedicated final-draft mode
- reduced AI chrome
- annotation access without forcing constant context switching
- explicit completion / handoff state

Tests:

- E2E coverage for entering final-draft mode, resolving notes, and continuing to write
- regression checks to ensure the editor remains interruption-free

Testable:

- move from annotations into a clean writing pass
- revise while selectively consulting notes
- finish with a stronger draft and fewer open issues

### Sprint 6: Trust, Quality, and Reliability [LATER]

Goal:

Make the system credible enough for repeated use.

Focus:

- citation quality monitoring
- retrieval and parsing failure handling
- provenance completeness checks
- grounding / hallucination regression coverage
- product analytics for loop completion
- optional background worker if constellation latency grows beyond request budgets

Testable:

- constellation and annotation runs are stable enough to trust during repeated sessions

## Out of Scope for This MVP

These are explicitly not the center of the current roadmap:

- public publishing pages
- portfolio dashboards
- standalone evidence library as the primary workflow
- social or peer feedback features

Those ideas may return later, but they should not distort the current sequencing.

## Delivery Rule

For every sprint:

1. Define the pure domain types first.
2. Write the unit tests for the core rules.
3. Implement adapters second.
4. Keep UI routes and actions thin.
5. Add or update the agent-driven workflow spec in `eval/*.json`.

If a sprint ends without a testable user flow, it is not done.
