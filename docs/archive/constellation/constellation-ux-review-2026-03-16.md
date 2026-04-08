# Constellation UX Review

Date: 2026-03-16

Scope: concept sketch, current constellation spec, and current prototype implementation

Method: reviewed the intent sketch, compared it against the current product spec and implementation, and benchmarked the draft against current UX guidance that still defines professional product quality in 2026: progressive disclosure, overview-first details-on-demand, human-AI transparency, WCAG 2.2 accessibility, and enterprise typography/content design.

## Executive Summary

The underlying product idea is strong. A protected freewrite that turns into a theme-first review surface is a differentiated and credible direction. The sketch communicates the right mental model: the draft stays central, themes organize the space, and arguments, counterarguments, and sources radiate outward in support of revision.

The current draft does not yet deliver that product. It reads more like a generic node canvas with placeholder intelligence than a trustworthy post-writing review workspace. The largest risk is not polish. It is credibility. The UI currently implies semantic precision, provenance, and revision guidance that the implementation does not actually provide.

In its current form, Constellation is too much of a canvas, too little of a review flow, too visually quiet for the amount of meaning it carries, and too weak on trust cues for an AI-mediated professional product.

## What Is Working

- The core transition from freewrite to review is directionally right. The board appears after a protected writing phase instead of interrupting composition.
- The draft-centered model is correct. The user’s writing should remain the center of gravity, not a side effect of the AI.
- Theme-first organization is the right top-level mental model. It is stronger than category-first or source-first.
- The concept sketch is better than the current implementation because it immediately communicates object types and relationships instead of hiding most meaning inside uniform cards.

## Findings

### 1. Critical: the product currently creates a trust gap between what it implies and what it actually knows

The board presents itself as a grounded analytical synthesis, but the implementation is still largely driven by mock theme templates and mock source data. The current builder defines fixed themes such as "Central Argument Tension" and "Evidence Gaps," injects only a small number of real annotations into the first theme, and even generates fake source references. See `MOCK_THEME_TEMPLATES` and `buildMockSourceRefs` in `src/domain/gadfly/constellation-builder.ts`.

This is a serious product risk because the UI style suggests precision. The user sees a composed board with leverage scoring, sources, and thematic structure, but much of that structure is not actually derived from the draft in a trustworthy way. For a professional AI product, that is worse than showing less.

The spec correctly says the surface should preserve trust through provenance and should show source URL, title, domain, research origin, affected anchor, and verdict. The current UI does not render source refs, anchor refs, confidence, or verdicts in any meaningful way.

Impact:

- Users can over-trust the board.
- The product risks feeling performative rather than analytical.
- Teams will struggle to evaluate whether the review surface is helping because the output is partially synthetic in a prototype-y way.

Recommendation:

- Do not ship a “serious” version of this surface until every visible theme and claim can be traced to real draft spans, real annotations, or real research artifacts.
- If confidence is low, say so explicitly.
- If data is incomplete, show a partial review state instead of polished-looking certainty.

### 2. Critical: the interaction model drifts into a generic whiteboard instead of a guided review workflow

The current board is implemented as a full React Flow canvas with pan, zoom, draggable nodes, controls, and an always-visible minimap in `src/app/(protected)/editor/constellation-board.tsx`. Themes and the draft are all draggable, and the layout is a simple ellipse in `src/domain/gadfly/constellation-layout.ts`.

This is the wrong interaction posture for the job. The user does not need a blank canvas after a freewrite. They need orientation, prioritization, and a clear next move. Free dragging, pan/zoom chrome, and minimap tooling make the surface feel like an internal diagramming utility. Your own product thinking already identifies this risk: the zoomed-out view should not look like a blank whiteboard where the user has to do the AI’s organizational work manually.

Impact:

- The board feels exploratory when it should feel editorial.
- The user is asked to manage layout even though layout is not the task.
- Professional tone drops immediately because the default visual language is “prototype graph tool.”

Recommendation:

- Remove free dragging from the default mode.
- Remove the minimap until the board genuinely exceeds one screen.
- Replace generic canvas affordances with explicit review affordances: filters, priority labels, revision actions, and anchor navigation.
- Treat layout as authored product structure, not as a freeform user responsibility.

### 3. High: focus mode does not function as a revision flow

The spec says a selected theme should expand into a structured argument map while the draft remains visible but recedes. The current implementation instead zooms the viewport toward the selected theme and renders a detached detail panel in the top-right corner. That panel is a grouped list of nodes, not a working revision surface.

