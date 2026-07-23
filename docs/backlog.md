# Backlog

Forward work and known debt, kept out of the roadmap docs so those stay
narrative. Sequencing authority is [mvp-cycle.md](./mvp-cycle.md); feature
detail is [intelligence-roadmap.md](./intelligence-roadmap.md). This file is the
running list of concrete follow-ups and the debt each shipped increment left
behind.

## Next Steps — updated 2026-07-23 after Spark + provider portability shipped

The old numbered list is retired; most of it either shipped with Spark or was
reshaped by `docs/plans/constellation-run-1.md` (the Sprint 2 spec). Current
state, ordered by dependency:

1. **Constellation Run 1** — the active sprint. Steps 0–1 (doc refresh, golden
   corpus, shared primitives: span-matcher extraction, `fence.ts`, per-call
   repair caps) are done; next is step 2, the constellation domain
   (`NodeKind`/`Star`/validate-node/assembly). The plan is the checklist.
2. **Run the drip eval.** `eval/constellation.json` is authored but has never
   been executed via agent-browser (needs `E2E_TESTING=true
   E2E_BYPASS_AUTH=true` plus the debug overlay). Oldest open item in this
   file.
3. **Drip mocks → server-side** (decoupled from Run 1 by design). Replace
   `infra/llm/mock-{triage,analysis}-adapter.ts` using the spark
   mock-behind-route template (`/api/spark` + `deps.ts` composition) and the
   provider registry (`providers.ts`) — NOT a hardcoded Anthropic adapter as
   this item originally said.
4. **Retrieval + entailment (Run 2).** Landing zone mapped in the plan §10.
   Note the citations redesign finding first
   (`docs/research/llm-provider-portability.md` §4): the Citations API is
   incompatible with structured outputs even on Anthropic — Run 2 uses
   schema-level quote-and-verify over the shared span-matcher.
5. **Sprint 3 interaction layer** — tour, node chats, reaction-gated
   resolution, map editing, riding on Run 1's data model.

Done since the last revision of this file: server-side inference route +
adapter discipline + per-attempt telemetry (spark, 2026-07-08); durable
`SprintId`; LLM provider portability + spark on `gpt-5.6-luna` (2026-07-23);
golden freewrite corpus + live yield instrument (`scripts/spark-smoke.ts
--corpus`, first run: 24/24 first-attempt yield, all ten lenses represented).

## Tech Debt — introduced by the mocked pipeline

- ~~**`SprintId` is a client-side counter**~~ — RESOLVED (spark, 2026-07):
  durable client-minted UUID with full mint/restore/resume lifecycle.
- ~~**No retries / rate-limit / cost handling / telemetry.**~~ — RESOLVED for
  the server inference path (`structured-call.ts` repair/retry discipline,
  neutral error taxonomy, `inference_attempt` telemetry, per-route rate
  buckets). Still true of the browser-side drip mocks, which by design never
  emit errors.
- **Mock adapters are regex heuristics**, not intelligence. Intent/signal/theme
  classification is surface-level by design — fine for wiring and deterministic
  evals, not for product behavior. (Still true; see Next Steps item 3.)
- **Multiple in-flight concurrency is supported but disabled.** The runner
  honors `maxConcurrent`; `DEFAULT_RUNNER_CONFIG` pins it to 1. Bumping it needs
  a dedupe/backpressure review — the queue currently drops the oldest burst and
  there is no cross-burst finding dedup.
- **Client-side inference is temporary for the drip.** The mock triage/analysis
  ports run in the browser; the migration path is the spark mock-behind-route
  template plus the provider registry.

## Known Limitations — acceptable for now

- **Substrate is not persisted within a sprint** — a reload mid-sprint loses it.
- **`validateFinding` length ceiling (280 chars)** is a structural ghostwriting
  guard, not a semantic check; a finding could still be too prose-like under the
  limit.
- **Tension detection** is a simple "same theme, asserting + wondering"
  heuristic; theme labels come from the mock's longest-word / entity heuristic.
- **Findings ranking** is tier + recency only; no near-duplicate dedup.
- **StrictMode** recreates the runner on dev remount (correct, slight churn).

## Other standing debt

- `arch-review` and domain-purity are checked by hand / eslint, not in CI beyond
  `bun run check`.
- `eval/*.json` workflows run at agent-time only; no headless CI runner (by
  design — see agentic-ux-testing.md).
