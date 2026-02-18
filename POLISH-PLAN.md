# Polish Plan

Ship-readiness checklist derived from a full MVP audit. Organized into tiers by blast radius and urgency.

---

## Tier 1 — Ship-Blocking

These are correctness, security, or data-integrity issues. Fix before any public traffic.

### 1.1 Security Headers

**Problem:** `next.config.ts` has an empty config object. No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy. Clickjacking, MIME sniffing, and reflected XSS are unmitigated at the app layer.

**Fix:** Add a `headers()` function to `next.config.ts` returning security headers for all routes. Start with:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://*.sentry.io; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Tune the CSP after verifying no breakage with Sentry, OAuth redirects, and font loading.

**Files:** `next.config.ts`

---

### 1.2 Missing Database Indexes

**Problem:** `essay.user_id`, `evidence_card.user_id`, `claim_evidence_link.essay_id`, and `claim_evidence_link.evidence_card_id` have no indexes. Every `listByUser` and `findLinksByEssay` query does a sequential scan.

**Fix:** Add index definitions to `src/infra/db/schema.ts`:

- `essay`: index on `userId`
- `evidenceCard`: index on `userId`
- `claimEvidenceLink`: index on `essayId`, index on `evidenceCardId`

Also consider indexes on `session.userId` and `account.userId` for Better Auth lookup performance.

**Files:** `src/infra/db/schema.ts`

---

### 1.3 Migration Baseline

**Problem:** The `./drizzle/` directory doesn't exist. Schema has been deployed via `db:push` with no SQL migration trail. Future schema changes have no rollback path and no audit history.

**Fix:** Run `bun run db:generate` to create an initial migration snapshot. Commit the `./drizzle/` directory. From this point forward, use `db:migrate` for production deployments instead of `db:push`.

**Files:** `drizzle.config.ts`, new `drizzle/` directory

---

### 1.4 Sentry Environment Tag

**Problem:** No `environment` tag in any Sentry config. All events land in a single unnamed bucket — impossible to filter production vs. preview vs. local.

**Fix:** Add to all three Sentry configs:

```ts
environment: process.env.VERCEL_ENV ?? "development"
```

Also enable Sentry on preview deployments:

```ts
enabled: process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview"
```

**Files:** `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`

---

### 1.5 Silent Error in `createDraftAction`

**Problem:** When `repo.save(essay)` fails in `createDraftAction`, the action redirects to `/dashboard?error=create-failed` without calling `reportError()`. Database failures creating essays are invisible in Sentry.

**Fix:** Add `reportError(saved.error, { action: "createDraft", userId: session.userId })` before the redirect.

**Files:** `src/app/(protected)/editor/actions.ts` (~line 44)

---

### 1.6 E2E Test Parallelism Bug

**Problem:** `write-and-publish.spec.ts` uses `test.describe()` without `.serial`. With `fullyParallel: true`, tests sharing `essayId` via closure can run out of order. The `test.skip(!essayId)` guards silently pass, so 6 of 9 tests can become no-ops in CI without any failure signal.

**Fix:** Change `test.describe(` to `test.describe.serial(` in `write-and-publish.spec.ts`, matching the pattern already used in `evidence.spec.ts`, `coach-review.spec.ts`, and `revision.spec.ts`.

**Files:** `test/e2e/write-and-publish.spec.ts` (line 3)

---

## Tier 2 — Should Fix Before Launch

Functional gaps or reliability issues that degrade the user experience or operational confidence.

### 2.1 Essay Deletion

**Problem:** No way to delete an essay. Users with abandoned drafts have no cleanup path.

**Fix:** Add `deleteEssayAction(id)` to editor actions. Domain function should validate ownership and status (consider whether published essays can be deleted or must be unpublished first). Add a delete button with confirmation dialog to the dashboard card or editor toolbar.

**Files:** `src/domain/essay/operations.ts`, `src/app/(protected)/editor/actions.ts`, dashboard or editor UI

---

### 2.2 Persist Coach Feedback

