# MVP Cycle Plan

Break the MVP into small sprints, each ending with a manually testable deliverable. Follows the architecture's mandatory feature workflow: domain types/tests first, then infra, then app shell.

**Scope:** Phase 1 from the business model — prove retention with a working write-review-publish loop.

**Sprint cadence:** ~1 week each. Ship what's done, carry what's not.

---

## Sprint 0: Infrastructure Setup [OPEN]

Provisioning, deployment pipeline, database connection, and any remaining tooling. Details TBD — leaving this open for additional infra decisions.

Expected items:
- Next.js App Router bootstrapped and deploying to Vercel
- Railway Postgres provisioned, `DATABASE_URL` wired to Vercel env vars
- Drizzle ORM installed + configured (client, migration scripts)
- Sentry installed (server + client)
- CI: `bun run check` passing in GitHub Actions
- Local dev: `bun run dev` boots cleanly

**Testable:** `bun run dev` serves a page. Vercel preview deployment works on push. Database connects.

---

## Sprint 1: Auth + Protected Shell

Get users into the app. Everything behind auth from the start.

### Domain
- `Result<T, E>` type with `ok()`, `err()`, `pipe`, `flatMap`
- Branded types: `UserId`, `EssayId`
- Domain error union: `NotFoundError`, `UnauthorizedError`, `ValidationError`, `PersistenceError`

### Infra
- Better Auth config: Google + GitHub OAuth providers
- DB-backed sessions in Railway Postgres (Better Auth tables via CLI migrate)
- `requireSession()` helper: extracts session, returns `Result<Session, AuthError>`

### App
- Auth API route (`/api/auth/[...all]`)
- Next.js middleware protecting `/(protected)/*` routes
- Sign-in page with OAuth buttons
- Protected layout with user info + sign-out
- Dashboard stub page (placeholder — just "Welcome, {name}")

### Tests
- Unit: `Result` utilities (pipe, flatMap, mapError with ok/error values)
- Unit: branded type constructors (valid inputs succeed, invalid return errors)

### Testable
Sign in with Google or GitHub. Land on a protected dashboard showing your name. Sign out. Try accessing `/editor` while signed out — redirected to sign-in.

---

## Sprint 2: Essay CRUD + Draft Editor

The core writing surface. Create, save, and list drafts.

### Domain
- Full `Essay` type: id, userId, title, content, status, timestamps
- State machine: `createDraft()` smart constructor
- `updateDraft()`: validates title/content, returns `Result`
- Zod schemas: `CreateEssayInput`, `UpdateEssayInput`
- `EssayRepository` port interface (`save`, `findById`, `listByUser`)

### Tests
- Unit: `createDraft()` produces valid draft with correct defaults
- Unit: `updateDraft()` rejects empty content when title is set, handles word count edge cases
- Unit: Zod schema validation (missing fields, overflow, edge cases)

### Infra
- Drizzle `essays` table: id (UUID), user_id, title, content, status, created_at, updated_at, published_at
- Migration script
- `PostgresEssayRepository` implementing the port

### App
- `/editor` page: textarea + title input, auto-save or explicit save button
- `/editor/[id]` page: load existing draft for editing
- `createDraft` Server Action
- `updateDraft` Server Action
- `/dashboard` (or `/essays`): list user's essays with status badges, link to edit

### Testable
Sign in. Click "New Essay." Type a title and some content. Save. Navigate to your essay list. See the draft listed. Click it to resume editing. Changes persist.

---

## Sprint 3: Publish Flow + Public Pages

Close the loop: drafts become readable public pages.

### Domain
- `publishEssay()`: draft with non-empty content -> published, sets `publishedAt`
- `unpublishEssay()`: published -> draft
- Validation: cannot publish empty content, cannot publish already-published essay
- `PublishError` variants: `empty_content`, `already_published`, `not_found`

### Tests
- Unit: publish succeeds with valid content, fails on empty
- Unit: unpublish succeeds from published, fails from draft
- Unit: state transition returns correct error variants

### Infra
- `publish` / `unpublish` repository methods (update status + timestamps)
- `findPublishedById()` method (no auth required, returns `Result`)

### App
- "Publish" button in editor (disabled if content empty)
- "Unpublish" button for published essays
- Status indicator in editor (Draft / Published)
- `/essay/[id]` public page: SSR, renders title + content + published date
- Public page returns 404 for drafts or missing essays

### Testable
Write a draft. Click "Publish." See status change to "Published." Open the public URL in an incognito window. Read the essay. Go back and unpublish. Incognito refresh shows 404.

---

## Sprint 4: Coach Review MVP

The product's core differentiator. LLM coaching with no-ghostwriting enforcement.

### Domain
- `CoachReview` type: inline comments, issue list, rubric scores
- `InlineComment`: anchor, problem, why, question, suggestedAction
- `ReviewIssue`: tag, severity, description, suggestedAction
- `ReviewRequest` / `ReviewResponse` Zod schemas
- `enforceAuthorshipConstraint()`: pure function that rejects responses containing replacement prose fields
- `ReviewPipeline`: `validateInput -> checkOwnership -> callLlm -> enforceConstraint -> structureResult`
- `ReviewPort` interface (what the LLM adapter must provide)
- `ReviewError` union: `llm_timeout`, `ghostwriting_detected`, `validation_failed`, `unauthorized`

### Tests
- Unit: `enforceAuthorshipConstraint` accepts valid coaching artifacts
- Unit: `enforceAuthorshipConstraint` rejects responses with replacement prose
- Unit: `ReviewResponse` schema validates correct structure, rejects malformed
- Unit: pipeline steps individually with synthetic data
- Unit: composed pipeline with known inputs -> expected outputs

