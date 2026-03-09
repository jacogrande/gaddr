# Gadfly Product UX Design Space

Date: 2026-03-06

## Goal

Define the strongest user experience for Gaddr: an AI-powered Socratic gadfly that is fully integrated into the writing environment, never writes on the user's behalf, and does meaningful background work without forcing the user into a chat workflow.

## Product Essence

Gadfly should feel less like "an AI assistant in your document" and more like "an active intellectual environment around your writing."

That distinction matters.

If the AI behaves like a visible copilot, users will expect:

- immediate answers
- manual prompting
- direct drafting help
- an increasingly chat-shaped product

That is the wrong center of gravity for Gaddr.

The better center of gravity is:

- the user writes
- Gadfly investigates
- Gadfly challenges
- Gadfly organizes
- Gadfly surfaces only the most useful pressure at the right time

In short: Gadfly should hold the mirror, not hold the pen.

## Non-Negotiables

These are consistent with the current repo direction and should remain product invariants:

1. Gadfly never writes replacement prose.
2. The primary activity is still writing, not chatting.
3. Typing flow is sacred.
4. AI work should happen in the background whenever possible.
5. Every AI artifact should be inspectable enough to build trust.
6. Research claims should be grounded in visible sources.
7. The system should help with both private thinking and public writing.

## Core Tension

The product tension is not "how do we add AI to writing?"

It is:

1. How present can the AI feel without becoming a second writer in the room?
2. How helpful can the AI be without interrupting composition?
3. How much of the AI's work should happen inline versus outside the text plane?
4. How do we turn latency from a flaw into part of the experience design?

The answer is probably not one mode. It is a deliberate combination of modes across the writing lifecycle.

## Research Signals

### 1. Journaling products win when AI is reflective, optional, and clearly subordinate to the user's voice

Day One frames AI as a "creative companion, not a replacement for your voice," and keeps its Apple Intelligence features optional and off by default. Their AI features activate after the user has already written enough text to provide context, and focus on prompts, highlights, and titles rather than full authorship. This is a strong signal for Gaddr's authorship boundary and for post-text reflection rather than premature intervention.

Rosebud's "Dig deeper" flow is even closer to the target. It explicitly aims to help the user "find the answers within." More importantly, Rosebud distinguishes between an interactive conversational mode and a focused mode that gives three questions and preserves a more one-way journaling experience. That distinction is important: users often want help without having to switch into conversation mode.

Implication for Gaddr:

- reflective questioning is welcome
- chat is not the only or best wrapper for reflective AI
- "focused mode" is a better precedent than "interactive mode" for this product

### 2. Chat-based journaling is a valid market pattern, but it points in the wrong direction for Gaddr

Day One's newer "Daily Chat" turns AI conversations into entries. That is a real product category, but it collapses the difference between reflection and co-authorship. It is useful as a contrast case: if Gaddr leans too hard into conversational capture, it stops being a gadfly and starts becoming a journal companion that co-produces text.

Implication for Gaddr:

- avoid an AI-first input surface
- avoid "generate entry from conversation" as a primary product action
- preserve visible authorship

### 3. Real-time inline AI has an extremely high latency bar, and critique is heavier than autocomplete

Google's Smart Compose work makes the constraint explicit: real-time assisted writing required a 90th percentile latency under 60 ms to feel instantaneous. That system is also suggesting likely continuations, which is cognitively lighter than critique, counterargument, or research surfacing.

If even autocomplete needs that level of speed to feel "instant," then inline criticism that arrives 500-1500 ms late is likely to feel glitchy, judgmental, or distracting unless it is surfaced very sparingly.

Implication for Gaddr:

- laggy inline critique is the worst of both worlds
- continuous in-text AI should be a secondary layer, not the primary experience
- anything slower than true real-time should surface at sentence, paragraph, pause, or phase boundaries instead of pretending to be keystroke-native

