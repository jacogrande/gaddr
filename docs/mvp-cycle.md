# MVP Cycle Plan

Break the MVP into small sprints, each ending with a manually testable deliverable. Follows the architecture's mandatory feature workflow: domain types/tests first, then infra, then app shell.

**Scope:** Phase 1 from the business model — prove retention with a working write-review-publish loop.

**Sprint cadence:** ~1 week each. Ship what's done, carry what's not.

---

## Sprint 0: Infrastructure Setup [DONE]

Provisioning, deployment pipeline, database connection, and any remaining tooling. Details TBD — leaving this open for additional infra decisions.

Expected items:
- Next.js App Router bootstrapped and deploying to Vercel
- Railway Postgres provisioned, `DATABASE_URL` wired to Vercel env vars
- Drizzle ORM installed + configured (client, migration scripts)
- Sentry installed (server + client)
- CI: `bun run check` passing in GitHub Actions
- Local dev: `bun run dev` boots cleanly

**Testable:** `bun run dev` serves a page. Vercel preview deployment works on push. Database connects.

### Implementation Notes

- Next.js 16 with App Router + Turbopack dev server (port 8080)
- Drizzle ORM with `postgres` driver, `drizzle-kit` for migrations (`db:push`, `db:generate`, `db:migrate`)
- Sentry v10 with `@sentry/nextjs` (server + client instrumentation)
- ESLint config enforces architecture boundaries at lint time: domain purity (no throw, no Date, no fetch, no external imports), layer direction (app → infra → domain), no barrel files in domain
- CI runs `bun run check` (typecheck + lint + knip) on push/PR to main
- Tailwind CSS v4 via `@tailwindcss/postcss`

---

## Sprint 1: Auth + Protected Shell [DONE]

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

### Implementation Notes

- **Result type** (`src/domain/types/result.ts`): Discriminated union (`ok: boolean`), not class-based. Includes `map`, `flatMap`, `mapError`, curried `Fn` variants for pipe, and `pipe` with type-safe overloads (1–6 functions).
- **Branded types** (`src/domain/types/branded.ts`): `UserId` accepts any non-empty string (Better Auth generates nanoid-style IDs, not UUIDs). `EssayId` requires UUID v4. Single ESLint override allows `as` casts in this file only.
- **Better Auth**: Google OAuth only for MVP (GitHub deferred). DB-backed sessions via Drizzle adapter with `postgres` driver. Fail-fast env var validation — server won't start without `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **Schema**: Better Auth tables (`user`, `session`, `account`, `verification`) written manually (CLI had network issues). `emailVerified` set to `notNull().default(false)` for OAuth compatibility. Essay table included for forward compatibility.
- **Middleware**: Cookie-presence check only (fast, edge-compatible, no DB hit). Checks both `better-auth.session_token` and `__Secure-better-auth.session_token`. Security enforcement is in `requireSession()` server-side, not middleware.
- **Open redirect prevention**: `callbackUrl` validated as relative path (starts with `/`, not `//`) in both middleware and sign-in page.
- **Route groups**: `(auth)` for sign-in, `(protected)` for authenticated pages, `(dev)` for design kit pages. Protected layout calls `requireSession()` once; child pages don't repeat the check.
- **Design kit**: Playfair Display (serif headings) + Inter (sans body). Brick red CTAs with hard shadow, warm white (`#FAFAF8`) backgrounds, `border-2 border-black` card style.
- **28 unit tests** across Result and branded types, all passing in <10ms.
- **DB pool**: Increased to `max: 10` with `idle_timeout: 20` and `connect_timeout: 10`.

---

## Sprint 2: Essay CRUD + Draft Editor

The core writing surface. Create, save, and list drafts.

### Domain
- Full `Essay` type: id, userId, title, content (JSON — TipTap document), status, timestamps
- State machine: `createDraft()` smart constructor
- `updateDraft()`: validates title/content, returns `Result`
- Zod schemas: `CreateEssayInput`, `UpdateEssayInput` (content is TipTap JSON, not plain string)
- `EssayRepository` port interface (`save`, `findById`, `listByUser`)
- `wordCount()`: pure function that counts words from TipTap JSON document

