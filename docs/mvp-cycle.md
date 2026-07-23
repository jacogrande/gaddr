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

### Sprint 1.5: Trigger Substrate [DONE]

Groundwork for the intelligence layer, built ahead of the constellation pipeline so the keystroke-path plumbing is settled before any model is wired.

Shipped:

- pure trigger detector (`src/domain/editor/trigger-detector.ts`) emitting pause-bounded P-burst triggers (`production-pause`, `question-posed`, `max-quiet-time`) with boundary / pause / threshold metadata
- editor hook (`use-trigger-detector.ts`) that observes TipTap and fires triggers during typing, off the keystroke path
- two delivery seams for inference consumers: an `observer` callback and an async `semanticCompletionCheck` gate
- unit coverage for the detector across boundaries, reasons, and adaptive thresholds

Status note (2026-07): the observer seam now feeds **real inference** — Spark's pre-warm rides the production-pause triggers (Sprint 1.7). The during-sprint drip (triage/analysis) still runs on browser-side mock adapters by design; migrating those server-side is a decoupled backlog item, not a blocker for anything below.

### Sprint 1.7: Spark + Server Inference Foundation [DONE]

Shipped 2026-07-08, tuned to v3 by 2026-07-10, provider-portable by 2026-07-23. Spec: `docs/product/spark.md` + `docs/plans/spark-implementation.md`. Not originally in this cycle plan — inserted here because it quietly delivered most of Sprint 2's infrastructure list.

Shipped:

- summonable Spark cards: pre-warmed candidates, lens taxonomy, one re-roll, quiet fizzle; the never-unbidden contract is eval-asserted
- durable client-minted `SprintId` (UUID, survives reload) — the key all persistence hangs off
- server-side inference foundation: `structured-call.ts` discipline (neutral outcome vocabulary, bounded repair with exact validator errors), versioned prompt registry, `spark_event` + `inference_attempt` telemetry
- **LLM provider portability**: a neutral facade over native provider SDKs, per-stage provider/model registry (`LLM_PROVIDER`), OpenAI + Anthropic adapters; spark runs on `gpt-5.6-luna` (yield gate 3/3, then 24/24 on the golden corpus)
- shared primitives for the constellation build: span-matcher + ghost-echo (`domain/text/span-matching.ts`), the untrusted-content fence (`prompts/fence.ts`), per-call repair caps
- the golden freewrite corpus (`eval/corpus/`, 24 synthetic drafts + provenance rules) — the quality-lane instrument

Testable:

- summon a spark mid-sprint; it renders in <1s, fades on typing, never appears unbidden
- `bun scripts/spark-smoke.ts --corpus` measures live yield + lens spread on the corpus

## The Next Sprints

> **Canonical sources.** Intelligence-feature detail (what findings exist, in what dependency order, with the "guide, not critic" framing) lives in [intelligence-roadmap.md](./intelligence-roadmap.md) — treat it as authoritative for the *content* of the constellation. This file owns *delivery sequencing* across the whole loop. Where the two describe the same layer, intelligence-roadmap's vocabulary (themes / tentative-positions / tensions) wins over the older constellation vocabulary (claims / counterarguments / issues).

### Sprint 2: Constellation Run 1 [NEXT]

**Superseded in place. The binding spec is [`docs/plans/constellation-run-1.md`](./plans/constellation-run-1.md)** (proposed 2026-07-10, revised after its reviewer pass 2026-07-16). This section is a pointer, not a spec — where the two disagree, the plan wins.

What changed since the original Sprint 2 was written, in one paragraph: the co-thinker repositioning (2026-07-01) named the steelmanned opposition the load-bearing move; the harness research established that the sourced tier must be *earned* by retrieval + entailment machinery, a sprint of its own; and Spark shipped the infrastructure this section used to ask for (server inference route, adapter discipline, telemetry, durable SprintId). So Run 1 ships the **inferred-first** constellation — S1 discovery, four inference-tier node kinds with structural hallucination defense, a checkpointed durable run, and a populated board with a minimal reaction affordance — and Run 2 builds the retrieval/entailment machinery that unlocks the sourced tier.

Testable (per the plan's ship gate):

- finish a sprint → a durable run starts; the board shows stars in ~30s and nodes at completion, and survives a full reload
- every node is inference-tier, provenance-tagged, grounded in a verbatim draft span, and contains no citation-shaped content
- first-attempt yield ≥ 80% per stage on the golden corpus; three consecutive clean runs on five corpus drafts

### Sprint 3: Constellation Interaction [NEXT]

Goal:

Make the populated board a place to think, not just to look. (Board *population* — stars, node cards, statuses, the reaction input — moved into Sprint 2/Run 1; this sprint is the interaction layer riding on that data model: the tour, node chats, reaction-gated resolution, and map editing, per `docs/product/constellation-interaction.md`.)

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
