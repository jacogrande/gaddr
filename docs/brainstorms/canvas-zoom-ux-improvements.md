# Canvas Zoom UX Improvements

Brainstormed improvements for gaddr's always-on React Flow canvas system. The editor lives inside a React Flow node — writing mode locks at zoom=1, board mode zooms out after sprint completion.

## Writing Flow & Transitions

### 1. Scroll-position preservation across board transitions

When the writer exits the board and returns to the editor, restore the exact scroll position they had before the zoom-out. Currently the viewport returns to `y: 0`, snapping the writer to the top of a long draft.

Capture `scrollTop` from the `.gaddr-editor-scroll` container before `transition_in`, store in a ref, restore after `transition_out`. The product philosophy says "protect the writing loop" — losing your place violates that.

**Complexity: Low**

### 2. Cursor heartbeat on sprint chip

When the sprint is running and the writer is actively typing, subtly pulse the sprint chip border in sync with typing activity (~530ms cycle). When the writer pauses, the pulse slows and dims. Communicates "you're in flow" without the clock-watching anxiety of a countdown number.

The sprint chip already has a `--running` border state. Add a CSS animation class `gaddr-sprint-chip--flowing` toggled by `lastEditAtMsRef`.

**Complexity: Medium**

### 3. Depth-of-field blur during zoom-out transition

During `transition_in`, apply a progressive `filter: blur()` (0 to 1.5px) to the editor card content. Remove at the end of the transition. Creates the sensation of physically pulling back from a page rather than a flat CSS scale.

Respect `prefers-reduced-motion`. Use `will-change: filter` for GPU compositing.

**Complexity: Medium**

### 4. Last sentence preview in board overlay

When the board overlay appears, show a one-line preview of the writer's last sentence below the "Sprint complete" label. After a focused sprint, the writer's working memory is fragile — showing the last thought helps them close the chapter mentally.

Extract from `editor.getJSON()`, truncate to ~120 characters. Pure text extraction, no AI.

**Complexity: Low-Medium**

### 5. Keyboard shortcut for board toggle (Cmd+.)

Add a single shortcut that toggles between writing and board mode, available after sprint completion. Escape already exits the board, but there is no symmetric keyboard path back in. Writers who touch-type should not need the mouse for this.

Add handler in `handleGlobalKeyDown` — check for `Cmd+.` when `sprintPhase === "completed"`.

**Complexity: Low**

### 6. Word count at sprint completion

When the sprint completes, show word count in the board overlay: "347 words in 10 minutes." Do not show word count during writing — it creates number-watching. Reveal it only at the natural pause as a quiet reward.

Use `editor.state.doc.textContent.split(/\s+/).filter(Boolean).length` at the moment of completion.

**Complexity: Low**

### 7. Asymmetric transition timing

Use different durations for zoom-out vs zoom-in. Stepping back should be slower and contemplative (1600ms). Returning to writing should be faster and decisive (900ms). The two directions are cognitively opposite — symmetric timing treats them as the same experience.

Split `TRANSITION_DURATION_MS` into `ZOOM_OUT_DURATION_MS` and `ZOOM_IN_DURATION_MS`.

**Complexity: Low-Medium**

### 8. Sprint soft landing at 60 seconds remaining

When the sprint reaches its last 60 seconds, subtly shift the chip border to a warmer tone — a quiet peripheral signal that the sprint is wrapping up. No toast, no sound, no pop-up. Just a color shift on the chip that already exists.

Add CSS class `gaddr-sprint-chip--winding-down` when `sprintRemainingMs` is between 0 and 60000.

**Complexity: Low**

### 9. Editor card hover state in board mode

When the writer hovers over the editor card while the board is visible, show a brighter border and pointer cursor indicating the card is clickable. The `onNodeClick` already calls `onExitBoard`, but there is zero visual affordance — the writer must discover this or use the "Resume writing" button.

Add `.gaddr-canvas-node--card:hover` rule scoped to `[data-board-active="true"]`.

**Complexity: Low**

### 10. Breathe micro-animation on sprint start

When a sprint begins, play a single 400ms scale pulse (1.0 to 1.002 and back) on the editor surface. Signals "the space is now protected" without text or overlays. The equivalent of a pianist settling their hands before playing.

Toggle a CSS class on `sprintPhase` transition from idle to running. Respect `prefers-reduced-motion`.

**Complexity: Low**

### 11. Persist sprint state across page reloads

Save sprint state (`sprintPhase`, `sprintEndsAtMs`, `pausedSprintRemainingMs`) to localStorage alongside the editor content. Restore on load. If the sprint expired while the page was closed, mark as completed.

Editor content already persists via `STORAGE_KEY`. Sprint state should too — an accidental refresh during a 15-minute sprint destroys the timer.

**Complexity: Medium**

### 12. Contextual footer copy by sprint phase

Replace the static "Copyright Gaddr 2026" footer with phase-sensitive copy:
- Idle: "Copyright Gaddr 2026"
- Running: hidden (maximize clean writing space)
- Completed, board visible: "Your constellation is forming" (introduces Sprint 2 language)
- After board dismissed: "Sprint complete. Keep writing or review the board."

