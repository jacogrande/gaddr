# Intelligence Roadmap

Sequences the LLM-powered features that read a freewrite and surface findings in the constellation. Sits inside the sprint scaffolding from [mvp-cycle.md](./mvp-cycle.md).

Related research:

- [Background inference during the freewrite](./research/background-inference-during-freewrite.md) — Anthropic SDK patterns, tiered model strategy, cost model.
- [Trigger units and cadence](./research/trigger-units-and-cadence.md) — why pause-bounded P-bursts replaced paragraph-based triggers; describes the production-pause / question-posed / max-quiet-time set the detector emits.

## Framing

The input is a freewrite, not a first draft. The writer is verbosely philosophizing — discovering their position, testing half-formed thoughts, circling concerns they haven't named. They are mostly not citing sources, naming thinkers, or making sharp claims.

The intelligence layer is a **guide, not a critic**. Its job is to:

- help the writer see what they keep returning to
- introduce them to the canon and the empirical literature their thinking is adjacent to
- push back gently when they go off track or lean on an unexamined assumption
- sharpen positions they're leaning toward, without committing them prematurely

Order is dependency-first, then risk. Structure ships first because everything reads it. Hallucination defense is built early because the headline feature (canon dialogue) depends on it.

## Cross-Cutting Principles

- **Three provenance tiers** — every finding is tagged `sourced` (verified citation), `inferred` (model reasoning over freewrite text), or `heuristic` (pattern-level signal). Tiers must be visually and semantically distinct.
- **Background-only execution** — runs during or after the sprint, never on the keystroke path.
- **No-ghostwriting** — every output is a finding, question, or comparison. Never replacement prose.
- **Hallucination defense** — never generate a citation or attribute a position. Retrieve first, then summarize against a verifiable span.
- **Exploration tolerance** — a freewrite is thinking in progress. Findings open doors, they don't grade. Leaps are not errors unless the writer is leaning on them.
- **Latency budget** — features that can't meet it run as background workers and degrade to partial constellations gracefully.

---

## Phase 1: Discovery Substrate

The structural understanding every later feature reads, shaped for exploratory writing.

- **Theme extraction** — concerns the writer keeps returning to, with frequency and emphasis weight.
- **Tentative-position detection** — positions the writer is taking, each tagged with an intent axis: `asserting` / `testing` / `wondering`.
- **Tension mapping** — places where the writer's positions conflict with each other internally.
- **Hallucination defense infrastructure** — retrieval, span verification, confidence thresholds, graceful decline. Phase 2 depends on this being mature.

A claim graph emerges as a secondary output for the subset of positions sharp enough to function as claims.

Tier: `inferred`.

Testable: a freewrite produces a ranked theme list, a position list with intent labels, and an internal-tension map.

---

## Phase 2: Connect to the World [HEADLINE]

The highest-value move for a discovering writer. Show them what the canon and empirical literature say about what they're circling.

- **Dialogue with the canon** — for each major theme or position, identify the thinkers and traditions the writer is adjacent to. Cite primary sources with verified spans. *"You keep circling something Hannah Arendt called the banality of evil."*
- **Named-thinker positions** — 3–5 named figures whose published positions on the theme are retrievable. Each persona is span-grounded; if no source exists, the figure does not appear.
- **Further reading** — per theme, three intents: *what would deepen this*, *what would challenge this*, *what has already said this well*.
- **Empirical literature** — when a theme has an empirical literature, surface it: *"There's a body of research on X you may not know about."*

Tier: `sourced`. No speculative attribution.

Risk: this is the highest-misattribution-risk phase, shipped early because it's the headline. The hallucination defense from Phase 1 is load-bearing here.

Testable: every persona, citation, and recommendation cites a real source with a verified span; the system declines gracefully when no source exists.

---

## Phase 3: Sharpen What's Emerging

Pushback, but aimed at helping the writer find and commit to their position — not at catching errors.

- **Position steelmans** — for positions the writer is leaning into, show the strongest version of the committed claim. *"If you went all the way with this, here's what you'd be saying. Is that where you're going?"*
- **Counter-positions** — strongest honest opposition to a position the writer is testing. Helps them decide before they commit.
- **Unexamined assumptions** — surface assumptions a position is leaning on without saying so. Phrased as invitations, not verdicts. *"This position assumes X. Worth pulling on?"*
- **Gentle pushback** — when the writer asserts something that contradicts a strong body of evidence, name it once, with sources. Not repeatedly, not for tentative thoughts.

Tier: steelmans and counter-positions prefer `sourced`, fall back to `inferred`. Assumptions and pushback are `inferred` with sources where available.

Testable: pushback fires only on asserting-tagged positions, never on testing or wondering; every finding is phrased as an opening.

---

## Phase 4: Subtext & Abandoned Ideas

In a freewrite this is gold. The writer is testing ideas mid-thought; the things they almost said or kept retreating from often hold the real signal.

- **Implicit premises** — load-bearing assumptions the freewrite never states.
- **Ghost arguments** — unnamed interlocutors the writer is responding to.
- **Subterranean topic** — drift between stated concern and actual emphasis. *"You say this is about X. You keep returning to Y."*
- **Idea recovery** — classify deleted spans (typo, rephrase, abandoned idea, self-censored thought) and resurface the interesting ones with the moment of retreat as evidence anchor.

Tier: `inferred`.

Testable: subtext findings cite the sentences that produced them; abandoned-span findings link to deletion timestamp and surrounding context.

---

## Deferred

Features that need a sharper artifact than a freewrite produces. They may return when the writer moves from constellation toward a finished draft.

- **Counterfactual term substitution** — needs load-bearing terms to substitute against.
- **Argument symmetry** — needs claims sharp enough to test for principled consistency.
- **Fallacy detection** as a discrete feature — the freewrite-appropriate version lives inside Phase 3's "unexamined assumptions."

## Out of Scope

- **Voice & tone drift** — a freewrite is a thinking session, not a stylistic artifact. There is no voice to be drifting from.
- inline AI during the freewrite
- ghostwriting in any form, including stylistic rewrites
- "real subject" detection (too invasive at any phase)
- generic personas without real attribution
- speculative attribution to named thinkers

---

## Summary

| Phase | Features | Depends on | Risk |
|---|---|---|---|
| 1 | theme & position extraction, tension mapping, hallucination defense | — | medium (substrate quality determines everything downstream) |
| 2 | canon dialogue, named-thinker positions, further reading, empirical literature | Phase 1 | **high** (misattribution risk; shipped early because it's the headline) |
| 3 | position steelmans, counter-positions, unexamined assumptions, gentle pushback | Phases 1–2 | medium |
| 4 | subtext, idea recovery | Phase 1 + revision-history plumbing | low |
| Deferred | counterfactual, symmetry | sharper artifact | — |

## Delivery Rule

Each phase ships domain types, adapter contracts, constellation UI with correct tier styling, and an eval contract plus Playwright workflow. Anything less is not done.
