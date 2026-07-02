# Spark — Summonable Thinking Prompts During the Freewrite

**Status:** Proposed feature, 2026-07-01. Companion to `docs/product/constellation-interaction.md`; grounded in `docs/research-ai-cothinker-constellation.md`.
**One-liner:** When a writer stalls mid-sprint, they can *summon* a single question that adds a dimension to their thinking — the AI never speaks first.

---

## 1. The problem

Stalls are real. Mid-sprint, a writer drifting toward an opinion — say, the decline of craftsmanship — stops typing. Their thoughts trail. The blank-cursor moment is painful, and every other AI writing tool "solves" it by jumping in.

gaddr must not, for three research-backed reasons:

1. **A pause is not a stall.** Writing-process research (Flower & Hayes; keystroke-logging studies) shows pauses — especially at clause and sentence boundaries — are where planning happens. A proactive nudge interrupts exactly the moments most worth protecting, and the tool cannot reliably tell "stuck" from "thinking."
2. **The freewrite is the instrument reading.** The constellation depends on the sprint producing a genuine record of the writer's *unaided* reasoning (the freewrite-first forcing function; the generation effect). An unbidden prompt at the stance's most plastic moment contaminates that record — and, since every stalled writer on a topic would get similar prompts from the same model, it is the homogenization mechanism (Doshi & Hauser) applied at the worst possible time.
3. **The observer effect fires even when the nudge doesn't.** Freewriting works because it is psychologically private (Elbow). If writers know the AI watches pauses and might comment, every pause becomes a performance. The *possibility* of interruption changes the writing before any interruption occurs.

But refusing to help at all abandons the writer in the one moment they'd welcome a co-thinker. The resolution is **pull, not push**.

## 2. The contract

> **The writer always breaks the silence.** During a sprint, the AI never renders, signals, animates, or suggests unbidden. No presence indicator, no shimmer, no "thinking…" — nothing that says *you are being watched*. Spark exists only as a quiet, static affordance until summoned.

## 3. Mechanics

### Summoning
- A hotkey (e.g. `⌘.`) or a small fixed affordance at the sprint surface's edge — visually inert, never animated, never badge-counted.
- Invoking it renders **one spark card**: a single question, one line, no preamble.

### What a spark contains

A spark is **always a dimensional question**: it names a lens the writer hasn't used — it never asserts a stance. "What about affordability?" passes; "craftsmanship declined because mass production made goods affordable" fails. That is the whole grammar of the feature: one question, one unnamed dimension, nothing else.

The boundary holds in both directions:

- **Never less:** no contentless nudges ("elaborate," "keep going") — a spark that names nothing is worse than silence.
- **Never more:** no positions, no counterarguments, no prose. Those wait for the constellation, where the writer's own committed case exists to push against.

### Selection logic
- **Grounded in what's written.** The dimension derives from the writer's actual draft — the lens they're circling but haven't named. A rich draft earns a sharp, specific dimension; a thin draft gets a broader one. Never ungrounded.
- **Vary the dimension across writers and sessions.** Dimensional selection must not converge on the model's favorite lens for a topic (anti-homogenization: rotate across e.g. economic, historical, personal, adversarial, definitional lenses, weighted by what the *draft* lacks — not by what the model likes).

### Behavior after render
- **One re-roll.** A "different spark" tap serves one alternative, then the affordance rests until the writer writes again. No slot machine.
- **The card fades on the first keystroke.** It did its job; it must not linger as a co-presence. There is no reply box — **Spark is not a chat.** If the question deserves deep engagement, that happens in the constellation.
- Every spark (served, re-rolled, ignored) is logged with its sprint position.

### Latency
- Typing latency is P0. Spark candidates may be prepared asynchronously in the background so a summon renders in under a second — but background preparation never surfaces, signals, or renders anything unbidden.

## 4. Handoff to the constellation

- **Sparks carry provenance.** A spark is model reasoning, tagged `inferred` — never presented as sourced evidence.
- **No double-serving.** The constellation knows which sparks the writer saw. A dimension already sparked mid-sprint appears in the constellation only *developed* (with evidence and sources attached), never re-asked as if new.
- **Pause-anchored nodes.** Independently of Spark, trail-off points are logged silently and become first-class constellation signals: a long pause while circling a claim feeds the crux/heat ranking, and can anchor a post-sprint node — *"You trailed off here while circling the decline of craftsmanship — what about affordability?"* Same content as a spark, zero contamination, delivered after the writer's own case is committed. This is the default path; Spark is the opt-in accelerant.

