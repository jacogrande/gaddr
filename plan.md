# Review Report — Tier 3 Polish (+ Tier 1/2 accumulated)

**Date**: 2026-02-17
**Branch**: main (uncommitted)
**Files changed**: 25 modified, 5 new (+487 / -188)

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Tests | PASS | 233 tests, 406 assertions, 43ms |
| Types | PASS | `tsc --noEmit` clean |
| Lint | PASS | ESLint clean (domain purity, boundaries, exhaustive switches) |
| Knip | PASS | No dead code detected |
| Build | PASS | `next build` succeeds, `/u/[id]` route present |

## Change Summary

### Tier 3 Polish (this session)

| # | Feature | Files |
|---|---------|-------|
| 3.1 | Public portfolio page `/u/[id]` | `domain/essay/repository.ts`, `infra/essay/postgres-essay-repository.ts`, `app/u/[id]/page.tsx`, `app/u/[id]/not-found.tsx` |
| 3.2 | Sprint timer | `app/(protected)/editor/[id]/sprint-timer.tsx`, `essay-editor.tsx` |
| 3.3 | Share button (copy link) | `essay-editor.tsx` |
| 3.4 | Root not-found page | `app/not-found.tsx` |
| 3.5 | LLM stream timeout (60s) | `app/api/review/route.ts` |
| 3.6 | Better save failure UX | `essay-editor.tsx` |
| 3.7 | Dev kit route guard | `middleware.ts` |
| 3.8 | Dead code cleanup | `domain/essay/schemas.ts`, `editor/[id]/use-evidence-links.ts`, `editor/actions.ts` |
| 3.9 | User deletion cascade | `infra/db/schema.ts`, `drizzle/0001_outstanding_titanium_man.sql` |

### Tier 1/2 (prior sessions, uncommitted)

Sign-in hardening, dashboard delete button, publish title guard, editor save queue refactor, review persistence (sessionStorage), Sentry observability, error boundaries, E2E auth setup fixes, error reporting on all failure paths.

## Code Review Findings

### Critical

None.

### High Priority

None.

### Medium Priority

**1. Save error string coupling** (`essay-editor.tsx:358`)

The save label checks `saveError === "Can only update essays in draft status"` as a literal string match against the message returned from `updateErrorMessage()` in `actions.ts`. If that message changes, the user-facing explanation silently degrades to showing the raw error. A shared constant or error code would be more robust, but the coupling is contained to two files in the same feature directory.

**2. Portfolio page bypasses repository port** (`app/u/[id]/page.tsx:17-24`)

The `getUser()` function queries the `user` table directly via Drizzle rather than going through a domain port. This is pragmatic — there's no user repository port and this is a single read-only query for a public page — but it sets a precedent for bypassing the port/adapter pattern. If more user queries appear, extract to a proper port.

### Low Priority

**3. Sprint timer hydration flash** (`sprint-timer.tsx:23-34`)

`useState(DEFAULT_DURATION)` initializes to 600s, then `useEffect` reads localStorage and overwrites. Users with a custom duration see a brief flash of "10:00" before their stored value loads. The standard `useState(() => getStoredDuration())` pattern won't work here because `typeof window === "undefined"` during SSR. The current approach is correct for Next.js — just a cosmetic flash on first render.

**4. `clipboard.writeText` failure handling** (`essay-editor.tsx:495`)

`navigator.clipboard.writeText()` can fail (e.g., in non-secure contexts or when permissions are denied). The `.then()` only handles success. A `.catch()` would prevent an unhandled promise rejection, though in practice the `void` prefix suppresses the lint warning and modern browsers grant clipboard permission in response to user clicks.

## Positive Observations

- **Domain purity maintained**: New `listPublishedByUser` port follows existing patterns — `Result` return type, domain types only, no implementation leakage
- **Consistent styling**: All three not-found pages (root, essay, portfolio) use identical brand styling (`#FAFAF8`, `animate-fade-up`, stone-900 serif heading, rounded-full CTA)
- **Sprint timer is self-contained**: No global state, localStorage for persistence, proper interval cleanup on unmount
- **Migration is clean**: All 6 user FK constraints correctly dropped and re-added with CASCADE, no data-modifying statements
- **Dead code fully traced**: Removed `CreateEssayInputSchema`, `refresh` function, and `listEssayEvidenceAction` — knip confirms no orphans
- **LLM timeout is defensive**: Deadline pattern is checked between stream events, Sentry-reported, and emits a user-facing error SSE event
- **Kit route guard is minimal**: Single `process.env.NODE_ENV` check in middleware, rewrites to `/_not-found` for proper 404 treatment

## Verdict: PASS

All automated checks pass. No critical or high-priority issues. The two medium findings (string coupling, direct Drizzle query) are pragmatic trade-offs documented for future awareness.

### Next Steps

1. Commit all three tiers of changes
2. Apply the migration (`drizzle/0001_outstanding_titanium_man.sql`) to staging, verify FK constraints, then production
3. Manual verification: visit `/nonexistent`, `/kit` (prod build), editor sprint timer, copy link, save failure scenarios, `/u/[userId]`
