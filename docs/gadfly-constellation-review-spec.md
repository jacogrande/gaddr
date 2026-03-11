# Gadfly Constellation Review Spec

Date: 2026-03-10

## 1. Purpose

Define the post-freewrite review surface for Gadfly.

This surface appears after a protected freewrite timer completes and the user pauses. It is a zoomed-out synthesis view that helps the user inspect themes, counterarguments, evidence gaps, and sources without turning the product into a chat tool or a ghostwriter.

## 2. Product Position

Constellation Review is not:

1. a mindless "AI summary"
2. a source dump
3. a debug pane for model output
4. a replacement drafting surface

Constellation Review is:

1. a theme-oriented synthesis board
2. a review layer between drafting and revision
3. a source-grounded map of the most important tensions in the draft
4. a way to help the user decide what to rethink, verify, or strengthen next

## 3. Core Recommendation

The default layout is `theme-first`.

Within each theme, items are organized by `argument role`:

1. `supports`
2. `challenges`
3. `questions`
4. `sources`

This means:

1. spatial position answers "what is this about?"
2. lane or color answers "what role does this play?"
3. attached sources answer "where did this come from?"

Do not sort the board primarily by category or source.

Category-first makes the experience feel like an internal AI tool panel.
Source-first makes it feel like research management.
Theme-first keeps the user oriented around their own thinking.

## 4. UX Goals

1. Give the user immediate orientation after freewriting.
2. Surface the highest-leverage revision areas first.
3. Preserve trust by showing provenance for claims and critiques.
4. Keep authorship with the user by surfacing pressure, not prose.
5. Make the AI's organization editable because clustering is suggestive, not absolute.

## 5. Entry Trigger

The board should appear only when both conditions are true:

1. the timer has completed
2. the user has paused typing for a short idle threshold

Recommended thresholds:

1. timer completes naturally, not when manually ended
2. user idle threshold: `1800-3000 ms`

If the user keeps typing after the timer ends, do not interrupt. Keep the timer in its completed state and defer the transition.

## 6. Transition

Recommended transition sequence:

1. Timer chip switches to `Review ready`.
2. On idle pause, editor content scales down and recenters.
3. The freewrite becomes a central draft card.
4. Theme islands fade in around the draft.
5. Lines animate in only after cards land.

Do not:

1. open a modal
2. force a route change
3. blank the draft completely
4. throw the user into an overwhelming full-canvas state with dozens of items visible at once

## 7. Information Architecture

The board has four conceptual layers.

### 7.1 Draft Layer

The user's freewrite remains the center of gravity.

The draft is represented as:

1. a central card
2. note title or fallback label
3. writing stats
4. a compact excerpt
5. links back to anchored text spans

### 7.2 Theme Layer

Themes are the primary spatial objects on the board.

A theme is a semantic cluster such as:

1. `AI dependence`
2. `fear of mediocrity`
3. `audience uncertainty`
4. `identity vs ambition`

Each theme island should show:

1. title
2. one-sentence summary
3. leverage score
4. counts by lane
5. confidence band

### 7.3 Node Layer

Nodes are the review artifacts inside a theme.

Recommended node kinds:

1. `claim`
2. `support`
3. `challenge`
4. `question`
5. `gap`
6. `source`

### 7.4 Provenance Layer

Every research-backed node should preserve:

1. source URL
2. source title
3. source domain
4. research task origin
5. affected draft anchor
6. verdict when available

## 8. Default Screen Layout

### 8.1 Overview Mode

Use this as the default board.

Layout:

1. Center: draft card
2. Around center: `4-7` theme islands
3. Top-left: scope and filter controls
4. Top-right: close / return to draft
5. Bottom-left: legend for lane colors and edge types
6. Bottom-right: optional minimap only if the board grows beyond one screen

### 8.2 Theme Island Structure

Each theme island should be visually compact in overview mode.

Recommended shape:

1. theme header
2. summary line
3. four micro-lanes: `supports`, `challenges`, `questions`, `sources`
4. compact chips or counts in each lane

Do not render full source cards in overview mode.
Show counts and only the strongest one or two nodes.

### 8.3 Focus Mode

When the user clicks a theme:

1. the chosen island expands
2. non-selected islands dim
3. the draft stays visible but recedes
4. the selected theme becomes a structured argument map

Focus mode is where longer evidence snippets, critique details, and source cards belong.

## 9. Ordering Rules

### 9.1 Primary Ordering: Theme by Revision Leverage

Themes should be sorted by a derived `revisionLeverageScore`, not alphabetically.

Recommended formula:

```ts
revisionLeverageScore =
  0.35 * draftCentrality +
  0.25 * conflictScore +
  0.20 * evidenceGapScore +
  0.10 * repetitionScore +
  0.10 * freshnessScore;
```

Definitions:

1. `draftCentrality`: how central the theme is to the draft's overall meaning
2. `conflictScore`: strength and quantity of meaningful challenges or contradictions
3. `evidenceGapScore`: how under-supported the theme is
4. `repetitionScore`: how often the theme appears across anchored spans
5. `freshnessScore`: whether recent research added materially new pressure

### 9.2 Secondary Ordering: Nodes by Role

Inside a theme, nodes should be grouped in this order:

1. `challenge`
2. `gap`
3. `question`
4. `support`
5. `source`

Rationale:

1. Gadfly is a Socratic critic, so pressure should surface before reassurance.
2. Sources are supporting provenance, not the first object the user should parse.

### 9.3 Source Ordering

Sources should be sorted within a node by:

1. relevance to the node
2. verdict strength
3. source quality heuristics
4. recency only when the claim is time-sensitive

Do not sort sources globally as top-level board objects.

## 10. Visual Encoding

Use position for `theme`.
Use lane or shape for `argument role`.
Use color intensity for `severity` or `pressure`.
Use edge style for `relationship type`.

Recommended lane encoding:

1. `supports`: calm / stable
2. `challenges`: sharp / high-contrast
3. `questions`: lighter / open
4. `sources`: quiet / neutral

Recommended edge types:

1. `anchors_to_text`
2. `supports`
3. `challenges`
4. `derived_from`
5. `relates_to`

## 11. Interaction Model

### 11.1 Overview Interactions

1. Hover a theme to highlight related spans in the draft.
2. Hover a draft span to light up the related theme island.
3. Click a theme to enter focus mode.
4. Click a node to open detail.
5. Filter the board by lane, severity, or unresolved items.

### 11.2 Editing Interactions

Users must be able to:

1. rename a theme
2. merge themes
3. split a theme
4. dismiss a node
5. pin a node
6. mark a question as addressed

The system should not assume its clustering is final.

### 11.3 Return to Draft

When the user clicks a node or anchor:

1. the board can temporarily shrink or slide aside
2. the draft scrolls to the relevant anchor
3. the corresponding sentence or paragraph is highlighted

This handoff must feel instant and reversible.

## 12. State Model

Recommended top-level board states:

1. `hidden`
2. `transition_in`
3. `overview`
4. `focus_theme`
5. `focus_node`
6. `transition_out`

Recommended theme states:

1. `suggested`
2. `accepted`
3. `edited`
4. `dismissed`

Recommended node states:

1. `active`
2. `pinned`
3. `acknowledged`
4. `resolved`
5. `dismissed`

## 13. Data Types

These are proposed view-model contracts for the Constellation Review surface.

They should sit on top of the existing `GadflyAnnotation`, `GadflyResearchTask`, and `GadflyResearchSource` types instead of replacing them.

```ts
export type ConstellationBoardMode =
  | "hidden"
  | "transition_in"
  | "overview"
  | "focus_theme"
  | "focus_node"
  | "transition_out";

export type ConstellationThemeStatus =
  | "suggested"
  | "accepted"
  | "edited"
  | "dismissed";

export type ConstellationNodeKind =
  | "claim"
  | "support"
  | "challenge"
  | "question"
  | "gap"
  | "source";

export type ConstellationLaneKind =
  | "supports"
  | "challenges"
  | "questions"
  | "sources";

export type ConstellationEdgeKind =
  | "anchors_to_text"
  | "supports"
  | "challenges"
  | "derived_from"
  | "relates_to";

export type ConstellationNodeStatus =
  | "active"
  | "pinned"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export type ConstellationSeverity = "low" | "medium" | "high";

export type ConstellationVerdict =
  | "unverified"
  | "supported"
  | "mixed"
  | "contradicted"
  | "not_applicable";

export type ConstellationAnchorRef = {
  annotationId: string;
  from: number;
  to: number;
  quote: string;
};

export type ConstellationSourceRef = {
  sourceId: string;
  researchTaskId: string | null;
  title: string;
  url: string;
  domain: string;
  pageAge: string | null;
  snippet: string | null;
  relevanceScore: number;
  verdict: ConstellationVerdict;
};

export type ConstellationNode = {
  id: string;
  kind: ConstellationNodeKind;
  lane: ConstellationLaneKind;
  themeId: string;
  title: string;
  summary: string;
  severity: ConstellationSeverity;
  status: ConstellationNodeStatus;
  verdict: ConstellationVerdict;
  confidenceScore: number;
  leverageScore: number;
  sourceRefs: ConstellationSourceRef[];
  anchorRefs: ConstellationAnchorRef[];
  linkedNodeIds: string[];
};

export type ConstellationThemeCounts = {
  supports: number;
  challenges: number;
  questions: number;
  sources: number;
};

export type ConstellationTheme = {
  id: string;
  title: string;
  summary: string;
  status: ConstellationThemeStatus;
  counts: ConstellationThemeCounts;
  leverageScore: number;
  draftCentrality: number;
  conflictScore: number;
  evidenceGapScore: number;
  repetitionScore: number;
  freshnessScore: number;
  confidenceScore: number;
  anchorRefs: ConstellationAnchorRef[];
  nodeIds: string[];
};

export type ConstellationEdge = {
  id: string;
  kind: ConstellationEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  strength: number;
};

export type ConstellationDraftCard = {
  noteId: string;
  docVersion: number;
  title: string | null;
  excerpt: string;
  wordCount: number;
  anchorRefs: ConstellationAnchorRef[];
};

export type ConstellationFilters = {
  lanes: ConstellationLaneKind[];
  severity: ConstellationSeverity[];
  unresolvedOnly: boolean;
  showDismissed: boolean;
};

export type ConstellationLayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ConstellationLayout = {
  draft: ConstellationLayoutNode;
  themes: ConstellationLayoutNode[];
};

export type ConstellationBoard = {
  id: string;
  noteId: string;
  generatedAt: string;
  mode: ConstellationBoardMode;
  draft: ConstellationDraftCard;
  themes: ConstellationTheme[];
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  filters: ConstellationFilters;
  layout: ConstellationLayout;
};
```

