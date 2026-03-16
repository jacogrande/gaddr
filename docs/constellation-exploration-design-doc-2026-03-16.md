# Constellation Exploration Design Document

Date: 2026-03-16

Owner: Product + Design

Status: revised design direction

## Product Thesis

Constellation is the second phase after freewrite and before first draft.

Its job is not to grade or revise a draft. Its job is to help the user explore, interrogate, and expand their emerging argument. The user starts with a raw freewrite, then enters Constellation to:

- discover themes in their thinking
- see counterarguments and supporting evidence
- explore research gathered by the assistant
- branch into deeper inquiry
- collect the strongest threads before writing a first draft

Constellation should feel like an exploratory argument atlas.

## Product Flow

1. `Freewrite`
The user writes without interruption.

2. `Constellation`
The system reveals a visual map of themes, tensions, questions, sources, and research branches.

3. `First Draft`
The user converts selected threads, clusters, or findings into a first structured draft.

This phase order matters. Constellation is upstream of drafting, not downstream of it.

## What Constellation Is

- an exploratory knowledge map
- a sensemaking surface
- a branching research workspace
- a place to learn more about one’s own argument
- a bridge between intuition and formal writing

## What Constellation Is Not

- a chat-first assistant
- a final revision checklist
- a generic infinite whiteboard
- a source manager
- a replacement for authorship

## Design Principles

### 1. Exploration needs structure

The board can be branchable and still disciplined. Exploration should feel open, but never shapeless.

### 2. The user’s freewrite remains the center

Everything starts from the user’s raw thought. The map grows outward from that center.

### 3. Branching should be local, not global

The user should expand selected threads deeply without exploding the entire board at once.

### 4. AI should expand inquiry, not settle it

The system should surface questions, evidence, objections, and related sources. It should not collapse ambiguity too early.

### 5. The map must remain legible as it grows

Clutter control is a first-class product requirement.

### 6. Provenance must travel with the branch

Every important research or counterargument node should carry its origin and “why this surfaced.”

## External Best-Practice Basis

This direction aligns with current patterns for exploratory and AI-assisted knowledge work:

- Google positions NotebookLM mind maps as a way to get a visual overview, understand key themes, and discover additional sources.
- Miro’s current mind-mapping guidance emphasizes that early stages are for exploration rather than strict organization, while also recommending short labels and splitting maps when complexity grows.
- Microsoft HAX recommends making clear what the system can do, showing contextually relevant information, supporting efficient invocation, and explaining why the system behaved as it did.
- Microsoft Research’s VeriTrail work reinforces the value of evidence trails, provenance, and user agency in graph-like AI workflows.
- Shneiderman’s long-standing “overview first, zoom and filter, then details on demand” model remains the right backbone for complex exploratory interfaces.

## Options

### Option A: Guided Atlas

Description:

- central freewrite node
- 4 to 6 auto-clustered themes
- clicking a theme opens a contained exploration panel
- limited branching depth

Strengths:

- easiest to understand
- lowest clutter risk
- best onboarding path

Weaknesses:

- may feel too constrained
- may underplay the research-branching promise

Use when:

- optimizing for MVP clarity

### Option B: Open Research Graph

Description:

- central freewrite node
- themes, questions, sources, counterarguments, and responses all branch freely
- user and assistant can keep expanding threads indefinitely

Strengths:

- highest expressive power
- strongest exploratory feel
- most natural for research branching

Weaknesses:

- highest cognitive load
- highest clutter risk
- easiest to make feel like a generic whiteboard product

Use when:

- optimizing for advanced users over general usability

### Option C: Hybrid Atlas-to-Graph

Description:

- curated overview at entry
- local branch expansion around the selected theme or node
- board stays clean globally while allowing depth locally
- collected insights can be promoted into a draft-prep tray

Strengths:

- balances orientation and exploration
- keeps the node map as a core affordance
- best fit for evolving from prototype to product

Weaknesses:

- more complex to design well
- requires stronger state choreography

Use when:

- building the intended product, not just the easiest prototype

## Recommendation

Recommend Option C: Hybrid Atlas-to-Graph.

