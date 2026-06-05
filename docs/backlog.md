# Backlog

Forward work and known debt, kept out of the roadmap docs so those stay
narrative. Sequencing authority is [mvp-cycle.md](./mvp-cycle.md); feature
detail is [intelligence-roadmap.md](./intelligence-roadmap.md). This file is the
running list of concrete follow-ups and the debt each shipped increment left
behind.

## Next Steps — Background Inference (Intelligence Phase 1 / Sprint 2)

Ordered by dependency.

1. **Real model adapters behind the existing ports.** Replace
   `infra/llm/mock-{triage,analysis}-adapter.ts` with a server-backed Anthropic
   adapter (Haiku triage / Sonnet analysis). The `TriagePort` / `AnalysisPort`
   contracts do not change — swap at the composition root.
   - Move model calls server-side (secret keys): a `/api/triage` route the
     client `observe` callback posts bursts to, instead of calling the port
     in-process.
   - Prompt caching: system + tool definitions + freewrite-so-far as a stable
     cached prefix (see background-inference-during-freewrite.md).
2. **Substrate persistence.** The substrate is in-memory only and lost on
   reload. Add a per-sprint store (`constellation_run` + findings) so it
   survives reload and feeds the board. Depends on a durable `SprintId`
   (see debt below).
3. **Retrieval + hallucination defense.** A real `sourced` finding needs a
   retrieval port and span verification before Phase 2 (canon dialogue) can
   ship. This is load-bearing for the headline feature.
4. **Tier-3 assembly at the sprint boundary.** An Opus pass that aggregates the
   substrate + tier-2 findings into the ranked constellation. The current
   pipeline is during-sprint only.
5. **Constellation board UI (Sprint 3).** Render the substrate properly with
   per-tier styling. The current `substrate-debug` panel is a dev-only
   placeholder behind `NEXT_PUBLIC_DEBUG_TRIGGERS`.
6. **Run the eval.** `eval/constellation.json` is authored but not yet executed
   against a running dev server via the agent-browser skill.

## Tech Debt — introduced by the mocked pipeline

- **`SprintId` is a client-side counter** (`sprint-N`), not durable or unique;
  it collides across reloads. Needs a real id when persistence lands (step 2).
- **Mock adapters are regex heuristics**, not intelligence. Intent/signal/theme
  classification is surface-level by design — fine for wiring and deterministic
  evals, not for product behavior.
- **Multiple in-flight concurrency is supported but disabled.** The runner
  honors `maxConcurrent`; `DEFAULT_RUNNER_CONFIG` pins it to 1. Bumping it needs
  a dedupe/backpressure review — the queue currently drops the oldest burst and
  there is no cross-burst finding dedup.
- **No retries / rate-limit / cost handling / telemetry.** `InferenceError`
  variants exist but the mocks never emit them; the real adapter must map SDK
  failures and the runner should surface degraded states.
- **Client-side inference is temporary.** The mock ports run in the browser; the
  real version must move model calls server-side (keys, caching, batching).

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
