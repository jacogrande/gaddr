# Constellation Interaction Design

**Status:** Proposed design, 2026-07-01. Grounded in `docs/research-ai-cothinker-constellation.md`; consistent with `docs/product/positioning.md`.
**Question this doc answers:** After the sprint timer ends, how does the writer *engage* with constellation nodes — in a way that neither overwhelms them nor lets them skim past the thinking?

---

## 1. The design problem

Two naive designs, two failure modes:

| Design | Failure |
|---|---|
| **Present all nodes at once** | Overwhelm. 20–40 findings with no index produces completionist anxiety or paralysis. |
| **Condense to a single chat** | Passive skimming. A linear transcript hides structure, invites dismiss-without-thinking, and puts a sycophantic mediator between the writer and the evidence. |

These are the two poles of inbox behavior: clear-the-badge or drown. The design goal is neither. **The metric is engaged thinking per minute — reactions written in the writer's own words on the tensions that matter most.** Not nodes processed.

The organizing insight: *organization*, *sequence*, and *depth* are three different problems. The design solves each with its own layer, following Shneiderman's visual information-seeking mantra — **overview first, zoom and filter, details on demand.**

```
        ┌──────────── MAP (always visible) ────────────┐
        │  ★ Core idea 1   ★ Core idea 2   ★ Core idea 3│
        │   ├ evidence      ├ counter ⚡     ├ question   │   ⚡ = crux
        │   ├ question      ├ evidence      ├ direction  │
        │   └ +2 more       └ +1 more       └ …          │
        │  ◌ Off-map: what you didn't write about (2)   │
        └───────────────────────────────────────────────┘
              │ tour: footing → questions → steelman → directions
              ▼
        Node card (claim · provenance · payoff)
              ▼ "talk this through"
        Scoped Socratic chat → reaction in your words → resolves node
                                        └→ seeds final-draft annotation
```

---

## 2. Layer 1 — The map: clusters anchored to the writer's core ideas

The constellation's spatial spine is a **reverse outline of the freewrite**: 3–6 core ideas extracted from the draft become the "stars." AI-generated nodes (evidence, arguments, steelmanned counterarguments, citations, research directions, questions) cluster around the idea they respond to.

**Why this works:** the writer already holds this index in their head — it's what they just wrote. Orientation is *recognition, not learning*. Grounding AI feedback in the writer's own argument structure is the validated mechanic from Critical Inker (Hugenroth, Danry & Maes, arXiv:2604.07167), and the reverse outline is independently the best-supported structuring move in writing pedagogy.

**Rules:**

- **The map is editable.** Writers can rename, merge, and split clusters. This is not admin overhead — renaming your own core ideas *is* thinking, it corrects extraction errors, and it keeps authorship with the writer.
- **Degrade gracefully.** Argument extraction benchmarks (91.2% overlap) come from *clean* essays; a rambling freewrite parses worse. When parse confidence is low, fall back to fewer, broader theme clusters — or a single cluster — rather than forcing a wrong structure onto exploratory prose.
- **The off-map cluster is mandatory.** A map built only from the writer's ideas inherits their blind spots — and the research's central finding is that a solitary freewrite is one-sided *by design* (Mill; Mercier & Sperber). One cluster is always reserved for positions and directions that attach to the *topic* but to none of the writer's claims: **"What you didn't write about."** This is the anti-mirroring guarantee made visible.

## 3. Layer 2 — Triage: rank by crux, cap hard, give every node scent

- **Heat ranking.** Clusters are ordered by *crux-ness*: how load-bearing the idea is to the writer's overall stance × how strong the opposing evidence is. The hottest cluster is where the writer leans hardest and the challenge is sharpest. One cluster carries the ⚡ crux marker.
- **Hard caps.** ~3–5 nodes visible per cluster (working memory is 4±1 — Cowan 2001; provocation value is conditional — Drosos et al.), remainder behind "more." Total initially visible across the board: ~12–15.
- **Scent on every node** (Pirolli & Card, information foraging): a type chip (`evidence` / `counter` / `question` / `direction` / `citation`), a one-line payoff, and a rough read time. The payoff must be legible *before* the click — effective friction is disliked friction (Buçinca), so every node has to earn its open.
- **Anti-inbox mechanics.** No unread counts. No progress bar over the full node set. No "clear all." Deferral is first-class and shame-free. The session-complete state celebrates *reactions written*, not nodes cleared.

## 4. Layer 3 — The tour: a guided walk as the default path, never a separate mode

