# Trigger Units and Cadence for the Freewrite

Research on what unit of writing should fire the background intelligence pipeline. Companion to [background-inference-during-freewrite.md](./background-inference-during-freewrite.md). Supersedes the paragraph-as-primary-unit assumption baked into the current trigger detector.

## Why this exists

The current trigger detector treats `paragraph-ended` as the workhorse and `idle-pause` as a fallback. That's brittle in two opposite directions:

- A writer who freewrites in one long unbroken paragraph never fires `paragraph-ended` — only `idle-pause` and `word-volume` carry the load.
- A writer who hits Enter after every sentence fires `paragraph-ended` constantly — the intelligence layer would drown in noise.

Both failure modes are *normal freewriting styles*. The unit needs to be writer-style-agnostic.

## What writing-process research uses instead

### P-bursts are the empirical standard

Writing-process researchers don't use paragraphs as the basic unit either. They use the **P-burst**: a continuous stretch of text production ending at a pause of at least **2 seconds**. ([Leijten & Van Waes, keystroke logging](https://link.springer.com/chapter/10.1007/978-3-031-36033-6_25), [PMC: Interword pause threshold](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3971171/))

The 2-second threshold has empirical grounding:

- Pauses **under 2s** correspond to transcription processes — motor execution of typing, spelling lookup. Noise.
- Pauses **at or above 2s** correspond to higher-order cognition — planning the next sentence, deciding what to assert, revising. Signal.

This boundary has been replicated across writers, languages, and tasks for decades. It's the closest thing the field has to a universal unit.

### Pause-at-boundary is stronger than pure-time-threshold

A 2s pause means different things depending on where it lands:

- 2s pause at a sentence boundary (`.`, `?`, `!`, then space) → the writer is planning the next sentence. Strong cognitive signal.
- 2s pause at a clause boundary (`,`, `;`) → mid-thought adjustment. Weak signal.
- 2s pause mid-word → external interruption (phone, knock at the door). Probably noise.
- 2s pause at a paragraph break → the writer is shifting to a new movement. Strongest signal.

Pure time threshold treats all of these the same. Position-aware scoring doesn't. ([PMC: Interword pause thresholds](https://pmc.ncbi.nlm.nih.gov/articles/PMC3971171/))

### Sentence-centric models are the emerging alternative

A 2025 paper proposes the **sentence** as the basic temporal unit, replacing both bursts and paragraphs. The argument: the final text is a linear sequence of sentences regardless of how non-linearly they were produced. Sentences are the unit a reader perceives, so they're a defensible unit for analysis. ([Sentence-centric modeling of the writing process, JoWR 2025](https://www.jowr.org/jowr/article/view/1301))

This is newer and less validated than P-bursts, but conceptually cleaner: every writer produces sentences, regardless of paragraph style.

### Semantic chunking via LLM uncertainty is the production state of the art

"Meta-chunking" detects boundaries where the LLM's perplexity drops sharply, or where a prompted "split vs. keep" probability hesitates. ([Meta-Chunking, 2024](https://arxiv.org/html/2410.12788v3))

More expensive than pause-based detection, dramatically higher quality. LLM-judged boundaries match human-perceived logical transitions far better than punctuation-based heuristics do. The tradeoff is per-trigger latency and cost.

### Adaptive thresholds are underexplored

Some AI writing assistants observe individual writers' patterns and adjust suggestion cadence to their pace. ([Adaptive personalization in AI writing](https://www.jenova.ai/en/resources/ai-writing-assistant)) Not widely formalized, but for a freewrite we could compute a writer's median inter-pause time in the first minute and anchor the trigger threshold to *their* baseline rather than a universal 2s.

## What this implies for gaddr

The current design treats paragraph as the workhorse and pause as a fallback. That's backwards. **Paragraph is one of three signals (paragraph, sentence, pause), and it's the weakest in freewrites because it's stylistically variable. Pause is the universal one.**

The redesign principles:

1. **Stop treating typing structure as a proxy for cognition.** Pauses are the actual evidence of thinking and they survive any writing style.
2. **Position matters as much as duration.** A pause at a sentence boundary is qualitatively different from a pause mid-word.
3. **Token counts fail at both extremes.** They cause spam in dense writing and silence in sparse, deliberate writing. Time-based safety nets are more honest.
4. **Per-writer calibration beats universal thresholds**, once we have signal to calibrate against.

