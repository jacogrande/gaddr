# Constellation Redesign Brief

Date: 2026-03-16

Owner: Product + Design

Status: Redesign brief for next iteration

## Objective

Redesign Constellation from a graph-style prototype into a high-trust post-freewrite review workspace that helps users decide what to rethink, verify, and strengthen next.

## Product Intent

Constellation appears after a protected freewrite sprint. It should transform raw writing into a clear, theme-first review surface that:

- preserves authorship
- surfaces argument pressure before prose suggestions
- makes AI reasoning legible
- helps users move directly from insight to revision

Constellation is not a chat panel, a mind map, or a generic canvas tool.

## Problem Statement

The current draft has the right concept but the wrong product posture. It behaves like a draggable node canvas with placeholder intelligence instead of a serious editorial review workflow. Users are not clearly told:

- what matters most
- why a theme exists
- what evidence supports the critique
- what action to take next
- how to get back to the relevant draft text

## Users

Primary users:

- serious writers using freewrite as a thinking tool
- professionals developing arguments, memos, essays, or position pieces
- users who want critique and research pressure without giving up authorship

## Core Jobs To Be Done

After a freewrite, the user should be able to:

1. understand the top tensions in the draft quickly
2. identify the highest-leverage revision area
3. inspect the strongest counterargument or evidence gap
4. see why the system surfaced that issue
5. jump directly into revision with context preserved

## Redesign Principles

### 1. Trust before richness

If the system cannot explain an insight, it should not present it with polished confidence.

### 2. Overview before exploration

The first screen should orient the user and prioritize revision decisions before offering deeper inspection.

### 3. Pressure before reassurance

Challenge, gap, and unresolved question should be more prominent than support or source inventory.

### 4. Draft remains central

The user’s writing is the center of gravity in overview and focus states.

### 5. Review, not whiteboard

Layout should feel authored and intentional. Users should not be asked to organize the board manually.

### 6. AI must be legible

Every major theme or node should show what triggered it, why it matters, and how confident the system is.

## Non-Goals

- building a general-purpose graph editor
- turning Constellation into a research database
- replacing revision with AI-generated rewrites
- showing all model artifacts by default

## Target Experience

### Entry State: Review Ready

When a sprint ends and the user pauses, show a clear `Review ready` state. The system may open automatically on idle, but the user should also have an explicit way to enter review.

Requirements:

- no jarring modal
- no route change
- no loss of draft context
- no forced transition while user is actively typing

### Overview State

The overview must answer three questions in under five seconds:

1. What are my top tensions?
2. What should I revise first?
3. Where is the missing evidence or strongest counterargument?

Required layout:

- center: draft card with title, excerpt, word count, and anchor availability
- first ring: 4 to 6 themes only
- top-left: filters
- top-right: return-to-draft control
- bottom area: compact legend only if needed

Each theme card should show:

- theme title
- one-sentence summary
- explicit priority or leverage label
- strongest challenge or gap
- unresolved question count
- source/evidence status
- confidence indicator

The user should not need to open a theme to know whether it is important.

### Theme Focus State

Selecting a theme should open a structured revision workspace, not a detached inspector panel.

Recommended three-pane layout:

- left: anchored draft spans tied to the theme
- center: structured theme review, grouped by challenge, gap, question, support, source
- right: provenance and action panel

The focus state should support:

- jump to draft anchor
- inspect why the theme exists
- inspect sources and verdicts
- mark items reviewed or addressed
- return to overview without losing state

## Information Architecture

### Top-Level Objects

- `Draft`
- `Theme`
- `Node`
- `Source / provenance`

### Theme Ordering

Themes should be ordered by revision leverage, not alphabetically.

### Node Ordering

Default order inside a theme:

1. challenge
2. gap
3. question
4. support
5. source

### Filters

Minimum filter set:

- `Counterarguments`
- `Evidence gaps`
- `Questions`
- `Unresolved only`

Optional future filters:

- confidence threshold
- source-backed only
- recent research only

