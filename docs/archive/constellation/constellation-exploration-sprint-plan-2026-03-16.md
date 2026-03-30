# Constellation Exploration Sprint Plan

Date: 2026-03-16

Based on:

- [constellation-exploration-rfc-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-exploration-rfc-2026-03-16.md)
- [constellation-exploration-design-doc-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-exploration-design-doc-2026-03-16.md)
- current Constellation implementation in `src/domain/gadfly/*` and `src/app/(protected)/editor/*`

## Goal

Migrate the current Constellation prototype from a theme-review board into the new exploratory product model:

`freewrite -> constellation exploration -> first draft`

The migration should preserve as much of the existing system as is useful, especially:

- the post-sprint entry flow in the editor
- the React Flow canvas foundation
- the existing Gadfly annotation and research-task data
- the current draft-centered transition into Constellation

The migration should avoid a full rewrite. The fastest path is an evolutionary rebuild behind the existing entry point.

## Current System Inventory

### Existing assets we should keep

- `MinimalEditor` already controls sprint completion, idle-triggered entry, and Constellation transitions.
- `buildConstellationBoard()` already provides a single domain boundary for constructing board data.
- React Flow is already integrated and supports node-based rendering, viewport control, and future local branching.
- Current Gadfly annotations and research tasks already provide enough structure for an initial exploration graph:
  - annotations
  - prompts
  - research tasks
  - research results
  - sources
- Reduced-motion handling and basic keyboard escape behavior already exist.

### Existing assets we should replace or reshape

- review-oriented board modes: `overview` and `focus_theme`
- theme-first lane cards and right-side inspector panel
- mock theme-template builder model
- simple ellipse layout as the only board structure
- generic graph-tool chrome in the default UI

## Migration Strategy

Use a staged, in-place migration rather than replacing Constellation in one pass.

Recommended implementation strategy:

1. Keep the existing editor entry point and Constellation mount point.
2. Migrate the current review-era graph model directly toward the new exploratory model.
3. Ship the new overview first.
4. Add local branching and branch actions next.
5. Add working set / draft-prep last.
6. Remove legacy review-specific code as soon as the exploratory path replaces it.

## Proposed Sprint Cadence

Assumption: 4 one-week implementation sprints after a short design/architecture alignment pass.

If your team runs two-week sprints, keep the order and combine Sprint 0 with Sprint 1.

## Sprint 0: Alignment and Foundations

### Objective

Lock the migration shape so engineering does not build the new experience on top of review-era assumptions.

### Product / Design

- finalize the phase model: `freewrite -> constellation -> first draft`
- confirm the recommended direction: `Hybrid Atlas-to-Graph`
- define the initial node families for MVP:
  - `Seed`
  - `Theme`
  - `Question`
  - `Counterargument`
  - `Evidence`
  - `Source`
  - `Research task`
- define the first branch actions for MVP:
  - `Find strongest objection`
  - `Find stronger evidence`
  - `Ask a deeper question`
  - `Follow this source`
  - `Respond to this counterargument`
- define the initial `Working set` behavior

### Engineering

- decide whether to evolve `ConstellationBoard` types in place or add parallel exploratory types
- define a migration-safe state model:
  - `hidden`
  - `transition_in`
  - `atlas_overview`
  - `local_exploration`
  - `draft_prep`
  - `transition_out`
- define a new graph data contract that can replace the current board contract cleanly, even if temporary parallel types are used during refactor

### Deliverables

- updated UX flows
- final node family list
- state model
- implementation RFC or engineering note

### Exit Criteria

- no open ambiguity about Constellation’s purpose
- engineering has a stable target model before UI work begins

## Sprint 1: Atlas Overview MVP

### Objective

Replace the current review-first overview with an exploratory atlas overview while reusing the current editor transition and canvas mount.

### Scope

- keep the existing post-sprint entry trigger in `MinimalEditor`
- keep the central draft/seed transition
- replace the current theme-island overview with an exploratory overview
- remove review-oriented framing from visible UI

### Engineering Tasks

#### Domain model

- add exploratory graph types next to or replacing the current review types
- create a new graph builder that maps existing data into:
  - one `Seed` node from the freewrite
  - 4 to 6 top-level `Theme` nodes
  - first-pass attached nodes from existing annotations and research tasks
- keep mock generation where needed, but make mock output mimic future provenance fields

#### UI

- replace theme card copy and inspector framing with exploratory language
- redesign overview so it answers:
  - what is this map about?
  - what are the main inquiry branches?
  - what can I explore next?
- reduce or hide generic graph controls by default
- keep draft/seed visually central

#### Layout

- replace the single ellipse-only mental model with a seed-centered atlas layout
- keep auto-layout deterministic
- keep the board useful without dragging

### Design Tasks

- create final atlas overview layout
- define node-family styling
- define how top-level themes differ visually from evidence, questions, and sources

### Test Tasks

- add unit tests for new graph builder output
- add layout tests for seed-centered overview
- add a Playwright smoke path that reaches Constellation overview

### Exit Criteria

- user can enter Constellation and understand it as exploration, not review
- overview shows central seed plus 4 to 6 main themes
- mock nodes display provenance-like metadata shape

## Sprint 2: Local Exploration and Branch Actions

### Objective

Turn Constellation from a static map into a branchable exploration surface.

### Scope

- add local exploration around a selected node
- add branch actions that create new attached nodes
- keep global clutter under control

### Engineering Tasks

#### Board state

- replace `focus_theme` with `local_exploration`
- preserve overview context while expanding a selected branch
- keep expansion local to the selected theme/node instead of exploding the whole board

#### Node actions

