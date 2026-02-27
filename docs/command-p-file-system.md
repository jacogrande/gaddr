# Command+P Note/File System Design

## 1. Purpose

Design a `Cmd/Ctrl+P` note/file system that is optimized for fast recall.
The UI should always expose:

1. `Pinned` notes.
2. `Recent` notes.
3. Fuzzy search results with strong title prioritization.

This is designed for users who capture frequently but do not often revisit old entries through manual browsing.

## 2. Goals

1. Open any note within 2-3 keystrokes in the common case.
2. Make important notes reachable without remembering exact names.
3. Favor title relevance over body matches to reduce noisy results.
4. Keep interaction latency below human perception thresholds.

## 3. Non-Goals

1. Replacing full library or archive views.
2. Building a full filesystem tree browser inside the palette.
3. Complex boolean query syntax in V1.

## 4. UX Principles

1. Recall beats hierarchy: users should not need to remember folder paths.
2. Stable top-of-list behavior: pinned and very recent notes should feel predictable.
3. Keyboard-first with zero-friction mouse fallback.
4. No typing lag introduced by search/ranking work.

## 5. Information Architecture

### 5.1 Empty Query State

When the user opens `Cmd/Ctrl+P` with no query:

1. Show `Pinned` section first.
2. Show `Recent` section second.
3. Show lightweight hint row: "Type to search titles, then content."

Section caps:

1. Pinned: up to 8.
2. Recent: up to 12.

### 5.2 Query State

When query is non-empty:

1. Replace sectioned view with a single ranked result list.
2. Highlight matched characters in title first, then subtitle metadata.
3. Show tiny badges on result rows:
   - `Pinned`
   - `Recent`

### 5.3 Result Row Anatomy

Each row shows:

1. Title (primary, larger weight visually and in ranking).
2. Secondary line (last edited date, short path/space, first body snippet).
3. Optional pin indicator.

## 6. Interaction Model

### 6.1 Open and Close

1. `Cmd/Ctrl+P` opens palette.
2. `Esc` closes palette and returns focus to editor.

### 6.2 Navigation

1. `ArrowDown` moves selection down.
2. `ArrowUp` moves selection up.
3. `Enter` opens selected note.
4. `Tab` autocomplete behavior:
   - If query exists, replace query with selected title.
   - If no query, move focus to first row.

### 6.3 Quick Actions

1. `Cmd/Ctrl+Enter`: open in new tab.
2. `Alt+P`: toggle pin on selected note.
3. `Backspace` on empty query does nothing (no accidental close).

## 7. Ranking Design (Title-Priority Fuzzy Search)

### 7.1 Candidate Retrieval

1. Pull active user's notes only.
2. Query-time candidate cap: 150 items.
3. Candidate order before scoring:
   - Pinned first
   - Updated recently second

### 7.2 Scoring Components

Use additive scoring.

| Signal | Range | Notes |
| --- | ---: | --- |
| Exact title match | +1200 | Case-insensitive exact |
| Title prefix match | +900 | Query starts at title start |
| Title token prefix | +700 | Query matches word start in title |
| Title fuzzy score | +0 to +600 | Subsequence match with adjacency bonus |
| Alias/tag fuzzy | +0 to +220 | Optional metadata |
| Body snippet fuzzy | +0 to +160 | Lower weight than title |
| Pinned boost | +140 | Ensures pinned stability |
| Recent boost | +0 to +120 | Decays with time since open |

Tie-breakers:

1. Higher title fuzzy score wins.
2. More recently opened wins.
3. More recently updated wins.
4. Stable lexical fallback by title.

### 7.3 Fuzzy Match Rules

1. Case-insensitive.
2. Subsequence matching.
3. Adjacency bonus for consecutive matched chars.
4. Word-start bonus in title tokens.
5. Penalty for long gaps in title.
6. Penalty when match only exists in body and not title.

### 7.4 Example Pseudocode

```ts
function scoreNote(note: CommandIndexNote, query: string): number {
  const q = normalize(query);
  if (!q) return note.pinned ? 140 : 0;

  let score = 0;

  score += exactTitle(note.title, q) ? 1200 : 0;
  score += prefixTitle(note.title, q) ? 900 : 0;
  score += tokenPrefixTitle(note.title, q) ? 700 : 0;
  score += fuzzyTitle(note.title, q) * 600;
  score += fuzzyAlias(note.aliases, q) * 220;
  score += fuzzyBody(note.preview, q) * 160;
  score += note.pinned ? 140 : 0;
  score += recencyBoost(note.lastOpenedAt, now());

  return score;
}
```

## 8. Data Contract

```ts
type CommandIndexNote = {
  id: string;
  title: string;
  preview: string;
  pinned: boolean;
  lastOpenedAt: string | null;
  updatedAt: string;
  aliases: string[];
};
```

Required indexes:

1. `(user_id, pinned, last_opened_at desc)`
2. `(user_id, updated_at desc)`
3. Full-text or trigram support for title/body fuzzy candidate retrieval.

## 9. Architecture Placement (Hexagonal)

1. Domain:
   - Pure ranking/scoring functions.
   - Query normalization and fuzzy matching logic.
2. Infra:
   - Repository method returning candidate notes for a user.
   - DB indexing and retrieval strategy.
3. App:
   - Palette UI state, keyboard handling, rendering.
   - Calls infra-backed route/action for candidate data.

## 10. Performance Budgets

1. Palette open to first paint: under 80 ms.
2. Query update to ranked repaint (150 candidates): under 16 ms target, under 30 ms max.
3. No blocking operations on keydown path.

Implementation guardrails:

1. Memoized ranking for repeated query prefixes.
2. Preload pinned + recent snapshot on session load.
3. Optional `requestIdleCallback` refresh of warm cache.

## 11. Accessibility

1. Dialog semantics with focus trap.
2. `aria-activedescendant` for list navigation.
3. Clear selected row contrast on warm palette theme.
4. Screen-reader labels for pinned/recent badges.

## 12. Instrumentation

Track:

1. `cmdp_opened`
2. `cmdp_query_changed` (query length only, not raw text)
3. `cmdp_result_opened` (rank index, source bucket)
4. `cmdp_pin_toggled`
5. `cmdp_latency_ms` (open + query interaction)

Success metrics:

1. Median open-to-note time under 4 seconds.
2. 80%+ opens from top 5 results.
3. Increased repeat opens from pinned set for heavy users.

## 13. Acceptance Criteria

1. Empty query shows pinned then recent sections.
2. Typing instantly switches to ranked fuzzy results.
3. Title matches consistently rank above body-only matches.
4. Keyboard-only flow works end-to-end.
5. Unit tests cover ranking rules and tie-breakers.
6. E2E tests cover open, search, select, and pin toggle.

## 14. Rollout Plan

1. Phase 1:
   - Read-only `Pinned + Recent + title-priority fuzzy search`.
2. Phase 2:
   - Pin toggle in palette and telemetry.
3. Phase 3:
   - Advanced recall helpers (aliases, resurfaced suggestions).
