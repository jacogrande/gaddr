import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ── Spark: the first product tables beyond auth (plan §4.4) ──────────────────
//
// CONTENT POSTURE (plan §4.4 — binding, both directions):
//   - NO draft text may EVER land in either table. The freewrite is the
//     writer's most private artifact and never persists server-side.
//   - `inference_attempt` stores hashes and counts only — never content.
//   - `spark_event.question` is the sole text column and it holds MODEL OUTPUT
//     (the served spark question), NOT writer prose. It is stored because it is
//     the served artifact the guard metrics and the no-double-serving query
//     need — nothing the writer typed is ever copied here.

/**
 * Durable Spark telemetry — one row per spark lifecycle event (plan §4.4).
 *
 * The primary key IS the dedup key: client-originated events carry a
 * client-generated UUID, server-originated events (`prepared`/`failed` written
 * by the route) get a server-generated one. Inserts are on-conflict-do-nothing
 * on this pk, so at-least-once delivery (client retries, React StrictMode double
 * fire, `sendBeacon` replays) can never double-count a metric.
 */
export const sparkEvent = pgTable(
  "spark_event",
  {
    // Client-supplied for client events, server-generated otherwise. No DB
    // default: the adapter always supplies the id so the value is the dedup key
    // under our control, not the database's.
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Opaque durable sprint UUID. Deliberately NO foreign key: the `sprint`
    // table does not exist yet — it arrives with the constellation-run schema,
    // which will join on this column (plan §3.6/§4.4). Adding the FK now would
    // reference a missing table.
    sprintId: uuid("sprint_id").notNull(),
    // SparkEventType: 'prepared'|'served'|'rerolled'|'faded'|'dismissed'|'failed'.
    type: text("type").notNull(),
    // SparkEventDetail — failure/dismiss reason; null for the non-terminal types.
    detail: text("detail"),
    // SparkLens — null for 'prepared'/'failed' (no served spark).
    lens: text("lens"),
    // MODEL OUTPUT, not writer prose (see the content-posture note above).
    question: text("question"),
    // Content-free sprint-position fields, client-supplied (server has no clock).
    draftWordCount: integer("draft_word_count").notNull(),
    sprintElapsedMs: integer("sprint_elapsed_ms").notNull(),
    // Staleness-calibration fields (plan §3.3) — present on served/faded only.
    cacheAgeMs: integer("cache_age_ms"),
    wordsSincePrepare: integer("words_since_prepare"),
    promptVersion: text("prompt_version").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // The no-double-serving query and every guard metric filter by
    // (user_id, sprint_id) — the composite index they all hit (plan §4.4).
    index("spark_event_user_sprint_idx").on(table.userId, table.sprintId),
  ],
);

/**
 * The harness observability spine, started early (plan §4.4). One row per model
 * call across every stage — `stage` already generalizes ('spark' now,
 * 'triage'/'claims'/… later). Retry-rate regressions, validation-failure
 * spikes, and first-attempt yield become SQL queries from day one.
 *
 * CONTENT-FREE: `input_hash` is hash(draft + promptVersion + schemaVersion +
 * modelId); no draft text, no model output text, is ever stored here.
 */