## 14. Mapping From Existing Gadfly Types

This is the recommended mapping from the current domain model.

### 14.1 Existing Inputs

Primary inputs:

1. `GadflyAnnotation[]`
2. `GadflyAnnotationGroup[]`
3. `GadflyResearchTask[]`
4. `GadflyResearchSource[]`
5. current note text
6. current doc version

### 14.2 Mapping Rules

1. A `GadflyAnnotationGroup` becomes one or more `ConstellationNode`s.
2. Related groups are clustered into a `ConstellationTheme`.
3. `annotation.category` influences node kind but should not determine top-level theme placement.
4. `research.tasks` and `research.sources` become `ConstellationSourceRef`s and research-backed nodes.
5. Anchors from annotations become `ConstellationAnchorRef`s.

### 14.3 Suggested Kind Mapping

```ts
function mapAnnotationToNodeKind(annotation: GadflyAnnotation): ConstellationNodeKind {
  if (annotation.research.needsFactCheck) {
    return "gap";
  }

  if (annotation.prompts.some((prompt) => prompt.kind === "followup_question")) {
    return "question";
  }

  if (annotation.category === "logic" || annotation.category === "evidence") {
    return "challenge";
  }

  return "claim";
}
```

This mapping is only a starting point.
The real board should allow a theme builder to synthesize multiple annotations into cleaner review nodes.

## 15. Board Construction Pipeline

Recommended pipeline:

1. Gather renderable annotation groups.
2. Extract candidate semantic themes from anchors, explanations, questions, and research tasks.
3. Merge candidates into `4-7` high-signal themes.
4. Create nodes inside each theme, grouped by lane.
5. Attach sources to the most relevant node, not directly to the board.
6. Calculate leverage scores.
7. Place theme islands around the draft.

## 16. Theme Generation Heuristics

Theme clustering should consider:

1. overlapping anchor ranges
2. repeated nouns and noun phrases
3. shared entities
4. semantic similarity between explanation and question text
5. shared research intent

Guardrails:

1. prefer fewer, stronger themes over many weak ones
2. cap overview themes at `7`
3. fold low-confidence themes into a catch-all bucket only in generation, not in UI
4. if a theme has only one weak node, merge it unless it has unusually high leverage

## 17. MVP Scope

Recommended MVP:

1. one overview mode
2. one focus mode
3. theme-first clustering
4. support, challenge, question, and source lanes
5. anchor highlighting back into draft
6. no freeform node dragging yet

Do not include in MVP:

1. collaborative multiplayer canvas behavior
2. arbitrary graph editing
3. infinite canvas complexity
4. route-level persistence of custom layout

## 18. Success Metrics

Key product metrics:

1. percentage of timer-complete sessions that open review
2. percentage of review sessions that return to draft and revise
3. average number of nodes opened before revision
4. percentage of surfaced sources clicked
5. percentage of themes edited, merged, or renamed by users

Interpretation:

1. high theme edits can be healthy because they indicate active ownership
2. low source clicks may mean the board is already trustworthy or that provenance is not visible enough

## 19. Open Questions

1. Should the overview cap at `4`, `5`, or `7` themes by default?
2. Should challenge nodes visually dominate support nodes?
3. Should completed review actions persist across future sessions or reset per freewrite?
4. Should theme edits feed back into personalization for future clustering?

## 20. Implementation Recommendation

Build the first version as a derived view-model over the current Gadfly annotation system.

Do not create a second, parallel source of truth for review artifacts.

Recommended next engineering step:

1. add a pure domain mapper such as `buildConstellationBoard(...)`
2. emit `ConstellationBoard` from existing annotation and research state
3. render the overview with fixed layout first
4. add focus mode second

That path keeps the initial implementation testable, incremental, and aligned with the current codebase.