There is also no click-through from a node to the relevant draft anchor, no visible provenance on the node rows, no node detail state, and no action model such as “address this challenge,” “check this source,” or “mark reviewed.”

Impact:

- The user can inspect information, but not turn inspection into revision momentum.
- The board feels like a dead-end branch of the workflow.
- The connection between critique and the actual draft is too weak.

Recommendation:

- Make focus mode a working pane, not an inspector card.
- Keep the draft visible in the same frame.
- Let node selection jump to anchored draft text instantly and reversibly.
- Turn theme focus into a clear decision surface with next actions.

### 4. High: the review hierarchy is inverted, so the board emphasizes reassurance over pressure

The product philosophy is Socratic. The spec explicitly says pressure should surface before reassurance: challenge, gap, question, support, then source. The current lane ordering is `supports`, `challenges`, `questions`, `sources`, and the UI renders groups in that order.

That means the first thing users scan is support, not tension. It softens the system’s critical function and weakens revision prioritization. Even the “highest leverage” theme is only given a subtle accent treatment and a thin 3px bar rather than an explicit recommendation.

Impact:

- The first read is less useful than it should be.
- The board appears descriptive rather than directive.
- High-value revision pressure is visually underplayed.

Recommendation:

- Reorder the board around challenge/gap first.
- Use explicit “highest leverage” labeling, not just a slightly different border.
- Make the first visible question on the board: “what should I rethink first?”

### 5. High: the visual system is too quiet, too small, and too uniform for the cognitive load of this task

The type scale is undersized for a dense, analytical workspace: chips and legends at `0.7rem`, summaries at `0.78rem`, titles at `0.88rem`, and even the focus title at `1.05rem`. Theme and draft cards are fixed at `w-52` (208px). The result is a whisper-scale interface carrying heavyweight meaning.

The visual hierarchy is also too flat. Theme cards, draft card, close controls, legend, and focus details all use the same subdued card language. Challenge, source, and question states are mostly encoded through small chips and muted colors. The leverage bar is too thin to function as a real prioritization signal.

Additional style problems:

- tiny all-caps lane headers in focus mode
- frequent truncation on summaries without clear expansion at the overview level
- React Flow controls and minimap bring prototype aesthetics into a customer-facing surface
- the board has little sense of editorial seriousness or brand confidence

Impact:

- Scannability is weaker than it should be.
- Important distinctions are easy to miss.
- The board does not read like a primary product moment.

Recommendation:

- Increase type sizes and card widths materially.
- Use stronger contrast between high-pressure, open-question, and low-signal states.
- Use sentence case for headers and labels unless there is a strong reason not to.
- Remove ornamental UI that competes with reading.

### 6. Medium: the flow is too automatic on entry and too fragile on exit

The board appears automatically when the sprint completes and the user pauses, then disappears as soon as the user types again. This is directionally understandable, but the current behavior gives the user too little control over when review starts and too little stability once it has started.

There is no meaningful “Review ready” pre-state, no explicit enter action, and no persistence of review context if the user dips back into the draft. The transition timing is also long and theatrical for a professional workflow.

Impact:

- The shift into review can feel system-driven rather than user-driven.
- The shift out of review can feel accidental.
- The user can lose context too easily.

Recommendation:

- Keep the post-sprint idle trigger, but add an explicit `Review ready` control the user can invoke.
- Preserve the currently focused theme if the user jumps back into the draft and returns.
- Tighten animation timing so motion supports orientation instead of becoming the experience.

### 7. Medium: the board is missing key accessibility and semantic interaction rigor

This surface depends on small cards, small chips, drag behavior, canvas navigation, and custom click targets. WCAG 2.2 expects keyboard-operable functionality, visible focus, alternatives to dragging, and adequate target size. For an enterprise product, those are baseline requirements, not later refinements.

The current prototype does include reduced-motion handling, which is good, but the broader interaction model still needs accessibility to be treated as a first-class design constraint.

Recommendation:

- Ensure every theme, node, and review action is fully keyboard-operable.
- Do not rely on drag as the primary way to manipulate or explore information.
- Increase effective target sizes.
- Use semantic interactive elements for anything that opens, selects, or navigates.

## Recommended Design Direction

### 1. Make the overview answer three questions in under five seconds

The first screen should answer:

1. What are my top tensions?
2. Which theme needs revision first?
3. Where is the missing evidence or strongest counterargument?

That means the overview should privilege prioritization over exploration.

### 2. Keep the draft central, but make the themes more explicit than the current cards

The concept sketch is directionally right. The overview should look like:

- center: the draft, with title, word count, and a meaningful excerpt
- first ring: 4 to 6 themes
- inside each theme: 1 strongest challenge, 1 unresolved question, evidence status, and source count
- top-left: filters such as `Counterarguments`, `Evidence gaps`, `Unresolved only`
- top-right: `Return to draft`

Do not make the user open a theme just to learn whether it contains something urgent.

### 3. Replace “zoom to card + side inspector” with a real focus state

A theme focus state should keep three things in view at once:

- the selected theme structure
- the anchored draft text
- the supporting provenance

A practical layout would be:

- left: anchored draft spans
- center: structured theme map
- right: evidence, sources, verdicts, and actions

That is much closer to the product promise than a floating detail card.

### 4. Reframe the visual language from graph demo to editorial intelligence

This surface should feel like a high-trust editorial instrument, not a playful network graph. Concretely:

- stronger type hierarchy
- fewer but more meaningful colors
- more explicit priority labels
- less generic card repetition
- less visual dependence on graph-tool chrome

The board should feel opinionated and calm, not configurable and busy.

### 5. Make the AI legible

For every non-trivial theme or node, the user should be able to understand:

- what part of the draft caused this
- why the system grouped it this way
- how confident the system is
- what evidence or source backs it
- what action the user can take next

If the system cannot explain a node at that level, it should not present it with polished confidence.

## Suggested User Flow

1. User completes a freewrite sprint.
2. Timer changes to `Review ready`.
3. On pause or explicit click, Constellation opens into an overview.
4. Overview highlights the top 4 to 6 themes and explicitly marks the highest-leverage revision theme.
5. Clicking a theme opens a focus state with anchored draft text, pressure points, and provenance.
6. Clicking a node jumps to the relevant draft span and offers a direct revision path.
7. Returning to overview or draft preserves context.

## Priority Roadmap

### Phase 1: fix credibility and product posture

- replace mock themes and mock sources with only real, traceable outputs
- remove default dragging and minimap
- expose real provenance and confidence
- reorder emphasis around challenge/gap first

### Phase 2: fix workflow and structure

- redesign focus mode as a real revision workspace
- add filter controls and explicit next actions
- add node-to-draft anchor navigation
- preserve context across draft/review transitions

### Phase 3: elevate the visual system

- increase type scale and card dimensions
- strengthen hierarchy and priority cues
- reduce UI chrome that signals “prototype graph tool”
- refine motion timing for a more professional cadence

## Best-Practice Basis

These recommendations align with widely used standards that still define strong product UX in 2026:

- Progressive disclosure: show complexity when it becomes relevant, not all at once.
- Overview first, then details on demand: the default screen should orient before it asks for exploration.
- Human-AI interaction guidance: make clear what the system can do, show contextually relevant information, and explain why the system behaved as it did.
- Accessibility: all primary interactions must be keyboard-operable, focus-visible, adequately sized, and not dependent on dragging.
- Enterprise typography and content design: readable type scales, clear hierarchy, sentence case, low truncation, and scannable labels.

## References

Internal:

- `docs/archive/constellation/gadfly-constellation-review-spec.md`
- `docs/archive/gadfly/gadfly-product-ux-design-space.md`
- `src/app/(protected)/editor/constellation-board.tsx`
- `src/app/(protected)/editor/constellation-theme-node.tsx`
- `src/app/(protected)/editor/constellation-draft-node.tsx`
- `src/app/(protected)/editor/minimal-editor.tsx`
- `src/domain/gadfly/constellation-builder.ts`
- `src/domain/gadfly/constellation-layout.ts`
- `src/domain/gadfly/constellation-types.ts`
- `src/app/globals.css`

External:

- Nielsen Norman Group, Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen Norman Group, 10 Usability Heuristics for User Interface Design: https://www.nngroup.com/articles/ten-usability-heuristics/
- Microsoft HAX Toolkit, Human-AI Interaction Guidelines: https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/
- W3C, Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/
- Ben Shneiderman, The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations: https://www.cs.umd.edu/users/ben/papers/Shneiderman1996eyes.pdf
- Atlassian Design System, Applying typography: https://atlassian.design/foundations/typography/applying-typography
