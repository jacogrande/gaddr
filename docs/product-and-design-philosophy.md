# Product and Design Philosophy

## Product Thesis

Writers do better work when drafting and critique happen in separate phases.

gaddr is built around a simple idea:

1. Let the writer think without interruption.
2. Let AI do research, pressure-testing, and annotation after the draft exists.
3. Return the writer to a clean surface for the final pass.

The product should feel like a disciplined writing studio, not a chat interface glued onto a document.

## The 3-Step Writing Loop

### 1. Uninterrupted Freewrite

The first step is a protected writing sprint.

- The editor stays quiet while the user writes.
- No inline AI suggestions should appear during active drafting.
- Autosave, formatting, and timer support should be invisible and low-latency.
- The user is producing raw thinking, not polishing.

At the end of the sprint, the app transitions into a constellation view.

The constellation is where the system:

- extracts the main claims from the freewrite
- finds supporting citations from studies, articles, and other relevant sources
- surfaces steelmanned counterarguments
- flags issues such as unsupported claims, leaps in reasoning, weak framing, or missing evidence

This stage is research and pressure-testing, not rewriting.

### 2. Auto-Annotated First Draft

The constellation findings are converted into annotations on top of a first draft.

- annotations should be anchored to claims, sentences, or sections
- annotations should explain why a citation, challenge, or issue matters
- annotations can suggest what to investigate, strengthen, or clarify
- annotations must remain advisory

The point is to make revision legible without taking authorship away from the writer.

### 3. Uninterrupted Final Draft

After the first draft is annotated, the writer returns to a clean drafting surface.

- the final-draft mode should minimize AI chrome
- annotations should be available when needed, but not constantly shouting for attention
- the writer should be able to resolve, ignore, or revisit notes on their own terms
- the product should help the writer finish, not trap them in endless review

The last mile matters. The final drafting pass should feel focused, calm, and owned by the user.

## AI Behavior Rules

### No Ghostwriting

The system must not write the user's essay for them.

Allowed:

- citations
- source summaries
- counterarguments
- issue descriptions
- questions
- annotations

Not allowed:

- replacement paragraphs
- polished rewrites of the user's sentences
- hidden authorship disguised as "suggested wording"

### Source Grounding

If the system claims a source supports or challenges the draft, it must preserve provenance.

Each surfaced source should have enough metadata to answer:

- What is the source?
- Where did it come from?
- What specific claim in the draft does it relate to?
- Is it support, complication, contradiction, or open research?

### Steelman Before Critique

Counterarguments should be strong, fair, and intellectually useful.

Bad behavior:

- cheap gotchas
- sarcastic objections
- exaggerated strawmen
- vague "needs more nuance" filler

Good behavior:

- articulate the strongest reasonable opposing view
- show where the draft would need evidence or clarification
- separate factual dispute from framing dispute

### Separate Fact, Inference, and Heuristic

The system should distinguish between:

- sourced evidence
- model inference
- heuristic writing feedback

These are different confidence levels and should not be blended together as if they were equally grounded.

## UX Principles

### Protect the Writing Loop

The app should respect cognitive mode changes.

- drafting mode is for generation
- constellation mode is for synthesis and pressure-testing
- annotation mode is for understanding revision targets
- final-draft mode is for execution

Do not collapse all of those modes into one noisy screen.

### Make Research Legible

Writers should be able to understand why a citation or counterargument appeared.

- show provenance
- show the linked claim
- show whether the source supports, complicates, or challenges the draft
- avoid black-box "trust us" AI behavior

### Keep the Writer in Control

The system should help users think better, not take over.

- findings can be accepted, ignored, or deferred
- annotations should support judgment, not replace it
- the final text remains the writer's responsibility

### Reward Depth, Not Volume

The goal is stronger reasoning, not more words.

The product should help the writer:

- support claims
- face objections honestly
- notice weak spots
- finish a better argument

## Out of Scope for the Current Product Story

These may exist later, but they are not the core narrative right now:

- public publishing pages
- social sharing loops
- standalone evidence libraries as the main product surface
- portfolio dashboards
- peer feedback systems

The center of gravity is the 3-step writing loop.

## Success Criteria

We should consider the product direction healthy if users can:

- complete a freewrite without AI interruption
- reach a constellation view that feels source-grounded and useful
- receive annotations that make revision easier
- complete a final draft without getting dragged back into tooling complexity

If the system makes users feel researched, challenged, and still fully responsible for the prose, it is working.
