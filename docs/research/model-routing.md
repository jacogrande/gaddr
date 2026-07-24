# Model routing & reasoning-effort — how gaddr should tier its LLM calls

**Status:** Research, 2026-07-24. Companion to `llm-provider-portability.md` (the facade this rides on) and an input that refines `constellation-run-1.md` D6.

**Question it answers:** can we run fast/cheap models for some stages and stronger reasoning models (or heavier thinking configs) for others? **Yes — and the facade is already built for it.** Three gaps stand between "designed for" and "wired." This doc is the framework, the grounded current-state, and the per-stage map.

---

## 0. TL;DR

- Routing is not "which model." It is a point in a **2-D space per stage**: **capability tier** (small/fast ↔ large/reasoning) × **reasoning effort** (`none … xhigh`). The two are *substitutes with different price curves*, not independent knobs.
- **Static per-stage config is the backbone** — ~80% of the value, zero added latency, fully testable as pure data. gaddr should stay static everywhere **except one stage**.
- The one stage that earns adaptive machinery is **sprint-end verification / entailment** (Run 2, S4): a **cascade** — cheap-first, escalate only on a failed entailment check — because the escalation signal (a citation that doesn't entail its source) *is the product's own check*, already needed for correctness.
- **Do not** add a learned/external router (RouteLLM / NotDiamond / Martian / GPT-5 auto-router). For a fixed handful of well-understood stages it is the wrong complexity-to-benefit ratio and it plants a dependency near the latency-P0 path.
- gaddr already does the single most important reasoning-model best practice — **think-first, format-later** (delayed structure). Keep it; it is why forcing reasoning *inside* strict JSON (a 10–30% quality tax) never bites us.
- **The three infra gaps are now CLOSED (built 2026-07-24 — see §6).** Reasoning effort is a per-call, neutral `ReasoningEffort` dial threaded through `structured-call` to both adapters; Anthropic extended thinking is wired via `output_config.effort`; the registry carries `{ effort, maxTokens }` and `inference_attempt` records the served model + effort. A stage now picks its routing point in config.

---

## 1. The two axes

**Axis A — capability tier.** A *weights* decision: small/fast (Haiku-class, `gpt-5.6-luna`-class) vs large reasoning (Sonnet/Opus-class, `gpt-5.6-terra`-class). Different price/token, different latency floor, different **ceiling** on hard tasks.

**Axis B — reasoning effort on one model.** A discrete dial the model spends *before* it emits visible output. gaddr's OpenAI adapter already types this: `"none" | "low" | "medium" | "high" | "xhigh"` (the 5.6 scale; the older `"minimal"` 400s). Anthropic's equivalent is `effort` (`low…max`, default `high`) and is the current replacement for the deprecated `budget_tokens`.

**How they interact — the operational fact that drives every decision below:** raising effort on a mid model and jumping to a bigger model both buy "more correctness," but they fix *different* problems:

- **Upgrade the tier** to fix a **capability gap** — something the small model literally cannot do at any effort (steelmanning a sincere opposing case; a weak model produces strawmen no matter how long it thinks).
- **Raise the effort** to fix a **headroom gap** — the small model *can* do it but is truncating or committing early (a long multi-step extraction that just needs room).

Diagnose which you have by looking at the small model's *failures*: **qualitative wrongness → upgrade tier; haste/truncation → add effort.** This is the honest version of the harness rule "upgrade the model before enlarging the budget" (`constellation-run-1.md` D6): it is right for capability gaps, wrong for headroom gaps.

**Effort saturates, and overthinking is real.** Quality rises with effort, then *plateaus*; past the knee, extra thinking buys ~nothing, and on *easy* inputs it can **lower** accuracy (the model second-guesses a correct first pass). So the optimal effort is difficulty-dependent — which is the whole reason the dial exists. **Method: tune effort per stage on a golden set (the corpus already exists), sweep `low→xhigh`, plot quality vs p95 latency vs tokens, pick the knee. Re-sweep on every model upgrade — the knee moves.**

---

## 2. Routing strategies, ranked by complexity-worth

| Strategy | What it is | Worth it for gaddr? |
|---|---|---|
| **Static per-stage map** | Config `stage → {model, effort, maxTokens}` | **Yes — the backbone.** Pure data, testable, diff-able, zero latency. Captures ~80% of the value because *stages differ far more than requests within a stage.* |
| **Signal-based escalation** | Input features (claims, entities, length) trigger a bigger model — a *pure function*, no learned router, no extra call | **Yes — already built.** `domain/constellation/routing.ts::shouldEscalate` is exactly this: escalate to Tier-2 on any of `declarative-claim / near-citation / named-entity / hedging-shift / backtrack`, or on `intent === "asserting"`, biased toward false positives ("a wasted call costs cents; a missed finding costs trust"). |
| **Cascade (FrugalGPT)** | Cheap model first; escalate on low confidence / a failed self-check | **At exactly one stage: S4 entailment (Run 2).** The escalation signal is a *cheap entailment check that fails* — which we must run anyway. Confidence via failed-entailment or agreement (sample the cheap model 2–3×, escalate on disagreement). Adds latency only on the escalated fraction. |
| **Learned / external router** | RouteLLM (open), NotDiamond/Martian (hosted), GPT-5 auto-router, semantic routers | **No.** Real 40–85% savings numbers are all *vs a naive always-big baseline* a good static map already beats; the tax is a network hop + a dependency that decays as models change underneath it. Its edge is heterogeneous unpredictable traffic (chat gateways), not a fixed 3-stage pipeline. |

**Recommendation:** **static everywhere, one cascade at S4, no learned router.** gaddr already lives at "static + signal-based"; the only new machinery Run 2 needs is the S4 cascade, and its confidence signal is free (entailment is on the critical path regardless).

---

## 3. Where gaddr is today (grounded)

**Wired and real — exactly one path:** spark. `providers.ts` resolves `LLM_PROVIDER` → a model ID (`gpt-5.6-luna` default, or `claude-haiku-4-5-20251001`), composed in `app/api/spark/deps.ts`. That is the *only* place the running app selects a model.

**Scaffolded but not wired** (ports + mocks + doc decisions, no real adapter): during-sprint triage (Haiku) / analysis (Sonnet) tiers; constellation S1/S3 (Sonnet); the Sonnet-vs-Opus A/B on the counterargument call. The pure escalation policy (`routing.ts`) is live; the models it routes *between* are not.

**The three gaps between "designed for per-stage routing" and "does it" — all CLOSED 2026-07-24 (§6):**

1. ~~**Reasoning effort is construction-time-only and hardwired to `"none"`.**~~ **Fixed:** `effort` is now a per-call option on `StructuredCallOptions`/`StructuredCallRequest`, threaded to both adapters; the construction-time value is only a fallback. Spark pins `"none"` explicitly at the registry; a synthesis stage passes its own.
2. ~~**Anthropic extended thinking has zero code surface.**~~ **Fixed:** `anthropic-client.ts` translates the neutral effort to `output_config.effort` (`none`→unset, else 1:1), so Sonnet/Opus stages can think. `"none"` preserves the prior no-effort request exactly.
3. ~~**The registry has no effort or `maxTokens` dimension.**~~ **Fixed:** `StageLlmConfig` is now `{ provider, modelId, effort, maxTokens? }`; `resolveSparkLlm` returns `effort: "none"`. A per-stage map beyond `spark` lands with the constellation adapters (step 4).

`structured-call.ts` is otherwise ready: `modelId`, `maxTokens`, and `repairCap` are already per-call; the neutral `CallOutcome` vocabulary (`complete | truncated | refused | paused | other`) already absorbs provider differences. Adding `effort` follows the exact same seam.

---

## 4. Gotchas that bite gaddr specifically

**4.1 — Routing fights prompt caching, and the constellation S3 design is where it collides.** Two facts: (a) **switching models switches cache pools** — a different model cannot read another's warmed prefix; (b) on Anthropic, **changing `effort` breaks the cache** because the resolved effort is rendered into the prompt. The S3 plan (D5) runs *four* kind-calls over a **shared cacheable prefix** `[system + draft + brief]`, staggered so three read the first's cache. **That optimization assumes all four calls use the same model AND the same effort.** So the Sonnet-vs-Opus A/B on the counterargument call — or giving the counterargument call `high` effort while questions run `low` — **cannot share the cache** with the other three; it re-pays the prefix write (thousands of input tokens, ~cents per run). Resolution: keep the four production calls **uniform** (cache wins) and run the A/B / per-kind effort as an **offline quality-lane** experiment, not in the hot path. If per-kind routing ever goes to production, price the extra cache writes in explicitly.

**4.2 — Reasoning + strict structured outputs is a 10–30% tax we already avoid.** Forcing a model to reason *inside* schema-constrained tokens degrades reasoning measurably. gaddr's answer is already the correct one: **delayed structure** — reason in a free `analysis` field first, emit JSON second (the harness finding: recovers ~80–87% of the lost accuracy on Haiku). This is a *validation* of current design, not a change. Keep the `analysis`-first contract on every stage that reasons, and — for annotation generation (Sprint 4) — **reason with a strong model, then a cheap constrained pass to shape the schema**, never one reasoning call trapped in the JSON.

**4.3 — Thinking tokens inflate cost and latency invisibly, and reasoning delays first-token.** Reasoning tokens bill as output but often aren't shown, and thinking happens *before* any visible token streams. This is precisely why spark pins effort `"none"`: its summon→fallback budget is ~4s, and a reasoning pass would blow first-token latency even at fine total time. **Rule: reasoning/effort only on async stages (sprint-end); never on anything a keystroke gates.** Budget `maxTokens` generously on reasoning stages (thinking eats the same budget) or you dead-end on `truncated`.

**4.4 — Telemetry must make every route attributable.** `inference_attempt` already carries `stage`, yield, and reject reasons. Add **`model_id` (the response-reported model — the alias-drift guard from the portability work)** and **`effort`** so a quality regression is pinned to a specific `(stage, model, effort)` triple, and so a cascade can later be *retired* by proving the cheap path was good enough. Without this, routing turns every regression into an unfalsifiable mystery.

---

## 5. The per-stage map (the recommendation)

| Stage | Latency | Tier | Effort | Strategy | Why |
|---|---|---|---|---|---|
| **Freewrite / final draft** | P0 keystroke | **no LLM** | — | none | Interruption-free is non-negotiable; first-token delay alone disqualifies any model. |
| **Spark** (during-sprint summon) | ~4s budget | small (`gpt-5.6-luna` / Haiku) | **none** | static | Latency-bounded, single dimensional question. Current state — correct. |
| **Triage** (Tier 1, every burst) | async, throttled | small (Haiku) | **none/low** | static | Classify + route. Cheap models are genuinely sufficient; the Tier-1 *prompt* matters more than the tier. |
| **Analysis** (Tier 2, escalated) | async, fire-and-forget | mid (Sonnet) | **low/medium** | **signal-based** (`shouldEscalate`) | Only fires on claim/entity/citation signals; medium effort for the grounding synthesis. |
| **S1 discovery** (sprint-end) | minutes | mid (Sonnet) | **medium** | static | Determines everything downstream; delayed structure; one call, worth real effort. |
| **S3 counterargument** | minutes | **large (Opus) or Sonnet+high** | **high** | static (uniform w/ siblings — §4.1) | The product bar. Steelmanning is a *capability* gap → try Opus/high. Keep A/B **offline**. |
| **S3 question / argument / direction** | minutes | mid (Sonnet) | **low/medium** | static, **same model+effort as counterarg for cache** | Generative but bounded; keep uniform to preserve the shared S3 prefix. |
| **S2 retrieval ranking** (Run 2) | minutes | small–mid | **low** | static | Relevance/ranking, structured provenance out — not a reasoning job. |
| **S4 entailment** (Run 2) | minutes | mid→large | **medium→high** | **cascade** | Cheap check proposes; on failed entailment / disagreement, escalate to the strong verifier. The signal is free. |
| **Annotation generation** (Sprint 4) | async | mid, **think→format split** | medium then none | static | Reason the annotation, then a cheap constrained pass shapes the schema (§4.2). |

> Cross-family judge note (from the harness research): if S4 ever runs a judge panel, **pool a non-Anthropic small model with the Haiku-class judge** — a same-family judge overrates its own family.

---

## 6. Infra to unlock it — **BUILT 2026-07-24**

The seam work below is done and green (627 tests, typecheck + lint clean). It is all infra registry + adapter plumbing; nothing touches `domain/` (routing *policy* stays pure in `routing.ts`). The change is behavior-preserving — spark still runs at `effort: "none"` (OpenAI explicit none / Anthropic unset), so the default path is byte-identical.

1. **[DONE] Registry gains the missing dimensions.** `StageLlmConfig = { provider, modelId, effort, maxTokens? }`; `resolveSparkLlm` returns `effort: "none"`. A real per-stage map (`discovery`, `nodes`, `analysis`, …) beside `spark` lands with the constellation adapters (step 4) — the shape is ready. Still pure config, `LLM_PROVIDER`-selected, per-stage-mixable across providers.
2. **[DONE] `effort` is a per-CALL option** — a neutral `ReasoningEffort` (`none|low|medium|high|xhigh`) on `StructuredCallOptions` → `StructuredCallRequest` → both adapters (mirrors how `maxTokens`/`repairCap` flow). OpenAI passes it straight through (reference scale); Anthropic translates via `toAnthropicEffort`.
3. **[DONE] Anthropic extended thinking wired** — `output_config.effort`, set only when the stage asks for reasoning.
4. **[DONE] `inference_attempt` records the SERVED model + `effort`** (§4.4) — the adapters surface `response.model`/`message.model` (alias-drift guard), `structured-call` records it and the requested effort. Schema column added (`drizzle/0004_brave_tempest.sql` — apply via direct SQL per the migration-0003 pattern; the DB write is otherwise live).
5. **[KEPT] Delayed structure** on every reasoning stage (§4.2) — unchanged; it is why we pay no structured-output reasoning tax.

---

## 7. How this refines constellation D6

D6 says "Sonnet for both stages; Sonnet-vs-Opus A/B on the counterargument call." This research sharpens three things:

- **The A/B is a routing decision, and effort is the cheaper knob to try first.** Before the Opus tier jump, sweep the counterargument call's *effort* on the corpus (Sonnet `medium→high→xhigh`). If steelman quality is a **capability** gap (strawmen persist at every effort) → Opus. If it is a **headroom** gap (good but truncated/rushed) → Sonnet + higher effort, at a fraction of the cost.
- **Per-kind routing trades against the shared S3 cache (§4.1).** Keep the four production calls uniform; run the A/B and effort sweeps **offline** on the quality lane. This keeps the cache-prefix optimization intact and the experiment clean.
- **Pin snapshots and log `(model, effort)`** so the A/B result is attributable and reproducible (the spark-v2 alias-drift lesson, generalized).

---

## 8. What I did NOT recommend, and why

- **A learned/external router** (RouteLLM, NotDiamond, Martian, GPT-5 auto): over-engineering for a fixed pipeline; adds a decaying dependency near the latency path. Revisit only if request-within-stage variance ever dwarfs cross-stage variance (it won't for a 3-stage writing pipeline).
- **Per-request routing on the keystroke path:** category error — typing latency is P0, and reasoning delays first token.
- **Changing effort mid-conversation** on a cached workload: breaks Anthropic's cache. Hold one effort per workload; steer per-turn with *prompt text* ("think hard" / "answer directly"), which lands after the cache breakpoint.

**Bottom line:** the answer to "can we tier fast vs powerful models per task?" is yes, the facade and the pure escalation policy are already there, and the work is three additive infra seams (effort per-call, Anthropic thinking, registry+telemetry dimensions) — not an architecture change.
