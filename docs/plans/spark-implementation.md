# Spark — Implementation Plan

**Status:** approved plan, 2026-07-03. Revised same day after a two-reviewer audit (AI-research + systems); accepted deltas are folded in below and listed in §10.
**Spec:** `docs/product/spark.md` (the product contract; this plan does not restate it).
**Companions:** `docs/research-agentic-harness-constellation.md` (harness practices this plan seeds), `docs/product/positioning.md`, `docs/architecture.md`.

**One-liner:** Ship summonable spark cards with pre-warmed candidates, durable spark logging in Postgres, and — as the load-bearing side effect — gaddr's first real server-side inference foundation, shaped so the constellation harness (S1–S5) extends it rather than replacing it.

---

## 1. Decisions already made

Settled with Jackson 2026-07-03:

1. **Pre-warm from day one.** Candidate sparks are prepared in the background off the existing trigger pipeline so a summon renders in <1s. Accepted tradeoff: the draft leaves the client during the sprint (not only on summon). The observer-effect contract still holds absolutely — pre-warming produces **zero** UI change, network-status indication, or DOM mutation.
2. **Postgres now.** A `spark_event` table (first product table beyond auth) plus a durable, client-generated UUID `SprintId` — fixing the known collision debt. Guard metrics and the constellation handoff get real data from day one.
3. **Foundation + Spark only.** This plan builds the shared LLM infrastructure (client factory, structured-call discipline, prompt registry, attempt telemetry) with Spark as its only consumer. The during-sprint triage/analysis mocks are untouched; migrating them to this foundation is a documented follow-up.

Decisions made in this plan (rationale inline below): one generation call returns a ranked candidate set (serve top, re-roll from the set — no second model call); Haiku-class model using the **single-call delayed-structure** pattern (reason first, then emit JSON — free under pre-warm); served-lens state is **derived server-side from `spark_event`**, never trusted from the client; candidate selection is seeded deterministically per sprint; a pure spark-session state machine in `domain/`; one route for prepare and summon-fallback; deterministic mock adapter behind the same route for evals.

---

## 2. Architecture overview

Functional core / imperative shell, same as everything else. New code by layer:

```
src/domain/spark/
  types.ts            SparkLens, SparkCandidate, SparkCandidateSet, SparkEvent
  validate-spark.ts   the dimensional-boundary validator (pure, unit-tested)
  select-spark.ts     candidate selection, lens rotation, cache-staleness rule,
                      countWords, minimumGround
  spark-session.ts    pure reducer for the summon/card lifecycle
  ports.ts            SparkGenerationPort, SparkEventSink

src/infra/llm/
  anthropic-client.ts server-only SDK client factory (env: ANTHROPIC_API_KEY)
  structured-call.ts  shared call discipline: stop_reason branch, parse,
                      bounded repair, InferenceError mapping   ← harness seed
  prompts/spark.ts    versioned four-field prompt + wire schema ← registry seed
  spark-adapter.ts    real SparkGenerationPort (composes the above; owns input_hash)
  mock-spark-adapter.ts deterministic port for E2E/eval mode

src/infra/db/
  schema.ts           + spark_event, + inference_attempt
  spark-event-repo.ts SparkEventSink adapter (insert-only, dedup on event id)

src/app/api/spark/route.ts         POST — generate candidates (prepare & summon)
src/app/api/spark/events/route.ts  POST — client-side event log (fire-and-forget)

src/app/(protected)/editor/
  use-spark.ts        hook: wires reducer ↔ triggers ↔ routes ↔ editor
  spark-affordance.tsx / spark-card.tsx   the two UI pieces
```

Data flow:

```
                     writer types … pauses (production-pause trigger, existing)
                                        │  (throttled; ≥N new words since last prepare)
              POST /api/spark  {draft, draftWordCount, sprintElapsedMs, sprintId, reason:"prepare"}
                                        │
              server derives servedLenses from spark_event(sprintId)   ← never client-trusted
                                        │
                        structured-call → validate each candidate → log attempt
                                        │
                     candidate set cached in client hook state (nothing renders)
                                        │
   writer hits ⌘. ──► cache fresh? ──yes──► render selected candidate  (<100ms)
                          │ no                       │
                          └──► same route,           ├─ "different spark" → next candidate
                               reason:"summon",      │   from the SAME set (instant, once)
                               quiet placeholder     └─ first keystroke → card fades
                               (~1–2.5s)
                                        │
         every served / rerolled / faded / dismissed / failed event → POST /api/spark/events
                                        │
                              spark_event rows (Postgres, keyed by sprint UUID)
                                        │
                     future constellation run reads these for no-double-serving
```

---

## 3. Domain design

### 3.1 Types

```ts
// The closed lens taxonomy. A closed enum, not free text — routing fields are
// enums (harness doc §2), and rotation logic needs equality.
export type SparkLens =
  | "economic" | "historical" | "personal" | "adversarial" | "definitional"
  | "causal" | "comparative" | "scale" | "temporal" | "ethical";

export type SparkCandidate = {
  readonly lens: SparkLens;
  readonly question: string;        // one line, ends with "?"
  readonly grounding: string;       // verbatim span copied from the draft
};

export type SparkCandidateSet = {
  readonly sprintId: SprintId;
  readonly candidates: readonly SparkCandidate[];  // 2–3, distinct lenses, ranked
  readonly draftWordCount: number;  // staleness anchor
  readonly promptVersion: string;
};
```