### 4. Interruptions are less harmful at low-workload moments and task boundaries

Recent interruption research continues to support an old but very relevant UX rule: interruptions are more harmful during high-workload moments and less harmful at subtask boundaries or lower-workload moments.

For writing, that means Gadfly should prefer moments like:

- end of a sentence
- end of a paragraph
- an idle pause
- scrolling up to review
- timer completion
- switching from draft to revise

It should avoid surfacing new demands in the middle of a thought.

### 5. Spatial, source-linked canvases are increasingly credible as a synthesis surface

Obsidian Canvas and NotebookLM's newer mind maps both validate a broader pattern: people increasingly accept spatial views when the task is synthesis rather than composition. NotebookLM in particular is relevant because it uses visual relationships to help users understand source material and discover connections. Obsidian Canvas shows that users will work with linked notes, websites, PDFs, and connections when the view is framed as thinking support rather than document editing.

Implication for Gaddr:

- your "Figma-style zoom-out" instinct is strong
- a spatial synthesis layer is much more credible after drafting than during drafting
- the board should visualize claims, evidence, tensions, and open questions, not just generic cards

### 6. Grounded source use is becoming a default expectation

Google is explicitly moving toward source-grounded writing in Docs, where AI assistance can be restricted to linked materials. NotebookLM is also pushing source-connected synthesis rather than free-floating response generation. Users are learning to ask: where did this come from?

Implication for Gaddr:

- research artifacts should show source grounding by default
- claims, critiques, and counterarguments should be traceable
- the product should feel investigatory, not oracular

### 7. The strongest AI pattern is not replacing core creative work, but removing peripheral work around it

Google's knowledge worker research is especially useful here: workers want AI to enhance core work and remove peripheral work. Writing itself is core work. Background fact gathering, contradiction detection, source clustering, and remembering open loops are peripheral to composition but central to better outcomes.

Implication for Gaddr:

- do not automate the writing act
- do automate the research, challenge, memory, and organizational labor around the writing act

## Design Principles

1. Protect flow first.
2. Let AI do more than it shows.
3. Surface pressure, not prose.
4. Prefer questions, contradictions, and evidence gaps over prescriptions.
5. Distinguish composition mode from sensemaking mode.
6. Make research visible when it matters, not while it is still half-baked.
7. Give the user a strong feeling of authorship even when the environment is highly agentic.
8. Treat privacy and trust as product features, especially for journaling.

## The Main UX Axes

Any viable Gadfly experience can be described across four axes:

### 1. When does AI surface?

- continuously while typing
- at pauses
- at timer/checkpoint boundaries
- only during revision
- only before publish

### 2. Where does AI surface?

- inline in the document
- peripheral rail
- floating cards / annotations
- full-screen zoomed-out canvas
- preflight report

### 3. What does AI do?

- critique
- fact check
- find evidence
- find counterarguments
- detect tension or inconsistency
- remember themes across sessions
- structure and cluster findings

### 4. How much agency does the user exert directly?

- none, fully ambient
- lightweight mode settings
- timer / sprint setup
- lens selection
- explicit prompting

For Gaddr, the sweet spot is likely:

- mostly ambient
- lightly steerable
- no chat dependence
- multiple surfaces across phases

## Design Avenue 1: Inline Whisper Mode

### Concept

As the user types, Gadfly occasionally adds an inline marker or subtle underline to a sentence. Hover reveals a compact note with diagnosis, rule, and a Socratic question.

### Best Version of It

- no side panel
- no popovers while caret is active
- only sentence-complete or paragraph-complete analysis
- only high-confidence findings
- only a few active highlights at once

### Pros

- feels magical and integrated
- low navigation cost
- preserves one-document simplicity
- aligns with the current repo's Phase 1 direction

### Cons

- extremely sensitive to latency
- easy to make annoying
- critique competes with composition in the same visual field
- hard to show background research elegantly
- weak fit for deeper research and counterargument workflows