export const inferenceAttempt = pgTable("inference_attempt", {
  // Always server-generated — no client dedup semantics here.
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  // Correlates the attempt to its sprint when the stage has one (spark does;
  // future stages may not — hence nullable). No FK for the same reason as
  // spark_event.sprint_id. Lets per-sprint yield be a plain SQL slice instead
  // of a fuzzy input_hash+timestamp join.
  sprintId: uuid("sprint_id"),
  inputHash: text("input_hash").notNull(),
  promptVersion: text("prompt_version").notNull(),
  // The model that SERVED the call (provider-reported when available — the
  // alias-drift guard), not necessarily the requested id.
  modelId: text("model_id").notNull(),
  // The reasoning effort the stage requested (ReasoningEffort:
  // 'none'|'low'|'medium'|'high'|'xhigh'). Nullable: a stage may set none, and
  // pre-routing rows predate the column. Makes quality regressions attributable
  // to a (stage, model, effort) triple (model-routing research §4.4).
  effort: text("effort"),
  // InferenceAttemptOutcome: 'ok'|'validation-failed'|'refusal'|'max-tokens'|…
  outcome: text("outcome").notNull(),
  retryCount: integer("retry_count").notNull(),
  // Wire-level count before validation; null for non-parse attempts (e.g.
  // transport failures) and for non-spark stages that emit no candidates.
  candidatesReturned: integer("candidates_returned"),
  // Post-exclusion servable survivors — the YIELD metric (returned vs. valid).
  // Nullable: non-spark stages won't have candidate counts.
  candidatesValid: integer("candidates_valid"),
  // Comma-joined validator reject codes; the quality lane reads this. Null when
  // there is nothing to reject.
  rejectReasons: text("reject_reasons"),
  latencyMs: integer("latency_ms").notNull(),
  // NOT NULL to match the InferenceAttempt type and the emitter, which
  // zero-fills when the API returns no usage (transport failures). "0 tokens"
  // and "no usage data" are deliberately the same value — cost queries sum
  // both as 0, and no named guard metric needs to distinguish them.
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  // Prompt tokens served from the provider cache (Anthropic cache_read /
  // OpenAI cached_tokens). Nullable — the provider omits it when there was no
  // cache read, and pre-column rows predate it. Alert query: cache_read = 0 on
  // S3 calls means the shared-prefix cache never engaged (plan §5.5).
  cachedInputTokens: integer("cached_input_tokens"),
  // The constellation run this attempt belongs to, when the stage has one
  // (discovery/nodes:* do; spark does not — it carries sprint_id instead). No
  // FK: keeps the telemetry write off the run table's lock path, and per-stage
  // yield stays a plain SQL slice (plan §5.3).
  runId: uuid("run_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Constellation Run 1: the sprint-end pipeline's durable spine (plan §5.3) ──
//
// CONTENT POSTURE (plan §4.4/D11 — binding): the draft is NEVER at rest here.
// The POST carries it, the run holds it in memory, and only MODEL OUTPUT
// persists — star labels, node text, the S1 brief, and short verbatim grounding
// spans (the same class as spark_event.question). Resume re-sends the draft; the
// run_key hash proves it is the same draft without storing it.

/**
 * One durable, checkpointed run per (user, run_key). Persisted BEFORE any model
 * call (D3) so the board reads Postgres, not React state. `run_key` =
 * hash(draft ‖ versions ‖ models); a re-POST with the same key resumes from the
 * first incomplete stage instead of duplicating (the §5.4 lease gates execution
 * on staleness). `updated_at` is the staleness clock — touched at every
 * checkpoint transition.
 */
export const constellationRun = pgTable(
  "constellation_run",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Opaque durable sprint UUID; no FK (same posture as spark_event.sprint_id —
    // the sprint table still does not exist).
    sprintId: uuid("sprint_id").notNull(),
    // hash(draft ‖ promptVersions ‖ schemaVersions ‖ modelIds), NUL-separated.
    // Unique PER USER (the composite index below) — the resume/dedup key.
    runKey: text("run_key").notNull(),
    // RunStatus: 's1'|'s3'|'assembling'|'complete'|'failed'. The board reveals in
    // two beats — stars at 's3', nodes at 'complete' (D12).
    status: text("status").notNull(),
    // On failure: which stage died and why (partial-constellation UI, §3).
    failedStage: text("failed_stage"),
    errorReason: text("error_reason"),
    // S1's thesis/stance brief — MODEL OUTPUT, an S3 input, persisted so a resume
    // after S1 skips it (D3). Null until S1 completes.
    brief: text("brief"),
    // 'high'|'low' — drives graceful degradation. Null until S1 completes.
    confidence: text("confidence"),
    // The ⚡ crux star's id, chosen by assembly with a seeded tie-break — stored,
    // not re-derived at read time (D10/§4.4). Null when no counterargument
    // exists, or until assembly completes.
    cruxStarId: text("crux_star_id"),
    draftWordCount: integer("draft_word_count").notNull(),
    // Version fingerprints (also folded into run_key). Composite descriptors the
    // runner supplies (e.g. "discovery-v1+nodes-v1").
    promptVersion: text("prompt_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    modelId: text("model_id").notNull(),
    // Run-total token accounting, accumulated across the ~5 calls. BEST-EFFORT:
    // only checkpoint-winning calls roll up here, so a CAS-lost redundant call's
    // tokens are missed — `inference_attempt` (one row per call) is the
    // authoritative cost source; sum it for exact spend.
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // The staleness clock (§5.4): touched at every checkpoint.
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    // The resume/dedup key: a re-POST for the same (user, run_key) finds the
    // existing run instead of creating a second.
    uniqueIndex("constellation_run_user_key_idx").on(
      table.userId,
      table.runKey,
    ),
    // The board GET reads the latest run for a sprint.
    index("constellation_run_user_sprint_idx").on(
      table.userId,
      table.sprintId,
    ),
  ],
);

/**
 * A star: one of the writer's core ideas (`kind: 'star'`) or an off-map seed
 * (`kind: 'off-map'`). `id` is run-scoped and STABLE (`${runId}:${localRef}`) so
 * the S1 checkpoint upsert is idempotent and nodes resolve their star by the
 * same key. All fields are MODEL OUTPUT or the writer's own verbatim span
 * (grounding) — never draft prose at large.
 */
export const constellationStar = pgTable(
  "constellation_star",
  {
    id: text("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => constellationRun.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // StarKind: 'star'|'off-map'.
    kind: text("kind").notNull(),
    // PositionIntent: 'asserting'|'testing'|'wondering'.
    intent: text("intent").notNull(),
    weight: integer("weight").notNull(),
    grounding: text("grounding").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [index("constellation_star_run_idx").on(table.runId)],
);

/**
 * An assembled node — the card the board renders. `id` is run-scoped and STABLE
 * (`${runId}:n:${rank}`, deterministic from the pure assembly) so the assemble
 * checkpoint upsert is idempotent and the PATCH route can target a node by id.
 * `status`/`reaction` are the ONLY writer-mutated columns; the assemble upsert
 * is create-once and never clobbers them.
 */
export const constellationNode = pgTable(
  "constellation_node",
  {
    id: text("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => constellationRun.id, { onDelete: "cascade" }),
    starId: text("star_id")
      .notNull()
      .references(() => constellationStar.id, { onDelete: "cascade" }),
    // NodeKind: 'evidence'|'argument'|'counterargument'|'citation'|'direction'|'question'.
    kind: text("kind").notNull(),
    // ProvenanceTier — always 'inferred' in Run 1; the column exists for Run 2.
    tier: text("tier").notNull(),
    payoff: text("payoff").notNull(),
    body: text("body").notNull(),
    grounding: text("grounding").notNull(),
    cruxScore: integer("crux_score").notNull(),
    rank: integer("rank").notNull(),
    // From the caps: visible cards vs. the "more" partition.
    visible: boolean("visible").notNull(),
    // NodeStatus: 'unseen'|'opened'|'resolved'|'dismissed'|'deferred'.
    status: text("status").notNull().default("unseen"),
    // The writer's one-line reaction (D12) — written by the PATCH route only.
    reaction: text("reaction"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    statusChangedAt: timestamp("status_changed_at"),
  },
  (table) => [index("constellation_node_run_idx").on(table.runId)],
);