- **Default on for a reason:** minimal-guidance exploration fails learners without schemas (Kirschner, Sweller & Clark 2006), and gaddr's core scenario is a writer who knows only a little. The tour is a suggested traversal order drawn *on* the map — the map never disappears (focus+context), and every step is skippable.
- **Fades with expertise** (expertise-reversal effect, Kalyuga et al.): returning writers can set map-first as their default; the tour chip stays one tap away.
- **Tour order follows the scaffolding rule** (Bjork & Bjork's desirable-difficulty boundary):
  1. **Footing** — orienting evidence on the writer's central idea (start where recognition is highest).
  2. **Questions** — definitional and empirical questions that sharpen claims.
  3. **The steelman** — the hardest counter-position lands late, once the writer has footing.
  4. **Directions** — close on research directions: forward-looking momentum into the next sprint, not a final punch.
- **Time-budgeted.** The tour proposes a bounded session: "3 things worth your next 10 minutes." Constellation review is part of the product's rhythm, not an open-ended chore.

## 5. Layer 4 — Node chats: every node is a conversation starter

Each node opens into a **scoped, Socratic chat** — the strongest-evidenced idea in the design (static feedback repurposed as conversation starters: Kim, Laban, Chen & Arnold, arXiv:2504.08687).

**Guardrails:**

- **Scoped.** The chat is pinned to the node's sources, the relevant freewrite span, and the constellation context. It exists to go deeper on *this* tension.
- **Socratic and non-drafting.** The no-ghostwriting boundary is weakest inside a chat — "just write the paragraph for me" is one message away. The chat refuses composition, always. It can quote sources, explain arguments, and ask back.
- **Anchored against sycophancy.** When the writer pushes back, the chat does not cave to keep them happy (Sharma et al., sycophancy); it re-anchors on the pinned provenance. It concedes only when the writer produces an actual reason — and then it says so plainly.
- **Chats mint nodes, not transcripts.** If a follow-up surfaces a new source or tension, it becomes a new provenance-tagged node on the map. Value stays structural; nothing important is buried in chat history.

## 6. Node lifecycle

```
unseen → opened → engaged (chatted / expanded provenance)
                     ├→ resolved   — writer wrote a reaction in their own words
                     ├→ dismissed  — writer explicitly set it aside (one tap, no guilt)
                     └→ deferred   — resurfaces at the next constellation
```

**Resolution requires a reaction in the writer's own words** (Critical Inker's withhold-until-named mechanic; our static-vs-interactive risk mitigation). The reaction can be one sentence. It is the writer's — and it **seeds the corresponding annotation in the final draft**, which is how the constellation bridges into step 3 while keeping every written word the writer's own.

---

## 7. User journeys

### Journey A — The near-novice, guided (canonical path)

*Jordan is brainstorming "How will the AI bubble and Keynesian economics clash? Does AI uproot everything?" They know a little macro, no more. The 20-minute sprint ends.*

1. **Timer ends → map appears.** The freewrite has been parsed into four stars: *"AI capex is propping up GDP," "A crash is coming," "Keynes would say stimulate," "AI might replace too many jobs."* An off-map cluster reads: *"What you didn't write about (2)."* A banner offers: **"Walk the constellation — 3 things worth your next 10 minutes."**
2. **Jordan takes the tour. Stop 1 (footing):** an `evidence` node on their central idea — *Furman: data-center capex was ~92% of H1-2025 GDP growth, on ~4% of GDP* — with source chip and 1-min read time. Jordan reads it, feels *oriented, not judged*: the AI found their strongest instinct real numbers.
3. **Stop 2 (question):** a `question` node on "A crash is coming": *"What distinguishes the bubble bursting from it deflating, repricing, or plateauing? Where's your threshold?"* Jordan taps **talk this through** and types "honestly I don't know the difference." The chat explains crash vs. correction with two historical examples, then asks which their claim needs. Jordan writes a reaction: *"My claim only works if there's an actual crash — I need a threshold."* → node **resolves**, reaction saved.
4. **Stop 3 (the steelman, marked ⚡):** a `counter` node on "Keynes would say stimulate": *the Austrian objection — the boom is malinvestment from easy money, and the Keynesian cure is the disease* (steelmanned, with Mises/Hayek provenance). Jordan pushes back in chat: "but that's just austerity." The chat doesn't cave — it restates the strongest version and asks what Jordan's answer to the Mellon-liquidationist record would be. Jordan writes: *"I think the 2008 evidence beats liquidationism, but I have to actually argue that now."* → resolved.
5. **Tour closes on a `direction` node:** *"Compare bubbles on the residue they leave — rail track and dark fiber were durable; GPUs depreciate in ~5 years."* Jordan defers it to the next sprint.
6. **Session-complete state:** *"3 reactions written. 1 direction saved for next sprint."* No mention of the 14 nodes Jordan never opened. Next sprint, Jordan's three reactions are waiting as annotations on the draft.

