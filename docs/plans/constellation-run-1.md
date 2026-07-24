# Constellation Run 1 — the inferred-first sprint-end pipeline

**Status:** Proposed plan, 2026-07-10; revised 2026-07-16 after its reviewer pass — accepted deltas folded in below and logged in §11. The first constellation the writer actually sees.
**Scope:** sprint ends → one durable, checkpointed run → S1 discovery over the full draft → inference-tier node generation (steelmanned counterarguments, questions, arguments, research directions) → domain validation → deterministic assembly (stars, caps, crux) → persisted constellation the board renders after reload.
**Explicitly deferred to Run 2+:** retrieval (S2), entailment verification (S4), sourced-tier nodes (evidence, citation), judge panels, the batch lane, node chats, and the annotation bridge. §10 maps every deferral to its landing zone.

This plan is the constellation sibling of `docs/plans/spark-implementation.md` and inherits its review discipline: this document is the binding spec; deviations get logged here.

---

## 0. Canon and vocabulary

Aligned with, in precedence order where they overlap:

- `docs/product/positioning.md` — non-negotiables; "co-thinker, not fact-checker."
- `docs/product-and-design-philosophy.md` — no-ghostwriting, steelman-before-critique, fact/inference/heuristic separation.
- `docs/research-ai-cothinker-constellation.md` (2026-07-01) — the repositioning: six node kinds, provocation-not-verdict, the steelmanned opposition as the load-bearing move. Supersedes the fact-checking framing of the older first-draft-feedback report.
- `docs/product/constellation-interaction.md` — map/stars, hard caps, scent, node lifecycle, off-map cluster, graceful degradation.
- `docs/research/constellation-map-design-research.md` — the board's visual grammar (deterministic semantic layout — never force-directed; type encoded redundantly as shape+color, never color alone; tier strips; hub-and-spoke edges; document-order keyboard nav). Caveat: it predates the co-thinker repositioning — its four-content-type mapping is superseded by the six-kind taxonomy, and §6's board spec owns the Run 1 reconciliation.
- `docs/research-agentic-harness-constellation.md` — the harness playbook (workflow-not-agent, read/write split, four-field contracts, think-free/extract-strict, idempotency, yield telemetry, eval-first).
- `docs/intelligence-roadmap.md` — feature content and the intent axis; its vocabulary (**themes / positions / tensions**) wins over the older claims/counterarguments/issues vocabulary.
- `docs/mvp-cycle.md` — delivery sequencing (this plan revises its Sprint 2; see §2).
- `docs/architecture.md` — functional core / imperative shell; provenance is a domain concern (§6.5); no-ghostwriting is a domain invariant (§6.6).

Vocabulary used throughout: the during-sprint drip produces a **substrate** (themes, positions with intent, tensions, findings). The sprint-end run produces a **constellation**: **stars** (3–6 core ideas + the mandatory off-map cluster) and **nodes** (the six-kind co-thinker taxonomy). "Finding" continues to mean the during-sprint drip's output only.

---

## 1. Decisions

**D1 — Inferred-first.** Run 1 generates only inference-tier nodes: `counterargument` (steelmanned), `question`, `argument`, `direction`. The `evidence` and `citation` kinds exist in the domain taxonomy from day one but have **no generator**; the validator structurally rejects any node claiming the sourced tier without a source, and rejects citation-shaped content in inference-tier nodes (D7). Why: (a) the co-thinker research's highest-confidence finding is that the steelmanned opposition is the single load-bearing move — and it needs zero retrieval; (b) the harness research is unambiguous that the sourced tier must be *earned* by fetch → relevance → entailment machinery ("never hallucinate sources" cannot be achieved by prompting — claim-support runs 24–77% unverified), which is Run 2's whole job; (c) this is the fastest path to putting inferred-tier co-thinking in front of real writers before paying for retrieval. Honest scope: Run 1 tests whether inference-tier nodes are worth opening at all and baselines engagement (reactions written, dismissals, defers); the repositioning's two open hypotheses (static-vs-interactive; questioning-vs-answering) need Sprint 3's interactive arm and a later-stance instrument — Run 1 feeds them baseline data, it does not settle them.

**D2 — Two regimes, two taxonomies, one boundary.** The during-sprint drip (`FindingKind`, `validateFinding`, the browser-side runner) is **untouched** — the harness research's amendment stands: during-sprint is latency-adjacent and stays minimal; sprint-end is latency-tolerant and durable, and harness complexity must not leak backward into the writing loop. The run consumes the substrate as warm-start *input*; it never mutates it. The six-kind `NodeKind` taxonomy is new domain material in `src/domain/constellation/` beside the existing types. (Eventual reconciliation of `FindingKind` into `NodeKind` is extension-map work, §10 — not a Run 1 concern.)

**D3 — One durable run per sprint, persisted first.** `POST /api/constellation-run` fires from the `completed` phase transition — wired by **observing the phase value, never by enumerating call sites**: `use-sprint-session.ts` has *four* `setSprintPhase("completed")` sites (natural expiry, pause-at-zero, restore-completed, and restore of a running sprint that expired during a non-stale absence, `use-sprint-session.ts:338`), and site enumeration would miss the fourth. The run row is persisted **before** any model call — the writer may close the tab; the board reads Postgres, not React state. Run key = `hash(draft ‖ promptVersions ‖ schemaVersions ‖ modelIds)` (NUL-separated, the spark `computeSparkInputHash` pattern); re-POSTs with the same key resume from checkpoints instead of duplicating — and resume is lease-gated: a re-POST executes only when the run is stale (§5.4), otherwise it returns current status without running.

**D4 — No workflow framework in Run 1.** The runner is an in-process, sequential, DB-checkpointed step executor: per-stage status columns on `constellation_run`, idempotent upserts inside every step (at-least-once semantics), resume-from-failed-stage on re-POST. The harness research's own verdict: "a few-minute job with ~6 fan-out steps can be served by a plain queue with DB-checkpointed idempotent steps — durable-execution frameworks are a convenience here, not a requirement," and the Vercel-native option is young. The runner sits behind a thin seam so Inngest/Temporal/Vercel Workflows can swap in when S2's fan-out arrives (§10). Orchestration code stays deterministic; every model call and DB write lives in a step — the durability contract is the functional-core rule restated.

