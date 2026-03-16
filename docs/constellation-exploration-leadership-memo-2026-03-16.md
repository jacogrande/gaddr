# Constellation Leadership Memo: Exploratory Phase Direction

Date: 2026-03-16

Audience: product, design, and engineering leadership

Status: supersedes the earlier revision-oriented framing

## Summary

Constellation should be framed as the second exploratory phase after freewrite, before first draft.

This is not primarily a revision surface. It is a sensemaking and research surface. The user freewrites to surface raw thinking, then enters Constellation to explore themes, counterarguments, evidence, questions, and source branches before committing to a first authored draft.

Under that framing, the node-map direction is not the problem. The problem is that the current prototype does not yet behave like a specialized exploratory product. It still feels closer to a generic graph demo than an argument atlas for guided inquiry.

## Strategic Value

This direction strengthens Gadfly’s differentiation:

- phase 1: protected freewrite
- phase 2: exploratory constellation
- phase 3: authored first draft

That is a stronger product story than “write, then revise.” It positions Gadfly as a thinking partner that helps users interrogate their own ideas before they formalize them.

If executed well, Constellation becomes the signature moment of the product:

- a map of the user’s emerging argument
- a visual surface for branching research
- a place to pressure-test claims before drafting
- a workspace where AI expands inquiry without taking over authorship

## What Changes From The Earlier Framing

The earlier documents over-optimized for revision. That was the wrong mental model for the product direction you want.

The correct mental model is:

- exploratory, not corrective
- branching, not linear
- pre-draft, not post-draft
- sensemaking, not inspection-only

This changes the design goal. The board does not need to collapse into a traditional “what should I revise first?” interface. It should help the user learn more about their own thinking and branch outward from it.

## Why the Node View Is the Right Primitive

A node view fits this phase because exploration is inherently non-linear.

Users need to:

- follow a theme outward into counterarguments and sources
- compare conflicting ideas without flattening them into outline order
- branch off a research finding into more questions
- respond to a source or objection and trigger deeper investigation
- collect promising threads before drafting

A graph-like surface supports this better than a fixed review panel, as long as it remains productized and legible.

## The Real Risk

The main risk is not that the board is exploratory.

The main risk is that exploratory can slide into chaotic.

Leadership should focus on four risks:

1. Clutter risk
If branching is unconstrained, the map becomes unreadable.

2. Orientation risk
If users cannot tell where they are, what is central, and what changed, they will bounce.

3. Provenance risk
If research and AI-surfaced claims do not clearly explain where they came from, trust collapses.

4. Product posture risk
If the UI looks like a generic canvas tool, the feature will feel hobbyist rather than company-grade.

## Options Considered

### Option 1: Guided Atlas

An auto-organized board with limited branching and mostly fixed clusters.

Pros:

- easiest to keep clean
- easiest to onboard
- lowest implementation risk

Cons:

- may under-deliver on user agency
- may feel too static for the research/exploration promise

### Option 2: Open Research Graph

A highly flexible, deeply branchable graph where users and AI can keep expanding threads freely.

Pros:

- most powerful for exploratory thinking
- strongest expression of the product concept

Cons:

- highest clutter risk
- easiest to make feel like a generic whiteboard
- most likely to overwhelm users early

### Option 3: Hybrid Atlas-to-Graph

A curated overview that expands into branchable local graph exploration around selected nodes.

Pros:

- preserves overview and orientation
- enables meaningful branching
- balances exploration with product discipline

Cons:

- requires more deliberate interaction design
- slightly more complex state model

## Recommendation

Adopt Option 3: Hybrid Atlas-to-Graph.

This keeps the exploratory node-based direction, but turns it into a specialized product model:

- overview for orientation
- local branching for exploration
- provenance on every meaningful branch
- explicit handoff into first-draft preparation

## What Leadership Should Approve

Approve Constellation as a flagship exploratory surface, not a revision add-on.

That means funding the work as a real product definition effort around:

- exploratory interaction design
- graph hygiene and clutter management
- provenance and “why this surfaced”
- branch actions for deeper AI research
- explicit transition from exploration into first-draft creation

## Near-Term Priorities

### 1. Product model

- lock the phase model: freewrite -> constellation exploration -> first draft
- define the minimum set of branch actions
- define what the user can collect or promote into draft prep

### 2. Board behavior

- preserve a central seed node or draft spine
- allow branching from selected nodes, not everywhere at once
- add collapse, regroup, and focus mechanisms to prevent sprawl

### 3. Trust model

- every source, counterargument, and research branch should explain why it appeared
- mock data is acceptable at prototype stage, but it should already mimic the eventual provenance structure

### 4. Visual bar

- keep the node map, but make it feel like an argument atlas, not a whiteboard app
- use distinct node families, stronger hierarchy, and more intentional motion

## Decision Ask

Reset the Constellation work around the exploratory-phase thesis and approve a redesign brief that treats the node view as a core asset.

The question is no longer “should this be a node map?”

The question is “what kind of node-map product are we building?”

The recommended answer is: a high-trust exploratory argument atlas that helps users move from raw thought to informed first draft.