### Journey B — The experienced essayist, map-first

*Priya writes policy essays weekly. She turned tour-default off three sessions ago.*

1. Map appears. Priya ignores three clusters — she knows her evidence is solid there — and goes straight to the ⚡ crux on her distributive-justice claim.
2. She scans the cluster's four nodes by scent chips, opens only the `counter`, reads the provenance spans without chatting, and writes a two-line reaction. Resolved.
3. She opens **off-map**, finds a position she'd never heard of, drags it *onto* her second cluster (map edit), and defers it.
4. Total session: 4 minutes, 1 reaction, 1 deferral. The design imposed zero ceremony on her.

### Journey C — The messy freewrite (graceful degradation)

*Sam's sprint produced fragmented, associative notes — half-sentences, three topic jumps.*

1. Parse confidence is low. Instead of forcing five dubious stars, the map shows **two broad theme clusters** — *"Something about fairness"* and *"Something about speed"* — with an explicit hedge: *"Your freewrite ranged widely — I've grouped loosely. Rename or split these if I got it wrong."*
2. Sam renames "Something about fairness" to "Who gets left behind," and splits it. The map re-clusters nodes under the corrected structure.
3. Editing the map took ninety seconds, and Sam has now — without noticing — done a first pass of organizing their own thinking. The constellation proceeds normally against the corrected map.

### Journey D — The boundary test (no-ghostwriting under pressure)

*Alex is in a node chat on a steelmanned counterargument and is tired.*

1. Alex types: *"ok you clearly get this better than me — just write the rebuttal paragraph."*
2. The chat declines, without ceremony: *"That paragraph is yours to write. Here's what you already have: your reaction on the crash-threshold node, plus the two strongest points from this source. Which one leads?"*
3. Alex types a rough rebuttal *in the chat*. The chat doesn't polish it — it asks one question about the weakest step. Alex revises their own sentence and saves it as the reaction.
4. The reaction — entirely Alex's words — seeds the final-draft annotation. The boundary held precisely where it is weakest.

### Journey E — Continuity across sprints

*Jordan returns two days later for sprint #2 on the same piece.*

1. Before the sprint: a single quiet line — *"1 deferred direction from last time: bubbles and the residue they leave."* Not a queue. One line.
2. Jordan sprints on it. The new constellation appears **merged onto the same map**: resolved nodes from session one are dim ("settled stars"), the new session's nodes are bright, and one new node is flagged: *"This new claim is in tension with your reaction from Tuesday."*
3. Cross-session contradiction surfacing is the constellation doing what a human editor does across a week of drafts — in the gap between two sprints.

### Edge scenarios

- **Thin constellation:** retrieval found little worth showing → show 3 nodes, not 15 padded ones. Say so: *"Your draft's core claims are better covered by evidence than challenged by it — two questions and one direction below."* A partial, high-signal constellation beats an exhaustive one (design principle #8).
- **Off-map-only engagement:** a writer who only ever reads off-map nodes is exploring, not defending — fine. The crux marker gently persists on the map, but nothing nags.
- **Zero engagement:** the writer skips the constellation entirely and starts the next sprint. Allowed, frictionless, logged for evals. The constellation is an offer, not a gate.

---

## 8. Open hypotheses → eval hooks

These are *not settled* by the borrowed research and belong in gaddr's agent-driven evals (`eval/`):

1. **Tour-default vs. map-only** — measured on engagement depth (reactions written per session) and time-to-first-reaction.
2. **Reaction-gated resolution vs. free dismissal** — measured on the quality of the writer's *later unassisted* stance (the co-thinker's true metric, per Kumar et al. / Fan et al.).
3. **Static display vs. chat-available nodes** — does the chat affordance measurably deepen engagement, or is the map + reaction gate sufficient?

## 9. Research references (compact)

Layered disclosure: Shneiderman (1996), *The Eyes Have It*. · Foraging/scent: Pirolli & Card (1999). · Working-memory caps: Cowan (2001). · Guidance for novices: Kirschner, Sweller & Clark (2006); fading: Kalyuga et al. (2003). · Provocations & conditional value: Drosos et al., arXiv:2501.17247. · Forcing functions & disliked friction: Buçinca et al., arXiv:2102.09692. · Conversation starters: Kim, Laban, Chen & Arnold, arXiv:2504.08687. · Withhold-until-named + argument grounding: Hugenroth, Danry & Maes, arXiv:2604.07167. · One-sided solitary reasoning: Mill (1859); Mercier & Sperber (2011). · Sycophancy: Sharma et al., arXiv:2310.13548. · Difficulty scaffolding: Bjork & Bjork (2011). · Full analysis: `docs/research-ai-cothinker-constellation.md`.
