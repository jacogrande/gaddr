import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  index,
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
  modelId: text("model_id").notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
