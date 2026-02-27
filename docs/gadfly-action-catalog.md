# Gadfly Action Catalog

## 1. Purpose

Define the full Gadfly action surface area with clear behavior contracts:

1. What each action does.
2. When it should be used.
3. How it should appear in UX without becoming intrusive.

This document extends the Phase 1 action model (`annotate`, `clear`) into a comprehensive roadmap.

## 2. Core Product Constraints

All actions in this catalog must preserve these invariants:

1. Gadfly never writes user prose.
2. Gadfly feedback is contextual, compact, and optional to engage with.
3. Typing performance is never blocked by action handling.
4. Every action is auditable in debug logs.

## 3. Status Legend

1. `Implemented`: exists today in code.
2. `Planned`: approved direction for next phases.
3. `Future`: not yet prioritized, but part of long-term action model.

## 4. Anthropic-Aligned Tool Strategy

To match Anthropic agentic best practices, Gadfly should keep a compact tool surface:

1. Prefer a small number of well-scoped tools.
2. Use `action` enums for related operations.
3. Split tools only when permissions, payload shape, or lifecycle differ substantially.
4. Keep simultaneously loaded tools low (single digits for MVP).

Target steady-state for Gadfly:

1. 4-6 total tools.
2. 1-3 high-frequency tools loaded by default.
3. Optional tool discovery/loading for advanced tool families.

## 5. UX Primitives

All actions should compose from a small set of UI primitives:

1. Inline highlights.
2. Hover cards with Socratic feedback.
3. Lightweight status chips/badges (non-modal).
4. Optional command/slash actions for power users.
5. Dev debug pane for traceability.

No action in this catalog requires a chat interface.

## 6. Action Catalog

### 6.1 `annotate` (`Implemented`)

What it does: Adds an annotation anchored to a text span.

Use cases:

1. Flag sentence clarity issues.
2. Call out weak logic transitions.
3. Surface unsupported claims.

UX:

1. Underline/highlight appears inline.
2. Hover card shows diagnosis, rule, and Socratic question.
3. Severity affects visual emphasis but does not block typing.

### 6.2 `clear` (`Implemented`)

What it does: Removes one annotation by id.

Use cases:

1. Issue no longer applies after edit.
2. Model retracts earlier feedback.
3. Cleanup of stale annotations.

UX:

1. Highlight disappears with quick fade.
2. No toast by default.
3. Debug pane records removal reason.

### 6.3 `clear_in_range` (`Planned`)

What it does: Removes annotations whose anchors overlap a provided range.

Use cases:

1. Large paragraph rewrite invalidates old guidance.
2. Pasted replacement content shifts local context.
3. Bulk cleanup after section rewrite.

UX:

1. Affected highlights fade out together.
2. Optional subtle "updated feedback" hint near caret.
3. No modal interruption.

### 6.4 `clear_by_category` (`Planned`)

What it does: Clears annotations for a category (for example, `tone`).

Use cases:

1. User temporarily wants to focus only on logic.
2. Auto-policy suppresses noisy category output.
3. Session-level feedback reset.

UX:

1. Category chip toggles off and related highlights disappear.
2. Filter state remains visible in a tiny status control.
3. Easily reversible.

### 6.5 `update_annotation` (`Planned`)

What it does: Updates an existing annotation’s anchor or metadata.

Use cases:

1. Re-anchor after text movement.
2. Refine explanation wording without creating duplicate notes.
3. Change rule/question as context improves.

UX:

1. Existing highlight updates in place.
2. Hover card content refreshes without flicker.
3. No duplicate cards for same issue.

### 6.6 `set_severity` (`Planned`)

What it does: Changes severity level of an annotation.

Use cases:

1. Escalate unresolved high-impact issue.
2. De-escalate after partial improvement.
3. Normalize severity across an entire section.

UX:

1. Highlight color/intensity changes smoothly.
2. Severity badge updates in hover card.
3. No intrusive warning sounds or banners.

### 6.7 `set_status` (`Planned`)

What it does: Sets annotation lifecycle status (`active`, `acknowledged`, `resolved`, `dismissed`, `snoozed`).

Use cases:

1. Track whether user has seen an issue.
2. Hide dismissed suggestions.
3. Preserve resolved history for analytics.

UX:

1. Status icon appears subtly in card header.
2. Resolved/dismissed items fade from main canvas.
3. Optional compact "show resolved" filter.

### 6.8 `snooze_until` (`Planned`)

What it does: Temporarily hides an annotation until a condition or time.

Use cases:

1. User postpones low-priority cleanup.
2. Avoid repetitive prompts during drafting burst.
3. Resume feedback before final review.

UX:

1. Snoozed highlight disappears immediately.
2. Small "snoozed" counter appears in status area.
3. Returns automatically when condition is met.

### 6.9 `unsnooze` (`Planned`)

What it does: Reactivates a snoozed annotation.

Use cases:

1. User enters revision phase.
2. Draft reaches checkpoint where feedback is useful again.
3. Manual restore from filters.

UX:

1. Highlight reappears with soft fade-in.
2. No blocking dialog.
3. Restored item is briefly accent-marked to aid discovery.