### Verdict

Keep this as a secondary surface, not the core product. It is best for light revision pressure during a second pass, not for the first draft experience.

## Design Avenue 2: Peripheral Pulse Rail

### Concept

While the user writes, Gadfly works in the background and accumulates artifacts in a narrow side rail. The rail shows things like:

- 2 claims to verify
- 1 counterpoint found
- 3 follow-up questions
- 1 structural weakness

A tiny pulse or badge appears only at safe moments.

### Pros

- preserves the document as the main stage
- turns lag into a background process instead of a visible stutter
- lets research accumulate without interrupting
- supports triage without chat

### Cons

- can become an inbox
- still risks ambient anxiety if counts keep rising
- the user may ignore it entirely

### Verdict

Very promising as the default live companion during drafting, but only if the rail is quiet and heavily summarized. It should feel like peripheral awareness, not a to-do list.

## Design Avenue 3: Timed Freewrite -> Constellation Review

### Concept

The user starts a freewrite sprint: 5, 10, 20, or custom minutes. During the sprint, Gadfly quietly:

- identifies claims
- checks facts
- gathers supporting and opposing sources
- detects contradictions
- generates follow-up questions
- clusters themes

When the sprint ends, the UI zooms out into a spatial synthesis view showing the draft in relation to research documents, source cards, critiques, and open tensions.

### Why This Is Strong

This converts the biggest product problem into the product signature.

The "lag" no longer feels like the AI struggling to keep up. It feels like the AI using the sprint to prepare something meaningful.

### Pros

- preserves uninterrupted flow during composition
- gives the AI real time to do useful background work
- makes research, critique, and sensemaking visible in a richer way
- strongly differentiates the product from chatbots and generic editors
- maps well to how many people actually think: draft first, interrogate second

### Cons

- requires a more complex UX transition
- may feel heavyweight for very short entries
- needs a very good synthesis board to justify the mode shift

### Verdict

This is the strongest primary concept.

It respects the authorship boundary, makes full use of agentic background work, and creates a distinct product identity.

## Design Avenue 4: Pause-Based Pulse Review

### Concept

Instead of a timer, Gadfly watches for natural pauses. After a meaningful pause, it surfaces one compact review unit:

- one question
- one evidence issue
- one structural note

The UI then recedes again.

### Pros

- lower commitment than a timer
- works for casual note-taking
- adapts to real use instead of requiring ritual

### Cons

- pauses do not always mean openness to feedback
- difficult to infer intent correctly
- if timed poorly, this feels like interruption

### Verdict

Useful as a fallback mode when the user does not explicitly start a sprint. Still, it should be less assertive than the timer-driven pipeline.

## Design Avenue 5: Lens-Based Revision

### Concept

After drafting, the user can switch between revision lenses:

- Logic
- Evidence
- Counterpoint
- Tone
- Structure

Each lens reveals only the relevant highlights, questions, and sources.

### Pros

- reduces overload
- gives the user control without requiring prompts
- supports deliberate revision habits
- reinforces that Gadfly is an analytical environment, not a chat partner

### Cons

- adds mode complexity
- weaker for users who want fully ambient behavior

### Verdict

Strong as the second-pass UX. This pairs naturally with the Constellation Review model.

## Design Avenue 6: Shadow Research Notebook

### Concept

Gadfly maintains a hidden notebook of:

- extracted claims
- entities and topics
- source summaries
- timelines
- unresolved questions
- previously found counterarguments

Most of this remains backstage until a checkpoint or publish review.

### Pros

- lets the AI do meaningful work without spamming the user
- compounds value across a session
- creates room for multi-step agentic pipelines
- strengthens public-writing and research workflows

### Cons

- invisible value can feel nonexistent if surfaced poorly
- requires strong explanation and traceability for trust

### Verdict

This should be a foundational system capability even if the user never sees it directly.

## Design Avenue 7: Publish Preflight

### Concept

