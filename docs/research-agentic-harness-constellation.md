# Agentic Harness Best Practices — and the Freewrite → Constellation Pipeline

**Date:** 2026-07-02. **Status:** research report + proposed architecture.
**Companions:** applies the co-thinker positioning from `research-ai-cothinker-constellation.md` and the interaction model from `product/constellation-interaction.md` to the engineering question the backlog calls "Tier-3 assembly at the sprint boundary."

**The question:** what are the current (July 2026) best practices for agentic loops and LLM harnesses, and how should gaddr pipe a finished freewrite into a harness that generates constellation nodes — reliably, observably, and affordably?

## Method & epistemic status

Fifteen research agents: six survey angles (loop design, orchestration, structured-output reliability, grounding/verification, production harness engineering, document→structured-artifact pipelines), six deep-read agents extracting concrete practices from the primary sources each survey nominated, one codebase scout mapping gaddr's current inference pipeline, and two adversarial skeptics who attempted to refute the 14 most load-bearing claims against the live sources.

Confidence tags:

- **[Holds]** — survived adversarial verification; source supports it verbatim; no credible counter-evidence found.
- **[Nuanced]** — true, but the skeptic found caveats the original framing omitted; the caveat is stated inline.
- **[Overstated]** — directionally useful but the cited support doesn't establish it; treated as judgment, not evidence.
- **[Unverified]** — extracted from a primary source by a deep-reader but not stress-tested (55 of 69 practices; the load-bearing ones were prioritized for verification).

Where a skeptic caught an embellished attribution — twice, a deep-reader ascribed a "recommended pattern" or rationale to a source that doesn't state it — the correction is kept, not hidden.

---

# Part 1 — The harness playbook, July 2026

## 1. Shape: this is a workflow, not an agent

**[Nuanced] Build the pipeline as a code-orchestrated workflow, not an autonomous agent loop.** Anthropic's canonical distinction: workflows are "systems where LLMs and tools are orchestrated through predefined code paths"; agents "dynamically direct their own processes." Workflows are explicitly recommended for "predictability and consistency for well-defined tasks"; orchestrator-workers (a model deciding subtasks at runtime) is reserved for "complex tasks where you can't predict the subtasks needed" ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)). gaddr knows its subtasks at build time — extract claims → retrieve → generate six node types → validate → assemble — so the plan is TypeScript, not a model's chain of thought.
*Skeptic's caveat:* the fixed taxonomy only settles the **top level**. Which citations and counterarguments to chase *for this particular draft* is exactly the "can't predict the subtasks" case — so the retrieval layer inside each stage is legitimately agentic (a small bounded loop), even though the pipeline skeleton is code. LangChain's 2026 docs independently affirm static workflows are "often faster and more accurate than ReAct-style agent loops" for known task shapes.

**[Nuanced] Split the pipeline at the read/write boundary.** Fan out parallel workers only for *retrieval* (read-only research over a shared immutable input); run every cross-node composition step — dedup, ranking, cross-linking — in a single context that sees everything. This is where the field's loudest disagreement resolves: Cognition's "Don't Build Multi-Agents" ("actions carry implicit decisions, and conflicting decisions carry bad results") and Anthropic's production multi-agent research system (+90.2% over single-agent Opus on breadth-first research) are both right, on either side of the read/write line. LangChain states the rule directly: "read actions are inherently more parallelizable than write actions," and notes Anthropic's own system does the final composition in one unified call.
*Skeptic's caveats:* (1) the 90.2% is heavily confounded — the same post reports token spend alone explains 80% of performance variance, so much of the lift is "spend more, in parallel"; (2) by 2026 the real boundary is "writes that share a decision surface," not writes per se (coding agents now parallelize writes into disjoint worktrees). Both caveats still favor gaddr's design: node dedup/ranking is one shared decision surface.