**D5 — Pipeline shape: S1 → S3ᵢ → validate → assemble (pure) → persist.**
- **S1 discovery** (one call, full draft): thesis/stance brief; stars (3–6 core ideas with labels, draft-grounded spans, load-bearing weight, dominant intent from the position axis); per-star gap notes (what the draft lacks); an extraction-confidence field driving graceful degradation (low confidence ⇒ fewer, broader stars — interaction doc Journey C). Warm-started from the client-sent substrate snapshot and the server-queried served sparks (`spark_event` by sprint UUID — the §6 promise of the spark plan, exercised for real). The substrate *refresh* (themes/positions/tensions recomputed over the whole draft) originally sketched here is **cut from Run 1**: it had no consumer and no storage (§5.3 never persisted it), and every extra field in a structured call taxes the fields that matter — S1 determines everything downstream. It returns with the Run 2+ drip reconciliation (§10).
- **S3 node generation** (four calls, one per kind, staggered): shared cacheable prefix `[system + fenced draft + S1 brief]`, kind-specific instruction block *after* the draft (the cache-prefix discipline; stagger the first call so the remaining three read the cache). Each call emits candidate nodes assigned to stars (or off-map), with delayed structure (`analysis` first) and the spark house rules (D8).
- **Validate** — per-node domain validation (D7); rejects logged with machine-readable reasons; yield telemetry per stage.
- **Assemble** — a **pure domain function**, not a model call: dedup, star assignment sanity, crux scoring, rank, caps. The tool owns ranking, diversity, and selection — never the model, never user-approval signals (co-thinker principle 5). S5-as-a-model-call arrives only when cross-node linking needs it (§10).

**D6 — Models: Sonnet for both stages, pinned snapshots.** S1 determines everything downstream (substrate quality risk, per the intelligence-roadmap) and S3's steelman quality is the product bar — the harness rule is "upgrade the model before enlarging the budget," and steelmanning from messy prose is the near-ceiling synthesis case where delayed structure and model class matter. Haiku remains spark-only. Both model IDs pinned to dated snapshots (spark-v2 lesson: alias re-resolution silently confounds telemetry under an unchanged input hash). Cost envelope: ~5 calls/run, roughly 3–6k input + 0.5–2k output each — cents per run, minutes of latency budget (rendered in two beats, D12), inside one serverless invocation with an explicit `maxDuration` (§5.4); per-user rate bucket regardless (§6). The counterargument call is the product bar and costs one call per run, so the quality lane runs a **Sonnet-vs-Opus A/B on that call only** (§7) — "upgrade the model before enlarging the budget" applied exactly where it counts; per-stage model choice is already a prompt-module parameter, so the outcome is config, not code.

**D7 — Hallucination defense in Run 1 is structural, not retrieval-based.** Because no retrieval exists, *no node may assert the world*: the validator **rejects** (not demotes — there is nothing to demote to) any node containing citation-shaped content: URLs, quote-plus-named-attribution patterns, "studies show/according to X (year)" shapes. Named schools of thought are allowed as lenses ("the Austrian objection," "a Keynesian would answer…"); named-thinker *published-position* attribution is not — that is Phase 2 canon dialogue, which stays sourced-gated exactly as `validateFinding` rule 5 ("no speculative attribution") already encodes for the drip. `direction` nodes propose lines of inquiry ("compare bubbles on the residue they leave") without naming specific works; a direction that names a specific paper/book is a citation and is rejected. This preserves the intelligence-roadmap's hardest rule with zero retrieval spend. Accepted side effect, pre-budgeted: real drafts (philosophy/economics freewrites especially) are dense with borderline shapes — "the Austrian objection" passes, "Hayek argued X" rejects — so `speculative-attribution` is expected to be the top reject reason, and a model forbidden from citing drifts toward "some economists argue" hedge-slop. The §7 rubric carries an explicit **citation-stripped vagueness** reject category, and the S3 prompt tuning (§8 step 4) is expected to be about teaching the allowed register (lenses, schools of thought, logic) more than length budgets.

