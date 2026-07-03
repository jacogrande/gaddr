# Temporal Signals — Reading the Freewrite as a Trajectory

**Status:** Proposed feature, 2026-07-02. Companion to `constellation-interaction.md` and `spark.md`; harness placement in `../research-agentic-harness-constellation.md`; trigger substrate in `../research/trigger-units-and-cadence.md`.
**One-liner:** The final text is a lossy projection of the freewrite. The timeline is the record of the thinking — and a co-thinker should respond to the thinking, not the artifact.

---

## 1. The premise

Two writers can end a sprint with identical text and have done completely different thinking. An idea the writer *opened with* is not the same as an idea they *arrived at* after fifteen minutes of circling — one is a premise, the other a discovery — and only the timeline can tell them apart.

Every other writing tool sees a document. gaddr is structurally positioned to see a trajectory: the freewrite is thinking-in-progress by design, and the trigger substrate already segments it into pause-bounded bursts with sequence, trigger reason, and intent. Temporal signals are how the constellation stops reading the draft as a finished argument and starts reading it as a record of discovery.

## 2. What the timeline knows that the text doesn't

Each signal below is a **heuristic reading** — a prior for ranking and framing, never a fact about the writer's mind (see §6).

### Fluency — rehearsed vs. frontier

Writing-process research distinguishes fluent bursts (long, fast, few revisions) from halting production (short bursts, backtracks, pauses). Fluent language tends to be *rehearsed* — things the writer has said or thought before, possibly borrowed. Halting language is *frontier* — constructed for the first time, right there.