## Recommended trigger set

| Trigger | Fires on | Role |
|---|---|---|
| `production-pause` | ≥2s inactivity, weighted by position: paragraph break (strongest), sentence boundary (strong), clause boundary (weak), mid-word (ignore) | Primary generic trigger. Replaces both `paragraph-ended` and `idle-pause`. |
| `question-posed` | `? ` just typed | Structural special case. Questions are research-worthy regardless of pause. Unchanged. |
| `max-quiet-time` | 60s elapsed without any other trigger AND content changed | Safety net. Replaces `word-volume`. Survives both writing styles because it's time-based, not token-based. |
| `deletion-burst` *(future)* | ≥5-word deletion within 3s | Idea-recovery hook for the Phase 4 subtext layer. |

Notes:

- `paragraph-ended` disappears as its own trigger. It survives as the strongest position weight inside `production-pause`.
- `word-volume` disappears entirely. Replaced by `max-quiet-time` which doesn't care about token count.
- The token floor on `idle-pause` (`idleTokenFloor: 40`) disappears. It was a hack to suppress firing mid-thought; position-weighted pause detection does that more cleanly.

## Phased rollout

All three phases shipped. The detector is at `src/domain/editor/trigger-detector.ts`; the hook is at `src/app/(protected)/editor/use-trigger-detector.ts`.

### Phase 1: position-weighted pause + safety net — **shipped**

- Pause threshold: **2000ms** base.
- Position-classified by `classifyBoundary(text)` — paragraph-break, sentence-boundary, clause-boundary, between-words, mid-word. Mid-word never fires; all others do.
- `paragraph-ended` and `idle-pause` collapsed into a single `production-pause` trigger that carries `boundary`, `pauseDurationMs`, and `thresholdMs` as metadata.
- `word-volume` replaced by `max-quiet-time` (60s) — time-based safety net, no token gating. Suppressed in evaluations where `production-pause` also fires, so the two don't double-emit.
- `question-posed` unchanged (structural, fires regardless of pause).
- Token floor removed entirely.

### Phase 2: adaptive threshold — **shipped**

- State carries a ring buffer (`pauseHistoryMs`, capped at 30) of observed pause durations.
- Pauses are recorded on edit events that ended a meaningful pause (≥500ms, ≤30s; outside this range is treated as transcription noise or extreme outlier).
- After 10 samples, `computeAdaptiveThreshold` returns the 40th-percentile pause, clamped to [1000ms, 5000ms]. Below 10 samples, falls back to the 2000ms base.
- The effective threshold is recomputed every evaluation and surfaced on each `production-pause` emission's `thresholdMs` field for downstream observability.

### Phase 3: pluggable semantic-completion check — **shipped**

- `useTriggerDetector` accepts an optional `semanticCompletionCheck: (params) => Promise<boolean>` option.
- When provided, candidate triggers are awaited through the check before being delivered to the observer. Returning `false` (or throwing) drops the trigger.
- The check receives `burst` (text produced since the last *delivered* trigger), `reason`, and `boundary`.
- Default is no check — pass-through delivery.

The wired implementation is the interface; the actual LLM call is left for a future Haiku integration. To plug in:

```ts
useTriggerDetector(editor, {
  enabled: sprintPhase === "running",
  semanticCompletionCheck: async ({ burst, boundary }) => {
    // Call Haiku here with a "is this a complete thought?" prompt.
    return await isCompleteThought(burst);
  },
});
```

## Trigger ≠ unit

One conceptual cleanup worth making explicit: the current design conflates **when we look** (trigger) and **what we analyze** (unit). With pause-bounded triggers they become distinct:

- **Trigger:** a pause is detected.
- **Unit:** the P-burst — everything written since the last trigger.

The unit naturally spans whatever the writer just produced, whether that's half a sentence or three paragraphs. This is the right separation for the intelligence pipeline downstream: the Haiku triage call always receives a coherent unit of content, regardless of paragraph style.

## What stays the same

- The pure-domain shape of the trigger detector (`evaluateTrigger(state, event, config) → { triggers, nextState }`).
- The hook integration (`useTriggerDetector` consumes the detector and emits observations).
- Background-only execution; no keystroke-path work.
- All cross-cutting principles from the [intelligence roadmap](../intelligence-roadmap.md): provenance tiers, no-ghostwriting, hallucination defense, latency budget.

The trigger set changes; the architecture doesn't.