Before publishing a note, essay, or microblog post, Gadfly runs a final integrity pass and shows:

- unsupported claims
- likely objections
- missing nuance
- source weaknesses
- possible overstatements
- tone mismatches

This is not a rewrite pass. It is a pressure-test pass.

### Pros

- very legible value
- low interruption cost
- strong fit for public writing
- good place to surface traceability and provenance

### Cons

- too late to shape early thinking if used alone
- less useful for purely private journaling unless reflection is the goal

### Verdict

Necessary, but not sufficient as the core experience.

## Design Avenue 8: Longitudinal Memory and Reflection

### Concept

Across entries, Gadfly notices recurring motifs:

- repeated anxieties
- recurring theses
- unresolved arguments
- changes in tone or certainty
- topics the user keeps circling without resolving

It then surfaces these gently in future sessions or weekly synthesis views.

### Pros

- powerful for journaling retention
- creates a sense that Gadfly is actually paying attention
- compounds value over time

### Cons

- highest privacy sensitivity
- easy to feel creepy if surfaced too aggressively
- less relevant to quick public drafting

### Verdict

Promising long-term differentiator, but not the first UX to perfect.

## What The Product Should Not Be

### 1. Not a chat-first journal

This weakens authorship and drifts toward co-writing.

### 2. Not Grammarly for essays plus web search

That is too narrow and too familiar. Gadfly should be more philosophical and research-aware than grammar-centric.

### 3. Not a constant annotation storm

Even if technically possible, it will feel naggy and anti-flow.

### 4. Not a generic canvas app

The zoomed-out view should be specialized for argument, reflection, and evidence. It should not look like a blank whiteboard where the user now has to do the AI's organizational work manually.

## Recommended Direction

### A Two-Tempo, Three-Surface Product

The best direction is a two-tempo system with three distinct surfaces.

### Tempo 1: Protected Composition

Primary goal: help the user write without interruption.

Surface: the editor

Gadfly behavior:

- works silently in the background
- collects research and critique artifacts
- only shows minimal peripheral awareness
- does not inject active inline critique except for very rare high-confidence cases

Recommended UI:

- optional sprint timer at the top
- small status chip: "researching", "checking claims", "finding counterpoints"
- subtle artifact counter in a side rail
- no chat
- no rewrite suggestions

This mode should feel monastic. Quiet. Slightly charged, but not busy.

### Tempo 2: Sensemaking and Interrogation

Primary goal: turn background AI work into usable intellectual pressure.

Surface: Constellation Review board

Board structure:

- center spine: the draft or argument outline
- source cards: articles, papers, links, quotes, timelines
- tension cards: contradictions, overclaims, missing assumptions
- question cards: Socratic prompts
- counterpoint cards: strongest opposing frames
- evidence cards: support found, support missing, support mixed

The board should auto-layout around the draft. The user can drag if they want, but the board should be useful without manual arranging.

This is the product's signature moment.

### Surface 3: Final Draft / Publish Preflight

Primary goal: help the user tighten authorship and integrity before sharing.

Surface: editor plus compact preflight sheet

Gadfly behavior:

- low-frequency inline notes only if the user is in revision mode
- publish review focused on support, nuance, logic, and tone
- visible provenance for sensitive claims

This stage should feel sharp and editorial, not generative.

## Why This Recommendation Wins

1. It aligns with the repo's existing no-ghostwriting architecture.
2. It uses AI where AI is strongest: research, clustering, challenge, memory, synthesis.
3. It avoids the trap of laggy pseudo-real-time criticism.
4. It gives the product a unique identity that is neither chatbot nor grammar checker.
5. It works for both journaling and public writing.

## Detailed UX Proposal

### Entry Point

The user opens a blank page and sees:

- a clean editor
- an optional sprint selector: `5 min`, `10 min`, `20 min`, `open`
- a tiny Gadfly status control, not a panel

Default recommendation: `10 min` freewrite.