**[Holds] Write every worker delegation as a four-field contract: objective, output format, tool/source guidance, explicit boundaries.** The strongest-verified claim of the set. Anthropic documents the failure mode from one-line instructions ("research the semiconductor shortage" → duplicated, misdirected subagents); MAST (arXiv [2503.13657](https://arxiv.org/abs/2503.13657), 1,642 annotated traces across 7 frameworks) independently finds specification/system-design issues are the single largest failure class at ~43.9% of all multi-agent failures. The harness contract, not the model, is usually the bug.

**[Unverified] Scale effort to the input, statically.** Anthropic's embedded scaling rules: simple fact-finding = 1 agent / 3–10 tool calls; direct comparisons = 2–4 subagents / 10–15 calls each; only open-ended research gets 10+. A 500–3,000-word freewrite with a handful of load-bearing claims sits in the middle band. Token economics: agents ≈ 4× chat tokens, multi-agent ≈ 15×; and "upgrading the model is a larger performance gain than doubling the token budget" — buy quality with model choice before buying it with spend.

## 2. Generation reliability: think free, extract strict

**[Nuanced] Two-phase generation: unconstrained reasoning first, schema-constrained extraction second.** "Capacity, Not Format" (arXiv [2606.09410](https://arxiv.org/abs/2606.09410)) measured simultaneous reason-and-emit-JSON costing Haiku 4.5 **36pp** on MATH-Hard versus free CoT, with a delayed-structure condition (one call, explicit "Phase 1 — THINK / Phase 2 — FORMAT" separator) recovering ~80–87% of the loss. On easy tasks the tax vanishes (GSM8K: no significant change) — it's capacity-dependent, not universal.
*Skeptic's caveats:* single-author preprint, one month old; the paper never tested grammar-constrained decoding (how real structured-output APIs work); and the dottxt rebuttal to "Let Me Speak Freely" showed properly-implemented constrained generation can match or beat free-form under matched prompts. Verdict for gaddr: two-phase is a *safe default* for the near-ceiling synthesis stages (steelmanning from messy prose), and it's free — the job is off the keystroke path — but it's a capacity-conditional heuristic from a contested literature, not settled law.

**[Nuanced] Gate every parse on `stop_reason` before validation.** The Claude docs confirm the schema guarantee is conditional: `refusal` returns 200 with billed tokens and "the output may not match your schema"; `max_tokens` means truncated output — retry with a higher budget. *Skeptic's corrections:* the deep-reader's claim that the docs "recommend an if/else on stop_reason" is embellished — no such example exists on the page; and a naive three-way switch misclassifies `tool_use` and `pause_turn` (normal non-terminal states when tools are involved). The engineering rule survives as: branch on `stop_reason` exhaustively, treat `refusal` as non-retryable, `max_tokens` as retryable-with-bigger-budget, and `pause_turn` as continue-the-turn.

**[Unverified] Design the wire schema inside strict-mode limits; keep richer constraints in local validators.** Verified against current docs: strict schemas forbid recursion, min/max numerics, minLength/maxLength, and cap **16 union-type parameters combined across all strict schemas per request** — a real constraint on a six-type discriminated union. Constraints like "note ≤ 280 chars" or "URL resolves" belong in domain validators (gaddr already does this: `validateFinding`), not in the generation schema. Make every routing field a closed enum; use explicit null for unknowns; cap array sizes.

**[Unverified] Cap validation-driven retries at 2, repair with the exact validator error, dead-letter after the cap.** And treat sustained retry rate as a prompt/schema defect signal, not an operating cost. Distinguish transient failures (truncation, rate limits → retry same input) from structural ones (validation failures → re-prompt with feedback, then dead-letter).

**[Nuanced] Build idempotency at the job layer, never on model determinism.** Thinking Machines measured 1,000 temperature-0 completions yielding **80 distinct outputs** — root cause is batch-size non-invariance under server load, which no client parameter controls. Key runs on `hash(freewrite + promptVersion + schemaVersion + modelId)`, make re-runs replace rather than duplicate, and write golden tests that assert *validated properties* (types present, provenance honest, no ghostwritten prose), never exact output text. *Skeptic's note:* deterministic inference is becoming an opt-in for self-hosted stacks (SGLang, ~34% overhead), but for the hosted Claude API the prescription stands — and a model ID doesn't pin the serving stack anyway (one paper accidentally documented a provider backend drift that moved a benchmark cell from 93% to 60% with no client-side change), which *strengthens* the case for job-layer keys.

## 3. Grounding: the sourced tier is earned, not asserted

This section is where the research most directly touches gaddr's product promise. The headline: **pointer validity and claim support are different properties, and only one of them is easy.**

**[Holds] The Citations API cannot be combined with structured outputs — the two-stage split is forced.** Verified verbatim against current docs: enabling citations on any document plus `output_config.format` returns a 400. So the node pipeline shape is fixed by the platform: (1) citation-enabled generation over fetched documents — where fabricated quotes are impossible by construction, since the API extracts `cited_text` from the documents rather than trusting generation — then (2) a **deterministic parse** of the citation-bearing blocks (each carries `cited_text`, document index, and char-offset locations) into typed node JSON. Bonus economics: `cited_text` doesn't count toward output tokens.

**[Unverified] Even frontier research agents misground 10–20%+ of citations.** DeepResearch Bench FACT (arXiv [2506.11763](https://arxiv.org/abs/2506.11763)): best-measured citation accuracy is ~90% (Perplexity, at low citation volume); higher-volume systems run 78–84%. And "Cited but Not Verified" (arXiv [2605.06635](https://arxiv.org/pdf/2605.06635)) is starker: across 14 models, 12 exceeded 94% *link validity* and all frontier models exceeded 80% *topical relevance*, yet claim-support fact-check scores ranged 24–77%. A working link to a relevant page fails to support the specific claim roughly half the time for some models. **"Never hallucinate sources" cannot be achieved by generation-side prompting.** The sourced tier must be earned by a verification stage: deterministic URL fetch → relevance check → claim-to-source entailment check, with failures *demoted to inferred* (reason logged), never shipped and never silently dropped.

**[Nuanced] Run citation binding as its own stage — but the API now does most of it.** Anthropic's production system uses a dedicated CitationAgent, and the deep-reader called this "the citation design of their best-measured configuration." *Skeptic's verdict: overstated* — the 90.2% figure measured the whole architecture, not the citation stage, which was never ablated; the rationale the deep-reader gave appears nowhere in the source; and the Citations API (post-dating that system) attaches verified spans at generation time, arguably superseding a model-driven post-hoc citation pass for document-grounded pipelines like gaddr's. Kept as directionally reasonable judgment: bind provenance in a cheap dedicated step, not inside a generator that summarizes across hops.

**[Unverified] Retrieval depth is poison to attribution — cap per-claim search in single digits.** The most counterintuitive finding of the round: fact-check accuracy dropped ~42% on average as tool calls scaled from 2 to 150 *within one context* (GPT-5.4: 79%→17%; Opus 4.6: 80%→58%), with the sharpest decline between just **2 and 10 calls** — while link validity and topical relevance stayed above 92% at every depth, making the damage invisible to surface metrics. Information overload impairs factual synthesis. Give each per-claim worker a hard budget of ~3–8 searches in a **fresh context**; never one mega-agent doing 50 searches. (This reconciles with Anthropic's "spend more tokens" data: their scaling is across parallel *isolated* contexts; the degradation is accumulation *within* one.)

**[Unverified] Prefer selective citation over exhaustive citation.** Citation quantity anti-correlates with citation accuracy across providers (the most exhaustive system: 1,272 attributions at 39–59% fact-check; more selective systems: 69–77%). A constellation of 8 verified nodes beats 25 weakly-attributed ones — which is also exactly what the interaction model's density caps want.

**[Unverified] Extract load-bearing claims at moderate granularity, and treat granularity as a knob profiled against your verifier.** Optimal claim decomposition is a property of the *verifier*, not the text (ACL 2025, arXiv [2503.15354](https://arxiv.org/abs/2503.15354)): different verifiers peak at different atomicity, and over-atomic decomposition produces unverifiable tautologies. Extract self-contained, decontextualized claims with stance attached — not FActScore-style atomic shreds — and add an eval that sweeps extraction granularity against the verification stage.

**[Unverified] Prompt retrieval workers with source-quality rankings, and keep a human spot-check for source bias.** Anthropic's production agents "consistently chose SEO-optimized content farms over authoritative but less highly-ranked sources like academic PDFs" — caught only by human testers, never by the automated evals. For a product whose value proposition is provenance tiers, this is the failure mode to fear most, and it is exactly the one LLM judges miss.

## 4. Verification: deterministic gates first, judge panels second

**[Nuanced] Gate every node behind rules-based verification; use LLM-as-judge only for fuzzy dimensions.** Anthropic ranks feedback quality: clearly-defined rules first, LLM-as-judge last ("generally not a very robust method" at runtime). *Skeptic's caveats:* that ranking is about agent iteration loops, and the same evals guidance warns overly-specific code graders are "brittle to valid variations" — so deterministic gates must check **invariants** (schema valid, URL resolves, quote appears verbatim in source, note under length ceiling, question-phrasing), not surface form. And the semantically important gaddr checks — "does the source support this claim," "is this counterargument actually steelmanned" — are not deterministically checkable, so the judge layer carries more weight than the slogan implies. The honest split: **rules at runtime for invariants, calibrated judges at runtime for entailment, rubric judges offline for quality.**

**[Unverified] Judge subjective quality with a cross-family panel, never a single same-family judge.** PoLL (arXiv [2404.18796](https://arxiv.org/abs/2404.18796)): a panel of three small judges from disjoint model families beat a single GPT-4 judge on human agreement in every tested setting at 7–8× lower cost, and self-preference is measurable (models score their own family highest). Since gaddr's generator will be a Claude model, a Claude-only judge of steelman quality systematically overrates its own family's style — pool a Haiku-class judge with at least one non-Anthropic small model. (Tension worth knowing: Anthropic's own production evals converged on a single rubric judge as "most consistent" — panels win on discrete judgments, single judges on long-report rubrics.)

**[Unverified] Give judges isolated dimensions, structured rubrics, and an Unknown escape hatch;** calibrate any binary judge against 50–100 human-reviewed judgments before trusting it in a gate.

## 5. Durability: deterministic orchestration, non-determinism in steps

**[Holds] Keep orchestration code strictly deterministic; confine every source of non-determinism — LLM calls, retrieval, `Date.now`, `Math.random`, network IO — to steps/activities.** This is the durable-execution contract, corroborated across Temporal, Vercel, Azure Durable Functions, and Cloudflare: recovery replays *recorded decisions* rather than re-running them, so completed steps are never re-executed and retries can't produce divergent decisions. OpenAI's Codex web agent and Replit's Agent 3 run on Temporal. For gaddr this is delightful: **it is the functional-core/imperative-shell rule restated as a durability contract**, and `domain/`'s existing bans on `Date.now`/`Math.random`/`fetch` mean the pure core is already replay-safe by construction.

**[Nuanced] Run the sprint-end job as a durable workflow with every LLM call, retrieval, and DB write as a named, retryable, individually-observable step.** Two skeptic caveats matter: (1) **step bodies execute at-least-once** — a step that crashes after its Postgres write but before completion re-runs the write on retry, so writes inside steps still need idempotency keys/upserts; "checkpointed" does not mean "exactly-once." (2) The Vercel-native option's maturity signals conflict: one verifier confirmed Vercel Workflows GA (April 2026, 100M+ runs in beta); the other found the open-source Workflow DevKit still flagged public-beta with open reliability issues and a "not recommended for full production" release-phase policy. Read: durable execution is the settled *pattern*; the Vercel-native *implementation* is young. Design the harness so the durability layer is swappable (the port architecture gives this for free), verify current WDK status before committing, and keep Inngest/Temporal as the documented escalation path. A few-minute job with ~6 fan-out steps can also be served by a plain queue with DB-checkpointed idempotent steps — durable-execution frameworks are a convenience here, not a requirement.

**[Unverified] Checkpoint each stage's output and resume from the failure point; deploy without killing in-flight jobs.** Anthropic: errors compound in long jobs, so resume-don't-restart, with rainbow deployments so a code push doesn't strand running agents. (Vercel's skew protection does this automatically: runs finish on the deployment that created them — which also means a hotfix does *not* affect constellations already assembling.)

## 6. Economics & privacy: cache, batch, tier — and delete

**[Unverified] Structure every stage's prompt as [system + freewrite] cached prefix, volatile stage instructions after — and stagger the fan-out.** Cache reads cost 0.1× base input; writes 1.25× (5-min TTL) or 2× (1-hour). Two traps verified from the docs: (1) **"a cache entry only becomes available after the first response begins"** — a naive `Promise.all` of six identical-prefix node calls pays full input price six times; await the first response starting, then parallelize the rest; (2) minimum cacheable prefixes are *inversely* related to model price — Haiku 4.5 needs **4,096 tokens** while frontier models need 512–1,024, and sub-minimum prompts silently no-op (both cache fields read 0, no error). A short freewrite on a cheap extraction model may get zero caching; alert on `cache_read_input_tokens = 0` rather than trusting the design.

**[Unverified] The batch lane fits the constellation fan-out exactly — but it is a data-retention decision, not just a cost decision.** Batches: 50% off all usage, most finish under an hour, stacks with caching (best-effort in batches: 30–98% hit rates; use the 1-hour TTL). Server tools including web search run inside batches — the batch worker runs the full server-side agentic loop, so even the retrieval-heavy sourced stage qualifies for the discount (handle `pause_turn` as a normal continuation). **The catch: batch processing is not ZDR-eligible** — request and response data, i.e. the writer's freewrite, is stored server-side for up to 29 days unless the app explicitly calls `DELETE /v1/messages/batches/{batch_id}`. The freewrite is the writer's most private artifact (the whole Spark contract is built on that); if gaddr uses the batch lane, the workflow must include a delete-batch step immediately after results are persisted, and Console result downloads should be disabled for the workspace.

**[Unverified] Tier models per stage; upgrade the model before enlarging the budget.** Cheap models for extraction and binding, the strongest model for synthesis — with the Haiku cache-floor caveat above, and Anthropic's measured result that a model upgrade beat doubling the token budget.

## 7. Observability & evals: the harness is only as good as its regression loop

**[Unverified] Instrument against OTel GenAI semantic conventions with content capture off by default.** One `invoke_agent` span per constellation run, child `chat`/`execute_tool` spans per stage, token-usage attributes on each. The conventions' privacy default — "no prompt content or tool arguments are captured… only metadata like model names, token counts, and durations" — matches gaddr's constraint that the freewrite never leaks into telemetry. Persist a per-attempt record (input hash, prompt version, schema version, model ID, validation outcome, retry count, latency, tokens) so retry-rate regressions surface in a SQL query.

**[Unverified] Build the eval harness before hardening the pipeline.** 20–50 real freewrites, graded on the **end-state constellation** (never intermediate paths), with code graders at hard gates (schema validity at 100%, provenance completeness, quote-in-source, n-gram-overlap ghostwriting check) plus a rubric judge scoring 0.0–1.0 on Anthropic's five dimensions (factual accuracy, citation accuracy, completeness, source quality, tool efficiency — they map almost one-to-one onto node quality). Use **pass^k, not pass@1**, as the ship gate: a 75%-reliable pipeline passes three consecutive sprints only ~42% of the time, and a writer who once gets a broken constellation loses trust. Adopt FACT's two KPIs per run: citation accuracy (% of sourced nodes whose source supports them) and effective citations (verified nodes per sprint).

**[Unverified] Promote every bad constellation into a versioned regression dataset — but curate by failure-mode cluster.** One representative case per cluster (shallow counterargument, mis-tiered provenance, ghostwritten node) plus sampled successes; pin judge model versions and scorer prompts in source control; gate prompt/model/routing changes in CI on the scorers. Braintrust explicitly warns against logging every failure as a permanent test case — overfitting the eval suite is a real failure mode.

**Meta-finding worth internalizing:** MAST's 1,642-trace analysis attributes ~76% of multi-agent failures to system design and coordination — specification, verification, handoffs — not model incapacity. The harness contract is the product surface. And the one production failure mode that threatened provenance most (SEO-farm source selection) was caught only by humans reading transcripts. Budget for that.

---

# Part 2 — Piping freewrites into a constellation harness

## 2.1 Where the code is today

The scout confirmed (and refreshed) the picture: the **during-sprint** pipeline is real, well-factored, and entirely mocked. Triggers (`domain/editor/trigger-detector.ts`) emit pause-bounded P-bursts; the runner (`infra/jobs/inference-runner.ts`) throttles Tier-1 triage, escalates via the pure `shouldEscalate` policy, fire-and-forgets Tier-2 analysis, and gates every finding through `validateFinding` before folding it into the in-memory substrate. But: both ports are regex/canned stubs running **in the browser** (`infra/llm/mock-*.ts`; the "sourced" mock fabricates example.org URLs); there is no Anthropic SDK in `package.json`, no server inference route, no retrieval, no persistence (the DB schema is auth-only; the substrate dies on reload; `SprintId` is a client counter that collides across reloads); there is **no sprint-end pass at all** — sprint completion only animates the board overlay; and observability is a gated `console.log`.

The gap between today and the backlog's "Tier-3 assembly" is precisely a harness. What follows is that harness, with every Part-1 practice placed.

## 2.2 The pipeline

```
                       sprint ends (use-sprint-session: phase → completed)
                                          │
                              POST /api/constellation-run
                        persist run row FIRST (durable RunId)     ← writer may close the tab
                                          │
        ┌─────────────────────────────────▼─────────────────────────────────┐
        │  DURABLE WORKFLOW (deterministic orchestration; all IO in steps)  │
        │                                                                   │
        │  S1 BRIEF        one call over the full draft (no chunking —     │
        │     & CLAIMS     3k words fits). Two-phase: think free →         │
        │                  extract strict. Emits: thesis/stance brief,     │
        │                  load-bearing claims (moderate atomicity),       │
        │                  research directions. Warm-started from the     │
        │                  during-sprint substrate (themes, positions      │
        │                  with intent, tensions).                         │
        │                                          │                       │
        │  S2 RETRIEVE     fan-out: one worker per claim/direction         │
        │     (fan-out,    (2–4 typical, hard cap). Each: fresh context,   │
        │      read-only)  3–8 searches max, four-field contract,          │
        │                  source-quality ranking in prompt. Returns      │
        │                  compressed cited digests; snapshots sources     │
        │                  to Postgres; passes back references only.      │
        │                                          │                       │
        │  S3 GENERATE     per node type, over [system + draft + digests] │
        │     (fan-out,    cached prefix (stagger: first call warms the   │
        │      staggered)  cache, then parallelize). Citation-enabled     │
        │                  generation over the snapshotted documents,     │
        │                  then DETERMINISTIC parse of citation blocks    │
        │                  into typed node JSON (the API forces this      │
        │                  split — citations × structured outputs = 400). │
        │                                          │                       │
        │  S4 VERIFY       deterministic gates first: schema, provenance  │
        │     (per node)   completeness, URL resolves, cited span appears │
        │                  verbatim in snapshot, note ≤ 280 chars,        │
        │                  question-phrasing (extends validateFinding).   │
        │                  Then entailment judge per sourced node:        │
        │                  "does this span support this claim?" —         │
        │                  fail ⇒ DEMOTE to inferred (reason logged).     │
        │                  Steelman quality: cross-family judge panel.    │
        │                                          │                       │
        │  S5 ASSEMBLE     ONE call that sees everything: full draft +    │
        │     (single      all surviving nodes. Dedup, cross-link         │
        │      context)    (support/contradict edges), crux ranking,      │
        │                  density caps per constellation-interaction.    │
        │                  Persist constellation; mark run complete.      │
        └───────────────────────────────────────────────────────────────────┘
                                          │
                        constellation board reads from Postgres
                     (writer returns whenever; the run outlived the tab)
```

Design decisions, each traceable to Part 1:

- **Code-orchestrated DAG; the only agentic loops are the S2 retrieval workers**, bounded at 3–8 searches in fresh contexts (§1 workflow-not-agent + §3 retrieval-depth poison).
- **Fan-out is read-only; S5 is the single writer** (§1 read/write split). S2 and S3 workers never see each other's output; all cross-node decisions happen in one context.
- **S3's two calls per node type are forced by the platform** (§3 citations × structured outputs), and they double as the two-phase think/extract split (§2).
- **Sourced is earned in S4, not asserted in S3** (§3): fetch + relevance + entailment, demote-don't-drop. Target the precision corner of the accuracy/volume frontier — 8 verified nodes beat 25 weak ones, which is also what the board's density caps want.
- **Every step idempotent** (§5): run key = `hash(draft + promptVersion + schemaVersion + modelId)`, replace-on-rerun, upserts inside steps (at-least-once semantics).
- **The batch lane is optional and gated on the delete step** (§6): if used, `DELETE /v1/messages/batches/{id}` immediately after results persist — the freewrite does not sit on anyone's servers for 29 days to save 50%.

## 2.3 What changes in the code

**Domain (`src/domain/constellation/`) — new pure material, no behavior changes to the existing during-sprint path:**

1. **Reconcile the node taxonomy.** Code has five `FindingKind`s (from the pre-repositioning roadmap); the co-thinker taxonomy has six node types. Proposed mapping:

   | Co-thinker node type | Today's `FindingKind` | Change |
   |---|---|---|
   | citation | `citation` | keep |
   | steelmanned counterargument | `steelman` + `counter-position` | merge — a counter-position that isn't steelmanned shouldn't ship |
   | research direction | `further-reading` | rename/extend |
   | question | `assumption` (already question-phrased) | generalize to `question` with an `assumption` subtype |
   | evidence | — | **new** |
   | argument | — | **new** |

2. **New ports** (`ports.ts`): `ClaimExtractionPort` (S1), `RetrievalPort` (S2 — already sketched in architecture.md §6.4), `NodeGenerationPort` (S3), `EntailmentPort` (S4), `AssemblyPort` (S5), and a `ConstellationRepository` (`types.ts` already anticipates one). The existing `AnalysisPort` returns exactly **one** Finding per burst — right for the during-sprint drip, wrong for a run that emits a constellation; the sprint-boundary ports are additive, not replacements.
3. **Provenance as edges, not strings.** `SourceRef {title, url, span}` becomes a claim-level edge — `Node —SUPPORT→ EvidenceUnit` (snapshotted document + char offsets), with `CONTRADICT` powering counterargument nodes. This is the pragmatic subset of the execution-provenance taxonomy (arXiv [2606.04990](https://arxiv.org/abs/2606.04990)) — the skeptic rightly warned against importing the full seven-relation graph into a small app; two relations carry the product.
4. **Extend `validateFinding`** for the six types and the S4 invariants. The 280-char ceiling, sourced-must-carry-source, and question-phrasing rules survive unchanged — they were the right guards before there was anything real to guard.

**Infra (`src/infra/`):**

5. **Real adapters** replacing the mocks (backlog step 1), server-side: a `stop_reason` switch as the first branch after every call, mapping to the existing `InferenceError` variants (which exist but nothing emits today); bounded repair loop (≤2, exact validator error in the re-prompt); dead-letter table.
6. **Durable workflow runner** (`infra/jobs/`): the sprint-boundary sibling of `inference-runner.ts`, same philosophy (all decisions delegated to pure functions), but server-side with checkpointed steps. Vercel Workflows if its maturity checks out at build time; otherwise Inngest or a plain queue with DB-checkpointed steps — behind a port either way.
7. **Schema** (backlog step 2, extended): `constellation_run` (run key, status, per-stage checkpoints, token/cost accounting, prompt+schema versions), `node`, `evidence_unit` (snapshotted source content — this is what makes entailment checks and offline FACT-style evals possible), `node_evidence_edge`. Plus the durable `SprintId` this all depends on.
8. **Telemetry** (`infra/observability/` — currently an empty directory): OTel GenAI spans, content capture off, `cache_read = 0` alerting, retry-rate canary.

**App (`src/app/`):**

9. **`/api/constellation-run`** triggered from the `setSprintPhase("completed")` transition in `use-sprint-session.ts`; the board (`canvas-flow.tsx`) reads persisted runs instead of nothing. The client `observe` path also moves server-side per backlog step 1 (`/api/triage`).

## 2.4 Evals & guard metrics

Extending `eval/constellation.json`'s outcome-not-implementation style:

1. **Golden freewrites (offline, data-level):** freeze ~20 real freewrites. Code graders at 100% gates: schema validity, provenance completeness, cited-span-verbatim-in-snapshot, n-gram overlap vs. draft (ghostwriting), density caps respected. Rubric judge on the five dimensions; FACT-style citation-accuracy + effective-citations as the two run KPIs; pass^k across repeated runs as the ship gate.
2. **Agent-browser workflows (UI-level):** sprint end → run row exists → board populates after reload (durability); a run with a failed stage degrades to a partial constellation with the failure visible, never a blank board.
3. **Human spot-check lane:** a periodic transcript read specifically for source-selection bias (SEO farms vs. primary sources) — the one provenance-corrupting failure automation demonstrably missed.
4. **Granularity sweep:** claim-extraction atomicity profiled against the entailment verifier (the optimum is a property of the verifier, not the text).
5. **Regression loop:** every bad production constellation → clustered failure-mode dataset row → CI gate. Judge models and prompts pinned in-repo.

## 2.5 Sequencing against the backlog

The backlog's order survives contact with the research almost intact — with one amendment:

1. Real adapters behind existing ports, server-side (**backlog 1**) — now with the `stop_reason`/repair/dead-letter discipline and prompt-cache prefix design from day one.
2. Durable `SprintId` + run/node/evidence persistence (**backlog 2** + debt item) — the schema above.
3. Retrieval + hallucination defense (**backlog 3**) — S2 + S4: this is where the entailment gate lands, and it is load-bearing for Phase 2 canon dialogue exactly as the roadmap says.
4. **Tier-3 assembly (backlog 4) = this harness** — S1/S3/S5 around the pieces built in 1–3.
5. Board UI (**backlog 5**) reads persisted constellations.
6. Evals (**backlog 6**, expanded per §2.4) — but start the golden-freewrite corpus **now**, before the harness exists; the research is unambiguous that the eval set precedes the hardening.

**Amendment:** the backlog frames the during-sprint pipeline and the sprint-end pass as one continuum. The research suggests treating them as **two different regimes with different rules**: the during-sprint drip is latency-adjacent and stays minimal (triage + occasional analysis, exactly what's built); the sprint-end run is latency-tolerant, durable, and where all the expensive machinery (retrieval fan-out, entailment, judge panels, maybe the batch lane) lives. Don't let harness complexity leak backward into the sprint loop — the interruption-free contract is also an architecture boundary.

---

## Sources

**Vendor engineering (primary):** Anthropic — Building effective agents · How we built our multi-agent research system · Demystifying evals for AI agents · Building agents with the Claude Agent SDK · Claude docs: structured outputs, citations, prompt caching, batch processing · Claude Agent SDK subagent docs. Cognition — Don't Build Multi-Agents. LangChain — Open Deep Research · How and when to build multi-agent systems. Vercel — Workflow DevKit / durable execution posts + docs. Temporal — dynamic AI agents on Temporal. OpenTelemetry — GenAI observability (2026). Braintrust — production failures → regression tests. dottxt — Say What You Mean. Thinking Machines — Defeating Nondeterminism in LLM Inference. HumanLayer — 12-Factor Agents.

**Papers:** MAST: Why Do Multi-Agent LLM Systems Fail? (arXiv 2503.13657) · Capacity, Not Format (arXiv 2606.09410) · Let Me Speak Freely? (arXiv 2408.02442) · JSONSchemaBench (arXiv 2501.10868) · DeepResearch Bench (arXiv 2506.11763) · Cited but Not Verified (arXiv 2605.06635) · Optimizing Decomposition for Claim Verification (arXiv 2503.15354) · VeriFastScore (arXiv 2505.16973) · Replacing Judges with Juries / PoLL (arXiv 2404.18796) · From Agent Traces to Trust (arXiv 2606.04990) · LLMs in Argument Mining survey (arXiv 2506.16383) · Provocations / "It makes you think" (CHI 2025, arXiv 2501.17247).

*Report synthesized 2026-07-02 from a 15-agent research workflow (6 survey → 6 deep-read → 1 codebase scout → 2 adversarial skeptics; 69 practices extracted, 14 load-bearing claims stress-tested).*