This preserves the exploratory node-map thesis while solving the biggest usability risk: uncontrolled sprawl.

The experience should have three distinct board states:

1. `Atlas overview`
The user sees the central seed and the main thematic branches.

2. `Local exploration`
The user expands one theme or node into deeper research, objections, questions, and responses.

3. `Draft prep`
The user collects selected nodes into a working set that will inform the first draft.

## Core Experience

### Entry

After the sprint ends, Constellation appears as a new exploratory phase.

Entry should communicate:

- the system found themes and tensions
- research and counterarguments are available to explore
- the user can branch outward before drafting

Recommended entry prompt:

- `Explore your argument`
- `Review themes, sources, and counterarguments before drafting`

### Atlas Overview

The default board should establish orientation immediately.

Required elements:

- a central `Seed` node representing the freewrite
- 4 to 6 top-level theme nodes around it
- clearly distinct node families
- a small set of suggested next actions

The first screen should answer:

1. what is this map about?
2. what are the main lines of inquiry?
3. where can I explore next?

### Local Exploration

When the user selects a theme or node, Constellation should branch locally rather than exploding the whole board.

Example branch actions:

- `Find strongest objection`
- `Find stronger evidence`
- `Find comparable source`
- `Ask a deeper question`
- `Respond to this counterargument`
- `Follow this source`
- `Compare viewpoints`

These actions should invoke the assistant in context, creating new nodes attached to the originating node.

### Draft Prep

Exploration needs an explicit bridge into writing.

The user should be able to:

- save nodes to a `Working set`
- pin themes or branches
- mark a node as `use in draft`
- convert selected nodes into a rough outline or first-draft starter structure

This keeps the exploratory phase distinct from drafting while still making it productive.

## Information Model

### Primary Node Families

- `Seed`
The original freewrite or thesis seed.

- `Theme`
High-level conceptual clusters.

- `Question`
Open Socratic prompts or unresolved issues.

- `Counterargument`
Opposing frames, objections, or alternative interpretations.

- `Evidence`
Supportive or contradictory findings.

- `Source`
Articles, papers, sites, clips, or documents.

- `Response`
The user’s reaction to a source or objection.

- `Research task`
A visible AI action such as “finding stronger contradictory evidence.”

### Relationship Types

- `emerges from`
- `supports`
- `contradicts`
- `questions`
- `derived from`
- `responds to`
- `expands`

### Mandatory Metadata

Every non-trivial node should be able to show:

- label
- node family
- why it surfaced
- provenance
- confidence
- last updated time
- whether it is saved to working set

## Interaction Model

### Global Controls

- filter by node family
- collapse low-signal branches
- show only pinned or saved nodes
- reset to atlas overview
- jump to working set

### Node-Level Actions

- open detail
- branch further
- save to working set
- pin
- dismiss
- compare with another node

### Board Hygiene Controls

- auto-cluster related low-confidence nodes
- collapse branches beyond selected depth
- summarize a branch
- split a dense area into a sub-map

These are essential. Miro’s guidance is correct here: early exploration can be messy, but the product needs mechanisms to regroup, split, and keep maps usable as complexity grows.

## Visual Design Direction

The visual language should support exploration without falling into generic canvas aesthetics.

### Desired Feel

- serious
- expansive
- investigative
- calm
- productized

### Visual Requirements

- stronger differentiation between node families
- clear center-of-gravity around the seed
- local branch emphasis when a node is selected
- readable labels at a glance
- subtle motion that helps orientation during branching
- reduced generic graph-tool chrome

### Avoid

- every node looking the same
- tiny labels
- uncontrolled edge spaghetti
- always-on controls that make the board feel technical
- a whiteboard aesthetic that outsources organization to the user

## Content Design

Node copy should be concise and directional.

Good examples:

- `Strongest objection: the trend reverses in smaller cities`
- `Question: what assumption makes this claim feel true?`
- `Source: Brookings analysis of adoption patterns`
- `Response: my argument still holds if the mechanism is cultural, not economic`

Avoid:

- vague AI abstractions
- long paragraph nodes
- empty labels like `Insight 3` or `Research result`