### During Freewrite

The editor remains visually calm.

Gadfly can show only:

- a small status pulse
- a claim count
- a source count
- a "1 tension found" whisper in the rail

No full cards. No popups. No inline highlights unless:

- the user is idle for a meaningful period, or
- the issue is severe and high-confidence, or
- the sprint has ended

### End of Sprint Transition

When the timer ends:

1. the writing canvas subtly zooms back
2. the draft snaps into the center
3. surrounding artifacts animate into place
4. Gadfly does not speak in prose; it reveals a map

This moment should feel revelatory, like seeing the hidden structure of your thought.

### Constellation Review Interactions

The user can:

- click a claim to see supporting and opposing evidence
- hover a tension card to highlight the affected sentences
- filter the board by lens
- collapse weak/low-confidence findings
- drag important cards near the draft if desired

The user should not need to ask the AI follow-up questions. The system should already have done the first layer of that work.

### Revision Pass

Back in the editor, Gadfly can now become slightly more visible because the user's task has shifted from generation to evaluation.

Allowed surface behaviors:

- sparse highlights
- marginal question markers
- evidence badges
- tone or logic warnings

Still disallowed:

- rewrite blocks
- paragraph alternatives
- auto-inserted text

### Publish Preflight

Before publishing:

- Gadfly runs a final challenge pass
- the user sees a compact report
- each warning links to the relevant sentence and sources

This is especially valuable for microblogging and public essays, where overstatement, unsupported claims, and missing caveats are costly.

## User Journey Variants

### Private Journaling Journey

1. User starts a 10-minute freewrite about a difficult conversation.
2. Gadfly quietly notices emotional themes, assumptions, and repeated tensions.
3. Sprint ends.
4. Constellation Review shows:
   - recurring assumption: "they don't respect me"
   - possible alternative reading
   - two questions that deepen the reflection
5. User writes a second pass in their own words.

### Public Thinker / Microblogger Journey

1. User freewrites a hot take about a policy, product, or cultural trend.
2. Gadfly fact-checks claims and finds the strongest opposing frames.
3. Review board highlights:
   - one shaky factual premise
   - two credible counterexamples
   - one more precise framing
4. User tightens the post.
5. Publish Preflight catches one overstatement and one unsourced claim.

### Research-Heavy Essay Journey

1. User drafts a thesis quickly.
2. Gadfly gathers sources and clusters them into support, contradiction, and context.
3. The board becomes an argument atlas.
4. User revises with evidence and structure lenses.
5. Final draft remains entirely authored by the user.

## Product Risks

### Risk 1: The system feels too invisible

Mitigation:

- show ambient evidence of background work
- make the transition moment strong
- make artifacts visibly valuable when revealed

### Risk 2: The system feels too judgmental

Mitigation:

- prefer questions over verdicts
- use "pressure" language, not "error" language
- tune tone differently for journal mode versus publish mode

### Risk 3: The board becomes cluttered

Mitigation:

- auto-cluster aggressively
- show only top findings by default
- let low-confidence artifacts stay collapsed

### Risk 4: Users do not understand why the AI found something

Mitigation:

- show source grounding and traceability
- preserve artifact provenance
- expose "why this surfaced" explanations in a lightweight way

### Risk 5: Privacy concerns kill trust

Mitigation:

- be explicit about data flow
- support local/on-device work where possible
- clearly separate private journaling memory from public research pipelines

## MVP Recommendation

Do not ship the full universe at once.

Ship the smallest version of the recommended direction:

### MVP Surface Set

1. Quiet freewrite editor with optional sprint timer
2. Background research and critique pipeline
3. Lightweight peripheral rail during drafting
4. End-of-sprint Constellation Review
5. Lens-based revision back in the editor
6. Publish Preflight for public drafts

### MVP Artifact Types

1. Socratic questions
2. Fact-check tasks
3. Supporting evidence tasks
4. Counterpoint tasks
5. Logic/structure tensions