**Problem:** AI coaching feedback is lost on page reload. The product's core loop is "get feedback, revise, get feedback again" — but the feedback side of that loop is ephemeral.

**Fix (minimum viable):** Store the last review result in `sessionStorage` keyed by essay ID, so feedback survives page reloads within a session. Re-hydrate the feedback panel on editor mount.

**Fix (full):** Add a `coach_review` table (essay_id, version_number, events JSONB, created_at). Persist the full review event stream on completion. Show historical reviews in the version history panel.

**Files:** `src/infra/db/schema.ts` (if full), `src/app/(protected)/editor/[id]/feedback-panel.tsx`, `src/app/(protected)/editor/[id]/essay-editor.tsx`

---

### 2.3 Save Promise Race Condition

**Problem:** In `essay-editor.tsx`, `savePromiseRef.current` is overwritten on each `save()` call. If autosave fires while a manual save is in-flight, `flushPending()` before publish awaits only the latest promise. Possible to publish stale content.

**Fix:** Track all in-flight save promises (e.g., a `Set<Promise>` or a monotonic counter) and have `flushPending` await all of them. Alternatively, serialize all saves through a single async queue that guarantees ordering.

**Files:** `src/app/(protected)/editor/[id]/essay-editor.tsx` (~lines 98-141)

---

### 2.4 Health Check Endpoint

**Problem:** No `/api/health` route. Railway can't verify the app is running after deploy. No way to probe DB connectivity without a real user request.

**Fix:** Add a minimal `GET /api/health` route that returns 200 with a timestamp. Optionally ping the DB with `SELECT 1` and report the latency.

**Files:** New `src/app/api/health/route.ts`

---

### 2.5 Validate Title Before Publish

**Problem:** `publishEssay` only checks `wordCount > 0`. An essay with an empty title can be published, rendering an empty `<h1>` on the public page.

**Fix:** Add a title check to `publishEssay` in `domain/essay/operations.ts`. Return a `ValidationError` if `title.trim().length === 0`. Update the publish button in the editor to disable when title is empty.

**Files:** `src/domain/essay/operations.ts`, `src/app/(protected)/editor/[id]/essay-editor.tsx`

---

### 2.6 Unreported DB Errors in Actions

**Problem:** Several server actions return generic error strings to the client on DB read failures without calling `reportError`. Inconsistent with the pattern used elsewhere.

**Fix:** Add `reportError()` calls to:
- `updateEvidenceCardAction` findById failure (`library/actions.ts` ~line 101)
- `attachEvidenceAction` essay ownership check (`editor/actions.ts` ~line 246)
- `attachEvidenceAction` evidence card ownership check (`editor/actions.ts` ~line 255)

Consider widening the `ErrorContext` type in `report-error.ts` to accept `evidenceCardId`.

**Files:** `src/app/(protected)/library/actions.ts`, `src/app/(protected)/editor/actions.ts`, `src/infra/observability/report-error.ts`

---

### 2.7 GitHub OAuth

**Problem:** CLAUDE.md specifies "Google + GitHub" OAuth. Only Google is configured.

**Fix:** Add `github` to the `socialProviders` block in `src/infra/auth/auth.ts`. Add a GitHub sign-in button to the sign-in page. Requires `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` env vars.

**Files:** `src/infra/auth/auth.ts`, `src/app/(auth)/sign-in/page.tsx`, Vercel/Railway env vars

---

### 2.8 Unit Tests for Untested Domain Logic

**Problem:** Three domain modules have zero test coverage:
- `formatting.ts` — `relativeTime`, `formatPublishedDate`, `pluralize` (6+ branches)
- `types/url.ts` — `isSafeUrl` (security gate, regex edge cases)
- `publish-pipeline.ts` — `preparePublishWithVersion` (composition of publish + version snapshot)

**Fix:** Add test files:
- `test/unit/essay/formatting.test.ts` — boundary cases for time diffs, timezone neutrality, pluralization
- `test/unit/types/url.test.ts` — valid URLs, `javascript:`, `ftp://`, empty string, uppercase protocol
- `test/unit/essay/publish-pipeline.test.ts` — happy path, failed publish propagation, version number forwarding