## Interaction Requirements

### Must Have

- click or keyboard-select a theme
- click or keyboard-select a node
- jump from node to anchored draft text
- return from draft to same review context
- close review and return to draft cleanly

### Must Not Be Default

- free dragging of themes
- visible minimap unless board scale genuinely requires it
- graph-editor controls as a primary interaction model

### Recommended State Model

- `hidden`
- `review_ready`
- `overview`
- `focus_theme`
- `focus_node`

## AI Transparency Requirements

Every major surfaced item should be able to show:

- source of origin: draft span, annotation, or research result
- rationale: why it was grouped or ranked this way
- confidence: low, medium, high or equivalent
- evidence state: supported, mixed, contradicted, unverified, or not applicable
- next action: what the user can do with it

If provenance is missing, the UI must not imply strong confidence.

## Visual Direction

Desired posture:

- serious
- calm
- editorial
- high-trust
- productized, not experimental

Requirements:

- larger type scale than current draft
- stronger hierarchy between theme title, summary, pressure cue, and metadata
- sentence-case labels by default
- clearer differentiation between challenge, question, support, and source states
- fewer generic cards that all look the same
- less chrome associated with graph tools

Avoid:

- tiny labels
- overly subtle priority cues
- decorative graph UI that competes with reading
- visual noise that makes the board feel like a dashboard demo

## Accessibility Requirements

The redesign must meet professional accessibility expectations from the start.

Requirements:

- all primary interactions keyboard-operable
- visible and consistent focus states
- no drag-only functionality
- adequate target sizes
- reduced-motion support
- readable contrast across all semantic states

## Content Design Requirements

Theme and node copy should be:

- short
- specific
- explanatory
- action-oriented

Avoid:

- vague abstractions
- generic AI phrasing
- hidden severity behind euphemistic wording

Examples of good prompts:

- `Strongest objection is still unaddressed`
- `This claim depends on evidence you have not shown yet`
- `Two premises conflict and weaken the thesis`

## Success Criteria

The redesign is successful if users can:

- identify the top revision area without opening every theme
- explain why a surfaced issue appeared
- navigate from review item to draft evidence quickly
- act on critique without feeling the AI is taking over authorship

## Acceptance Criteria

### UX

- overview shows no more than 6 themes by default
- highest-priority theme is explicitly marked
- overview exposes at least one meaningful pressure cue per theme
- focus state keeps draft context visible
- node selection can navigate to the relevant draft span

### Trust

- no visible mock source or mock provenance data
- every surfaced source-backed node can expose URL, title, domain, and verdict
- confidence is visible where semantic interpretation is uncertain

### Interaction

- keyboard navigation supports overview and focus states
- review context persists when returning from the draft
- no default dragging required to understand the board

### Visual

- text is readable at normal desktop viewing distance
- hierarchy clearly differentiates theme, issue, and metadata levels
- graph-tool chrome is reduced to near-zero in the primary experience

## Deliverables

### Design

- updated overview wireframe
- updated theme focus wireframe
- interaction notes for draft handoff
- visual direction exploration
- final high-fidelity screens

### Product

- revised state model
- updated content model for provenance and confidence
- prioritization of MVP vs follow-on capabilities

### Engineering

- implementation plan for removing graph-first behaviors
- anchor navigation design
- provenance rendering model
- accessibility checklist for keyboard and motion behavior

## Suggested Sequence

1. finalize the interaction model
2. finalize the trust/provenance model
3. redesign overview
4. redesign theme focus
5. refine visual system
6. build and test with realistic data only

## References

- [constellation-ux-review-2026-03-16.md](/Users/jackson/Code/projects/gaddr/docs/constellation-ux-review-2026-03-16.md)
- [gadfly-constellation-review-spec.md](/Users/jackson/Code/projects/gaddr/docs/gadfly-constellation-review-spec.md)
- [gadfly-product-ux-design-space.md](/Users/jackson/Code/projects/gaddr/docs/brainstorms/gadfly-product-ux-design-space.md)