## 5. What Spark is not

- **Not proactive.** It never fires on a timer, a pause threshold, or a sentiment signal.
- **Not a chat.** One card, one line, no thread, no reply.
- **Not a critic.** It never evaluates what's written ("this claim is weak" is constellation work, and even there it's framed as provocation).
- **Not a ghostwriter.** Positions, counterarguments, and prose are structurally unreachable — the generation prompt cannot produce them, and outputs are validated against the dimensional boundary before render.
- **Not "elaborate."** A contentless nudge is worse than silence. Every spark names a *dimension*.

## 6. User journeys

### Journey F — The stall (canonical)

*Jordan is 8 minutes into a 20-minute sprint, drifting toward an opinion on the decline of craftsmanship. They've written about mass production and quality. The cursor sits for 40 seconds. Thoughts trailing.*

1. Jordan hits `⌘.`. One card renders: **"What about affordability?"**
2. Something clicks — they'd been treating craftsmanship's decline as pure loss, and hadn't considered who could afford handmade goods in the first place. They start typing; the card fades on the first keystroke.
3. Jordan writes 200 words on craftsmanship as a luxury good historically, and whether "decline" is really "democratization."
4. Post-sprint, the constellation's affordability cluster arrives *developed* — evidence on real price histories, a steelmanned "the golden age never existed for most people" counter — building on the sparked dimension rather than re-asking it.

### Journey G — The spark that doesn't land

*Same sprint, different moment. Jordan summons a spark and gets "What about apprenticeship — how the skills were transmitted?"*

1. It doesn't resonate. Jordan taps **different spark** → one alternative dimension: *"What about repair — what happens when these things break?"* Then the affordance rests; no fishing.
2. Jordan ignores that too and writes about something else entirely. Nothing nags. Both sparks are logged; neither reappears.
3. The constellation later follows the thread Jordan *actually* pursued. The declined sparks cost four seconds and left no residue.

### Journey H — Too early to ground sharply (graceful degradation)

*Sam summons a spark 90 seconds into a sprint, with two fragmentary sentences about why nobody reads anymore.*

1. There isn't enough draft for a sharp dimension, so Spark serves a broad one grounded in the little that exists: **"What about what replaced it?"**
2. Sam starts listing what filled the hours — and the freewrite finds its subject. The dimension was wide enough to impose nothing, specific enough to open a door.

## 7. Eval hooks & guard metrics

These decide whether Spark ships, stays, and whether an opt-in "guided sprint" push mode is ever justified:

1. **Dependence:** do frequent spark-users' *unassisted* sprints (spark untouched) improve or degrade over time? Stall tolerance is part of the skill the product builds — if Spark erodes it, tighten the mechanic.
2. **Homogenization:** do sparked drafts on similar topics converge in embedding space vs. unsparked drafts? If yes, the dimensional-rotation logic isn't working.
3. **Pause base rate:** what fraction of long pauses resolve into productive bursts *with no intervention*? (Measurable from existing sprint data today — this number is the standing argument against ever making Spark proactive.)
4. **Usage shape:** sparks per sprint, ignore rate, re-roll rate, and words-after-spark. High ignore rates mean selection quality is failing; very high usage flags dependence review.

**Deferred:** an explicit opt-in "guided sprint" mode where dimensional prompts push on long stalls. Not before the pull data exists.

## 8. Research references (compact)

Pauses as planning: Flower & Hayes (1981); Leijten & Van Waes (keystroke logging). · Psychological privacy of freewriting: Elbow (1973). · Freewrite-first as forcing function: Buçinca et al., arXiv:2102.09692. · Generation effect: Bjork & Bjork (2011). · Homogenization: Doshi & Hauser, arXiv:2312.00506. · Suggestion anchoring & answer-engines: Fan et al., arXiv:2412.09315; Kumar et al., arXiv:2410.03703. · Dimensional-question boundary rationale: `docs/research-ai-cothinker-constellation.md` (Themes 1–3, 6); interaction model: `docs/product/constellation-interaction.md`.