**D8 — Spark house rules apply to every prompt.** Learned empirically this week, now binding for S1/S3: (1) state every length budget in the prompt, derived from the imported domain constant, **and repeat it in one line at the end of the user turn** — position beats repetition; (2) delayed structure (analysis field first); (3) four-field contract per prompt module (`prompts/<stage>.ts`, versioned, git-diff-as-registry); (4) untrusted content travels fenced — `neutralizeDraftDelimiters` + the data-not-instructions clause are extracted from `prompts/spark.ts` into a shared `prompts/fence.ts` and reused verbatim (S2's web content will make this load-bearing; build the shared module now — and note the draft is **not** the only untrusted input: the client-sent `substrateSnapshot` is equally forgeable and travels fenced and shape-validated too); (5) repair-with-exact-validator-error, cap 1 per stage call — and parameterize the repair cap in `structured-call.ts` (the documented below-cut cleanup, done here because two stages now share the seam); (6) first-attempt yield per stage is the tuning metric; sustained repair rate is a prompt defect, never an operating cost.

**D9 — Intent-aware posture, all four kinds under contract.** S1 stars carry the dominant `PositionIntent` (`asserting` / `testing` / `wondering` — the axis already live in the substrate). Node generation is gated by it: `counterargument` targets asserting/testing stars only, **never** wondering (exploration tolerance — pushback fires only on positions the writer is actually leaning on, the intelligence-roadmap Phase 3 testable); `question` leads on wondering/testing stars; `argument` is gated **symmetrically to counterargument — testing/wondering stars only**, in the roadmap Phase 3 posture ("if you went all the way with this, here's what you'd be saying — is that where you're going?"): an argument node that eloquently supports an already-asserted stance is sycophancy made structural and the most liftable prose in the product, so the gate keeps it a commitment-testing instrument; `direction` is ungated but contract-bound (a lead + why it matters + what to test — never a conclusion). Every node is provocation-shaped (critique *plus* alternative or question), never a verdict. A kind call with zero eligible stars is **skipped by the runner**, not generated-and-rejected — an all-`wondering` draft (a true exploratory freewrite) makes the counterargument call pointless, and skipping saves the spend and the telemetry noise.

**D10 — Diversity and anti-mirroring are seeded and structural.** Three transplants from spark: (a) seeded **school-of-thought hints** in the S3 counterargument call (the `hintLensesForSprint` pattern keyed on the run, so two writers circling the same topic don't receive the same objection — the Doshi & Hauser defense at the generation side); (b) a **composition guarantee** in assembly: the visible set always contains ≥1 counterargument when any validated one exists (the challenge-beat analog at board scale), and the steelman lands *late* in tour order per the scaffolding rule; (c) the **off-map cluster is mandatory** — S1 must propose 1–3 positions/questions that attach to the topic but to none of the writer's stars ("what you didn't write about"), the anti-mirroring guarantee made visible. Off-map nodes in Run 1 are **`question`/`direction` kinds only** (validation rule 9, §4.3): with no grounding requirement and no sources, an off-map position-assertion is the least-defended quadrant of the design — closest to asserting the world, or to generic topic-adjacent filler; questions and directions deliver "what you didn't write about" at the same value with a fraction of the risk, and off-map arguments return with retrieval. Never seed node stance from the freewrite's stance.

**D11 — Content posture: the draft is never at rest server-side in Run 1.** The POST carries the draft; the run holds it in memory; persisted artifacts are model outputs only (star labels, node text, and short verbatim grounding spans — the same posture as `spark_event.question`). Resume-by-re-POST re-sends the draft (the client's local-first copy is the source of truth; the run key hash proves it is the same draft). Consequence accepted: if the client is gone *and* the server process died mid-run, the run parks as `failed/resumable` until the writer returns. The full-harness retention question (S2 source snapshots, batch-lane 29-day storage) is deliberately deferred to Run 2 and must be answered in `docs/infra.md` §7.4 terms when it arrives.

**D12 — Board scope in Run 1: populate, reveal in two beats, capture the reaction.** The board (currently a zoom-out with a "Sprint complete" overlay) gains real rendered content: stars as anchors, node cards clustered under them with the interaction doc's scent contract (kind chip, one-line payoff, **quoted grounding span** — the writer's own sentence anchoring the node, provenance visible at scan zoom — tier chip, `inferred` styling per the tier rules), caps applied from assembly rank (~3–5/cluster, 12–15 total, remainder behind "more"), off-map cluster rendered. Three deltas from the original populate-only scope, accepted in review (§11):

- **Two-beat reveal.** The run takes minutes and lands at the most fragile moment in the product — right after the sprint, when momentum is the point — and the checkpoint design already pays for the fix: stars render as soon as GET shows status `s3` (~the first 30s); nodes constellate in at `complete`. Partial failure is the same UI missing its second beat — plus the failure line and retry — not a special case.
- **Minimal reaction affordance.** An opened card offers a one-line reaction input (≤ `REACTION_MAX_CHARS`); submitting one sets `status: resolved`. No chat, no gated resolution — but without it `resolved` is unreachable and Run 1 measures "did they look" instead of the interaction doc's actual metric, *reactions written in the writer's own words*. Reactions are also the annotation-bridge seed Sprint 4 reads.
- **Honest defer copy.** Resurfacing (Journey E) is not built, so the affordance is labeled "set aside," not "defer" — a promise the system can't keep yet doesn't ship.

Statuses `unseen → opened → resolved / dismissed / deferred` wired (one tap, shame-free, no unread counts, no clear-all). The rest of the interaction layer — tour, node chats, reaction-*gated* resolution, map editing — is mvp-cycle Sprint 3 riding on this data model; the `node.status` lifecycle and `reaction` column are live from day one so Sprint 3 needs no migration.

---

## 2. Relationship to the old roadmap

The prior plan of record was `mvp-cycle.md` Sprint 2 ("Constellation Research Pipeline" = intelligence-roadmap Phase 1) with Phase 2 (canon dialogue) as the headline fast-follow. Three things changed since it was written: the **co-thinker repositioning** (2026-07-01) demoted fact-checking and named the steelmanned opposition the load-bearing move; the **harness research** (2026-07) established that the sourced tier requires an entailment stage that prompting cannot replace; and **Spark shipped** (2026-07-08), which quietly delivered much of Sprint 2's infrastructure list.

**What Sprint 2 asked for that is already done (by Spark):**

| Sprint 2 / backlog item | Delivered as |
|---|---|
| durable `SprintId` (backlog debt item) | branded UUID, persistence v2, rehydrate-on-restore |
| server-side inference route pattern with secret keys | `/api/spark` + `deps.ts` real-vs-mock composition |
| real model adapter discipline behind ports | `structured-call.ts` + `spark-adapter.ts` (stop_reason, repair, error taxonomy) |
| deterministic stub so evals never touch live models | mock-behind-route + `isE2ETesting()` |
| per-attempt observability | `inference_attempt` with `stage`, yield fields, reject reasons |
| prompt-caching-aware prompt structure | four-field prompt registry convention |

**What this plan keeps from Sprint 2 unchanged:** the sprint-completion trigger; persistence for runs and their output; loading/progress and recoverable-failure states; unit tests for provenance and tier rules; no-ghostwriting validation as pure domain logic; the delivery rule (domain types first, adapters second, thin routes, eval spec updated).

**What this plan reorders, and why:**

1. **Hallucination-defense infrastructure moves out of the first constellation sprint.** Sprint 2 front-loaded "retrieval, span verification, confidence thresholds" because Phase 2 depended on it maturing early. The harness research sharpened what that actually costs (fetch + relevance + entailment stages, source snapshots, demote-don't-drop, judge calibration — a full sprint of its own), and the repositioning removed the reason to rush it: the co-thinker's core value (steelman, questions, directions) is inference-tier. Run 1 ships that value with **structural** hallucination defense (D7 — reject citation-shaped content outright); Run 2 builds the earning machinery.
2. **Intelligence-roadmap Phase 3 (sharpen) partially jumps ahead of Phase 2 (connect to the world).** Steelmans, counter-positions, and assumption-questions were always allowed to "fall back to inferred" by Phase 3's own tiering — Run 1 takes that fallback as the starting point. Phase 2's canon dialogue, named thinkers, and further-reading remain strictly sourced-gated and land in Run 2 with retrieval. The old headline is postponed; the *new* headline per positioning.md — "supplying the strongest opposing case a solitary draft always misses" — ships first.
3. **Phase 1 completes rather than starts.** Themes/positions/tensions with the intent axis already run in the browser (the drip). Run 1 completes Phase 1's promise: a sprint-end discovery pass over the whole draft with persistence, plus the claim-graph-precursor (stars with load-bearing weights) the board needs. Testable outcome matches the roadmap's line: a freewrite produces a ranked theme/star list, positions with intent labels, and a tension map — now durable and rendered.
4. **The during-sprint/sprint-end continuum becomes a hard boundary.** The backlog framed the drip and the sprint-end pass as one pipeline. Per the harness amendment, they are two regimes: the drip stays minimal and browser-fast; everything expensive lives behind the sprint boundary. Migrating the drip's mocks server-side (backlog 1) is *decoupled* from this plan and can proceed independently using the spark mock-behind-route template.

**Stale docs this plan obsoletes in part:** `mvp-cycle.md` Sprint 1.5 status ("no model is invoked yet" — spark is live), Sprint 2 content (superseded by this plan), backlog items 1–2 and the SprintId debt note (done or reshaped). Ship a doc-refresh commit alongside this plan's first phase (§8 step 0).

---

## 3. Architecture overview

```
 use-sprint-session: phase → "completed"  (observed transition; 4 sites — D3)
        │
        ▼
 POST /api/constellation-run   { sprintId, draft, substrateSnapshot }
        │  auth session · rate bucket · run_key = hash(draft‖versions‖models)
        │  IF run exists for key → resume from first incomplete stage
        ▼
 constellation_run row persisted (status: s1)          ← durable before any model call
        │
        ▼
 S1 DISCOVERY  (Sonnet, one call, delayed structure)
        │  in:  fenced draft + substrate snapshot + served sparks (spark_event)
        │  out: brief · stars(3–6, intent, weight, grounding) · off-map seeds ·
        │       confidence
        │  checkpoint: stars + brief upserted, status: s3
        ▼
 S3 NODE GENERATION  (Sonnet, 4 calls: counterargument · question · argument · direction)
        │  shared cached prefix [system + fenced draft + brief]; kind block after;
        │  staggered; seeded school-of-thought hints on the counterargument call;
        │  intent gating per star (D9)
        ▼
 VALIDATE (pure)  — per-node rules (D7, §4.3); rejects → reject_reasons; yield/stage
        ▼
 ASSEMBLE (pure)  — dedup · crux scoring · rank · caps · composition guarantees (D10)
        │  checkpoint: nodes upserted, status: complete
        ▼
 board reads GET /api/constellation-run?sprintId=…    (survives reload/tab close;
 stars render at status s3, nodes at complete — the two-beat reveal, D12)
```

Read/write split honored: the only fan-out (S3's four calls) is read-only over immutable inputs; every cross-node decision (dedup, rank, caps) happens in one place — pure code. There are no agentic loops anywhere in Run 1.

Failure shape: any stage error the process survives → `status: failed`, `failed_stage`, `error_reason` persisted; the board renders a **partial constellation with the failure visible, never a blank board** (stars without nodes if S1 succeeded; a plain retry offer if it didn't). A platform kill (function timeout, OOM, deploy) persists nothing — so **staleness is part of the contract**: GET treats a non-terminal run whose `updated_at` is older than `RUN_STALE_AFTER_MS` as `failed/resumable`, and the client auto-re-POSTs. Execution is leased (§5.4): a re-POST runs only against a stale run, otherwise it returns status — one rule covering zombie runs and concurrent double-fire.

---

## 4. Domain design (`src/domain/constellation/`, additive)

### 4.1 Types (new, beside the existing drip types)

- `NodeKind = "evidence" | "argument" | "counterargument" | "citation" | "direction" | "question"` — full taxonomy now; generators for `evidence`/`citation` do not exist until Run 2.
- `RunId` — branded UUID (mirror of `SprintId` in `types/branded.ts`).
- `Star = { id, label, intent: PositionIntent, weight: number, grounding: string, kind: "star" | "off-map" }` — grounding is a verbatim draft span (spark's normalized-match contract). Off-map is a star row with `kind: "off-map"` and no grounding requirement.
- `ConstellationNode = { id, kind: NodeKind, tier: ProvenanceTier, starId, payoff, body, grounding, cruxScore, rank, status, reaction? }` with `NodeStatus = "unseen" | "opened" | "resolved" | "dismissed" | "deferred"`. Run 1 always emits `tier: "inferred"`; the column exists for Run 2.
- Constants: `NODE_PAYOFF_MAX_CHARS = 140` (the scent line), `NODE_BODY_MAX_CHARS = 900` (a steelman needs a real paragraph; the drip's 280-char `NOTE_MAX_CHARS` stays the drip's), `STAR_MIN = 1`, `STAR_MAX = 6`, `NODES_VISIBLE_PER_STAR = 5`, `NODES_VISIBLE_TOTAL = 15`, `REACTION_MAX_CHARS = 280` (the writer's one-liner, D12 — same ceiling as the drip note), `DEDUP_JACCARD_THRESHOLD` (initial ~0.5; tuned through the §4.4 unit table).

### 4.2 S1 output shape

`Discovery = { brief, stars, offMapSeeds, confidence: "high" | "low" }` (substrate refresh cut — D5). Low confidence ⇒ S1 must emit 1–2 broad stars with hedged labels (Journey C) — the star count is enforced by validation; the hedged phrasing lives in the prompt and the rubric (a validator cannot check "hedged").

### 4.3 Node validation (`validate-node.ts`)

Extends the spark validator machinery — the shared primitives are **already extracted** (§8 step 1 done): `domain/text/span-matching.ts` exports `matchTokens`, `indexOfSubsequence`, `ngramSet`, and `echoesSourceBeyondSpan` (n-gram size is the caller's constant), and both validators import them. Rules, each with a machine-readable reject reason:

1. `payoff`/`body` non-empty, within caps (budgets stated in prompts per D8).
2. `grounding` matches the draft verbatim after normalization (except off-map nodes, which ground on the *topic* — checked only for non-empty rationale).
3. **Ghost-echo:** body must not reproduce draft n-grams beyond the grounding exemption — nodes are about the thinking, never replacement prose (architecture §6.6 as code).
4. **Tier honesty:** `tier: "sourced"` requires a source ref (impossible in Run 1 — no generator emits one) → any sourced claim without one rejects; `evidence`/`citation` kinds reject outright in Run 1.
5. **Citation-shaped content in inference nodes rejects** (D7): URLs, quoted-span-plus-attribution, named-work references. Reason: `speculative-attribution`.
6. **Question grammar:** `question` nodes end with exactly one `?` and pass the interrogative-stance check (the spark validator's stance machinery, reused).
7. **Provocation shape:** `counterargument` bodies must not contain verdict language about the *writer* ("you are wrong", "this fails") — they argue the opposing case; `assumption`-style questions are invitations. (Structural approximation; the rubric lane carries real steelman quality, §7.)
8. **Intent gating:** a `counterargument` attached to a `wondering` star rejects (`pushback-on-wondering`); an `argument` attached to an `asserting` star rejects (`argument-on-asserted`) — the D9 gates, enforced in code.
9. **Off-map kind restriction:** a node assigned to an off-map star with kind ∉ {`question`, `direction`} rejects (`off-map-kind`) — D10's least-defended-quadrant rule as code.

### 4.4 Assembly (`assemble-constellation.ts`, pure)

- **Dedup is cross-kind, and the algorithm is named.** The four S3 calls share the same S1 gap notes, so a `question` and a `direction` circling the identical gap is the *expected* duplicate shape — within-kind dedup would miss it. Near-identical = normalized token Jaccard over payoff+body above `DEDUP_JACCARD_THRESHOLD` (named domain constant, exercised in the unit table), plus grounding-overlap collapse; keep highest model rank, preferring the kind the composition guarantees need.
- **Dedup against served sparks.** Candidates are also checked against the sprint's served spark questions (already queried as S1 input): "a sparked dimension may only appear *developed*" (spark plan §6) gets its enforcement here, not just its data — a board that re-asks the spark's question is a visible "the AI repeats itself" moment.
- **Crux scoring, deterministic in Run 1:** `star.weight` is an integer 1–5 emitted by S1; `cruxScore = weight × count(validated counterarguments on the star)`. No model-emitted strength features until S5 arrives (Run 2) — the simplest ranking that is code, replayable, and testable (principle 5). One star gets the ⚡ crux marker; off-map is excluded from crux.
- Caps: ≤ `NODES_VISIBLE_PER_STAR` visible per star, ≤ `NODES_VISIBLE_TOTAL` overall, remainder ranked but behind "more."
- Composition guarantees (D10): ≥1 counterargument visible when one exists; off-map cluster always present when S1 seeded it; a thin run stays thin (3 honest nodes beat 15 padded — the edge scenario is a supported outcome, with the honest one-liner surfaced to the board).
- Seeded tie-breaks via the FNV pattern keyed on runId — deterministic, replayable.

### 4.5 Ports

- `DiscoveryPort { discover(input: { draft, substrateSnapshot, servedSparks }): Promise<Result<Discovery, InferenceError>> }`
- `NodeGenerationPort { generate(input: { draft, brief, stars, kind, hints }): Promise<Result<readonly CandidateNode[], InferenceError>> }`
- `ConstellationRunRepo` — run/star/node upserts + reads, all keyed for idempotency.

The existing `TriagePort`/`AnalysisPort` are untouched (D2).

---

## 5. Infrastructure design

### 5.1 Prompts (`src/infra/llm/prompts/`)

- `fence.ts` — **[DONE §8 step 1]** `fenceUntrusted(tag, content)` + `dataNotInstructionsClause(tag, noun, shortNoun)`, both parameterized by tag; `spark.ts` refactored onto it behavior-identically (forgery test + byte-identity lock shipped). S1/S3 import it for the fenced draft and the fenced substrate snapshot (D8).
- `discovery.ts` (S1) and `nodes.ts` (S3) — four-field contracts, versioned (`discovery-v1`, `nodes-v1`), pinned Sonnet snapshot, delayed structure, budgets stated from domain constants **and** restated at the end of the user turn (D8). The S3 system prompt is shared across kinds (cacheable prefix); kind-specific instruction blocks travel in the user turn after the draft, and **all four kinds carry explicit contracts** (MAST — spec gaps are the largest failure class — applies to our own prompt modules): `counterargument` — the steelman contract (strongest sincere opposing case, separate factual from framing dispute, engineered against the agreeable default; sycophancy is the enemy); `question` — generative, non-leading, one `?`; `argument` — the D9 commitment-test posture, testing/wondering stars only; `direction` — a lead + why it matters + what to test, never a conclusion. Each kind block also states the *other* kinds' remits as explicit boundaries ("do not propose research directions — another pass owns those"): the four calls share the same gap notes, and unbounded contracts are the systematic duplicate generator §4.4's cross-kind dedup exists to catch.
- Wire schemas strict-mode-thin; richness in validators. The six-kind enum plus star assignment stays well under the strict-schema union budget.

### 5.2 structured-call

Reused as-is; the one seam change is **done** (§8 step 1): the repair cap is now a per-call `repairCap` option (default 1 — spark's disposable-artifact cap), the absolute attempt ceiling resizes with it, and `maxTokens` was already per-call. S1/S3 pass their own `repairCap`; the neutral outcome vocabulary (from the provider-portability work) means S1/S3 branch on `complete | truncated | refused | paused | other`, not provider stop strings. `stage` telemetry values: `discovery`, `nodes:counterargument`, `nodes:question`, `nodes:argument`, `nodes:direction`.

### 5.3 Schema (`schema.ts` + migration `000X`)

- `constellation_run`: id (uuid pk), user_id (FK), sprint_id (uuid, no FK — the sprint table still does not exist; same posture as `spark_event`), run_key (unique per user), status (`s1 | s3 | assembling | complete | failed`), failed_stage, error_reason, confidence, draft_word_count, prompt/schema/model versions, token totals, created_at, updated_at (touched at every checkpoint — the staleness clock §5.4 reads), completed_at.
- `constellation_star` (tables prefixed per the `spark_event` convention — bare `star`/`node` are grep-hostile): id, run_id (FK), label, kind, intent, weight, grounding, rank.
- `constellation_node`: id, run_id (FK), star_id (FK), kind, tier, payoff, body, grounding, crux_score, rank, visible (bool from caps), status (default `unseen`), reaction (nullable — written in Run 1 by the minimal reaction affordance, D12; Sprint 3's *gated* resolution lands without migration), created_at, status_changed_at.
- `inference_attempt` gains nullable `run_id` (uuid, no FK churn) so per-stage yield is one SQL slice.

**Operational caveat (do not relearn):** the Supabase DB has no drizzle journal and holds legacy tables — generate the migration file, then apply its SQL directly in a transaction, exactly as migration 0003 was applied (see `HANDOVER.md`). Never `db:migrate`/blind `db:push`.

### 5.4 Runner (`src/infra/jobs/constellation-runner.ts`)

The sprint-boundary sibling of `inference-runner.ts`, same philosophy (every decision delegated to pure functions), but server-side and checkpointed: an ordered list of named steps, each `(runState) → Promise<Result<…>>`, each idempotent (upserts keyed on run_key/stage), each recording its `inference_attempt` rows. Execution model, pinned: the POST responds early (202 + current run status) and the runner continues via `waitUntil` in the same invocation — the client never blocks on a multi-minute fetch; the board's GET poll is the progress channel; the route exports an explicit `maxDuration` sized for the worst case (5 calls + repair tails). **Runs are leased by status-CAS:** every stage transition is an `UPDATE … WHERE status = <expected>`, and a re-POST with an existing run_key executes only when the run is *stale* (`updated_at` older than `RUN_STALE_AFTER_MS` — the prior invocation is presumed dead); otherwise it returns current status without running. One rule covers zombie runs (platform kills persist nothing) and concurrent double-fire (multi-site completion, StrictMode, impatient reloads): the upserts already make writes idempotent; the lease prevents double model spend and racing transitions. A re-POST against a stale run resumes at the first incomplete stage. No timers, no queues, no framework — and the step list is data, so a durable-execution backend can adopt it wholesale in Run 2.

### 5.5 Telemetry & guard metrics

Per-stage yield (candidates returned vs valid), reject-reason distribution, run duration, token/cost totals per run — all SQL on `inference_attempt` + `constellation_run` from day one. Content posture unchanged: drafts never at rest, node text is model output (same class as `spark_event.question`). Alert-shaped query for `cache_read_input_tokens = 0` on S3 calls (the Haiku 4096-floor trap generalizes: verify Sonnet's floor actually engages at our prefix sizes rather than trusting the design).

---

## 6. App shell design

- **`POST /api/constellation-run`** — session tenancy, Content-Length pre-parse gate, draft length cap, server word counts, separate rate bucket (~6/hour/user; a run is orders of magnitude more expensive than a spark) that counts **novel run_keys only — resume re-POSTs are exempt** (the spark rule, "background work must never be the reason the writer's request 429s," applied to the recovery path), run_key dedupe/resume under the §5.4 lease. E2E mode: `isE2ETesting()` composes a deterministic mock runner (mock-behind-route; canned constellation derived from draft hash — stable for eval assertions).
- **`GET /api/constellation-run?sprintId=`** — run status + stars + nodes (visible + "more" partition). When a sprint has multiple runs (an edited draft ⇒ a new run_key), GET returns the latest by `created_at`, preferring `complete` over in-flight. Applies the §5.4 staleness rule (a stuck non-terminal run reads as `failed/resumable`). The board polls while `status ∉ {complete, failed}`.
- **`PATCH /api/constellation-run/node-status`** — status transitions (opened/resolved/dismissed/deferred) plus the Run 1 **reaction write**: a `reaction` string (≤ `REACTION_MAX_CHARS`) whose acceptance sets `status: resolved` (D12). Batch ≤ 20, per-item validation, its own modest rate bucket. (Shape borrowed from the spark events route — batch cap, per-item accept/reject — but note that route is an append-only POST; the mutation semantics here are net-new.)
- **Client wiring:** the completed-phase *transition* (observed on the phase value, never call-site enumeration — D3) fires the POST with `{sprintId, draft, substrateSnapshot}` (snapshot fenced + shape-validated server-side, D8); `use-board-entry`'s existing zoom-out becomes the first loading beat; stars render at status `s3`, nodes at `complete` (the D12 two-beat reveal); honest failure state with retry; auto-re-POST on a stale run; zero-engagement path stays frictionless: the writer can start a new sprint and never look.
- **Board rendering — the Run 1 board spec (D12).** The highest-visibility deliverable, previously the least specified. It reconciles `constellation-map-design-research.md` with the six-kind taxonomy, and the 2026-03 board audit's twelve failures are its anti-checklist:
  - **Deterministic semantic layout, never force-directed:** star anchors placed by rank on a fixed layout with bounding-box collision handling; node cards cluster under their star; the off-map cluster ("What you didn't write about") sits visibly apart. Same input ⇒ same layout.
  - **Type encoded redundantly:** kind chip = icon + label + color family — never color alone; tier chip per the interaction doc's `inferred` styling; the crux star carries ⚡ and is visually differentiated (the audit's "identical visual weight" failure).
  - **Card face:** kind chip, one-line payoff, quoted grounding span (the writer's own sentence anchors the node — provenance legible at scan zoom, per "make research legible"), tier chip, read-time estimate.
  - **Interaction:** opened card offers the one-line reaction input (submit ⇒ resolved); dismiss and "set aside" (the honest defer label, D12) are one tap each; keyboard nav in document order (Tab/Shift+Tab across cards, Enter opens, Escape closes); desktop type sizes legible at arm's length.
  - Caps and crux marker from assembly output; edges (if drawn) are star→node hub-and-spoke only, never card-to-card. **This surface exits through a design review, not just a code review** (the standing design bar). No tour, no chats, no map editing in Run 1.

---

## 7. Testing & evals

**Unit (domain):** validate-node accept/reject table (each D7/§4.3 rule, incl. speculative-attribution shapes, pushback-on-wondering, argument-on-asserted, off-map-kind); assembly laws (caps, cross-kind dedup at the Jaccard threshold, served-spark dedup, composition guarantees, crux determinism incl. off-map exclusion, thin-run honesty); shared-primitive extraction keeps the spark validator suite green unchanged (the refactor proof); Discovery low-confidence shape.

**Contract (infra):** discovery/node adapters against a stubbed client — schema round-trip, repair path with per-stage caps, attempt telemetry with run_id + stage values, fence/forgery test on `fence.ts`; runner resume semantics against a stubbed repo (kill after S1 → re-POST completes without re-running S1; at-least-once upsert idempotency; **lease laws:** a re-POST against a fresh non-stale run returns status without executing, against a stale run it resumes; stage transitions are status-CAS).

**Agent-browser (`eval/constellation-run.json`, new file):** plain-language workflows in E2E mock mode — sprint end starts a run (row exists, loading state visible, editor stays quiet); **board populates after a full reload** (the durability eval); partial-failure run degrades to a visible partial constellation, never a blank board; dismiss/set-aside persist across reload; **writing a one-line reaction resolves the node and persists across reload** (the D12 affordance); the two-beat reveal shows stars before nodes (the mock runner exposes a staged mode so the beat is assertable); zero-engagement path (start next sprint immediately) is frictionless; off-map cluster renders with question/direction nodes only; no node ever contains a URL (mock + validator honesty check). Update `eval/constellation.json`'s stale preamble (E2E env-var conjunction) in the same pass.

**Quality lane (offline, human-scored — the "is the steelman good" instrument):** the **20–30 golden freewrite corpus is §8 step 0.5, not an afterthought** — and D11 means it can *never* come from usage exhaust (drafts are never at rest server-side), so it is authored and donated: Jackson's own freewrites plus explicitly-donated drafts spread across the 3–4 fixed diversity topics. It gates step 4's prompt tune; without it the v1→v2 tune is vibes. Rubric per run: steelman is the strongest *sincere* opposing case (not a gotcha, not "needs nuance" filler, and not **citation-stripped vagueness** — the "some economists argue" hedge-slop D7's strictness invites is a mandatory reject category); questions are generative and non-leading; directions are leads, not conclusions; stars match what the writer would name; off-map cluster is genuinely off-map, not generic topic-adjacent filler; no verdict language. Pinned by prompt version. Diversity check: 3–4 fixed topics × N runs — star/lens/objection spread (the homogenization early warning). **Model A/B (D6):** the corpus runs the counterargument call under Sonnet and Opus, scored on the same rubric — one call per run, cents of delta, the product bar deserves the comparison.

**Ship gate (go/no-go, measured on the corpus):** first-attempt yield ≥ 80% per stage; zero citation-shaped content escaping the validator; rubric pass on steelman sincerity and no-verdict-language; three consecutive clean runs on five corpus drafts. Cross-family judge panel and pass^k CI gating remain documented fast-follows (Run 2), not Run 1 gates — but Run 1 does not ship on "expect a v1→v2 tune" without a stopping rule.

---

## 8. Sequencing

0. **Doc refresh** — mvp-cycle Sprint 1.5/2 status + backlog items superseded by spark and by this plan (§2); link this plan as Sprint 2's spec. **[DONE 2026-07-23]**
0.5. **Corpus kickoff** — the golden-freewrite corpus (D11 forbids usage exhaust — §7). **[DONE 2026-07-23]** `eval/corpus/` holds 24 synthetic drafts (register/length/intent spread, four fixed diversity anchors, provenance frontmatter) + a README stating what synthetic drafts are and aren't valid for. First live pass on `gpt-5.6-luna`: 24/24 first-attempt yield, all ten lenses represented (`scripts/spark-smoke.ts --corpus`). Donated real drafts fold in as they arrive.
1. **Shared domain primitives** — **[DONE 2026-07-23]** span-matcher + ghost-echo extracted to `domain/text/span-matching.ts` (spark suite green unchanged — the refactor proof); `prompts/fence.ts` extracted behavior-identically with the forgery test + a byte-identity lock on the spark-v3 wording; structured-call repair cap parameterized per-call (`maxTokens` was already per-call). 489 tests green.
2. **Domain** — **[DONE 2026-07-24]** NodeKind/Star/ConstellationNode/Discovery types + constants (`constellation/node-types.ts`, beside the drip types); `validate-node.ts` (all §4.3 rules, with the D7 citation-shape and verdict-language guards tuned to pass the allowed school-of-thought register); `validate-discovery.ts` (star count, low-confidence collapse, per-star grounding); `assemble-constellation.ts` (cross-kind + served-spark dedup, deterministic crux, caps, composition guarantees, seeded FNV tie-breaks); `DiscoveryPort`/`NodeGenerationPort`; `RunId` branded type. The interrogative-mood machinery (§4.3 rule 6) was extracted from `validate-spark.ts` into the shared `domain/text/interrogative.ts` behavior-identically — the spark suite stayed green, the second refactor proof. Full unit table (validate-node accept/reject, assembly laws, discovery shape, the shared-primitive anchors). Hardened through an adversarial code-review pass: the citation detector now catches full "First Last" names and adverb-separated attributions (was blind to both) while sparing personified economic abstractions ("Markets argued", "Institutions maintained"); the composition guarantee holds both the per-star and global visible caps (a demotion/off-map-reservation interaction could breach them); cross-kind dedup is transitive (a bridging duplicate no longer leaves two overlapping cards); duplicate star ids are rejected. 611 tests green; typecheck + lint clean. `ConstellationRunRepo` (§4.5) is intentionally deferred to step 3, where its row shapes are driven by the schema (§5.3).
3. **Schema + repos** — migration (direct-SQL application), run/star/node repos, `inference_attempt.run_id`; contract tests.
4. **Prompts + adapters** — discovery.ts, nodes.ts, real adapters over structured-call; contract tests with stubbed client; first real-model smoke on a genuine freewrite (expect a v1→v2 prompt tune from yield telemetry — budget for it, the spark precedent says the first live run finds one).
5. **Runner + routes** — checkpointed runner, POST/GET/PATCH routes, mock runner behind E2E; resume contract tests.
6. **Board population + client trigger** — completed-transition POST (observed transition, D3), two-beat loading/failure states, star/node rendering per the §6 board spec, statuses + reaction affordance. **Exits through a design review** (the standing bar), not just `bun run check`.
7. **Evals + quality lane** — `eval/constellation-run.json` executed via agent-browser; quality-lane first pass + the Sonnet-vs-Opus counterargument A/B on the step-0.5 corpus; ship gate (§7) evaluated.

Steps 1–2 are pure and parallelizable; 3–4 are independent of each other after 2; 5+ integrates. Every step lands with its tests per the delivery rule.

---

## 9. Risks

- **S1 extraction quality on messy freewrites** — the known out-of-distribution risk (clean-essay benchmarks don't transfer). Mitigated by the confidence field + enforced degradation (broad stars, hedged labels), the map-editing escape hatch in Sprint 3, and S1 being one cheap call to iterate on with the corpus.
- **Steelman quality without sources** — the style-evidence tradeoff means fluent-but-shallow counterarguments are the default failure, and D7's strictness adds a second face to it: high `speculative-attribution` reject rates and citation-stripped hedge-slop (both pre-budgeted — D7, §7). The validator can only check shape; quality lives in the rubric lane, the steelman contract in the prompt, and the D6 model A/B. If inference-tier steelmen score persistently shallow, that is *evidence for accelerating Run 2's retrieval*, and the telemetry will show it.
- **Static-vs-interactive is unresolved** (the repositioning's biggest open question). Run 1 deliberately ships the static board — now with the minimal reaction affordance (D12), so the baseline data includes *reactions written*, not just dismissal/defer/ignore rates; Sprint 3's reaction-gated resolution remains the experiment proper.
- **The old headline is postponed** — canon dialogue was Phase 2 "shipped early because it's the headline." Product risk accepted (§2): the repositioned headline ships first; if inferred-first constellations feel thin to real writers, that finding re-prioritizes Run 2 rather than invalidating Run 1.
- **Serverless duration** — ~5 sequential-ish Sonnet calls fit comfortably today under an explicit `maxDuration`; a platform kill is survivable by design (staleness rule + lease + auto-re-POST, §5.4), and the §10 durable-execution swap is the designed escape if S3 fan-out or repair tails grow.
- **Vocabulary drift** — three overlapping taxonomies now exist in docs (FindingKind, six node kinds, themes/positions/tensions). §0's rules are binding; the Run 2 reconciliation (§10) retires the drip's overlap.

---

## 10. Extension map (built now → consumed later)

| Built in Run 1 | Becomes |
|---|---|
| `constellation_run` + checkpointed runner | the durable spine S2 fan-out and the batch lane plug into (runner steps are data; Inngest/Temporal/Vercel Workflows adopt them behind the same seam) |
| `node.tier` column + tier-honesty validation | S4's demote-don't-drop lands as a status transition, not a schema change |
| `evidence`/`citation` kinds (validator-blocked) | Run 2 unblocks them behind retrieval + entailment; D7's reject rules become S4's demotion rules |
| shared span-matcher | S4's "cited span appears verbatim in snapshot" gate — already written and battle-tested |
| `fence.ts` | mandatory wrapper for S2/S3 retrieved web content (the injection surface that actually matters) |
| `node.status` + `reaction` (reaction *written* from day one — D12) | Sprint 3's tour, node chats, reaction-*gated* resolution, and the annotation bridge (Run 1 reactions are already the seed data final-draft annotations read) — no migration needed |
| per-stage yield telemetry + run_id | pass^k ship gates, FACT-style citation KPIs, regression datasets clustered by failure mode |
| seeded hints + composition guarantees | cross-session lens/objection weighting once `constellation_node` distributions accumulate (the measured anti-homogenization the spark plan deferred) |

Explicitly **not** built in Run 1: retrieval (S2), source snapshots + `evidence_unit` + entailment (S4), S5-as-model-call (cross-node support/contradict edges, model-assisted crux, model-emitted opposition-strength features), the S1 substrate refresh (cut in review — returns as the reconciliation point where drip `FindingKind` retires into `NodeKind`, Run 2+), judge panels, batch lane (+ its delete-step obligation), node chats, tour, map editing, annotations, cross-sprint constellation merging (Journey E).

---

## 11. Review log

**2026-07-16 — reviewer pass (technical-PM lens, with a codebase verification sweep). All findings accepted and folded in; declined: none.**

Accepted deltas, by theme:

*Product scope & honesty:*
- D1(c) restated honestly: Run 1 baselines engagement; the two open hypotheses (static-vs-interactive, questioning-vs-answering) need Sprint 3's interactive arm — Run 1 feeds them, it does not settle them.
- **Minimal reaction affordance pulled into Run 1** (D12, §6 PATCH): one-line reaction input, submit ⇒ `resolved`. Without it `resolved` was unreachable and Run 1 measured "did they look" instead of the interaction doc's metric (*reactions written*). Also starts the Sprint 4 annotation-bridge data.
- **Two-beat reveal** (D12, §3, §6): stars render at the S1 checkpoint (~30s), nodes at `complete` — the multi-minute wait was being treated as a spinner at the most fragile moment in the product; the checkpoint design already paid for the fix. Partial failure becomes the same UI missing its second beat.
- Honest defer copy: "set aside," since resurfacing (Journey E) is not built.
- Grounding span quoted on the card face — validated verbatim spans were persisted and then never surfaced ("make research legible").

*Pipeline & content:*
- S1 substrate refresh **cut** (D5, §4.2, §10): no consumer, no storage; extra structured-output fields tax the fields that matter.
- All four kinds under explicit contracts with cross-remit boundaries (D9, §5.1); `argument` gated to testing/wondering stars (an argument node supporting an already-asserted stance is sycophancy made structural and the most liftable prose in the product) — new reject `argument-on-asserted`.
- Off-map nodes restricted to `question`/`direction` kinds (D10, §4.3 rule 9) — the least-defended quadrant (no grounding, no sources) doesn't get to assert positions.
- Assembly dedup made **cross-kind** with a named algorithm (token Jaccard over payoff+body, `DEDUP_JACCARD_THRESHOLD`) — the four calls share gap notes, so cross-kind duplicates are the expected shape; plus **dedup against served spark questions**, giving the spark plan's "sparked dimensions only appear developed" contract its first enforcement.
- Crux scoring made deterministic for Run 1 (weight 1–5 × validated-counterargument count; off-map excluded); model-emitted strength features deferred to S5.
- D7 side effects pre-budgeted: `speculative-attribution` expected as top reject reason; **citation-stripped vagueness** added as a mandatory rubric category; S3 tuning expected to be register work, not budget work.
- Fence scope corrected (D8): `substrateSnapshot` is untrusted client input too, not just the draft.

*Runner & routes:*
- Execution model pinned (§5.4): 202 + `waitUntil`, explicit `maxDuration`, board polls GET as the progress channel.
- **Status-CAS lease + staleness rule** (§3, §5.4, §5.3 `updated_at`): a re-POST executes only against a stale run — one rule covering zombie runs (platform kills persist nothing) and concurrent double-fire.
- Four completion sites, not three (`use-sprint-session.ts:338` was unenumerated) — POST wired by observing the phase transition, never call-site enumeration (D3).
- Resume re-POSTs exempt from the rate bucket (the spark 429 rule applied to the recovery path); GET ordering rule for multi-run sprints; kind calls with zero eligible stars skipped by the runner.
- Tables prefixed: `constellation_star` / `constellation_node` (§5.3).

*Board & quality:*
- `constellation-map-design-research.md` admitted to canon (§0) with its staleness named; §6 gained the Run 1 board spec (deterministic layout — never force-directed, redundant type encoding, card-face contract, keyboard nav, arm's-length type) with the 2026-03 audit as anti-checklist; step 6 exits through a **design review**.
- Corpus promoted to §8 step 0.5 with a mechanism: D11 forbids usage exhaust, so it is authored + donated — it gates step 4's tune, and was previously scheduled after the thing it gates.
- Numeric **ship gate** added (§7): ≥80% first-attempt yield per stage, zero validator escapes, rubric pass, three consecutive clean runs on five corpus drafts. Plus the **Sonnet-vs-Opus A/B on the counterargument call only** (D6, §7).

Fact-check corrections against the code (verification sweep): four `setSprintPhase("completed")` sites, not three; `maxTokens` is already a per-call parameter in `structured-call.ts` — only the repair cap remains hardcoded (§5.2); the spark events route is an append-only POST, so the PATCH's mutation semantics are net-new (§6). All other codebase claims verified accurate (input-hash pattern, FNV-seeded hints, validator primitives module-private but cleanly extractable, pinned Haiku snapshot, mock-behind-route, migration-0003 direct-SQL caveat, `eval/constellation.json` stale preamble).
