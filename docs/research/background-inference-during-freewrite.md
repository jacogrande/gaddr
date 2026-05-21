# Background LLM Inference During the Freewrite

Research on how to run intelligence work during a sprint without touching the keystroke path, using Anthropic's SDK. Covers what the literature says, what comparable products do, and a recommended architecture for gaddr specifically.

## The Problem, Framed for gaddr

The freewrite is interruption-free for the writer but the system can use those 25 minutes to do real work. The goal is for the constellation to be ready — or nearly ready — at the sprint boundary, not built from scratch in a single blocking call.

This pattern doesn't map cleanly to any existing product category:

- **Grammarly / Copilot / Cursor Tab** are real-time *inline* suggestion systems. They optimize for sub-300ms latency on a user-facing path. gaddr's intelligence is silent and post-hoc.
- **Notion AI / Lex / Sudowrite** are *user-invoked*. The user asks, the system answers. gaddr fires intelligence automatically.
- **Batch document analyzers** (Elicit, Consensus) operate on finished documents in one shot. gaddr works on growing text.

The closest architectural analogy is **Cursor's speculative prefetching** — work that *may* be useful, computed during typing, ready when invoked. ([Cursor Fusion Tab](https://joshuaberkowitz.us/blog/news-1/cursors-fusion-tab-model-ai-code-editing-reimagined-140))

## What the Research Says

The literature on background LLM inference is mostly about *model-serving* optimization — speculative decoding, KV-cache prefetching, streaming attention. The application-layer pattern of "fire LLM analysis silently as the user types" has very little dedicated research. The relevant adjacent work:

- **Speculative Streaming** speeds inference 1.8–3.1x by predicting future n-grams during decoding. ([Apple ML, 2024](https://arxiv.org/abs/2402.11131)) — model-internal, not directly applicable, but the *philosophy* (do work speculatively against likely futures) maps onto gaddr's pattern at the application layer.
- **PRESERVE** and **SpeCache** prefetch model weights and KV pairs in distributed serving. ([PRESERVE](https://arxiv.org/html/2501.08192v1), [SpeCache](https://arxiv.org/pdf/2503.16163))
- **Cognitive load research** confirms that *user-visible* AI processing during writing harms thought. ([Cognitive load scale for AI-assisted L2 writing, 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1666974/full)) This validates gaddr's silent-background approach but doesn't prescribe an architecture.
- **Incremental long-context inference** (Ltri-LLM, UIO-LLMs, StreamingLLM) handles append-only context with sliding windows and KV compression. ([Ltri-LLM](https://arxiv.org/pdf/2412.04757)) — relevant background, but not directly actionable from the application layer because Anthropic abstracts these details.

**Net:** there are no published studies on the exact pattern. The closest engineering-practice writeups are Anthropic's own prompt-caching documentation and Cursor's blog posts on Tab. We're synthesizing across adjacent fields.

## What Comparable Products Do

### Inline-suggestion systems (real-time path)

| Product | Trigger | Latency target | Model approach |
|---|---|---|---|
| **GitHub Copilot** | Keystroke with configurable debounce ("show only after a pause"). On-demand mode disables auto-trigger entirely. | ~100–300ms TTFB | Single model, server-side; Visual Studio recently added debounced and on-demand controls to reduce flicker. ([Copilot debounce](https://devblogs.microsoft.com/visualstudio/better-control-over-your-copilot-code-suggestions/)) |
| **Cursor Tab / Fusion** | Predicts the next edit on every change; ultra-aggressive. | 260ms server latency (down from 475ms). 13K-token context. | Custom sparse model trained on billions of tokens. Uses **speculative pre-fetching based on predicted user actions**. ([Cursor Fusion Tab](https://joshuaberkowitz.us/blog/news-1/cursors-fusion-tab-model-ai-code-editing-reimagined-140)) |
| **Grammarly** | Continuous, paragraph-aware NLP pipeline. Real-time error detection with C++ core for speed. | Sub-second per chunk. | Microservices architecture; multi-stage pipeline (tokenization → syntactic → contextual → error detection). ([Grammarly architecture](https://www.ninetwothree.co/blog/how-grammarly-uses-ai-to-revolutionize-writing-assistance)) |

### User-invoked systems (no automatic triggering)

- **Notion AI**, **Lex**, **Sudowrite**: explicit user actions. Not relevant to gaddr's background pattern.

### What none of them do (and gaddr should)

None of these run *multi-step, retrieval-grounded, multi-tier inference* during typing. Inline systems can't afford the latency budget; user-invoked systems don't try. gaddr's sprint timer makes this possible: 25 minutes of allowed background work is a lot.

## Triggering Strategies

The question is when to fire each intelligence call. There are six trigger families; gaddr should combine three of them.

### The six options

1. **Time-based** — every N seconds regardless of activity. Simple, wasteful.
2. **Token-based** — every N tokens added. Cleaner cost ceiling, but cuts mid-thought.
3. **Sentence-boundary** — fire on sentence completion. Frequent, possibly too fine-grained.
4. **Paragraph-boundary** — fire on paragraph break (double newline). Natural unit of thought completion.
5. **Pause-based** — fire after N ms of typing inactivity. Reflects thinking; standard in inline-suggestion systems. Copilot's "pause" trigger is the canonical example. ([Copilot pause trigger](https://devblogs.microsoft.com/visualstudio/better-control-over-your-copilot-code-suggestions/))
6. **Semantic** — fire when a coherent unit has been expressed. Highest signal, requires its own LLM call to detect.

### Recommended hybrid

- **Primary unit: paragraph completion.** Most natural marker of a complete thought in a freewrite. Cheap to detect (double newline + ≥40 tokens).
- **Secondary unit: extended pause.** 4–6 seconds of inactivity mid-paragraph signals a writer who has finished a sub-thought. Treat as a triage opportunity.
- **Cadence: word volume.** Fire a triage pass every ~100 tokens (~75 words) of new content since the last trigger. Catches writers who produce long unbroken paragraphs and gives the system a steady rhythm independent of structural signals.

Avoid sentence-boundary as the primary trigger — too frequent, too many false positives (every "I think" sentence opener would fire). Use sentence-boundary only as a sub-signal *inside* the paragraph triage pass.

### Specific numeric recommendations

- **Pause detection threshold:** 4000ms. Copilot tunes around 75–500ms; that's for inline completion which needs to feel instant. For background work that nobody sees, longer pause = stronger signal.
- **Minimum tokens between triage calls:** 80 tokens. Below this, there isn't enough new content to learn from.
- **Word-volume threshold:** 100 tokens (~75 words) of new content since the last trigger. Roughly one paragraph of typical writing — keeps the system responsive without firing every sentence.
- **Debounce on rapid edits:** if a triage call is already in flight, queue at most one follow-up. Drop the rest.

## Tone and Signal-Based Triggers

The user asked specifically about tones. The right framing is: triggers shouldn't fire on *every* paragraph at the same cost. Certain signals warrant deeper processing.

### Signals that justify Haiku triage (cheap)

Every paragraph completion gets a Haiku triage pass. Its job is to extract:

- **Position intent** — `asserting` / `testing` / `wondering` (per [intelligence-roadmap.md](../intelligence-roadmap.md) Phase 1)
- **Theme delta** — is this a recurring concern or a new direction?
- **Retrieval-worthiness signal** — see below

### Signals that justify Sonnet retrieval (expensive)

Haiku triage should flag a paragraph for Sonnet-level retrieval when it contains:

- **Declarative claims** — *"X is true"*, *"the real issue is Y"*. Direct assertions that could be steelmanned or grounded.
- **Near-citations** — *"studies show…"*, *"research suggests…"*, *"X argued that…"*. The writer is gesturing at evidence; we can find the real source.
- **Named entities** — proper nouns referring to thinkers, traditions, events, works. Triggers canon-dialogue retrieval.
- **Strong emotional markers** — high intensity often correlates with high commitment; worth surfacing for the writer's own benefit.
- **Hedging shifts** — sudden increase in hedges may indicate the writer is testing a position they don't yet trust. Worth a counter-position generation.
- **Topic shift markers** — paragraph break + new noun phrases not previously seen. May indicate a new theme to add to the substrate.
- **Backtracks** — deletions >5 words within the paragraph. Feeds the idea-recovery pipeline (Phase 4).

### Signals that justify *nothing*

- Pure rephrasing of the previous paragraph
- Function words and connectives without new noun phrases
- Sentences under 8 tokens that don't contain a verb

A meaningful fraction of freewrite content is throat-clearing, transition, or self-talk. Don't pay Sonnet rates for it.

### Empirical question worth testing

There's recent work on **LLM-based style change detection at the sentence level** that could help detect when the writer's tone shifts mid-paragraph (asserting → wondering, or vice versa). ([Better Call Claude, 2025](https://arxiv.org/pdf/2508.00680)) Worth piloting once Phase 1 ships.

## Tiered Model Architecture

Industry consensus is that two- or three-tier model routing reduces cost by 30–70% with no quality loss for triage-style workloads. ([LLM router patterns](https://www.morphllm.com/llm-router), [Tiered routing tutorial](https://www.freecodecamp.org/news/how-to-build-a-cost-efficient-ai-agent-with-tiered-model-routing/))

### The tiers, mapped to gaddr's intelligence layer

| Tier | Model | Cost (input/output per MTok) | gaddr workload |
|---|---|---|---|
| 1 — Triage | Claude Haiku 4.5 | $1 / $5 | Every paragraph: intent classification, theme delta, retrieval-worthiness signal, deletion classification, tone shift detection |
| 2 — Analysis | Claude Sonnet 4.6 | $3 / $15 | Retrieval, source grounding, steelman generation, fallacy detection, subtext extraction |
| 3 — Deep work | Claude Opus 4.7 | $15 / $75 | Constellation assembly at sprint boundary, named-thinker critique (Phase 4 — highest misattribution risk) |

Haiku classifies inputs in ~200ms and is sufficient for routing-level judgment. ([Claude Haiku as triage](https://www.remoteopenclaw.com/blog/best-claude-models-for-hermes-agent))

### Cost model

For a 25-minute sprint producing ~1500 words:

- ~6–10 paragraph triage calls × Haiku ≈ 5–8K input tokens, ~500 output tokens → roughly $0.01
- ~3–5 Sonnet retrieval calls (only the paragraphs Haiku flagged) → roughly $0.05–0.15
- 1 Opus constellation assembly at sprint end → roughly $0.10–0.30

**Per-sprint intelligence cost: $0.15–0.50.** An all-Opus naive implementation would cost ~$2–5 per sprint. A ~10x cost reduction with no user-visible quality loss.

### Critical caveat on routing accuracy

The whole tiered scheme depends on Haiku's triage being accurate enough. Two failure modes:

- **False negatives** (Haiku misses retrieval-worthy claims): missing findings in the constellation. User notices.
- **False positives** (Haiku flags throat-clearing as a claim): wasted Sonnet calls, no user-visible harm beyond cost.

Bias the triage prompt toward false positives. Cost of a wasted Sonnet call is cents; cost of a missing finding is trust.

## Anthropic SDK Specifics

The SDK has three primitives that map directly onto gaddr's pattern.

### 1. Prompt caching (the biggest win)

Cache writes cost 1.25x (5-min TTL) or 2x (1-hour TTL) the base input price. Cache **reads** cost **0.1x** — a 90% discount. ([Prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching))

For gaddr, the cached prefix is: **system prompt + tool definitions + freewrite-so-far**. Each new paragraph extends the cached prefix; the next call reads everything up to paragraph N-1 from cache and only pays full price for paragraph N + the triage prompt.

**Sprint-TTL tradeoff:**

- 5-min cache costs $6.25/MTok writes. Acceptable only if calls fire within 5 minutes of each other — typical for the paragraph-trigger cadence.
- 1-hour cache costs $10/MTok writes. Safer if there are long pauses, and survives the sprint duration entirely.

For a 25-minute sprint, **start with the 5-minute cache** and let the natural cadence of paragraph triggers keep it warm. Refreshing the cache costs nothing if it happens within the TTL. Switch to 1-hour cache only if profiling shows cold-cache misses costing more than the write premium.

**Cache breakpoint placement** (the easy-to-get-wrong part):

- `cache_control` belongs on the **last stable block**, not on the new paragraph being added. If the breakpoint moves with every request, every call is a cold miss.
- Use automatic top-level `cache_control` for simplicity; the system advances the breakpoint as the conversation grows.
- Maximum 4 explicit breakpoints per request. Plenty for gaddr.

**Edge case — mid-document edits:** if the writer deletes paragraph 2 and inserts a new paragraph elsewhere, all caches downstream of the edit point invalidate. Acceptable: Elbow's freewrite philosophy says writers shouldn't be going back to edit anyway, and the product reinforces this. Tolerate the rare cache miss when it happens.

### 2. Batch API (the cheap path for non-urgent work)

50% discount on all tokens, asynchronous, returns within 24 hours (most batches in under an hour). ([Batch API](https://platform.claude.com/docs/en/build-with-claude/batch-processing))

**Where it fits gaddr:**

- ✗ Not for during-sprint triage — too slow (need triage results in seconds, not minutes).
- ✗ Not for the constellation handoff — the user is waiting at the sprint boundary; needs to feel quick.
- ✓ **Yes for the canon-retrieval and far-reading-list features in Phase 2** — if these can run between the sprint end and the writer's first interaction with the constellation, they can be batched at 50% off. Worth testing whether users tolerate a 30-second post-sprint delay if it halves cost.
- ✓ **Yes for retroactive deepening** — when a writer opens the constellation, more findings can stream in. Lazy backfill via the batch API is plausible.

### 3. Streaming + tool use

Both work with prompt caching. ([Streaming + caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching))

- **Streaming**: useful for the constellation render — findings can appear as they're computed, giving the writer something to look at while expensive calls finish.
- **Tool use**: structured outputs (typed claim graphs, retrieval calls). Define tools once at session start; cache them along with the system prompt.

**Gotcha:** changing tool definitions invalidates the entire prompt cache. Stabilize tools before sprint-start.

## Recommended Architecture for gaddr

```
┌──────────────────────────────────────────────────────────────┐
│  During sprint (background, never blocks editor)             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Editor change events ──┐                                    │
│                         ▼                                    │
│                  Trigger detector                            │
│      (paragraph end | "? " | 4s pause | 100-token volume)    │
│                         │                                    │
│                         ▼                                    │
│             Haiku triage call                                │
│      (cached prefix + new paragraph + triage prompt)         │
│                         │                                    │
│           ┌─────────────┴─────────────┐                      │
│           ▼                           ▼                      │
│   Update substrate           Retrieval-worthy?               │
│   (themes, positions,        ├── yes ──► Queue Sonnet        │
│    tensions, deletions)      │           retrieval/analysis  │
│                              └── no  ──► Continue            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ (sprint boundary)
┌──────────────────────────────────────────────────────────────┐
│  Constellation assembly                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Opus call: aggregate substrate + Sonnet findings into       │
│  ranked, grouped constellation findings with provenance      │
│  tiers. Stream into the UI.                                  │
│                                                              │
│  Optional batch backfill: Phase 2 canon dialogue and         │
│  far-reading lists via Batch API (50% off) if user can       │
│  tolerate 30s+ delay for those finding types.                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Key implementation rules

- **One in-flight Haiku triage at a time.** Queue at most one follow-up. Drop the rest. Background work must not stack.
- **Sonnet calls are fire-and-forget.** They write into a per-sprint findings store. The sprint boundary reads from that store; it does not wait on in-flight Sonnet calls (it cancels them or accepts partial results).
- **Cache the system prompt + tool definitions + freewrite-so-far.** Place `cache_control` on the last stable paragraph; advance with each new paragraph.
- **Tier 1 prompt design matters more than Tier 2.** Haiku is making the routing decisions; a poorly designed triage prompt cascades into wasted Sonnet calls or missing findings.
- **Never put intelligence work on the keystroke path.** Worker threads, queues, debounced triggers. The editor should not know intelligence exists.

## Open Questions and Things to Eval

1. **Triage accuracy.** What's Haiku's hit rate at correctly flagging retrieval-worthy paragraphs? Needs an eval harness with gold-labeled paragraphs from real freewrites. Build this early — the whole cost model depends on it.
2. **Cache hit rate.** Are paragraph-trigger cadences keeping the 5-minute cache warm in practice? If profile shows cold misses, switch to 1-hour cache.
3. **Mid-document edits.** How often do freewrite users go back and edit? If rare (per Elbow's philosophy), tolerate cache invalidation. If common (because real users don't write Elbow-style), build chunk-level caching.
4. **Sprint-boundary latency budget.** How long can the user wait at the constellation handoff? If ≥30s is acceptable, more work can shift to the Batch API.
5. **Cancellation semantics.** When the user starts a new sprint, what happens to in-flight Sonnet calls from the prior sprint? Cancel cleanly; don't pollute the new sprint's substrate.
6. **Failure modes.** What does the constellation look like when retrieval failed for half the claims? Need graceful partial-constellation states (already noted in the latency principle of the roadmap).

## Decision Summary

For Phase 1 of [intelligence-roadmap.md](../intelligence-roadmap.md):

- **Triggers:** `paragraph-ended` (structural), `question-posed` (`? `, structural), `idle-pause` (4s + 40-token floor), `word-volume` (~100 tokens since last trigger).
- **Tier 1:** Haiku 4.5 triage call every trigger. Cached prefix.
- **Tier 2:** Sonnet 4.6 only on triage-flagged paragraphs. Fire-and-forget.
- **Tier 3:** Opus 4.7 once at sprint boundary for constellation assembly.
- **Caching:** 5-minute TTL, automatic breakpoint advancement, system + tools + freewrite-so-far in cache.
- **Batch API:** defer to Phase 2; evaluate for canon dialogue.

Per-sprint cost target: under $0.50.