### 6.10 `pin_annotation` (`Future`)

What it does: Pins an annotation as high-salience guidance.

Use cases:

1. Persistent writing habit to improve.
2. Critical thesis issue user wants visible.
3. Editorial checklist item.

UX:

1. Pinned badge in card and optional top stack.
2. Stays visible across local edits.
3. Limited count to avoid clutter.

### 6.11 `unpin_annotation` (`Future`)

What it does: Removes pinned state.

Use cases:

1. Issue resolved.
2. User no longer wants persistent reminder.
3. Pin budget exceeded.

UX:

1. Badge disappears.
2. Annotation returns to normal lifecycle rules.
3. No extra confirmation needed.

### 6.12 `link_annotations` (`Future`)

What it does: Creates relationship links between multiple annotations.

Use cases:

1. One root cause driving several local issues.
2. Grouped revisions for a paragraph cluster.
3. Pattern tracking (for example, repeated hedging).

UX:

1. Related items show "linked" indicator.
2. Hovering one can lightly glow linked siblings.
3. Relationship view remains optional.

### 6.13 `ask_followup_question` (`Planned`)

What it does: Adds one deeper Socratic question tied to an annotation.

Use cases:

1. User requests more depth without rewriting.
2. Clarify why a logic issue matters.
3. Encourage self-correction.

UX:

1. Additional question appears in expandable section of hover card.
2. Hidden by default to keep cards compact.
3. Never includes replacement sentences.

### 6.14 `add_counterpoint_prompt` (`Planned`)

What it does: Adds a prompt to consider an opposing view.

Use cases:

1. One-sided argumentation.
2. Weak anticipatory rebuttal.
3. Opinion-heavy drafts needing balance.

UX:

1. Counterpoint prompt appears as a labeled card row.
2. Clicking focuses relevant sentence/paragraph.
3. Optional "explore later" action snoozes prompt.

### 6.15 `add_evidence_prompt` (`Planned`)

What it does: Requests evidence or support for a claim.

Use cases:

1. Claim without citation.
2. Anecdotal reasoning lacking proof.
3. Generalization that needs grounding.

UX:

1. Evidence badge appears on affected span.
2. Hover card asks what evidence type is missing.
3. May deep-link to research workflow later.

### 6.16 `add_structure_prompt` (`Planned`)

What it does: Prompts for macro/micro structure improvement.

Use cases:

1. Missing topic sentence.
2. Abrupt paragraph transitions.
3. Weak progression from claim to support.

UX:

1. Prompt anchored to paragraph start.
2. Card includes structural lens (sequence, hierarchy, flow).
3. Minimal visual weight versus high-severity logic issues.

### 6.17 `add_clarity_prompt` (`Planned`)

What it does: Prompts for clarity simplification at sentence level.

Use cases:

1. Overly dense sentence.
2. Ambiguous referent.
3. Unclear causal relationship.

UX:

1. Inline highlight on exact confusing span.
2. Card asks user to restate intent in their own words.
3. No direct rewrite suggestions.

### 6.18 `add_tone_consistency_prompt` (`Planned`)

What it does: Flags tone only when inconsistent with nearby context.

Use cases:

1. Formal paragraph with sudden slang insertion.
2. Narrative voice drift.
3. Professional memo with abrupt casual pivot.

UX:

1. Tone badge appears only on inconsistency events.
2. Card references surrounding tone pattern.
3. Quiet by default to avoid over-policing voice.

### 6.19 `flag_fact_check_needed` (`Future`)

What it does: Marks statements that should be externally verified.

Use cases:

1. Numeric/statistical claim without source.
2. Historical or legal assertion with uncertainty.
3. Time-sensitive factual statement.

UX:

1. Fact-check glyph appears in margin/inline.
2. Card asks what source would validate claim.
3. Can later integrate with research tasks.

### 6.20 `create_research_task` (`Future`)

What it does: Creates a structured research to-do linked to text.

Use cases:

1. Gather supporting data before revision.
2. Investigate counterexamples.
3. Validate citation reliability.

UX:

1. Task appears in lightweight research queue.
2. Linked annotation shows task count.
3. Queue is optional, not a persistent side chat.

### 6.21 `attach_research_result` (`Future`)

What it does: Attaches structured findings to a research task.

Use cases:

1. Summarize findings in bullets.
2. Store source metadata for later use.
3. Close research loop without auto-writing prose.

UX:

1. Result metadata visible in task detail popover.
2. Annotation state can update from pending to informed.
3. Never inserts generated paragraphs into document.

### 6.22 `set_learning_goal` (`Future`)

What it does: Stores a user goal tied to recurring feedback patterns.

Use cases:

1. "Reduce sentence sprawl."
2. "Strengthen evidence in claims."
3. "Maintain consistent analytical tone."

UX:

1. Goal appears as compact ribbon in non-editing chrome.
2. Relevant annotations can reference active goal.
3. Easily dismissed during drafting.

### 6.23 `clear_learning_goal` (`Future`)

What it does: Removes an active learning goal.

Use cases:

1. Goal achieved.
2. User changes writing objective.
3. Temporary sprint complete.

UX:

1. Goal ribbon fades out.
2. Existing annotations remain unless separately cleared.
3. No interruption to typing focus.

### 6.24 `mute_category` (`Planned`)

What it does: Temporarily suppresses a feedback category.

Use cases:

1. Draft mode focused on structure only.
2. Avoid tone feedback in early ideation.
3. Reduce noise for a short writing session.

UX:

1. Category appears muted in filter control.
2. Matching highlights hide immediately.
3. Debug pane records mute origin (user/system).

### 6.25 `unmute_category` (`Planned`)

What it does: Re-enables a muted category.

Use cases:

1. Transition from drafting to revision.
2. Re-enable evidence checks before publish.
3. Recover from accidental mute.

UX:

1. Category chip returns to active state.
2. Relevant annotations repopulate on next analyze pass.
3. Restored feedback appears incrementally, not all at once.

### 6.26 `emit_debug_event` (`Planned`)

What it does: Writes structured diagnostics for action decisions.

Use cases:

1. Explain why an annotation was dropped.
2. Track superseded/filtered action behavior.
3. Monitor token, latency, and policy outcomes.

UX:

1. Visible only in dev debug pane.
2. Structured event rows (action id, reason, timing).
3. Never shown in normal writing UI.

## 7. Tool Families and Action Mapping

To prevent tool sprawl, actions should be grouped into a small number of tools.

### 7.1 `annotation.manage` (primary high-frequency tool)

Actions:

1. `annotate`
2. `clear`
3. `clear_in_range`
4. `clear_by_category`
5. `update_annotation`
6. `set_severity`
7. `set_status`
8. `snooze_until`
9. `unsnooze`
10. `pin_annotation`
11. `unpin_annotation`
12. `link_annotations`

Why grouped: all operate on annotation lifecycle and share similar anchor/id payloads.

### 7.2 `prompt.manage` (Socratic prompt expansion)

Actions:

1. `ask_followup_question`
2. `add_counterpoint_prompt`
3. `add_evidence_prompt`
4. `add_structure_prompt`
5. `add_clarity_prompt`
6. `add_tone_consistency_prompt`

Why grouped: all produce structured prompts tied to an existing anchor or annotation.

### 7.3 `preference.manage` (feedback policy and user goals)

Actions:

1. `mute_category`
2. `unmute_category`
3. `set_learning_goal`
4. `clear_learning_goal`

Why grouped: all affect what feedback appears rather than direct annotation state.

### 7.4 `research.manage` (lower-frequency research workflow)

Actions:

1. `flag_fact_check_needed`
2. `create_research_task`
3. `attach_research_result`

Why grouped: all are research and verification workflow operations with distinct payloads.

### 7.5 `debug.emit` (dev-only)

Actions:

1. `emit_debug_event`

Why isolated: should be gated to non-production UX and internal observability.

## 8. Recommended Implementation Order

Implementation order is now tool-first to keep model choice quality high while capability grows.

### Phase 1: strengthen current core without adding new top-level tools

Tool footprint:

1. `annotation.manage` only.

Actions:

1. `annotate`
2. `clear`
3. `clear_in_range`
4. `update_annotation`
5. `set_severity`
6. `set_status`

Reasoning: delivers most UX value while preserving one dominant tool.

### Phase 2: controlled prompt expansion

Tool footprint:

1. `annotation.manage`
2. `prompt.manage`

Actions added:

1. `ask_followup_question`
2. `add_clarity_prompt`
3. `add_structure_prompt`
4. `add_evidence_prompt`
5. `add_counterpoint_prompt`
6. `add_tone_consistency_prompt`

Reasoning: separates lifecycle operations from coaching prompt generation.

### Phase 3: personalization and noise control

Tool footprint:

1. `annotation.manage`
2. `prompt.manage`
3. `preference.manage`

Actions added:

1. `clear_by_category`
2. `mute_category`
3. `unmute_category`
4. `snooze_until`
5. `unsnooze`
6. `set_learning_goal`
7. `clear_learning_goal`

Reasoning: reduces annoyance and improves long-session usability.

### Phase 4: research extensions

Tool footprint:

1. `annotation.manage`
2. `prompt.manage`
3. `preference.manage`
4. `research.manage`

Actions added:

1. `flag_fact_check_needed`
2. `create_research_task`
3. `attach_research_result`

Reasoning: introduces non-writing side workflows after core coaching quality is stable.

### Phase 5: advanced relationship and telemetry features

Tool footprint:

1. `annotation.manage`
2. `prompt.manage`
3. `preference.manage`
4. `research.manage`
5. `debug.emit` (dev-only)

Actions added:

1. `pin_annotation`
2. `unpin_annotation`
3. `link_annotations`
4. `emit_debug_event`

Reasoning: useful but lower priority than core review quality and signal/noise control.

## 9. Action Contract Guidance (Future Schema)

To keep the system extensible, action types should evolve as a discriminated union with:

1. Stable `type` string.
2. Strict payload schema per action.
3. Optional `reason` metadata for debug traceability.
4. Optional `source` metadata (`model`, `system`, `user`).

This preserves strong validation at the domain boundary and keeps behavior predictable.
