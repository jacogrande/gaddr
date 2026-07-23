# LLM Provider Portability — the facade, the switch, and what it actually costs

**Status:** research + proposed architecture, 2026-07-16.
**Question:** gaddr wants to switch its primary provider from Anthropic to OpenAI now, and expects the choice to keep changing. What is the right provider-agnostic facade — and what does a switch actually cost?
**Method:** three parallel research passes (TypeScript abstraction layers; gateways and their privacy postures; Anthropic↔OpenAI API parity), every load-bearing claim verified against live vendor docs on 2026-07-16, plus a coupling inventory of `src/`.
**Companions:** `docs/architecture.md` (ports), `docs/plans/spark-implementation.md` §4 (the structured-call discipline), `docs/plans/constellation-run-1.md` D6/§5 (consumes this doc's registry design), `docs/infra.md` §7.4 (outbound data posture — re-run per provider).

---

## 0. The finding that frames everything

**The facade already exists. Finish it; don't buy one.**

The coupling inventory came back smaller than expected, because the spark plan's discipline already built the right seam:

- `src/infra/llm/structured-call.ts` imports **no SDK**, duck-types transport errors, and defines an injectable `StructuredCallClient` interface — the facade interface, already in production.
- `src/infra/llm/anthropic-client.ts` is, by its own header, "the ONLY module that touches Anthropic SDK types" (~124 lines). Verified true.
- The composition root (`src/app/api/spark/deps.ts`) constructs the client in exactly one place.
- The domain layer is fully clean — every `anthropic` match in `domain/` is a comment.
- `SPARK_WIRE_SCHEMA` is already authored in the strict common subset both providers accept (`additionalProperties: false`, all fields required, closed primitive enums, no bound keywords) — the "wire schemas strict-mode-thin, richness in validators" rule turns out to be exactly the portable dialect.

What remains Anthropic-coupled: the `stop_reason` string vocabulary inside `structured-call.ts`'s switch, the single SDK wrapper, one pinned model ID in `prompts/spark.ts`, and the absence of cached-token fields in the usage shape. That is the whole migration surface at the code level. The real cost of a switch lives elsewhere — in prompts and evals (§5).

---

## 1. Options considered, with verdicts

### 1.1 Facade SDKs — rejected for this profile

**Vercel AI SDK** is the default answer for TS apps and the wrong one for gaddr's profile (server-only, non-streaming, structured JSON with a domain-validator repair loop, exact cache control, per-attempt telemetry, pinned snapshots):

- **Three majors in 11 months** — v5 (2025-07), v6 (2025-12), v7 (2026-06) — each with breaking renames; v7 alone renamed `system`→`instructions` and moved `usage.cachedInputTokens`→`usage.inputTokenDetails.cacheReadTokens` ([v7 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)).
- `generateObject` was **deprecated in v6** in favor of `generateText` + `Output.object()` — and the repair hook (`experimental_repairText`) **does not exist on the successor API** ([issue](https://github.com/vercel/ai/issues/11696)). Our repair-with-exact-validator-error loop would live outside the SDK either way, which removes most of its value.
- **No first-class refusal surfacing** — refusals are inferred from `finishReason` inside a `NoObjectGeneratedError` ([docs](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-object-generated-error)). Our discipline branches on refusal explicitly.
- Open Anthropic edge cases: `@ai-sdk/anthropic` passes through schema properties Anthropic 400s on ([issue](https://github.com/vercel/ai/issues/13355)); historic tool-mode structured output broke Anthropic prompt caching ([discussion](https://github.com/vercel/ai/discussions/3921)); a documented silent flip of OpenAI `strict` default in v4→v5 ([issue](https://github.com/vercel/ai/issues/8868)).
- Practitioner consensus for exactly this shape of use — Zechner ([pi-coding-agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)), Ronacher ("cache control differences are one of the named reasons no right abstraction exists" — [Agent Design Is Still Hard](https://lucumr.pocoo.org/2025/11/21/agents-are-hard/)), futuresearch ([provider quirks](https://futuresearch.ai/blog/llm-provider-quirks/)) — is: thin own adapter over native SDKs when the surface is small and provider features matter. Our surface is one interface and ~124 lines per provider.

Others, one line each: **token.js** dormant (last release 2025-04); **LangChain.js / LlamaIndex.TS / Mastra** are frameworks, superset of need (Mastra is built *on* AI SDK's model layer); **Effect AI** requires adopting Effect wholesale and still emulates Anthropic structured output via tools ([issue](https://github.com/Effect-TS/effect/issues/6091)).

**AI SDK remains the right answer if gaddr later grows streaming chat UI** (node chats, Sprint 3+ — reconsider then, at whatever major it's on).

### 1.2 Gateways — rejected on the content posture

Every hosted gateway is **an additional data processor for the writer's most private artifact**. That is a §7.4 decision, not a convenience decision.

- **Vercel AI Gateway** is the only hosted option whose default posture qualifies (gateway-side ZDR by default, per-request provider-ZDR enforcement with an audit trail, zero markup — [docs](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr)). But it adds nothing we need today, has silently downgraded Anthropic's 1h cache TTL to 5m ([report](https://www.danielternyak.com/articles/vercel-ai-gateway-downgrades-anthropic-prompt-cache)), shows intermittent 503s on Anthropic structured output ([issue](https://github.com/vercel/ai/issues/13963)), and its ZDR mode **silently permits** models with provider-side retention exceptions. If multi-provider fallback/quotas become real needs, this is the one to adopt — with team-wide ZDR and a per-model check.
- **OpenRouter**: no-logging by default, but opting into prompt logging grants a perpetual irrevocable commercial license over content ([terms](https://openrouter.ai/terms)) — a one-toggle blast radius the compliance doc would have to explain. Pass.
- **Cloudflare AI Gateway / Helicone / Portkey**: content logging **on by default** — the opposite of "drafts never at rest." Privacy-by-configuration is a weaker doc than ZDR-by-default. Pass.
- **LiteLLM self-hosted**: the only proxy whose defaults fit the posture (content storage off by default), but it means running a Postgres-backed service outside Vercel to abstract two providers. Not worth it.

### 1.3 OpenAI-compatibility endpoints — rejected outright

Anthropic's OpenAI-compat endpoint drops **our entire requirements list**: prompt caching unsupported, `response_format` ignored, tool `strict` ignored, cached-token usage always empty, `refusal` always empty — and Anthropic itself labels it "not... a long-term or production-ready solution" ([docs](https://platform.claude.com/docs/en/api/openai-sdk)). Compat layers are for benchmarking, not production.

---

## 2. The design: finish the native facade

Seven changes, in dependency order. Items 1–4 are the switch; 5–7 are the discipline around it.

**P1 — Neutralize the outcome vocabulary.** `StructuredCallResponse.stopReason` becomes a closed neutral union the discipline switches on:

```ts
type CallOutcome = "complete" | "truncated" | "refused" | "paused" | "other";
```

Each client adapter owns its provider's translation:

| Neutral | Anthropic (`stop_reason`) | OpenAI (Responses API) |
|---|---|---|
| `complete` | `end_turn`, `stop_sequence`, `null` | `status: completed`, no refusal part |
| `truncated` | `max_tokens`, `model_context_window_exceeded` | `status: incomplete` + `incomplete_details.reason: max_output_tokens` |
| `refused` | `refusal` (+ `stop_details.category`) | refusal content part (**status stays `completed`** — the trap), or `content_filter` (category preserved in `stopDetails`) |
| `paused` | `pause_turn` | never emitted (no equivalent) |
| `other` | `tool_use`, unknown | `status: failed` maps to a thrown error; unknown shapes |

The repair loop, retry budgets, and telemetry emission in `structuredCall` don't change — only the case labels. Keep the existing `InferenceAttemptOutcome` strings (`max-tokens`, `pause-turn`) unchanged: production `inference_attempt` rows already use them, and they read fine as semantic labels.

**P2 — `openai-client.ts`.** Second implementation of `StructuredCallClient` over the official `openai` SDK, Responses API, strict `json_schema`. Three hard rules learned from the parity research:
- **`store: false` on every call, hard-coded.** The Responses API default is `store: true` — response bodies persist ≥30 days and are retrievable ([data controls](https://developers.openai.com/api/docs/guides/your-data)). This is the single sharpest §7.4 trap in the whole migration.
- **Guard `incomplete_details == null`** (known intermittent bug) — classify defensively as `truncated`.
- **Pin reasoning effort low/minimal for spark-class calls.** GPT-5.x reasoning models can spend the entire `max_output_tokens` budget on reasoning and return `incomplete` with empty text ([report](https://community.openai.com/t/responses-api-empty-output-text-no-message-item-when-status-incomplete-due-to-max-output-tokens-reasoning-only-output/1373609)). Spark's summon-fallback path has a ~4s budget; an unbounded reasoning pass blows it.

**P3 — Provider registry at the composition root.** A `src/infra/llm/providers.ts` mapping `stage → { provider, modelId, maxTokens }`, resolved from env (`LLM_PROVIDER=anthropic|openai` default + per-stage overrides). `deps.ts`'s one `createAnthropicStructuredClient()` call becomes `clientFor(stageConfig)`. This gives **per-stage mixing** for free — spark on OpenAI while constellation stays on Anthropic is a config line, which is exactly the posture for "this will change on a dime."

Tier mapping at current pricing ([OpenAI](https://developers.openai.com/api/docs/pricing) / [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing)):

| Role | Anthropic | OpenAI |
|---|---|---|
| cheap-fast (spark) | Haiku 4.5 — $1/$5 | `gpt-5.6-luna` — $1/$6 (or `gpt-5.4-mini` $0.75/$4.50) |
| strong synthesis (constellation S1/S3) | Sonnet 4.6 $3/$15 · Sonnet 5 $2/$10 intro | `gpt-5.6-terra` — $2.50/$15 |

Pinning caveat both ways: OpenAI has dated snapshots with a ≥6-month deprecation policy ([policy](https://developers.openai.com/api/docs/deprecations)); Anthropic's **current-gen models are alias-only** (no dated IDs — Haiku 4.5's dated snapshot still works, Sonnet 4.6/5 have none). Where a dated ID doesn't exist, record the **response-reported model version** in `inference_attempt.model_id` so alias drift is at least visible in telemetry — the spark-v2 lesson (alias re-resolution silently confounds telemetry) can't be fully prevented on alias-only models, only detected.

**P4 — Schema portability lint.** Author all wire schemas in the shared strict subset and enforce it with a unit test (`assertPortableSchema`): root object; `additionalProperties: false` everywhere; all fields required (nullable unions for optional); no recursion (Anthropic rejects it), no `oneOf`/`allOf`, no numeric/length bound keywords, no `format` (OpenAI strict rejects it; put it in `description` and check in the domain validator — where those constraints already live); primitive-only enums; internal `$defs` only. `SPARK_WIRE_SCHEMA` already passes. One Anthropic-only quirk to absorb in validators: enum values may return with different casing — compare case-insensitively.

**P5 — Usage + caching semantics.** Add optional `cachedInputTokens` (and `cacheWriteTokens`) to `StructuredCallResponse.usage` and `InferenceAttempt`; nullable columns when the constellation migration lands. Caching control stays an **adapter concern**: the Anthropic adapter sets `cache_control` breakpoints; the OpenAI adapter sets a stable `prompt_cache_key` per prefix and relies on automatic prefix caching (min 1,024 tokens, ~15 req/min per key, best-effort — [guide](https://developers.openai.com/api/docs/guides/prompt-caching)). Two consequences for the constellation plan:
- The **stagger discipline survives on both providers** (identical concurrent requests all miss the cold cache on both).
- The `cache_read_input_tokens == 0` **per-call alert is Anthropic-only**. On OpenAI, zero cached tokens is normal (short prompts, cold keys, evictions) — the alert becomes a **rolling hit-rate SLO** per stage. Constellation plan §5.5 should be read with this amendment.

**P6 — Prompt versions grow a model axis.** The spark-v2/v3 tuning log is the proof: prompts are tuned *to a model* (the length-budget-at-end-of-turn fix, the lens-hint compliance, 0%→89% yield). A provider switch without a re-tune is how quality silently dies while the code keeps working. Prompt modules keep one source of truth for the contract but version per target (`spark-v3` on Haiku ≠ `spark-v3` verbatim on gpt-5.6-luna — expect a tune, ship it as `spark-v4-oai` or similar). `input_hash` already includes `modelId`, so telemetry segmentation is automatic.

**P7 — Mocks and evals: untouched.** Mock-behind-route composes at the same seam and is provider-agnostic already. Contract tests gain a second table: the OpenAI adapter against a stubbed SDK, covering every outcome-mapping row above (esp. refusal-with-status-completed and null `incomplete_details`).

---

## 3. The switch protocol (what "changing on a dime" actually costs)

The facade makes the **code** provider-indifferent. The **quality** never is. A provider switch is an eval-gated rollout, not a config flip:

1. Flip the registry for the target stage in a branch.
2. Run the golden-freewrite corpus (constellation plan §8 step 0.5 — the same corpus gates this) through the quality-lane rubric on the new provider.
3. Watch first-attempt yield per stage (`inference_attempt` is already segmented by `model_id`); expect one prompt tune (the spark precedent says the first live run finds one).
4. Re-run the §7.4 checklist **per provider** before real drafts flow: no-training posture (OpenAI: API data not trained on by default), retention window (OpenAI: 30-day abuse monitoring; ZDR is approval-gated via sales, same as Anthropic), dashboard/console logging visibility, and `store: false` verified in the adapter contract tests.
5. Ship stage-by-stage. The registry makes partial rollouts (spark first, constellation later) the default motion.

Steady-state cost of the whole posture: one extra ~150-line adapter, one registry module, a schema lint, and a second contract-test table. No new runtime dependency beyond the `openai` package.

---

## 4. Roadmap consequences (read before Run 2)

1. **The Run 2 citations design must change — and not only for portability.** The harness research assumed S3 = citation-enabled generation via Anthropic's Citations API. Verified today: Anthropic citations return **400 when combined with structured outputs** ([docs](https://platform.claude.com/docs/en/build-with-claude/citations)) — the two features are mutually exclusive even on Anthropic — and **OpenAI has no equivalent** (file-search annotations are pointer-level over uploaded files, outside ZDR; the official guidance is a prompt-engineered marker protocol, explicitly not a guarantee — [guide](https://developers.openai.com/api/docs/guides/citation-formatting)). The portable pattern, which is also the only pattern that composes with our structured-output discipline: **schema-level `{ docId, quote }` citation fields + client-side exact-substring verification against the source snapshot**. gaddr is unusually well positioned for this — the shared span-matcher being extracted in constellation §8 step 1 *is* that verifier. Run 2's S3/S4 should adopt quote-and-verify as the primary design, with the Citations API at most a provider-specific enhancement on a non-structured call.
2. **Constellation Run 1 D6** ("Sonnet for both stages, pinned snapshots") maps onto the registry as stage config; the Sonnet-vs-Opus A/B machinery generalizes to cross-provider A/Bs for free. The alias-only pinning caveat (P3) applies to D6's "pinned snapshots" wording.
3. **Batch lane (Run 2)**: parity is close (both 50% off; Anthropic 29-day retention, OpenAI 30-day output files; **neither is ZDR-eligible**) — the delete-step obligation already in the plan covers both.
4. **`pause_turn`** stays in the neutral vocabulary as Anthropic-only; the OpenAI adapter never emits it and nothing downstream cares.

---

## 5. Sequencing

1. Neutral outcome enum in `structured-call.ts` + anthropic-client translation + tests (pure rename, spark suite must stay green).
2. `providers.ts` registry + `deps.ts` swap (behavior-identical for Anthropic-only config).
3. `openai-client.ts` + contract-test table (store:false asserted, outcome mapping rows, null-`incomplete_details` guard, reasoning-effort pin).
4. `assertPortableSchema` lint over the prompt registry.
5. Usage/telemetry cached-token fields (piggyback on the constellation migration — no standalone migration needed).
6. Spark-on-OpenAI branch: prompt tune + corpus/yield verification per §3; ship stage-by-stage.

Steps 1–4 are safe to land before any switch and are prerequisites for the constellation plan's adapters anyway — building Run 1's discovery/nodes adapters against the neutral vocabulary costs nothing extra and avoids a later migration.

---

## Sources

**Verified 2026-07-16.** TS layers: [AI SDK v7](https://vercel.com/blog/ai-sdk-7) · [v7 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) · [repair-hook gap](https://github.com/vercel/ai/issues/11696) · [Anthropic schema passthrough issue](https://github.com/vercel/ai/issues/13355) · [Zechner](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) · [Ronacher](https://lucumr.pocoo.org/2025/11/21/agents-are-hard/) · [futuresearch quirks](https://futuresearch.ai/blog/llm-provider-quirks/). Gateways: [Vercel AI Gateway ZDR](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr) · [cache TTL downgrade](https://www.danielternyak.com/articles/vercel-ai-gateway-downgrades-anthropic-prompt-cache) · [OpenRouter terms](https://openrouter.ai/terms) · [Cloudflare logging](https://developers.cloudflare.com/ai-gateway/observability/logging/) · [LiteLLM config](https://docs.litellm.ai/docs/proxy/config_settings). Parity: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) · [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) · [pricing](https://developers.openai.com/api/docs/pricing) · [deprecations](https://developers.openai.com/api/docs/deprecations) · [your-data](https://developers.openai.com/api/docs/guides/your-data) · [citation formatting](https://developers.openai.com/api/docs/guides/citation-formatting) · [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [citations](https://platform.claude.com/docs/en/build-with-claude/citations) · [data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) · [stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) · [Anthropic OpenAI-compat](https://platform.claude.com/docs/en/api/openai-sdk).