**Complexity: Low**

## Canvas & Spatial Design

### 13. Radial constellation layout

Position findings in concentric rings around the draft card. Inner ring: findings anchored to specific claims (citations, sentence-level issues). Outer ring: broader counterarguments and general issues. Edges connect findings to approximate vertical positions on the card edge.

Communicates "this surrounds and pressure-tests your draft." Layout algorithm belongs in `domain/constellation/` as pure logic.

**Complexity: High**

### 14. Semantic color zones on the dot grid

When findings are present, replace the uniform dot grid with subtly tinted zones — warm-gold around citations, cooler tone around counterarguments, muted warm-red around issues. Extremely subtle watercolor washes, not colored boxes.

The background becomes a heatmap of intellectual pressure. Uses SVG radial gradients behind the dot pattern.

**Complexity: Medium**

### 15. Density preview at low zoom

Below zoom ~0.4, replace the unreadable tiny text with a structural visualization: horizontal bars showing paragraph density, heading positions, and finding anchor points. A document "X-ray."

Extract from TipTap JSON. Trigger based on `useReactFlow().getViewport().zoom`.

**Complexity: Medium**

### 16. Gravitational pan — canvas re-centers on idle

After the writer pans or zooms to inspect a finding, if they stop interacting for 4-5 seconds, the canvas gently drifts back toward a centered view over 2-3 seconds. Any touch cancels instantly.

Prevents "lost in space" syndrome. The draft is the gravitational center. Uses the existing `setViewport` animation and idle detection patterns.

**Complexity: Low**

### 17. Claim anchor strips on the draft card edge

Thin colored strips along the card edge indicating where each extracted claim sits in the document. Hovering a strip highlights the corresponding region. Strip colors match the connected finding type.

Bridges spatial constellation view with linear document. Uses React Flow's `Handle` system for edge routing.

**Complexity: Medium**

### 18. Progressive disclosure zoom tiers

Three semantic zoom levels:
- Tier 1 (0.6-1.0): full finding summaries, visible edges
- Tier 2 (0.3-0.6): density preview on card, finding nodes collapse to icon + title
- Tier 3 (0.1-0.3): everything abstract — card is a rectangle, findings are colored dots

Each tier serves a different cognitive mode: reading, scanning, seeing patterns.

**Complexity: High**

### 19. Distinct node type visual language

Three finding types get distinct visual treatments using the existing design token system:
- Citations: compact card with warm-gold left-border accent, source title, supports/complicates/contradicts badge
- Counterarguments: slightly larger card with distinct silhouette, steelmanned summary, strength indicator
- Issues: minimal tag-shaped node with severity and one-line description

Shape, color, and proportion should communicate type before text does.

**Complexity: Medium**

### 20. Spatial minimap with finding distribution

React Flow's built-in `MiniMap` component, customized so the draft card renders as a cream rectangle and findings render as colored dots by type. Only appears in board mode.

Provides orientation when the constellation grows. Colored minimap dots double as a type distribution summary.

**Complexity: Low**

### 21. Pressure gradient on the draft card

The card's border or shadow intensifies in regions where findings cluster. If the top of the draft has five issues and two counterarguments while the bottom has one citation, the top edge glows warmer.

Most direct spatial encoding of "pressure-testing." The card heats up where it is being challenged.

**Complexity: Medium**

### 22. Keyboard constellation navigation

Tab/Shift-Tab cycles through findings by position in the draft. Arrow keys move between spatially adjacent nodes. Enter expands a finding to full detail. Escape returns to overview. Focus ring animates smoothly between nodes.

Writers keep hands on keyboard. Mouse-only board interaction is wrong for a writing tool.

**Complexity: Medium**

### 23. Animated constellation assembly

After sprint completion, findings emerge sequentially rather than appearing all at once. Citations first (support), then counterarguments (challenges), then issues (problems). Each type has a slight stagger. The whole assembly takes 3-4 seconds.

Transforms a data dump into a narrative reveal. Gives the writer time to shift from drafting mode to review mode.

**Complexity: Medium**

### 24. Double-click section focus

Double-clicking a region of the draft card in board mode zooms to that section at near-readable size (~0.8), showing only the findings connected to claims in that section. Unrelated findings fade to low opacity. A "back to full view" button appears.

Lets the writer review paragraph-by-paragraph with relevant challenges. Bridges overview and line-level review.

**Complexity: High**

## Recommended first batch

High-impact, low-cost changes that could ship together as a polish pass:

1. Scroll-position preservation (#1) — fixes a real usability bug
2. Keyboard board toggle (#5) — removes mouse dependency
3. Word count at completion (#6) — adds a reward moment
4. Soft landing at 60s (#8) — prevents the jump scare
5. Card hover state (#9) — surfaces hidden interaction
6. Gravitational pan (#16) — prevents lost-in-space on canvas