This yields the routing rule pure text cannot support: **challenge the fluent, nourish the halting.** The confident riff that poured out in one burst earns the steelmanned counterargument (is this yours, or received?). The sentence the writer fought for earns evidence and research directions (here is what supports where you're going).

### The abandoned fork — unanswered self-questions

A `question-posed` trigger that the writer never returned to is the highest-value, lowest-risk temporal signal. The writer flagged their own open question and moved on — often it's invisible in the final text. Echoing it back *developed* ("You asked yourself X at minute 4 and never came back — here's what's known") carries perfect provenance: the question is theirs.

### Return patterns — crystallizing vs. oscillating

A theme the writer keeps returning to after gaps is one that won't let them go; the *shape* of the returns says what to do about it:

- **Escalating returns** (each visit more asserting) — a position crystallizing → steelman the endpoint.
- **Oscillating returns** (asserting ↔ wondering; the `Tension` type already detects this) — genuine internal conflict → the best steelman target in the draft, because the writer is authentically torn. Steelman *both* poles.

### Time-weighted heat

Ranking today is tier + recency. The timeline upgrades it: **time-on-theme beats words-on-theme.** A theme that consumed 40% of the sprint's minutes but 10% of its words — slow, effortful writing — is where the thinking actually happened. Heat = time spent × returns × pause density, feeding the crux ranking (load-bearing × contested × hot).

### Trajectory and seams

Where the writer *ended* is where their head is; where they *started* is what they thought the piece was about. The board's opening view can honor the arc — and the drift between the two is the roadmap's "subterranean topic" signal, now measurable. Topic-shift boundaries are the seams of the associative graph: "you moved from A to B — what's the bridge?" is a generative question exactly there.

### Pauses and trail-offs

Already specified: `spark.md` §4 makes trail-off points pause-anchored constellation nodes and feeds them into heat ranking. Temporal signals generalize that mechanism; the phrasing discipline defined there (anchor to the visible trail-off, never the measurement) governs everything in this doc.

### Deletions (deferred — Phase 4 unlock)

Deletion events with timestamps make the roadmap's "idea recovery" real: *"You started to say X at minute 7 and deleted it — wrong, or just early?"* Requires revision-history plumbing; noted here because the temporal transcript is its prerequisite.

## 3. Routing table

| Temporal pattern | Heuristic reading | Constellation response |
|---|---|---|
| Fluent burst, asserting intent | rehearsed conviction | steelmanned counterargument — test it |
| Halting production, new theme | frontier thinking | evidence + research directions — nourish it |
| `question-posed`, never answered | abandoned fork | question node echoing the writer's own question, developed |
| Returns with escalating assertion | crystallizing position | steelman the endpoint; evidence both ways |
| Returns oscillating asserting ↔ wondering | genuine internal conflict | steelman both poles; top crux weight |
| Long pause while circling a claim | high-heat moment | heat boost + pause-anchored node (`spark.md` §4) |
| Topic-shift seam | associative bridge | "what connects A to B?" question node |
| Halting delivery of an "asserting" sentence | intent correction: really *testing* | soften — evidence and questions, not pushback |
| Deleted span *(deferred)* | moment of retreat | idea-recovery question |

Routing shifts **emphasis and framing**, never access: the writer still gets a full constellation under the interaction model's density caps. A temporal signal decides what leads and how it's phrased, not what exists.

## 4. The temporal transcript

The interface between the timeline and the model is a **temporal transcript** — the draft as a time-series, not flat text plus a pile of metrics:

```
[00:00–01:12 · fluent] I think craftsmanship declined because mass production...
[01:12 · pause 38s]
[01:50–03:04 · halting, 2 backtracks] but maybe what actually changed is who
could afford well-made things in the first place...
[03:04 · question posed, never answered] is repairability the real issue?
[03:31–05:10 · fluent, topic shift] anyway, the thing about planned obsolescence...
```

Properties that make it the right interface:

- **Cheap.** Constructed from data the trigger path already produces (burst seq, trigger reasons, boundaries, backtrack signals) plus per-burst timing the shell can trivially record.
- **Append-only.** Each burst appends a block, so the transcript *is* the growing cached prompt prefix of the instant-constellation harness — the speculative pipeline accumulates it burst by burst at cache-read prices.
- **Pure to build.** The transcript builder is a pure domain function over the burst log (timestamps arrive as data from the shell; `domain/` never calls a clock). Deterministic, unit-testable.
- **Intent-correcting.** Triage tags a burst `asserting`; the transcript shows it was written haltingly with two backtracks; the harness treats it as `testing`. Since pushback fires only on asserted positions, temporal correction directly enforces the product's gentleness rule.

## 5. User journeys

*(Lettering continues from `constellation-interaction.md` A–E and `spark.md` F–H.)*

### Journey I — The rehearsed riff

*Jordan spends the sprint on the decline of craftsmanship. The opening three minutes pour out in one fluent burst — the mass-production lament Jordan has been making at dinner parties for years. Minute eight, they hit the affordability idea for the first time: short bursts, backtracks, one long pause.*

1. The constellation leads the craftsmanship cluster with a steelman: *"The strongest version of the opposing case: the golden age of craftsmanship never existed for most people — handmade goods were a luxury. Does your argument survive that?"* The fluent riff earned the challenge.
2. The affordability passage — frontier thinking — arrives *supported*: price-history evidence, a research direction on repair economies. The halting idea earned nourishment, not a fight.
3. Jordan never sees the mechanism. What they experience: the tool pushed where I was coasting and helped where I was reaching.

### Journey J — The question that wouldn't wait

*Same sprint. At minute 4 Jordan typed "is repairability the real issue?" and immediately chased a different thread. The question never came back.*

1. The constellation carries a question node: *"At one point you asked whether repairability is the real issue — you never came back to it. There's a literature here: right-to-repair economics, planned obsolescence studies."*
2. Provenance is unimpeachable — the question is Jordan's own words, anchored to the burst that produced it. The node develops it rather than re-asking it (same no-double-serving rule as sparked dimensions).

### Journey K — The oscillation

*Priya freewrites on the AI bubble and Keynesian stimulus. Across twenty minutes she returns to "the bubble is productive investment" four times — twice asserting it, twice wondering whether she's rationalizing.*

1. The tension outranks every other crux: repeated returns, mixed intent, heavy pause density on the final visit.
2. The board opens on the oscillation, steelmanned in both directions — the Perez productive-bubble case at its strongest, the Minsky-moment case at its strongest — framed as: *"You went back and forth on this four times. Here is each side at full strength."*
3. Priya's genuine internal conflict, which a flat reading of her final text would have averaged into a single hedged claim, becomes the constellation's centerpiece.

## 6. Guardrails

1. **Temporal inferences are `heuristic` tier, always.** The tier exists for exactly this: pattern-level signal, no model judgment. Pause ≠ doubt — pauses are planning (Flower & Hayes), and sometimes they're coffee.
2. **Point at observables, never psychologize.** "You trailed off here" and "you never came back to this question" are provenance — visible in the record. "You were uncertain here" is presumption. The first phrasing is allowed; the second never ships.
3. **Per-writer baselines.** "Fast = borrowed" is an insult to fast typists and a horoscope without normalization. The trigger detector already maintains adaptive per-writer pause thresholds; fluency classification gets the same treatment. No absolute words-per-minute judgment anywhere.
4. **Nothing temporal surfaces mid-sprint.** The sprint contract (`spark.md` §2) is untouched: no presence indicators, no live readouts. Temporal signals are consumed by the post-sprint harness only.
5. **Not a quantified-self dashboard.** The timeline serves the constellation. gaddr never shows the writer their WPM, pause counts, or "focus score" — productivity analytics would poison the psychological privacy the freewrite depends on.
6. **Homogenization check still applies.** Routing rules are formulas, and formulas flatten. Dimensional rotation and per-draft grounding (`spark.md` §3) govern temporal-routed nodes the same as everything else.

## 7. Eval hooks & guard metrics

1. **Intent correction:** does demoting halting-asserting to testing reduce wrongly-aimed pushback? Measure via dismissal and reaction quality on pushback nodes, temporal-corrected vs. triage-only.
2. **Routing lift:** A/B temporal-routed constellations against text-only ones on the existing engagement metrics (reaction-gated resolutions, dismissals, node-chat depth per node type).
3. **Heat validity:** do time-weighted cruxes get engaged more than word-count-ranked ones? If heat ranking doesn't beat recency ranking on engagement, it's complexity without value.
4. **Fluency false positives:** spot-check "rehearsed" classifications against drafts where the writer is known to be on new ground (e.g., first sprint on a topic). A high false-positive rate means the baseline hasn't converged — suppress the routing rule until it has.
5. **The creepiness check:** qualitative, with real writers — do pause-anchored and history-anchored nodes read as attentive or as surveillant? This one can't be automated; it decides how much of §2 ever ships.

## 8. What this is not

- **Not a stall detector.** Spark stays pull-only; temporal signals never trigger anything mid-sprint.
- **Not a conviction meter.** No score, badge, or meter derived from typing dynamics is ever shown.
- **Not analytics.** No writer-facing productivity stats, ever.

## 9. Research references (compact)

Bursts and fluency: Chenoweth & Hayes (2001). · Pauses as planning: Flower & Hayes (1981); Wengelin. · Keystroke logging: Leijten & Van Waes (Inputlog). · Pause-anchored nodes and phrasing discipline: `spark.md` §4. · Intent axis and tension detection: `../intelligence-roadmap.md` Phase 1; `src/domain/constellation/types.ts`. · Harness placement (temporal transcript as cached prefix): `../research-agentic-harness-constellation.md` Part 2. · Crux ranking and density caps: `constellation-interaction.md`.