Sparks are **not** `Finding`s and do not enter the substrate. They are their own type with their own validator — a spark is pre-commitment, a finding is post-commitment; conflating them would let constellation machinery leak into the sprint loop (the regime boundary the harness doc's amendment warns about).

Provenance: a spark is always `inferred`. The type carries no tier field — it's a constant of the feature, enforced at the constellation handoff, not a degree of freedom.

### 3.2 The dimensional-boundary validator (`validate-spark.ts`)

The spec's grammar — one question, one unnamed dimension, nothing else — enforced structurally, in the spirit of `validateFinding`:

- non-empty, single line, ends with `?`
- length cap ~120 chars (a spark is tighter than a finding note; "What about affordability?" is the archetype)
- exactly one question — reject multi-`?` compounds
- **no declarative preamble:** reject candidates with a declarative independent clause before the question (structural check on sentence shape, not a connective blacklist — `because`/`which means` are legitimate *inside* a causal or comparative question; a leading assertion is not). Known gap, named honestly: a **leading/rhetorical question** ("Isn't mass production the real cause?") passes every structural check while asserting a stance. That vector is handled by the prompt's explicit boundaries (§4.2) and is a mandatory reject category in the human quality rubric (§7) — the one place that can catch what a regex cannot.
- no draft ghost-echo: reject if the question **minus its grounding span** shares a clause-length n-gram (~7 words) with the draft (it must add a dimension, not mirror one; the grounding span is exempt or this rule would contradict the next one)
- `grounding` must be non-empty and appear in the draft **after normalization** (lowercase, collapse whitespace, strip punctuation on both sides). The prompt instructs the model to copy the span verbatim (§4.2), and normalization absorbs the paraphrase drift a Haiku-class model still introduces — exact raw-substring matching would silently starve the candidate pool.
- lens must be a member of the closed taxonomy (wire value outside the enum ⇒ candidate rejected)

Candidates failing validation are dropped individually **with a machine-readable reject reason** (recorded per attempt, §4.4 — the reject-reason distribution is a day-one quality signal, not debug noise); a set is servable if ≥1 survives. All-fail ⇒ the repair loop in infra (one retry with the exact validator errors), then quiet failure.

### 3.3 Selection and staleness (`select-spark.ts`)

Pure functions, unit-tested, no clocks, no `Math.random`:

- `isCacheServable(set, currentWordCount)` — servable iff the draft has grown fewer than ~60 words **and shrunk fewer than ~15 words** since preparation (any-shrink invalidation would cache-miss on every typo fix; a large deletion still invalidates because the ground changed). Numbers are named constants; `spark_event` logs the fields needed to calibrate them (§4.4).
- `selectSpark(set, servedLenses, seed)` — picks among the highest-ranked candidates whose lens hasn't been served this sprint, tie-broken by a **deterministic seed derived from `sprintId`** so two writers with similar drafts don't both get the model's favorite lens for the topic (purity-safe stochasticity: same sprint always selects the same way; different sprints vary). `servedLenses` comes from the server (§4.5), so it survives reload.
- **Honest scope note:** within-sprint rotation plus seeded selection is a *variety* mechanism, not a defense against the cross-writer homogenization the spec names (Doshi & Hauser) — that requires cross-session lens weighting, which stays a documented follow-up fed by `spark_event`. Until it ships, expect the §7 offline diversity check to be the only early-warning signal; do not present rotation as more than it is.
- `minimumGround(wordCount)` — Spark serves only with ≥ ~15 words of draft; below that there is nothing to ground on and "never ungrounded" wins. A summon below minimum ground is a **quiet no-op** (nothing renders, logged as `failed`/`insufficient-ground`). The affordance itself is visually constant at all times — no enabled/disabled duality — because a typing-driven class change would violate the §5.3 contract audit.
- `countWords(draft)` — lives here (pure); the client hook and the route both use it rather than inventing their own.

### 3.4 The spark-session reducer (`spark-session.ts`)

The card lifecycle is a small pure state machine so the interruption contract is testable without a browser:

```
resting ──summon──► showing(candidate, rerollAvailable)
   ▲                    │ reroll (once) ──► showing(next, rerollSpent)
   │                    │ first keystroke / escape / sprint end
   └────── spent ◄──────┘
resting ──summon(no fresh cache)──► summoning ──candidatesReady──► showing
                                        └─failed / timeout──► fizzle ──► spent
spent ──writer edits──► resting
```

Invariants encoded as reducer laws (each a unit test):

- nothing transitions out of `resting` except `summon`
- `candidatesReady` is **ignored in every state except `summoning`** (a late response after Escape/keystroke/sprint-end must not resurrect a card)
- `reroll` is accepted at most once per showing
- any keystroke in `showing` goes to `spent`; Escape or sprint end in `showing` also goes to `spent` (logged as `dismissed`)
- `spent` requires an edit to re-arm — the "affordance rests until the writer writes again" rule

Sprint phase gates the whole machine: active only while `running`.

### 3.5 Ports

```ts
export interface SparkGenerationPort {
  generate(input: {
    readonly draft: string;
    readonly sprintId: SprintId;
    readonly servedLenses: readonly SparkLens[];  // supplied by the route from spark_event
  }): Promise<Result<SparkCandidateSet, InferenceError>>;
}

export interface SparkEventSink {
  record(event: SparkEvent): Promise<Result<void, PersistenceError>>;
}
```

Same interface-segregation stance as the existing tier ports. `SparkGenerationPort` is deliberately shaped like a miniature S1 ("read the draft, emit typed structured candidates") — the first concrete instance of the pattern every harness stage will follow. The port stays ignorant of the database; the route composes the served-lens query with the port call.

### 3.6 Durable SprintId — full lifecycle, one atomic change

`SprintId` becomes a client-generated `crypto.randomUUID()`. This migration spans domain, persistence, and app shell and **must land as one step** (§8) — tightening the brand validator alone breaks `use-background-inference`'s counter ids and two existing unit tests. The lifecycle, made explicit:

- **Mint once per *logical* sprint, at creation:** in `startSprint` and in `handleWizardResume` (resume-of-stale is a new logical sprint continuation carrying the persisted id if present, minting only when absent). The id is part of `PersistedSprintState` (schema version bump in `sprint-persistence.ts`), so **restore-on-mount rehydrates the existing id** — a reload mid-sprint keeps the same sprint identity.
- **Expose and thread:** `SprintSession` gains a `sprintId` field; `minimal-editor` threads it to `use-background-inference` (which stops minting its own counter) and to `use-spark`.
- **Reset on id change, not on the `active` edge.** Today `use-background-inference` resets on each `active` false→true edge — under a durable id, pause→resume would wrongly wipe the substrate (and the spark cache). Both the runner reset and the spark cache/reducer reset key on *sprintId change*.
- **`PLACEHOLDER_SPRINT_ID` is retired from any persistable path:** it may survive only as the runner's pre-first-reset in-memory state, provably never written to Postgres or joined against. The brand validator tightens to UUID shape; all `"sprint-test"`-style literals in unit tests are updated in the same change.
- **Served-lens durability for free:** because the route derives `servedLenses` from `spark_event` by sprint id (§4.5), the no-double-serving and rotation guarantees survive reload without any client-side lens state being trusted or persisted.

This retires the `sprint-${counter}` collision debt that both spark logging and every future persistence layer (constellation runs) depend on.

---

## 4. Infrastructure design

### 4.1 The shared structured-call discipline (`structured-call.ts`) — harness seed

One function, reused by every future stage, encoding the harness doc's generation-reliability rules (§2):

1. Call via the Anthropic SDK with a JSON output schema (wire schema kept inside strict-mode limits; richer constraints live in domain validators — exactly the existing `validateFinding` split).
2. **Branch exhaustively on `stop_reason`** before touching content: `refusal` → non-retryable `InferenceError{reason:"malformed-output"}`; `max_tokens` → one retry with a larger budget; `pause_turn` → continue the turn; `end_turn` → parse.
3. Parse, then hand to the caller's domain validator. Validation failure ⇒ **one** repair retry carrying the exact validator error text; second failure ⇒ error out (Spark's cap is 1, tighter than the harness's 2 — a spark is disposable). Revisit the cap only after first-attempt yield data exists (§4.4/§7); a sustained repair rate is a prompt/schema defect signal, not an operating cost.
4. Map every SDK/transport failure into the existing `InferenceError` variants (which exist today but nothing emits). No exception escapes an adapter.
5. Emit one `inference_attempt` record per attempt (see 4.4).

**Generation shape: single call, delayed structure.** Spark's task (lens-gap inference + grounding + stance avoidance on a Haiku-class model) is not confidently easy-band, and under pre-warm the reasoning phase costs nothing on the keystroke path — so the wire schema leads with a bounded free-text `analysis` field (lenses present in the draft, lenses absent, grounding notes) *before* the `candidates` array. That is the harness doc's think-free/extract-strict split collapsed into one call: most of the capacity insurance, none of the latency. The helper's signature leaves room for a true two-call mode when S1/S3 need it.

Model: Haiku-class (`claude-haiku-4-5-*`), id in the prompt module, never hardcoded at call sites. One call generates the whole candidate set (~3 one-line questions), so cost per prepare is trivially small and re-roll is free.

### 4.2 Prompt (`prompts/spark.ts`) — registry seed

Exports `SPARK_PROMPT_VERSION`, the system prompt, and the wire schema. The prompt is authored as the **four-field worker contract** — the strongest-verified claim in the harness research ([Holds], MAST: spec defects are the largest failure class) and the template every future stage inherits:

1. **Objective** — identify the lenses the draft already works in; propose 3 questions from distinct lenses the draft *lacks*, sharpness scaling with draft richness (Journey-H degradation lives here, not in a separate code path).
2. **Output format** — the wire schema: `analysis` first (delayed structure), then candidates, each `{lens, question, grounding}`.
3. **Source guidance** — ground each question in a specific span; **copy the grounding span verbatim from the draft, character-for-character** (the validator matches it after normalization; paraphrased grounding is dropped).
4. **Explicit boundaries** — never assert a stance; no leading or rhetorical questions (a question that presupposes its answer is a stance); no positions, counterarguments, or prose; exclude `servedLenses`; one line each.

The stance/format rules are stated in the prompt **and** enforced by the validator — prompt wording is never the sole enforcement mechanism (architecture.md §6.6 stance, applied to Spark), but for the rhetorical-question vector the prompt boundary plus the human rubric are the effective guards (§3.2).

Convention set here for the harness: one module per stage, exporting `{version, system, schema}`; the attempt log records the version; changing a prompt means bumping the version — diffs in git are the registry.

### 4.3 Adapters

- `spark-adapter.ts`: thin composition of client + prompt + structured-call + `validate-spark`. Computes `input_hash` (crypto is infra's job, not domain's). No business logic.
- `mock-spark-adapter.ts`: deterministic, in the style of the existing mocks — derives plausible lens questions from surface cues of the draft. Selected by the route when `isE2ETesting()` — which requires `E2E_TESTING=true`; see §7 for the exact eval env combination. This mock-behind-the-real-route pattern (rather than today's mock-in-the-browser) is the template for the eventual `/api/triage` migration.

### 4.4 Schema (Drizzle migration)

```ts
spark_event: {
  id           uuid pk        // client-generated for client events, server-generated
                              // for route events; insert is on-conflict-do-nothing,
                              // so at-least-once delivery can't double-count metrics
  user_id      text → user.id (cascade)
  sprint_id    uuid           // opaque; no FK yet — the sprint table arrives with
                              // the constellation-run schema and joins on this
  type         text           // 'prepared'|'served'|'rerolled'|'faded'|'dismissed'|'failed'
  detail       text null      // failure/dismiss reason: 'insufficient-ground'|'transport'|
                              // 'validation-exhausted'|'rate-limited'|'escape'|'sprint-end'
  lens         text null      // null for prepared/failed
  question     text null
  draft_word_count  integer   // sprint position, content-free (client-supplied; countWords)
  sprint_elapsed_ms integer   // client-supplied (server has no sprint clock)
  cache_age_ms      integer null   // on served/faded: staleness calibration (§3.3)
  words_since_prepare integer null // ditto — without these the "tune against logs"
                                   // promise is not computable
  prompt_version text
  created_at   timestamp default now()
}
-- index: (user_id, sprint_id) — the no-double-serving query and every guard metric hit it

inference_attempt: {
  id           uuid pk
  user_id      text → user.id
  stage        text           // 'spark' now; 'triage'|'claims'|… later
  input_hash   text           // hash(draft+promptVersion+schemaVersion+modelId) — no content
  prompt_version text
  model_id     text
  outcome      text           // 'ok'|'validation-failed'|'refusal'|'max-tokens'|'transport'|…
  retry_count  integer
  candidates_returned integer // wire-level count before validation
  candidates_valid    integer // survivors — returned vs. valid is the YIELD metric
  reject_reasons      text null // comma-joined validator codes; the §7 quality lane reads this
  latency_ms   integer
  input_tokens / output_tokens integer
  created_at   timestamp default now()
}
```

Content posture, both directions:

- **Inbound/at rest:** the draft is never persisted server-side and never appears in telemetry — `inference_attempt` stores hashes and counts only (OTel GenAI content-capture-off posture, harness doc §7). The spark question text is stored in `spark_event` because it is the served artifact the guard metrics and no-double-serving need — it is model output, not writer prose.
- **Outbound:** pre-warm transmits the evolving freewrite to Anthropic several times per sprint — a multiplied exposure relative to on-summon-only, and the freewrite is the writer's most private artifact (the whole Spark contract rests on that). Requirement, not a nice-to-have: the workspace posture must be documented in `docs/infra.md` before launch — API data not used for training (org-level default) confirmed, ZDR eligibility pursued/decided explicitly, and Console prompt-logging visibility reviewed. The harness doc frames retention as a product decision (§6); pre-warm makes it Spark's decision too.

`inference_attempt` is deliberately the harness's observability spine started early: retry-rate regressions, validation-failure spikes, and first-attempt yield become SQL queries on day one, and every future stage just writes a different `stage` value.

### 4.5 Routes

`POST /api/spark` — body `{draft, draftWordCount, sprintElapsedMs, sprintId, reason: "prepare"|"summon"}` (reason is telemetry + rate-class only; the work is identical). Thin per architecture.md §8.2: require session (existing `require-session`) → validate input shape, **including a draft length cap (~50k chars, reject over)** → derive `servedLenses` from `spark_event` for this sprint id (never from the client) → port → map `Result` to 200/4xx. Writes its own `prepared`/`failed` spark_events server-side (word count and elapsed-ms from the client-supplied fields — the server has no sprint clock).

Rate limiting: the coarse per-user cap (~10/min) applies to **`reason:"prepare"` only. `summon` is exempt** — background work must never be the reason the one request the writer consciously made returns 429. (Summon volume is inherently self-limited by the reducer: one card, one re-roll, re-arm requires typing.)

`POST /api/spark/events` — accepts a small batch of client-side events (`served`, `rerolled`, `faded`, `dismissed`), each carrying its client-generated uuid; insert on-conflict-do-nothing (dedup under retry/StrictMode). Fire-and-forget from the client (`navigator.sendBeacon` on pagehide, batched otherwise); losing one is acceptable, blocking the writer is not. Note the split write model: `prepared`/`failed` rows come from `/api/spark`, the rest from this route — loss skews client-event metrics slightly, duplication never does.

---

## 5. App shell design

### 5.1 `use-spark.ts`

Owns lifecycle glue only (the `use-background-inference` philosophy): holds the reducer state and the candidate cache; consumes the **existing** trigger stream. Concretely: `useTriggerDetector` takes a single observer, so `minimal-editor` composes one combined observer that fans out to `inference.observe` and `spark.observe` — **do not instantiate a second detector** (it would double-run the idle tick and fork the burst anchor). On a qualifying trigger (production-pause at a meaningful boundary, ≥N new words since last prepare, none in flight — one-in-flight/keep-freshest, mirroring the runner's throttle), it calls `/api/spark` and replaces the cache. On summon it consults `isCacheServable`; fresh ⇒ dispatch `candidatesReady` synchronously, stale/missing ⇒ fire the summon-path request. Keystroke and sprint-phase events feed the reducer.

Concurrency rules, learned from the runner's generation counter:

- Every in-flight request captures the `sprintId` it was issued for; **a resolution whose sprint id no longer matches the current one is dropped** — a prepare from sprint A must never populate sprint B's cache, and a stale summon response is discarded (the reducer's `candidatesReady`-only-in-`summoning` law is the second line of defense).
- The hook must be **StrictMode-safe** like `use-background-inference`: idempotent setup, single subscription, no double-prepare on the simulated double-mount.
- Sprint id change (not the `active` edge — §3.6) clears the cache and resets the reducer.

All decisions live in the pure module; the hook just wires.

### 5.2 UI pieces

- **Affordance:** a small fixed glyph at the sprint surface's edge. Static and **visually constant** — never animated, never badged, no hover pulse, and no enabled/disabled visual states (a threshold-crossing class change while typing would violate §5.3). `⌘.` bound at the editor layer (verified unbound today).
- **Card:** renders adjacent to the affordance at the surface edge — never at the cursor, never overlaying text. One line, quiet type. `showing` includes a small "different spark" control, which disappears after one use. Fade-out on first keystroke is a pure opacity transition then unmount; Escape dismisses. The summon-fallback placeholder is a calm static glyph (no spinner language).
- **Below minimum ground:** a summon with <~15 words is a quiet no-op — nothing renders at all, logged `failed`/`insufficient-ground`. Consistent with the fizzle posture; an edge case confined to the first seconds of a sprint.
- **Failure fizzle:** if the fallback path errors or exceeds ~4s, the placeholder dissolves and the affordance rests (re-armed by the next edit). No error chrome, no toast, no retry button — logged as `failed`, invisible to the writer beyond the non-arrival. No canned fallback question: ungrounded content is worse than silence (spec §3/§5).

### 5.3 Contract audit (what "never unbidden" means in code)

Pre-warm requests, cache replacement, and event logging cause **no render, no class change, no cursor or scroll effect**. The only DOM consequences of the entire feature before a summon are the static affordance mounting with the sprint surface. This is an eval assertion, not just a review note (§7) — and it is why the affordance has no typing-driven visual states (§5.2).

---

## 6. Constellation handoff & extension map

Built now, consumed later:

- **No-double-serving:** the future constellation run (S1) queries `spark_event` by sprint UUID (indexed, §4.4) for served/rerolled lenses+questions; a sparked dimension may only appear *developed*. The query contract is one indexed select — the same query the spark route itself uses to derive `servedLenses`, so it is exercised from day one.
- **Warm start:** served sparks and their grounding phrases join the substrate summary as S1 warm-start input.

What each piece becomes:

| Built for Spark | Harness role |
|---|---|
| `structured-call.ts` | generation discipline for S1/S3 (stop_reason, repair, error mapping, delayed structure) |
| `prompts/spark.ts` four-field convention | the prompt registry all stages follow |
| `inference_attempt` (incl. yield fields) | per-attempt observability spine; `stage` column already generalizes |
| Durable sprint UUID | the key `constellation_run` hangs off |
| `spark_event` | first instance of the append-only, sprint-keyed, dedup-by-event-id pattern |
| Mock-behind-route + `isE2ETesting()` | template for migrating `/api/triage`, `/api/analysis` server-side |
| Wire-schema-thin / domain-validator-rich split | S3/S4 validation architecture |
| `SparkGenerationPort` shape | the per-stage port pattern (S1 `ClaimExtractionPort`, etc.) |

Explicitly **not** built now: retrieval, entailment/judges, durable workflow runner, batch lane, pause-anchored constellation nodes (trail-off logging beyond what the trigger detector already captures is constellation-schema work), cross-session lens weighting (§3.3 names the consequence), the deferred "guided sprint" push mode.

---

## 7. Testing & evals

**Unit (bun test, domain only):** validator accept/reject table (declarative preamble, compound questions, ghost-echo with grounding exemption, ungrounded, normalization-tolerant grounding match, over-length); reducer laws (one re-roll, keystroke ⇒ spent, `candidatesReady` ignored outside `summoning`, spent re-arms only on edit, resting exits only via summon); staleness incl. shrink tolerance; seeded selection determinism; UUID sprint-id round-trip through persistence (start, pause/resume same id, restore same id).

**Contract tests (infra):** structured-call against a stubbed SDK — each `stop_reason` branch, repair-retry carries validator text, attempt records written with yield fields; adapter maps every SDK failure to `InferenceError`.

**`eval/spark.json`** (plain-language workflow, agent-browser; run with **`E2E_TESTING=true E2E_BYPASS_AUTH=true bun run dev`** — both variables: the first selects the mock adapter via `isE2ETesting()`, the second bypasses OAuth; update CLAUDE.md's testing note to match): summon mid-sprint renders exactly one one-line question; typing fades it; re-roll yields one alternative then the control disappears; a full sprint with no summon shows **zero** spark UI beyond the static affordance (the contract eval); summon at ~15 words still works (Journey H); pause→resume→summon keeps working under the same sprint id; spark rows exist afterward.

**Spark quality lane (offline, the "does it click" test — this decides whether Spark is good, not just safe):**

- Corpus: **20–30 real freewrites** (start collecting now; this seeds the golden corpus the harness doc mandates).
- Structured rubric per generated set, human-scored: *grounded* (derives from the draft), *novel dimension* (a lens the draft genuinely lacks, not one it already works), *non-leading* (*rhetorical/leading question is a mandatory reject category — the vector the validator cannot catch*, §3.2), *single clear question*. Pinned by prompt version; regenerated on version bump.
- **Yield metric:** fraction of prepares whose first attempt produces ≥1 servable candidate (from `candidates_returned` vs. `candidates_valid`), plus the reject-reason distribution. Validator-pass-rate on *served* sparks is trivially 100% and proves nothing; yield is the number that catches a starving pipeline.
- **Offline diversity check:** run 3–4 fixed topics through the generator N times each; measure lens spread and phrasing variance. This is the cheap early warning for the cross-writer homogenization that §3.3 admits v1 does not defend against.
- Fast-follow (documented, not v1): a cross-family LLM judge on the rubric dimensions (harness doc §4 — never a same-family-only judge).

**Guard metrics:** usage-shape queries (sparks/sprint, ignore rate, re-roll rate, time-to-keystroke after serve, cache-age at serve) are SQL on `spark_event` from day one. Interpret ignore-rate with care: Journey G (spark ignored, writer unstuck anyway) is a *success*, so ignore-rate alone under-determines quality — the rubric lane is the quality instrument. Dependence and homogenization metrics need corpus accumulation — defined in the spec, computed later, but the rows they need are being written from the first release.

---

## 8. Sequencing

Feature-workflow order (architecture.md §11), each step landing green:

1. **Spark domain (pure, mergeable alone):** `spark/` types, validator, selection, `countWords`, reducer + unit tests. No dependency on ids, keys, or migrations.
2. **SprintId migration (one atomic step — not splittable):** brand validator to UUID + `sprint-persistence` schema bump + mint/restore/resume lifecycle in `use-sprint-session` + `SprintSession.sprintId` + `minimal-editor` threading + `use-background-inference` rewire (reset-on-id-change) + retirement of persistable `PLACEHOLDER_SPRINT_ID` paths + update of every `"sprint-*"` test literal. Splitting this breaks background inference silently (validator rejects counter ids ⇒ resets stop firing).
3. **Infra foundation:** Anthropic client, `structured-call` (delayed-structure mode), prompt module (four-field), real adapter, contract tests. Env: `ANTHROPIC_API_KEY` (dev + Vercel); document the outbound data posture (§4.4) in `docs/infra.md`.
4. **Schema:** `spark_event`, `inference_attempt` migration (+ index, + dedup ids) + event-sink adapter.
5. **Routes:** `/api/spark` (mock-vs-real via `isE2ETesting()`, session guard, draft cap, prepare-only rate cap, server-derived lenses), `/api/spark/events`.
6. **UI:** `use-spark` (cancellation + StrictMode rules per §5.1), combined trigger observer, affordance, card, `⌘.`, sprint-phase gating.
7. **Evals:** `eval/spark.json` (+ CLAUDE.md env-var note), contract-audit assertions, spark quality lane on the freewrite corpus (§7).

Step 1 is pure and independent; 3 and 4 are independent of each other once 2 has landed; 5+ integrates.

## 9. Risks

- **Yield collapse from over-strict validation** — the paraphrase-tolerant grounding match, per-candidate reject logging, and the yield metric exist to catch this; if first-attempt yield is low, the fix is prompt/validator tuning, not raising the repair cap first.
- **Stance leakage past the structural validator** — the rhetorical-question vector is structurally uncatchable; prompt boundaries + the mandatory rubric category are the guards, and the validator errs toward rejection (a dropped candidate costs nothing; the set has spares).
- **Homogenization is not defended in v1** — stated plainly in §3.3; the offline diversity check is the early warning, cross-session weighting is the fix, and the data to build it accumulates from day one.
- **Pre-warm cadence vs. cost/egress** — the word-delta throttle bounds calls to a handful per sprint; `inference_attempt` makes actual volume a query. Outbound retention posture is a launch requirement (§4.4).
- **Staleness constants are guesses** — `cache_age_ms`/`words_since_prepare` on served/faded events make the 60/15-word rules calibratable against real fade/dismiss behavior.
- **`⌘.` collisions with browser/OS bindings** on some layouts — keep the visible affordance first-class; the hotkey is an accelerator, not the only path.

## 10. Review log (2026-07-03)

Two independent Opus reviews (AI-research lens; systems/architecture lens). Accepted and folded in: SprintId full lifecycle + atomic migration step + reset-on-id-change; server-derived served lenses; sprint-scoped request cancellation + StrictMode rules + `candidatesReady` reducer law; visually-constant affordance (resolving the §5.2/§5.3/Journey-H contradiction); prepare-only rate cap; `spark_event` index, event-id dedup, `detail`/calibration columns, client-supplied word-count/elapsed fields; eval env-var correction (`E2E_TESTING` + `E2E_BYPASS_AUTH`); normalized verbatim grounding match; structural stance check replacing the connective blacklist + grounding-exempt ghost-echo; honest homogenization scoping + seeded selection + offline diversity check; delayed-structure single call; four-field prompt contract; yield metric + reject-reason logging + 20–30-freewrite rubric lane; outbound data-retention requirement; draft length cap; observer fan-out specification; shrink tolerance. Declined: none outright; the cross-family LLM judge and cross-session lens weighting are deferred (documented fast-follows), not rejected.