### Explicitly Defer

1. chat surfaces
2. rich longitudinal memory
3. full collaborative whiteboard behavior
4. aggressive inline critique during freewrite

## Experiments To Run

### Experiment 1: Inline vs Quiet + Checkpoint

Compare:

- continuous sparse inline critique
- quiet drafting plus end-of-sprint review

Success metrics:

- uninterrupted writing burst length
- disable/snooze rate
- perceived annoyance
- revision adoption rate

### Experiment 2: Timer vs Pause Trigger

Compare:

- explicit freewrite timer
- automatic pause-based review

Success metrics:

- session completion
- artifact open rate
- user-reported flow preservation

### Experiment 3: Board vs List

Compare:

- spatial Constellation Review
- linear findings list

Success metrics:

- source click-through
- revision quality
- clarity of understanding
- delight / distinctiveness

## Metrics That Actually Matter

### Flow Metrics

- median uninterrupted writing burst
- time spent drafting before first interruption
- draft completion rate

### Usefulness Metrics

- artifact open rate
- sourced finding engagement
- percent of surfaced findings acted on

### Annoyance Metrics

- mute rate
- snooze rate
- Gadfly-off sessions
- dismissal speed

### Trust Metrics

- source click-through rate
- false-positive report rate
- user confidence that "this did not write for me"

### Outcome Metrics

- second-pass revision rate
- publish conversion
- retention for repeat writers

## Final Recommendation

The best version of Gadfly is not a smarter autocomplete and not a prettier chat window.

It is a two-tempo writing environment:

1. a protected freewrite zone where AI stays mostly backstage
2. a strong synthesis/interrogation moment where hidden research and critique become visible
3. a restrained editorial pass that helps the user publish with stronger thinking and cleaner support

The key product move is to stop treating the AI as something that must visibly "keep up" with the user's typing.

Instead, Gadfly should feel like an invisible team of researchers, critics, and question-askers that goes to work the moment the user starts writing, then returns at the right moment with an argument map, not a replacement paragraph.

That is a much more defensible product.

## Sources

### Internal

- [Gadfly Technical Design](../gadfly-technical-design.md)
- [Gadfly Action Catalog](../gadfly-action-catalog.md)
- [Agentic UX Pipeline Brainstorm](./agentic-ux-pipeline.md)

### External

- [Day One: Go Deeper with Apple Intelligence](https://dayoneapp.com/blog/go-deeper-with-apple-intelligence/)
- [Day One: Go Deeper guide](https://dayoneapp.com/guides/labs/go-deeper/)
- [Day One: Daily Chat](https://dayoneapp.com/guides/labs/daily-chat/)
- [Rosebud: Dig deeper](https://help.rosebud.app/tools-for-growth/dig-deeper)
- [Google Research: Gmail Smart Compose](https://research.google/pubs/gmail-smart-compose-real-time-assisted-writing/)
- [Google Research: Case Study - Creative Assistance for Knowledge workers](https://research.google/pubs/case-study-creative-assistance-for-knowledge-workers/)
- [Google Workspace: Source-grounded writing in Docs](https://workspace.google.com/blog/product-announcements/new-ways-to-do-your-best-work)
- [Google Workspace: NotebookLM Mind Maps and source exploration](https://workspace.google.com/blog/product-announcements/may-workspace-feature-drop-new-ai-features)
- [Google Research: Rambler](https://research.google/pubs/rambler-supporting-writing-with-speech-via-llm-assisted-gist-manipulation/)
- [Frontiers: Opportune moments for task interruptions](https://www.frontiersin.org/articles/10.3389/fpsyg.2024.1465323/full)
- [Notion AI product page](https://www.notion.com/product/ai)
- [Obsidian Canvas](https://obsidian.md/canvas)
- [Obsidian JSON Canvas announcement](https://obsidian.md/blog/json-canvas/)