### Tests
- Unit: `createDraft()` produces valid draft with correct defaults
- Unit: `updateDraft()` rejects empty content when title is set, handles word count edge cases
- Unit: Zod schema validation (missing fields, overflow, edge cases)
- Unit: `wordCount()` extracts text from TipTap JSON and counts correctly

### Infra
- Drizzle `essays` table: id (UUID), user_id, title, content (jsonb — TipTap document), status, created_at, updated_at, published_at
- Migration script
- `PostgresEssayRepository` implementing the port
- Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`

### App
- `/editor` page: TipTap rich text editor + title input, auto-save or explicit save button
- `/editor/[id]` page: load existing draft, hydrate TipTap from stored JSON
- TipTap config: starter kit (bold, italic, headings, lists, blockquote, code), word count display, 800-word limit indicator
- `createDraft` Server Action
- `updateDraft` Server Action (persists TipTap JSON)
- `/dashboard` (or `/essays`): list user's essays with status badges, link to edit

### Testable
Sign in. Click "New Essay." Type a title and some rich text (bold, lists, headings). Save. Navigate to your essay list. See the draft listed. Click it to resume editing — formatting preserved. Changes persist.

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
- `/essay/[id]` public page: SSR, renders TipTap JSON to HTML (read-only, no editor loaded — use `generateHTML()` from `@tiptap/html`)
- Public page returns 404 for drafts or missing essays

### Testable
Write a draft with formatting (headings, bold, lists). Click "Publish." See status change to "Published." Open the public URL in an incognito window. Read the essay with formatting intact. Go back and unpublish. Incognito refresh shows 404.

### Implementation Notes

- **Domain functions** (`src/domain/essay/operations.ts`): `publishEssay(essay, now)` and `unpublishEssay(essay, now)` are pure state transitions returning `Result<Essay, PublishError | UnpublishError>`. `now` is injected (domain purity — no `Date.now()`). Error types (`PublishError`, `UnpublishError`) centralized in `src/domain/types/errors.ts` alongside the `DomainError` union.
- **Formatting module** (`src/domain/essay/formatting.ts`): `relativeTime(date, now)` and `formatPublishedDate(date)` — pure functions moved here to keep derived view logic out of Server Components per architecture rules. Dashboard and public page both import from domain.
- **Repository port** (`src/domain/essay/repository.ts`): Added `findPublishedById(id)` — no `userId` param since it serves the unauthenticated public page. Returns `NotFoundError` for both missing and draft essays.
- **TipTap HTML rendering** (`src/infra/essay/render-essay-html.ts`): `renderEssayHtml(doc)` wraps `@tiptap/html`'s `generateHTML` in a `Result`, catching render errors. StarterKit config matches the editor (heading levels [2, 3]).
- **Postgres repository** (`src/infra/essay/postgres-essay-repository.ts`): `findPublishedById` filters `status = 'published'` in the query. `toDomain` now validates TipTap content via `TipTapDocSchema.safeParse()` at the infra boundary. `listByUser` fail-fast: returns `PersistenceError` on any invalid row instead of silently dropping.
- **Schemas** (`src/domain/essay/schemas.ts`): Typed against domain `TipTapDoc`/`TipTapNode` types (`z.ZodType<TipTapDoc>`) so schema drift causes compile errors.
- **Server actions** (`src/app/(protected)/editor/actions.ts`): `publishEssayAction` flushes pending saves via `savePromiseRef` before publishing (prevents stale DB content). Returns `publishedAt` ISO string for client state. If `publishedAt` is null after save, returns error rather than a timestamp fallback.
- **Editor** (`src/app/(protected)/editor/[id]/essay-editor.tsx`): Tracks `status` and `publishedAt` in state. Published mode: editor non-editable, title disabled, toolbar hidden, "View public page" link shown. Flush-before-publish uses a Promise ref pattern (`savePromiseRef`) instead of spin-waiting. Publish errors shown as inline banner.
- **Public page** (`src/app/essay/[id]/page.tsx`): Server component, no auth. React `cache()` wraps `findPublishedById` to deduplicate the DB call between `generateMetadata` and the page component. Renders HTML via `dangerouslySetInnerHTML` (safe — output is from `@tiptap/html` server-side, not raw user HTML). 404 page includes "has been unpublished" messaging.
- **E2E scaffolding**: Playwright config (`playwright.config.ts`) with auth setup project using `storageState` pattern. 8 test cases in `test/e2e/write-and-publish.spec.ts` covering create, edit, publish, public view, unpublish, and 404 edge cases. `bunfig.toml` scopes `bun test` to `test/unit/` to avoid loading Playwright files.
- **8 unit tests** for publish/unpublish covering success paths, error variants (`empty_content`, `already_published`, `already_draft`), empty paragraph edge case, and field preservation.

---

## Sprint 4: Coach Review MVP [DONE]

The product's core differentiator. LLM coaching with no-ghostwriting enforcement.

### Domain
- `CoachReview` type: inline comments, issue list, rubric scores
- `InlineComment`: anchor (TipTap node position range), problem, why, question, suggestedAction
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
- `POST /api/review` route handler (extracts plain text from TipTap JSON for LLM prompt)
- "Get Feedback" button in editor
- Feedback panel: renders inline comments as TipTap decorations (highlights) anchored to text ranges
- Issue list display (severity badges, suggested actions)
- Loading state while review is in progress
- Error handling: timeout -> show message, validation failure -> show message

### Testable
Write a 200+ word essay with formatting. Click "Get Feedback." Wait for LLM response. See inline comments highlighted in the TipTap editor pinned to parts of your essay. See an issue list with priorities. Verify no "here's a rewritten version" appears anywhere.

### Implementation Notes

- **Agentic tool-use loop** (`src/infra/llm/review-adapter.ts`): Claude uses 4 tools (`add_inline_comment`, `add_issue`, `ask_question`, `score_rubric`) as structured output channels — each tool call emits one coaching artifact. The adapter runs an agentic loop (message → tool_use → tool_result → continue) for up to 10 iterations until Claude issues `end_turn`. Non-streaming API per turn, but events are yielded between turns for incremental client delivery. Model defaults to `claude-sonnet-4-5-20250929`, configurable via `LLM_MODEL` env var.
- **Authorship enforcement at two layers**: The adapter validates each tool call via `validateArtifact()` and sends corrective `is_error` tool_results back to Claude when violations are detected (giving the LLM a chance to rephrase). The domain pipeline (`validateReviewStream`) re-validates as defense-in-depth, so any adapter implementation is forced through the constraint. Heuristics: rejects fields starting with "Replace with:", "Change to:", "Rewrite as:", "Try:", or containing backtick-wrapped sentences (4+ words). Checks all free-text fields (problem, why, description, rationale, suggestedAction), not just `suggestedAction`.
- **Domain pipeline** (`src/domain/review/pipeline.ts`): `prepareReviewRequest(essay)` validates essay is reviewable (non-empty) and extracts plain text. `validateReviewStream(events)` wraps the adapter's `AsyncIterable<ReviewEvent>` with authorship re-validation and completeness checking (verifies all 5 rubric dimensions — clarity, evidence, structure, argument, originality — were scored before `done`).
- **Streaming via SSE** (`src/app/api/review/route.ts`): Thin Route Handler — auth, parse `ReviewRequestSchema`, load essay from DB, call `prepareReviewRequest`, pipe adapter output through `validateReviewStream`, convert `AsyncIterable` to `ReadableStream` with `data: {json}\n\n` framing. Returns 422 for empty essays, 404 for missing, 401 for unauthenticated.
- **Client hook** (`src/app/(protected)/editor/use-review.ts`): `useReview()` manages SSE lifecycle with `AbortController`. Parses each SSE line through `ReviewEventSchema.safeParse()` (Zod boundary validation, not unsafe cast). Accumulates comments, issues, questions, and scores into React state. Handles abort, stream completion without `done` event, and HTTP errors.
- **Schema-type coupling**: All Zod schemas typed against domain types (`z.ZodType<InlineComment>`, `z.ZodType<ReviewEvent>`, etc.) so drift between schemas and types causes compile errors. `RubricDimension` type and `RUBRIC_DIMENSIONS` constant defined once in `review.ts`, consumed by schemas and pipeline (no duplication).
- **Click-to-highlight** (`essay-editor.tsx`): Clicking an inline comment walks ProseMirror's document tree via `doc.descendants()`, building a position-aware text map that correctly accounts for node boundaries (headings, lists, etc.), then maps the text match back to ProseMirror `from`/`to` positions for `setTextSelection`. This avoids the plain-text `indexOf` bug where positions diverge in multi-block documents.
- **FeedbackPanel** (`feedback-panel.tsx`): Right-side panel with sections for inline comments (clickable, quoted text highlighted), issues (severity badges: red/amber/stone), Socratic questions (left-border accent), and rubric scores (filled/empty dot visualization). Skeleton shimmer during loading, streaming indicator when partial results are in.
- **Editor integration**: Two-column layout on desktop when feedback is active (`flex max-w-6xl gap-8`), single-column otherwise (`max-w-2xl`). "Get Feedback" button flushes pending saves before requesting review. Disabled when essay is empty, during streaming, or while publishing. Panel is sticky (`lg:sticky lg:top-8`).
- **TipTap content validation**: `getJSON()` output validated through `TipTapDocSchema.safeParse()` at the editor boundary rather than an `as TipTapDoc` cast. Initial content deep-cloned via `JSON.parse(JSON.stringify(...))` to bridge readonly domain types to TipTap's mutable API.
- **30 new tests**: Unit tests for constraints (~17 tests covering all field checks, passthrough events, `extractEssayText`), schemas (8 tests), pipeline (7 tests including defense-in-depth authorship filtering and rubric completeness). Contract tests (13 tests) validate parsing of realistic LLM `tool_use` outputs through Zod schemas and authorship constraints.
- **New dependency**: `@anthropic-ai/sdk`. Client (`src/infra/llm/client.ts`) validates `ANTHROPIC_API_KEY` at startup with fail-fast error.

---

## Sprint 5: Evidence Cards [DONE]

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
- In TipTap editor: "Attach Evidence" flow — select from library, link to selected text/paragraph via custom TipTap mark or node attribute
- Show attached evidence indicators as inline marks in TipTap (e.g. underline + icon)
- Citation mismatch warnings displayed in editor sidebar

### Testable
Create an evidence card in the library (paste a URL, add a quote). Open an essay. Select a claim in the TipTap editor, attach the evidence card. See the attachment indicator inline. Remove it. See the citation warning if a claim has no evidence.

### Implementation Notes

- **Branded types** (`src/domain/types/branded.ts`): Added `EvidenceCardId` and `ClaimEvidenceLinkId`, both UUID v4 following the existing `EssayId` pattern with `validateUuid<T>()`.
- **Domain types**: `EvidenceCard` (`src/domain/evidence/evidence-card.ts`) with three-way `Stance` enum (`"supports" | "complicates" | "contradicts"`). `ClaimEvidenceLink` (`src/domain/evidence/claim-evidence-link.ts`) is immutable — to change an attachment, delete and re-create. Links carry `anchorBlockIndex` (TipTap top-level block index) + `claimText` (exact highlighted text) for stable anchoring that survives document edits better than character offsets.
- **Operations** (`src/domain/evidence/operations.ts`): `createEvidenceCard`, `updateEvidenceCard`, `createClaimEvidenceLink` — all pure, all return `Result`. Validation: URL must match `^https?://`, at least one of quote/summary required, field length limits (title 300, quote 2000, summary 2000, caveats 1000, claim text 1000). `now` injected as parameter (domain purity).
- **Schemas** (`src/domain/evidence/schemas.ts`): `CreateEvidenceCardInputSchema`, `UpdateEvidenceCardInputSchema` (with `.refine()` for quote-or-summary cross-field check), `AttachEvidenceInputSchema`. All used for both client-side form validation and server action boundary validation.
- **Citation mismatch detection** (`src/domain/evidence/citation-mismatch.ts`): Pure function `checkCitationMismatches({ doc, links })` returns three kinds: `OrphanedLink` (block deleted), `StanceMismatch` (evidence contradicts or complicates the claim — advisory, not error), `UnsupportedClaim` (paragraph blocks with 10+ words and no evidence attached). Headings and lists intentionally excluded from the unsupported check. Uses a narrow `LinkForMismatchCheck` input type to avoid depending on full domain types.
- **Repository port** (`src/domain/evidence/repository.ts`): Single `EvidenceCardRepository` interface covering both cards and links (shared transactional boundary). `findLinksWithCardsByEssay` returns `ClaimEvidenceLinkWithCard` — links joined with their cards, ordered by `anchorBlockIndex`. `deleteLink` takes `essayId` for proper scoping (not just userId).
- **Postgres repository** (`src/infra/evidence/postgres-evidence-card-repository.ts`): Follows the existing essay repository pattern — `cardToDomain`/`cardToRow` and `linkToDomain`/`linkToRow` mappers with branded ID validation at the boundary. `cardToDomain` runtime-validates the stance value from the DB via `STANCES.find()`. Card save uses `onConflictDoUpdate` (upsert). `findLinksWithCardsByEssay` uses Drizzle `innerJoin` ordered by `anchorBlockIndex`.
- **DB schema** (`src/infra/db/schema.ts`): Two new tables — `evidence_card` (text PK, userId FK, sourceUrl, sourceTitle, quoteSnippet nullable, userSummary nullable, caveats nullable, stance text, timestamps) and `claim_evidence_link` (text PK, essayId FK, evidenceCardId FK, userId FK, claimText, anchorBlockIndex integer, createdAt). Both FKs CASCADE on delete — deleting an essay or card auto-removes links.
- **Library pages** (`src/app/(protected)/library/`): Server component page loads cards via `repo.listByUser()`. `EvidenceCardList` client component manages modal state for create/edit/delete with the existing neobrutalist card style. `EvidenceCardForm` is a modal form with stance selection rendered as three colored radio-card buttons (emerald/amber/red). `DeleteConfirmation` warns that deletion removes the card from all linked essays.
- **Shared serialized types** (`src/app/(protected)/evidence-types.ts`): Single source of truth for `SerializedCard`, `EvidenceLinkData`, and `EvidenceCardSummary` — used by library, editor, and picker components. Stance typed as the domain `Stance` literal union (not `string`) to avoid assertion casts at the app layer.
- **TipTap evidence mark** (`src/app/(protected)/editor/extensions/evidence-mark.ts`): Custom TipTap Mark named `evidenceAttachment` with attributes `linkId`, `evidenceCardId`, `stance`. Renders as `<span data-evidence-link="..." class="evidence-mark evidence-mark--{stance}">`. `inclusive: false` so typing at mark boundaries doesn't extend the mark.
- **Evidence mark styles** (`src/app/globals.css`): Three line styles for color-blind accessibility: solid underline for supports (emerald), dashed for complicates (amber), dotted for contradicts (red). Light background tints for additional visual weight.
- **ProseMirror utilities** (`src/app/(protected)/editor/[id]/prosemirror-utils.ts`): `findTextPosition(doc, searchText, blockIndex?)` performs block-scoped search when `blockIndex` is provided, calculating absolute positions by summing prior sibling `nodeSize` values. Falls back to global `doc.descendants()` search. Shared by both evidence mark application and comment click-to-highlight.
- **Evidence links hook** (`src/app/(protected)/editor/[id]/use-evidence-links.ts`): Manages evidence link state with `attach`, `detach`, `refresh`, `applyMarks`. Uses `linksRef` (a `useRef` synced to state) for synchronous reads in async callbacks, preventing stale closures. `applyMarks` saves the current cursor position, strips all existing evidence marks, re-applies from the current links array with block-scoped positioning, then restores the cursor (clamped to doc bounds).
- **Evidence picker** (`src/app/(protected)/editor/[id]/evidence-picker.tsx`): Side panel (same position as FeedbackPanel) with filterable card list, stance badges, and Escape-to-close. Appears when "Attach Evidence" is clicked with text selected.
- **Citation warnings** (`src/app/(protected)/editor/[id]/citation-warnings.tsx`): Collapsible amber banner above the editor showing mismatch count. Expandable list with icons per kind and "Remove link" action for orphaned links.
- **Editor integration** (`src/app/(protected)/editor/[id]/essay-editor.tsx`): `EvidenceMark` added to TipTap extensions. Side panel state changed from boolean to `"none" | "feedback" | "evidence-picker"`. "Attach Evidence" toolbar button disabled when no selection or essay is not a draft. Attach/detach errors surfaced via an `evidenceError` state and inline error banner. Evidence marks applied on load from `initialLinks` prop.
- **Editor page** (`src/app/(protected)/editor/[id]/page.tsx`): Loads evidence links via `repo.findLinksWithCardsByEssay()` and user's cards via `repo.listByUser()`, serializes both for the client. Passes `initialLinks` and `evidenceCards` props to `EssayEditor`.
- **Server actions** (`src/app/(protected)/editor/actions.ts`): Three new actions — `attachEvidenceAction` (validates both essay and card ownership, creates link via domain constructor, saves via repo), `detachEvidenceAction` (essay-scoped deletion), `listEssayEvidenceAction` (returns links with joined cards).
- **Navigation** (`src/app/(protected)/layout.tsx`): "Library" link added after "Dashboard" in the nav bar.
- **Evidence is stored separately from TipTap JSON.** The `claim_evidence_links` table is the source of truth. TipTap marks are applied at render time for visual indicators. This keeps the domain decoupled from ProseMirror internals and makes Sprint 6 (public rendering) straightforward — the `renderEssayHtml` renderer silently drops unknown marks, so evidence marks won't cause issues on public pages until they're explicitly supported.
- **69 new tests** across 3 new test files and 1 modified: operations (34 tests covering create/update card + create link with all validation paths), schemas (16 tests for acceptance/rejection/refinements), citation mismatch (11 tests for all three kinds plus edge cases), branded types (8 new tests for `EvidenceCardId` and `ClaimEvidenceLinkId`). Total test suite: 155 tests, <50ms.