**Files:** New test files in `test/unit/`

---

### 2.9 Contract Test Script

**Problem:** `bun test` and `bun run test` only run `test/unit/`. Contract tests at `test/contract/` are silently excluded. No `test:contract` script exists despite CLAUDE.md documenting a "nightly schedule."

**Fix:** Add to `package.json` scripts:

```json
"test:contract": "bun test test/contract/",
"test:all": "bun test test/unit/ test/contract/"
```

**Files:** `package.json`

---

## Tier 3 — Polish

User-facing quality and completeness improvements. Not blockers, but they round out the product.

### 3.1 Public Portfolio Page

Add a `/u/[userId]` (or `/u/[slug]`) page listing all published essays by a user. Shows essay titles, publish dates, word counts. This makes the "thinking portfolio" from the product philosophy real.

**Files:** New `src/app/u/[id]/page.tsx`, new domain query for listing published essays by user (public)

---

### 3.2 Sprint Timer

Add an optional countdown timer to the editor (10-minute default). Visual indicator that counts down. No hard enforcement — when it hits zero, show a gentle nudge to wrap up, not a block. Store timer preference in localStorage.

**Files:** New component in `src/app/(protected)/editor/[id]/`

---

### 3.3 Share Button

Add a "Copy link" button next to the "View public page" link on published essays. Copies the `/essay/[id]` URL to clipboard with a brief toast confirmation.

**Files:** `src/app/(protected)/editor/[id]/essay-editor.tsx`

---

### 3.4 Root Not-Found Page

Add a branded `src/app/not-found.tsx` so unknown routes show a styled 404 instead of the Next.js default.

**Files:** New `src/app/not-found.tsx`

---

### 3.5 LLM Stream Timeout

Add an `AbortController` with a 60-second timeout to the review stream in `api/review/route.ts`. If the LLM hangs, abort the stream, report to Sentry, and send a terminal error event to the client.

**Files:** `src/app/api/review/route.ts`

---

### 3.6 Better Save Failure UX

When `updateDraft` returns `NotDraft` (e.g., essay was published in another tab), surface the reason to the user instead of showing "Unsaved changes" permanently. Show a toast or banner: "This essay has been published. Unpublish to continue editing."

**Files:** `src/app/(protected)/editor/[id]/essay-editor.tsx`

---

### 3.7 Dev Kit Route Guard

The `/kit/*` design sandbox pages are publicly accessible in production. Either:
- Gate them behind `NODE_ENV === "development"` in middleware, or
- Accept them as a public design showcase and document the decision

**Files:** `src/middleware.ts` or documentation

---

### 3.8 Clean Up Dead Code

| Item | Action |
|---|---|
| `CreateEssayInputSchema` (empty `z.object({})`, never imported) | Delete from `domain/essay/schemas.ts` |
| `refresh` function in `useEvidenceLinks` (returned but never called) | Remove from return object, or wire up the intended refresh-on-reopen behavior |

**Files:** `src/domain/essay/schemas.ts`, `src/app/(protected)/editor/[id]/use-evidence-links.ts`

---

### 3.9 User Deletion Cascade

Add `ON DELETE CASCADE` to all user-referencing FKs (`session`, `account`, `essay`, `evidenceCard`, `claimEvidenceLink`). Required for GDPR right-to-erasure if user account deletion is ever added.

**Files:** `src/infra/db/schema.ts`

---

## Out of Scope (Confirmed Not-MVP)

These were evaluated and confirmed as intentionally deferred:

- Peer feedback / objections / argument maps
- Clubs / cohorts / community features
- Daily prompts / prompt tracks
- Streaks and XP gamification
- Pro subscription / billing
- Export (PDF, Markdown)
- Rate limiting / quota tracking
- Multi-browser E2E (Firefox, Safari)
- Read replicas / multi-region DB