### Infra
- LLM client (Anthropic SDK)
- Prompt template for coach review (system prompt enforcing no-ghostwriting, structured JSON output)
- `LlmReviewAdapter` implementing `ReviewPort`
- Zod parsing of LLM response with fallback on parse failure

### App
- `POST /api/review` route handler
- "Get Feedback" button in editor
- Feedback panel: renders inline comments alongside essay text
- Issue list display (severity badges, suggested actions)
- Loading state while review is in progress
- Error handling: timeout -> show message, validation failure -> show message

### Testable
Write a 200+ word essay. Click "Get Feedback." Wait for LLM response. See inline comments pinned to parts of your essay. See an issue list with priorities. Verify no "here's a rewritten version" appears anywhere.

---

## Sprint 5: Evidence Cards

Build the evidence library and claim-evidence linking.

### Domain
- `EvidenceCard` type: id, userId, sourceUrl, sourceTitle, quoteSnippet, userSummary, caveats, stance (supports/complicates/contradicts), claimConnections
- Smart constructor with validation (must have source, must have quote or summary)
- `EvidenceCardRepository` port
- Zod schemas: `CreateEvidenceCardInput`, `UpdateEvidenceCardInput`
- `checkCitationMismatches()`: takes essay claims + attached evidence, returns mismatch list
- `ClaimEvidenceLink` type

### Tests
- Unit: evidence card constructor validates required fields
- Unit: stance enum enforced
- Unit: citation mismatch detection (unsupported claims flagged, matched claims pass)
- Unit: Zod schema edge cases

### Infra
- `evidence_cards` table + migration
- `claim_evidence_links` table + migration
- `PostgresEvidenceRepository` implementing the port

### App
- `/library` page: list all user's evidence cards, create new, edit, delete
- Evidence card form: source URL, title, quote, summary, caveats, stance selector
- In editor: "Attach Evidence" flow — select from library, link to a claim/paragraph
- Show attached evidence indicators in editor
- Citation mismatch warnings displayed in editor

### Testable
Create an evidence card in the library (paste a URL, add a quote). Open an essay. Attach the evidence card to a paragraph. See the attachment indicator. Remove it. See the citation warning if a claim has no evidence.

---

## Sprint 6: Evidence on Public Pages

Make the published essay credible and shareable with visible evidence.

### Domain
- Published essay view model: essay + ordered evidence cards per claim
- Evidence display logic (which cards to show, ordering)

### App
- Public essay page: expandable evidence cards under each supported claim
- Evidence card render: source link, quote, stance badge, caveats
- Collapsed by default, expand on click
- Share-friendly metadata (og:title, og:description)

### Testable
Publish an essay with attached evidence. Open the public URL. See evidence cards collapsed under claims. Click to expand — see source, quote, stance. Share the URL — preview shows title and description.

---

## Sprint 7: Version History + Revision

Revision is the product's learning mechanism. Make it visible.

### Domain
- `EssayVersion` type: id, essayId, versionNumber, title, content, publishedAt
- `createVersionSnapshot()`: captures current state before overwrite
- `diffVersions()`: pure function, takes two versions, returns structured changes (added/removed/modified sections)

### Tests
- Unit: version snapshot captures all fields
- Unit: diff logic (identical = no changes, additions, deletions, modifications)

### Infra
- `essay_versions` table + migration (immutable rows)
- Snapshot creation on each publish
- `listVersions()` repository method

### App
- Version history panel in editor (list of versions with dates)
- Click a version to view it (read-only)
- Diff view: highlight what changed between versions
- Badge on published page: "Revised N times"

### Testable
Publish an essay. Edit and republish. Open version history. See both versions listed. Click the old version — see the original. View the diff — changes highlighted. Public page shows "Revised 1 time."

---

## Sprint 8: E2E Tests + Error Hardening

Prove everything works together. Catch regressions.

### Setup
- Playwright config (against Vercel preview or local dev)
- Test database seeding strategy
- axe-core integration for accessibility audits

### E2E Specs
- `auth.spec.ts`: OAuth sign-in, session persistence, sign-out, unauthorized redirect
- `write-and-publish.spec.ts`: create draft -> edit -> publish -> verify public page
- `coach-review.spec.ts`: write essay -> request review -> feedback displayed -> no ghostwriting in output
- `evidence.spec.ts`: create card -> attach to claim -> verify on published view
- `revision.spec.ts`: publish -> edit -> republish -> version history visible

### Error States
- LLM timeout: partial feedback or clear timeout message
- Validation failure: clear error message, no data loss
- Auth session expiry: redirect to sign-in, preserve URL for return

### Observability
- Sentry error boundaries wired up
- Server Action errors reported
- `/api/review` timing logged

### Testable
Run `bunx playwright test` — all specs green. Manually: disconnect network during review -> see timeout message. Let session expire -> redirected to sign-in -> sign in -> return to where you were.

---

## Sprint Dependency Graph

```
S0 (Infra) ──> S1 (Auth) ──> S2 (CRUD) ──> S3 (Publish) ──┬──> S4 (Review)
                                                             │
                                                             ├──> S5 (Evidence) ──> S6 (Public Evidence)
                                                             │
                                                             └──> S7 (Versions)

S4, S5, S6, S7 ──> S8 (E2E + Polish)
```

Sprints 4, 5, and 7 can run in parallel after Sprint 3. Sprint 6 depends on Sprint 5. Sprint 8 is the final integration pass.

---

## What's NOT in the MVP

Deferred to post-MVP (Phase 2+):

- Daily prompts / prompt tracks
- Streaks and XP gamification
- Objections and peer feedback
- Research packets (LLM-assisted source discovery)
- Rate limiting and quota tiers
- Pro subscription billing
- Clubs / cohorts / community plans
- Argument map visualization
- Export to Substack/Medium/Ghost