---

## Sprint 6: Evidence on Public Pages

Make the published essay credible and shareable with visible evidence.

### Domain
- Published essay view model: essay + ordered evidence cards per claim
- Evidence display logic (which cards to show, ordering)

### App
- Public essay page: render TipTap JSON to HTML with evidence marks resolved to expandable cards
- Evidence card render: source link, quote, stance badge, caveats
- Collapsed by default, expand on click
- Share-friendly metadata (og:title, og:description)

### Testable
Publish an essay with attached evidence. Open the public URL. See evidence cards collapsed under claims. Click to expand — see source, quote, stance. Share the URL — preview shows title and description.

---

## Sprint 7: Version History + Revision

Revision is the product's learning mechanism. Make it visible.

### Domain
- `EssayVersion` type: id, essayId, versionNumber, title, content (TipTap JSON), publishedAt
- `createVersionSnapshot()`: captures current TipTap document state before overwrite
- `diffVersions()`: pure function, takes two TipTap JSON documents, returns structured changes (added/removed/modified blocks)

### Tests
- Unit: version snapshot captures all fields
- Unit: diff logic (identical = no changes, additions, deletions, modifications)

### Infra
- `essay_versions` table + migration (immutable rows)
- Snapshot creation on each publish
- `listVersions()` repository method

### App
- Version history panel in editor sidebar (list of versions with dates)
- Click a version to view it (read-only TipTap render via `generateHTML()`)
- Diff view: highlight what changed between TipTap documents (block-level additions/deletions/modifications)
- Badge on published page: "Revised N times"

### Testable
Publish an essay with formatting. Edit and republish. Open version history. See both versions listed. Click the old version — see the original with formatting. View the diff — changes highlighted at block level. Public page shows "Revised 1 time."

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
