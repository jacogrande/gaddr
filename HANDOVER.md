# HANDOVER — Spark shipped; next session: first real-model test

**Session ended:** 2026-07-08 · **Branch:** `main` (clean, in sync with `origin/main` at `f21ca1d`) · **Suite:** 425 tests green.

## What this session accomplished

The complete Spark feature (summonable thinking prompts during the freewrite) was planned, built, reviewed, and shipped:

1. **Plan** — `docs/plans/spark-implementation.md`, revised after a two-reviewer (AI-research + systems) audit. It is the binding spec; §10 holds the review log.
2. **Built in 7 phases** (one commit each, `10205b4..64ac2d2`): pure domain module (validator/selection/session reducer) → durable UUID SprintId → LLM infra foundation (`structured-call.ts` = the future constellation-harness seed) → `spark_event`/`inference_attempt` schema + sinks → API routes → editor UI (⌘. summon, interruption contract) → evals + docs. Every phase passed an adversarial review + fix round before commit.
3. **Comprehensive final review** (8 finder angles → 6 verifiers over the whole branch) found 10 confirmed cross-phase findings; **all fixed in `f21ca1d`** (plus a polish round for two fix-introduced regressions). All 8 workflows in `eval/spark.json` passed live via agent-browser in E2E mock mode.
4. **Merged to `main`, pushed** (Vercel deploys from main).
5. **Migration applied to Supabase** — `spark_event` + `inference_attempt` live, `(user_id, sprint_id)` index + FKs verified.

## Current state

- `ANTHROPIC_API_KEY` is in local `.env` (Jackson added it at session end). **Not yet added to Vercel env** — production sparks fizzle quietly until it is.
- The spark prompt (`spark-v1`, Haiku via `claude-haiku-4-5`) has **only ever run against the deterministic mock**. Zero real-model generations so far. That is the next session's job.
- §7.4 launch requirements (`docs/infra.md`) **not yet confirmed**: org no-training posture, ZDR decision, Console prompt-logging review. Required before real-key *production* use; a local real-model test is Jackson's own draft data and his call.

## Next steps (priority order)

1. **First real-model test** (local):
   ```bash
   bun run dev            # NO E2E vars → real adapters, real Postgres, real auth
   ```
   Real auth is required (`E2E_BYPASS_AUTH` alone is dead — its conjunction requires `E2E_TESTING`, which forces mocks). Sign in via OAuth, start a sprint, write ~100+ words of genuine prose, summon with ⌘. (or the affordance glyph, bottom-right). Judge against the plan §7 rubric: grounded / novel dimension / non-leading / single clear question. Re-roll once. Watch that pre-warm makes summon render instantly.
2. **Read the telemetry after the session** (yield is the number that catches a starving pipeline):
   ```sql
   SELECT outcome, retry_count, candidates_returned, candidates_valid,
          reject_reasons, latency_ms, input_tokens, output_tokens
   FROM inference_attempt WHERE stage = 'spark' ORDER BY created_at DESC;

   SELECT type, detail, lens, question, draft_word_count, words_since_prepare, cache_age_ms
   FROM spark_event ORDER BY created_at DESC;
   ```
   Low first-attempt yield or a skewed `reject_reasons` distribution = tune the prompt/validator (bump `SPARK_PROMPT_VERSION`), not the repair cap.
3. **Add `ANTHROPIC_API_KEY` to Vercel** (+ confirm the three §7.4 items in the Anthropic Console) when ready for production sparks.
4. **Backlog** (documented, not urgent): below-cut review cleanups — parameterize the repair cap in `structured-call` (+ resize `MAX_TOTAL_ATTEMPTS`), derive `MAX_EVENT_QUESTION_CHARS` from the domain constant, adopt Next 16 `after()` as a deferred-write seam, consolidate UUID-regex ×3 / lens-guard ×4 into domain exports, extract the E2E auth bypass into an env-free infra module, add a fence/forgery test for `neutralizeDraftDelimiters`. Then: start the 20–30-freewrite quality corpus; migrate triage/analysis mocks server-side using the phase-5 mock-behind-route pattern.

## Critical operational knowledge (do not relearn the hard way)

- **The Supabase DB has NO drizzle migration journal** (history was `db:push`) **and holds legacy tables** (`essay`, `essay_version`, `evidence_card`, `claim_evidence_link`) not in `schema.ts`. Do **not** run `bun run db:migrate` (re-runs 0000 → collides with auth tables) and do **not** run `db:push` blindly (may propose dropping the legacy tables). Migration 0003 was applied by executing its SQL directly in a transaction. Future schema changes: generate the migration file, then apply its SQL the same way — or baseline a journal first.
- **Eval mode** is `E2E_TESTING=true E2E_BYPASS_AUTH=true bun run dev` (both vars; documented in CLAUDE.md). Mock adapters + in-memory stores; needs no DB or key; sends nothing outbound.
- Spark is **English-first** (whitespace word counts + English interrogative grammar) — documented in `spark-glue.ts`/`select-spark.ts`.
- The during-sprint triage/analysis pipeline is **still browser-side mocks** — untouched by this work, by design.

## Key decisions (rationale lives in the plan + commit messages)

- Sparks are their own domain type, never `Finding`s — the pre-/post-commitment regime boundary.
- Pre-warm rides the existing trigger stream (one combined observer — a second detector is forbidden); everything pre-summon lives in refs (zero renders — the §5.3 contract, eval-asserted).
- Served lenses derived server-side from `spark_event`; server enforces the minimum-ground floor and records its own word counts; prepare and summon have separate rate buckets.
- `SparkEventDetail` distinguishes `sprint-paused` from `sprint-end`; phase-edge dismissals enqueue synchronously so the boundary flush carries them.
- Delayed-structure single call (analysis field before candidates) on Haiku; repair cap 1 (spark is disposable); user-abort deliberately maps to `transport` until the error taxonomy grows a variant.

## Key files

Spec/plan: `docs/plans/spark-implementation.md` · `docs/product/spark.md` · `docs/infra.md` §7.4
Domain: `src/domain/spark/*` · Infra: `src/infra/llm/*` (esp. `structured-call.ts`, `prompts/spark.ts`), `src/infra/db/{spark-event-repo,inference-attempt-repo,served-lens-query}.ts`
App: `src/app/api/spark/*`, `src/app/(protected)/editor/{use-spark.ts,spark-glue.ts,spark-card.tsx,spark-affordance.tsx,spark-hotkey-extension.ts}`
Evals: `eval/spark.json`

## Commands to resume

```bash
cd /Users/jackson/Code/projects/gaddr
git status                 # expect: clean on main at f21ca1d or later
bun run check && bun test  # expect: green, 425 tests
bun run dev                # real-model test (needs .env: DATABASE_URL + ANTHROPIC_API_KEY)
```
