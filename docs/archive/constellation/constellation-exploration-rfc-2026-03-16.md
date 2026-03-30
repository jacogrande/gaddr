# Constellation Exploration RFC

Date: 2026-03-16

Status: Sprint 0 source of truth

## Purpose

Lock the foundational decisions for migrating Constellation from a review-oriented board into an exploratory argument atlas.

This RFC defines the model that Sprint 1 will build on. Sprint 0 does not change the live Constellation UI.

## Locked Product Model

Constellation is the second phase between freewrite and first draft:

`freewrite -> constellation exploration -> first draft`

Constellation is:

- exploratory
- pre-draft
- branchable
- research-aware
- centered on the user’s own emerging argument

Constellation is not:

- a revision checklist
- a chat-first assistant
- a generic whiteboard

## Locked Entry Behavior

- after sprint completion, Constellation auto-opens on user idle
- the next active version will also support a persistent manual re-open affordance
- Sprint 0 keeps the current runtime behavior unchanged

## Locked Board States

The exploratory board state model is:

- `hidden`
- `transition_in`
- `atlas_overview`
- `local_exploration`
- `draft_prep`
- `transition_out`

The current runtime remains on legacy review-era states until Sprint 1 switches the active board.

## Locked MVP Node Families

- `seed`
- `theme`
- `question`
- `counterargument`
- `evidence`
- `source`
- `research_task`
- `response`

## Locked MVP Branch Actions

- `Find strongest objection`
- `Find stronger evidence`
- `Ask a deeper question`
- `Follow this source`
- `Respond to this counterargument`

## Locked Working Set Model

The MVP working set is session-scoped.

It must support:

- save
- remove
- pin
- use in draft

Persistence beyond the active session is out of scope for Sprint 0 and Sprint 1.

## Locked Trust Model

Mock data is acceptable during prototype development.

However, every mock exploratory node must already use the same trust shape the final system will need:

- why surfaced
- confidence
- provenance
- source references when applicable
- annotation references when applicable

This keeps the UX honest even while the underlying intelligence is still mocked.

## Locked Migration Approach

- no feature flag
- no dual live experience
- direct in-place migration of the active Constellation subsystem
- Sprint 0 adds docs and non-runtime scaffolding only
- Sprint 1 is the first user-visible exploratory UI change

## Sprint 0 Deliverables

- this RFC
- exploratory Constellation type scaffolding
- exploratory board-mode scaffolding
- exploratory graph builder entry point
- tests for the new graph contract

## References

- [constellation-exploration-design-doc-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-exploration-design-doc-2026-03-16.md)
- [constellation-exploration-sprint-plan-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-exploration-sprint-plan-2026-03-16.md)