- add node-level action affordances for the MVP branch actions
- implement mocked branch generation first
- attach new nodes to the originating node with relationship metadata

#### Detail and provenance

- add node detail view that shows:
  - why this surfaced
  - provenance
  - confidence
  - branch actions
- allow source nodes and counterargument nodes to be opened without leaving the map

#### Clutter controls

- add collapse for sibling branches
- add “reset to atlas overview”
- add “show only current branch”

### Design Tasks

- define local exploration choreography
- define node action menus or inline actions
- define how selected-branch emphasis works visually

### Test Tasks

- add tests for branching state transitions
- add tests for branch action node creation
- add e2e flow for expanding a theme and branching a node

### Exit Criteria

- user can select a theme or node and branch deeper
- branch actions create visible local exploration
- the board remains legible after branching

## Sprint 3: Working Set and First-Draft Bridge

### Objective

Add the bridge from exploration into writing so Constellation becomes a productive pre-draft phase rather than an endless map.

### Scope

- working set / saved nodes
- pinned themes or branches
- “use in draft” collection behavior
- explicit transition toward first-draft creation

### Engineering Tasks

#### Working set model

- add a persisted working-set state for saved nodes
- support:
  - save node
  - remove node
  - pin node
  - mark `use in draft`

#### Draft-prep surface

- add a lightweight draft-prep tray or side panel
- show collected nodes grouped by theme or node family
- allow basic ordering and removal

#### Editor handoff

- add the transition from Constellation to first draft
- decide initial output form:
  - rough outline
  - grouped talking points
  - seeded first-draft scaffold

### Design Tasks

- design the working set tray
- define the handoff into the editor
- define whether draft prep lives inside the board or as a companion panel

### Test Tasks

- add unit tests for working-set state
- add e2e flow for saving nodes and moving into draft prep

### Exit Criteria

- user can collect insights during exploration
- collected insights persist within the session
- Constellation has a clear bridge into first-draft work

## Sprint 4: Trust, Polish, and Cleanup

### Objective

Raise the system from “functional exploration prototype” to “credible company-grade exploratory surface.”

### Scope

- provenance polish
- keyboard and accessibility pass
- graph hygiene improvements
- legacy code cleanup

### Engineering Tasks

#### Trust and metadata

- standardize provenance fields across all node families
- show `why this surfaced` consistently
- standardize confidence and support/contradiction signals

#### Accessibility

- ensure node navigation is keyboard-operable
- ensure branch actions are keyboard-operable
- ensure target sizes and focus styles are sufficient
- preserve reduced-motion behavior

#### Cleanup

- remove or archive obsolete review-era modes and UI
- simplify board code around exploratory states
- remove unused review-specific rendering paths

#### Performance

- test map behavior with deeper branch counts
- cap or summarize low-signal branches
- ensure the board remains responsive under realistic exploration depth

### Design Tasks

- final visual pass on node families, branch emphasis, and motion
- remove lingering graph-demo cues
- tune label density and readability

### Test Tasks

- regression suite for overview, local exploration, and draft prep
- accessibility checklist
- visual snapshots for major states

### Exit Criteria

- the exploratory flow is stable end to end
- legacy review framing is no longer visible in the active path
- the map feels like a productized argument atlas rather than a generic graph demo

## System Changes by File Area

### Likely to change heavily

- `src/domain/gadfly/constellation-types.ts`
- `src/domain/gadfly/constellation-builder.ts`
- `src/domain/gadfly/constellation-layout.ts`
- `src/app/(protected)/editor/constellation-board.tsx`
- `src/app/(protected)/editor/constellation-board-types.ts`
- `src/app/(protected)/editor/constellation-theme-node.tsx`
- `src/app/(protected)/editor/constellation-draft-node.tsx`
- `src/app/globals.css`

### Likely to evolve, but not be replaced

- `src/app/(protected)/editor/minimal-editor.tsx`
- `src/app/(protected)/editor/use-gadfly.ts`

### Likely to be added

- new node renderers for additional node families
- new graph builder helpers
- working-set state module
- new tests for exploratory graph behavior

## Risks and Mitigations

### Risk 1: the team keeps thinking in review-era concepts

Mitigation:

- rename modes and UI text early
- remove review-oriented labels from Sprint 1

### Risk 2: branch growth creates unusable maps

Mitigation:

- local branching only for MVP
- collapse and focus controls in Sprint 2
- working set as explicit extraction path in Sprint 3

### Risk 3: mock outputs create the wrong UI assumptions

Mitigation:

- require mock nodes to use final metadata shape
- do not design around fake certainty or fake density

### Risk 4: scope explodes

Mitigation:

- limit MVP node families
- limit branch action catalog in first pass
- defer advanced compare/merge/multi-select behaviors

## Definition of Done

The migration is complete when:

- Constellation is clearly positioned as the second exploratory phase after freewrite
- the default board is an atlas overview, not a review panel
- users can branch locally from themes and nodes
- users can save useful threads into a working set
- users can move from exploration into first-draft preparation
- the active Constellation flow no longer depends on review-era mental models

## Recommended Team Split

### Design

- atlas overview
- local exploration
- working set / draft prep
- node family visual system

### Product

- branch action catalog
- provenance requirements
- draft-prep handoff definition

### Engineering

- graph model migration
- board state migration
- node action plumbing
- persistence and tests

## Recommended Demo Sequence

End of Sprint 1:

- enter Constellation and see exploratory atlas overview

End of Sprint 2:

- branch from a selected theme into deeper local exploration

End of Sprint 3:

- save nodes into working set and move toward first draft

End of Sprint 4:

- show polished, keyboard-accessible, end-to-end exploratory flow