## Provenance and Trust

Mock data is acceptable in the current prototype stage because the immediate goal is to validate the exploratory interaction model.

However, even mocked nodes should mimic the eventual trust structure:

- source title
- source type
- summary
- why surfaced
- support/contradiction signal
- confidence marker

That lets the team validate the eventual experience without waiting for the full intelligence stack.

## Accessibility

The exploratory board must still meet company-grade accessibility standards.

Requirements:

- keyboard-operable node selection and navigation
- clear focus states
- no drag-only critical action
- reduced-motion support
- adequate target sizes
- readable contrast by node family and state

## Success Criteria

The redesign is successful if users can:

- understand the main lines of inquiry within seconds
- branch deeper from a selected node without losing orientation
- understand why a source or counterargument appeared
- collect useful threads before starting a first draft
- feel that the AI expanded their thinking without writing for them

## Acceptance Criteria

### Product

- Constellation is explicitly positioned between freewrite and first draft
- the board supports branching exploration, not just inspection
- users can promote selected nodes into a working set for drafting

### UX

- entry state communicates exploration purpose clearly
- overview shows 4 to 6 main themes by default
- branching happens locally around selected nodes
- the user can return to overview at any time
- clutter controls exist before broad rollout

### Trust

- every source or research-derived node can show provenance fields
- every branchable AI-generated node can show `why this surfaced`
- mock data in prototype flows uses the same shape as eventual real data

### Visual

- node families are visually distinct
- center and branch hierarchy remain legible as the map grows
- graph-tool chrome is subordinate to the exploratory content

## Deliverables

### Design

- concept for atlas overview
- concept for local exploration state
- concept for working set / draft prep tray
- node family visual system
- branching interaction choreography

### Product

- updated phase model
- branch action catalog
- node family definitions
- provenance and metadata requirements

### Engineering

- state model for atlas, local exploration, and draft prep
- auto-layout and branch hygiene strategy
- node action model for assistant branching
- persistence model for saved/pinned nodes

## Internal Alignment

This direction is already latent in the product thinking:

- the board becoming an `argument atlas`
- a `sensemaking and interrogation` tempo distinct from composition
- a surface where research, critique, and source exploration become visible after freewrite

The redesign should lean into that logic instead of flattening Constellation into a conventional review panel.

## References

Internal:

- [constellation-exploration-rfc-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-exploration-rfc-2026-03-16.md)
- [gadfly-product-ux-design-space.md](/Users/jackson/Code/projects/gaddr/docs/brainstorms/gadfly-product-ux-design-space.md)
- [gadfly-constellation-review-spec.md](/Users/jackson/Code/projects/gaddr/docs/gadfly-constellation-review-spec.md)
- [constellation-ux-review-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-ux-review-2026-03-16.md)

External:

- Google Workspace Blog, NotebookLM Mind Maps and discover sources: https://workspace.google.com/blog/product-announcements/may-workspace-feature-drop-new-ai-features
- Miro, What is a mind map and how to create one: https://miro.com/mind-map/how-to-make-a-mind-map/
- Microsoft HAX Toolkit: https://www.microsoft.com/en-us/haxtoolkit/
- HAX Guideline 1, Make clear what the system can do: https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-what-the-system-can-do/
- HAX Guideline 4, Show contextually relevant information: https://www.microsoft.com/en-us/haxtoolkit/guideline/show-contextually-relevant-information/
- HAX Guideline 7, Support efficient invocation: https://www.microsoft.com/en-us/haxtoolkit/guideline/support-efficient-invocation/
- HAX Guideline 11, Make clear why the system did what it did: https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-why-the-system-did-what-it-did/
- Microsoft Research, VeriTrail: https://www.microsoft.com/en-us/research/blog/veritrail-detecting-hallucination-and-tracing-provenance-in-multi-step-ai-workflows/
- Ben Shneiderman, The Eyes Have It: https://www.cs.umd.edu/users/ben/papers/Shneiderman1996eyes.pdf
- W3C, WCAG 2.2: https://www.w3.org/TR/WCAG22/
