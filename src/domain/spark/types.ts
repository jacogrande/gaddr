/**
 * Domain types for Spark — summonable, single-question thinking prompts served
 * during a freewrite (product contract: `docs/product/spark.md`).
 *
 * A spark is deliberately NOT a `Finding` and never enters the constellation
 * substrate. A spark is *pre-commitment* (it opens a dimension while the writer
 * is still deciding); a finding is *post-commitment* (it pushes on a case the
 * writer has already made). Conflating them would let constellation machinery
 * leak into the interruption-free sprint loop — the regime boundary this
 * feature exists to protect (plan §3.1). So Spark carries its own small type
 * family and its own validator (`validate-spark.ts`), rather than reusing the
 * finding pipeline.
 *
 * Provenance: a spark is always model reasoning over the freewrite — `inferred`
 * in the constellation's tier vocabulary. That is a constant of the feature,
 * enforced at the constellation handoff, so it is not modelled as a field here
 * (a tier field would imply it is a degree of freedom; it is not — plan §3.1).
 *
 * Purity: these are pure data shapes. An infra adapter translates Anthropic
 * wire payloads into `WireSparkCandidate` on the way in; nothing here imports a
 * framework or SDK type.
 */

import type { SprintId } from "../types/branded";

/**
 * The closed lens taxonomy — the dimensions a spark can open. A closed union,
 * not free text, for two reasons (plan §3.1): rotation logic needs value
 * equality to avoid serving the same lens twice in a sprint, and a routing
 * field with a fixed set of values is easier to reason about and log than an
 * open string. A wire value outside this union is a rejected candidate, not a
 * new lens (see `validate-spark.ts`).
 */
export type SparkLens =
  | "economic"
  | "historical"
  | "personal"
  | "adversarial"
  | "definitional"
  | "causal"
  | "comparative"
  | "scale"
  | "temporal"
  | "ethical";

/**
 * A validated spark: one dimensional question grounded in a verbatim span of
 * the writer's own draft. Produced only by the validator — the `lens` is known
 * to be a taxonomy member and `question` is known to satisfy the dimensional
 * grammar (one line, one question, no asserted stance, no draft echo).
 */
export type SparkCandidate = {
  readonly lens: SparkLens;
  /** One line, ends in exactly one "?". The dimensional question itself. */
  readonly question: string;
  /**
   * A span copied from the draft that the question grounds in. The prompt asks
   * the model to copy it verbatim; the validator matches it against the draft
   * after normalization, so minor paraphrase drift is tolerated (plan §3.2).
   */
  readonly grounding: string;
};

/**
 * The raw, UNVALIDATED shape of a candidate as it arrives from the model over
 * the wire. `lens` is an arbitrary string here (the model can emit anything);
 * validation narrows it to `SparkLens` or drops the candidate. Kept distinct
 * from `SparkCandidate` so the type system tracks "has this been validated?".
 */
export type WireSparkCandidate = {
  readonly lens: string;
  readonly question: string;
  readonly grounding: string;
};

/**
 * A prepared, validated set of candidates for one sprint. Held in the client
 * hook's cache and never rendered until the writer summons (plan §5.3). The
 * `candidates` are 2–3, of distinct lenses, ranked best-first — an invariant
 * the assembling adapter maintains, not one enforced per-candidate here.
 */
export type SparkCandidateSet = {
  readonly sprintId: SprintId;
  readonly candidates: readonly SparkCandidate[];
  /**
   * The draft word count at preparation time — the staleness anchor. Selection
   * compares the live count against this to decide whether the cache still
   * grounds in what the writer has written (see `isCacheServable`).
   */
  readonly draftWordCount: number;
  /** Prompt version that produced this set — threaded into telemetry. */
  readonly promptVersion: string;
};

/**
 * The lifecycle stages of a spark, logged to `spark_event` (plan §4.4). These
 * are durable telemetry — the no-double-serving query, the staleness
 * calibration, and every guard metric read them:
 *  - "prepared"  — a candidate set was generated in the background (no UI).
 *  - "served"    — a candidate was rendered to the writer on summon.
 *  - "rerolled"  — the writer asked for the one available alternative.
 *  - "faded"     — the card faded on the writer's first keystroke (it landed).
 *  - "dismissed" — the writer escaped, or the sprint ended, with a card up.
 *  - "failed"    — a summon produced nothing (see `SparkEventDetail`).
 */
export type SparkEventType =
  | "prepared"
  | "served"
  | "rerolled"
  | "faded"
  | "dismissed"
  | "failed";

/**
 * Why a spark failed or was dismissed — the `detail` column of `spark_event`.
 * A closed union so the reason distribution is a queryable signal, not free
 * text. Failure reasons: nothing to ground on, transport/model errors, the
 * validator exhausting every candidate, or rate limiting. Dismiss reasons: the
 * writer escaped, the sprint ended under the card, or the sprint was PAUSED
 * under the card.
 *
 * `sprint-end` vs `sprint-paused` is a load-bearing distinction: a card up when
 * the sprint truly ends (stop / natural completion) is `sprint-end`, but a card
 * up when the sprint is merely PAUSED (and will resume under the same sprint id)
 * is `sprint-paused`. Conflating them let a pause masquerade as an end in
 * telemetry — a sprint that resumes would show a spurious `sprint-end`
 * dismissal, possibly several per sprint. The reader can now tell a genuine
 * end-of-sprint dismissal from a mid-sprint pause dismissal.
 */
export type SparkEventDetail =
  | "insufficient-ground"
  | "transport"
  | "validation-exhausted"
  | "rate-limited"
  | "escape"
  | "sprint-end"
  | "sprint-paused";

/**
 * A durable Spark telemetry event (plan §4.4). This is the pure *semantic*
 * payload plus the sprint it belongs to — the shape the `SparkEventSink` port
 * records. Persistence-envelope fields are deliberately NOT modelled here:
 *  - the dedup `id` (client-generated for client events, server-generated for
 *    route events) is attached by the adapter/route,
 *  - `userId` (tenancy) comes from the authenticated session at the route,
 *  - `createdAt` is a database default.
 * Keeping the domain event free of infra-generated identifiers matches the
 * layer's purity rules and the field list of plan §4.4.
 *
 * Field presence follows §4.4 (the DB columns are nullable accordingly):
 *  - `lens`/`question` are absent on `prepared` and `failed` (no served spark),
 *  - `detail` is present on `failed` and `dismissed`,
 *  - `cacheAgeMs`/`wordsSincePrepare` are present on `served`/`faded` — the
 *    fields that make the staleness constants (`select-spark.ts`) calibratable
 *    against real fade/dismiss behaviour.
 * `draftWordCount` and `sprintElapsedMs` are content-free sprint-position
 * fields, supplied by the client (the server has no sprint clock).
 */
export type SparkEvent = {
  readonly sprintId: SprintId;
  readonly type: SparkEventType;
  readonly detail?: SparkEventDetail;
  readonly lens?: SparkLens;
  readonly question?: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly cacheAgeMs?: number;
  readonly wordsSincePrepare?: number;
  readonly promptVersion: string;
};

/**
 * The lens taxonomy as a value, for membership checks and iteration. Annotated
 * (not `as const`) so each literal is checked against `SparkLens` while staying
 * within the domain layer's no-type-assertion rule.
 */
export const SPARK_LENSES: readonly SparkLens[] = [
  "economic",
  "historical",
  "personal",
  "adversarial",
  "definitional",
  "causal",
  "comparative",
  "scale",
  "temporal",
  "ethical",
];
