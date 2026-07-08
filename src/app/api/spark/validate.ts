/**
 * Input validation for the two spark routes (thin-shell step 1, architecture.md
 * §8.2). Pure functions over the raw parsed JSON body — no I/O, no framework —
 * so the whole accept/reject surface is contract-tested without a server.
 *
 * A validator's job here is narrow: prove the request has the shape and bounds
 * the domain expects, narrow the sprint id through the DOMAIN validator, and
 * hand back a typed value. It NEVER echoes the draft (the reject messages are
 * fixed, field-oriented strings), and it does no business logic — served-lens
 * derivation, generation, and rate limiting all live in the handler/composition.
 */

import { sprintId as toSprintId } from "../../../domain/types/branded";
import type { SprintId } from "../../../domain/types/branded";
import { ok, err } from "../../../domain/types/result";
import type { Result } from "../../../domain/types/result";
import { SPARK_LENSES } from "../../../domain/spark/types";
import type {
  SparkEvent,
  SparkEventDetail,
  SparkEventType,
  SparkLens,
} from "../../../domain/spark/types";

/**
 * Draft length cap for `POST /api/spark`. 50k chars is ~8–10k words — an order
 * of magnitude beyond any plausible single freewrite sprint, so a body past it
 * is a bug or abuse, not a real draft. It bounds the bytes we ship to the model
 * and the request we parse. Over the cap is a 413, distinct from a 400: the
 * request is well-formed, just too large.
 */
export const MAX_DRAFT_CHARS = 50_000;

/**
 * Pre-parse byte cap for the `POST /api/spark` body, checked against the
 * Content-Length HEADER before `request.json()` buffers anything (review
 * major: the char cap alone runs only AFTER the whole body is in memory).
 * 256KB = 50k chars at worst-case JSON-escaped UTF-8 plus field overhead.
 * The header can be absent or lying, so this is the CHEAP FIRST GATE only;
 * the post-parse char cap below remains the authoritative check.
 */
export const MAX_GENERATE_BODY_BYTES = 262_144;

/**
 * Pre-parse byte cap for the `POST /api/spark/events` body. A full batch of 20
 * events with maximal fields is a few KB; 64KB is an order of magnitude of
 * headroom. Same cheap-first-gate / authoritative-post-parse split as above.
 */
export const MAX_EVENTS_BODY_BYTES = 65_536;

/**
 * Per-batch cap for `POST /api/spark/events`. The client batches a handful of
 * lifecycle events (served/rerolled/faded/dismissed) per flush; 20 is generous
 * headroom. A batch past it is rejected wholesale as a malformed request.
 */
export const MAX_EVENT_BATCH = 20;

/**
 * Cap on a logged event's `question`. The domain validator caps SERVED
 * questions at ~120 chars, so nothing legitimate exceeds that; 200 leaves
 * headroom for future prompt changes while stopping a client from stuffing
 * megabytes of text into the question column (review major: probe showed a
 * 2MB question validated).
 */
export const MAX_EVENT_QUESTION_CHARS = 200;

/**
 * Largest value Postgres `int4` holds — `draft_word_count`,
 * `sprint_elapsed_ms`, `cache_age_ms`, and `words_since_prepare` are all
 * `integer` columns (see `infra/db/schema.ts`), so any accepted value above
 * this would overflow at insert time and the sink's swallowed error would
 * become SILENT telemetry loss (review major). Bounding here keeps every
 * accepted value insertable.
 */
export const INT4_MAX = 2_147_483_647;

/** The `reason` field: telemetry + rate-class only; the work is identical. */
export type SparkReason = "prepare" | "summon";

export interface SparkGenerateBody {
  readonly draft: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly sprintId: SprintId;
  readonly reason: SparkReason;
}

/** A rejected body: the HTTP status to return and a fixed, content-free reason. */
export interface BodyReject {
  readonly status: number;
  readonly message: string;
}

/** A validated client event ready for the sink: the pure domain payload plus the
 * client-generated dedup id (which travels on the sink CALL, not on the event). */
export interface ValidEventItem {
  readonly event: SparkEvent;
  readonly eventId: string;
}

// ── Narrowing primitives ─────────────────────────────────────────────────────

/** Canonical UUID shape (structural, case-insensitive) — kept byte-identical to
 * the domain and infra copies so `crypto.randomUUID()` and test fixtures pass. */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Non-negative integer that FITS IN int4 — every integer field the routes
 * accept lands in an `integer` column, so the upper bound is part of validity
 * (see `INT4_MAX`). */
function isNonNegativeInt(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= INT4_MAX
  );
}

/** Membership check against the closed lens taxonomy. Exported: the in-memory
 * E2E store narrows raw stored lens strings with it. */
export function isSparkLens(value: unknown): value is SparkLens {
  return isString(value) && (SPARK_LENSES as readonly string[]).includes(value);
}

/**
 * The event types a client may log (plan §4.5 split write model + review fix):
 *  - `served` / `rerolled` / `faded` / `dismissed` — purely client-observed.
 *  - `failed` — ONLY for the below-minimum-ground summon (plan §3.3/§5.2): that
 *    summon is a CLIENT-side quiet no-op — no server call happens — so the
 *    client is the only possible writer of `failed`/`insufficient-ground`.
 * Coherence enforcement (`checkDetailCoherence`) restricts client `failed` to
 * exactly that detail, so every OTHER `failed` detail (transport,
 * validation-exhausted, rate-limited) and all `prepared` rows remain
 * server-authored and unforgeable.
 */
function isClientEventType(
  value: unknown,
): value is "served" | "rerolled" | "faded" | "dismissed" | "failed" {
  return (
    value === "served" ||
    value === "rerolled" ||
    value === "faded" ||
    value === "dismissed" ||
    value === "failed"
  );
}

/**
 * Per-type (type, detail) coherence (review minor: `faded`+`rate-limited`
 * validated). The rules mirror the domain's field-presence semantics
 * (`SparkEvent` doc / plan §4.4):
 *  - served/rerolled/faded: no failure or dismiss reason exists — detail must
 *    be ABSENT.
 *  - dismissed: detail is REQUIRED and must say how — 'escape' or 'sprint-end'.
 *  - failed (client): detail must be 'insufficient-ground' — the one failure a
 *    client can legitimately observe (see `isClientEventType`).
 */
function checkDetailCoherence(
  type: "served" | "rerolled" | "faded" | "dismissed" | "failed",
  detail: SparkEventDetail | undefined,
): Result<void, string> {
  switch (type) {
    case "served":
    case "rerolled":
    case "faded":
      if (detail !== undefined) {
        return err("detail must be absent for this event type");
      }
      return ok(undefined);
    case "dismissed":
      if (detail !== "escape" && detail !== "sprint-end") {
        return err("dismissed requires detail 'escape' or 'sprint-end'");
      }
      return ok(undefined);
    case "failed":
      if (detail !== "insufficient-ground") {
        return err("client failed events must have detail 'insufficient-ground'");
      }
      return ok(undefined);
  }
}

const EVENT_DETAILS: readonly SparkEventDetail[] = [
  "insufficient-ground",
  "transport",
  "validation-exhausted",
  "rate-limited",
  "escape",
  "sprint-end",
];

function isEventDetail(value: unknown): value is SparkEventDetail {
  return isString(value) && (EVENT_DETAILS as readonly string[]).includes(value);
}

/** Optional non-negative int4: absent/null → `undefined`; present must validate. */
function optionalNonNegInt(
  value: unknown,
  label: string,
): Result<number | undefined, string> {
  if (value === undefined || value === null) {
    return ok(undefined);
  }
  if (isNonNegativeInt(value)) {
    return ok(value);
  }
  return err(`${label} must be a non-negative integer`);
}

// ── POST /api/spark body ──────────────────────────────────────────────────────

/**
 * Validate the generate body. Order matters: the draft cap is checked BEFORE the
 * cheaper field checks so an oversized body short-circuits to 413 without further
 * work. Every reject is content-free; the draft is never reflected back.
 */
export function parseGenerateBody(
  raw: unknown,
): Result<SparkGenerateBody, BodyReject> {
  if (!isRecord(raw)) {
    return err({ status: 400, message: "invalid request body" });
  }

  const draft = raw.draft;
  if (!isString(draft)) {
    return err({ status: 400, message: "draft must be a string" });
  }
  if (draft.length > MAX_DRAFT_CHARS) {
    return err({ status: 413, message: "draft exceeds maximum length" });
  }

  const draftWordCount = raw.draftWordCount;
  if (!isNonNegativeInt(draftWordCount)) {
    return err({
      status: 400,
      message: "draftWordCount must be a non-negative integer",
    });
  }

  const sprintElapsedMs = raw.sprintElapsedMs;
  if (!isNonNegativeInt(sprintElapsedMs)) {
    return err({
      status: 400,
      message: "sprintElapsedMs must be a non-negative integer",
    });
  }

  const rawSprintId = raw.sprintId;
  if (!isString(rawSprintId)) {
    return err({ status: 400, message: "sprintId must be a string" });
  }
  const sid = toSprintId(rawSprintId);
  if (!sid.ok) {
    return err({ status: 400, message: "sprintId must be a UUID" });
  }

  const reason = raw.reason;
  if (reason !== "prepare" && reason !== "summon") {
    return err({
      status: 400,
      message: "reason must be 'prepare' or 'summon'",
    });
  }

  return ok({
    draft,
    draftWordCount,
    sprintElapsedMs,
    sprintId: sid.value,
    reason,
  });
}

// ── POST /api/spark/events item ───────────────────────────────────────────────

/**
 * Validate one client event. Returns the pure domain `SparkEvent` plus the
 * client-generated `eventId` (the dedup key). Rejections are per-ITEM: the
 * caller counts a bad item and moves on, so one malformed event never discards
 * a whole best-effort batch (plan §4.5). The type allowlist + detail-coherence
 * pair is the enforcement point for the split write model: `prepared` and every
 * non-`insufficient-ground` failure stay server-authored.
 */
export function parseEventItem(raw: unknown): Result<ValidEventItem, string> {
  if (!isRecord(raw)) {
    return err("event must be an object");
  }

  const eventId = raw.eventId;
  if (!isString(eventId) || !UUID_SHAPE.test(eventId)) {
    return err("eventId must be a UUID");
  }

  const rawSprintId = raw.sprintId;
  if (!isString(rawSprintId)) {
    return err("sprintId must be a string");
  }
  const sid = toSprintId(rawSprintId);
  if (!sid.ok) {
    return err("sprintId must be a UUID");
  }

  const type = raw.type;
  if (!isClientEventType(type)) {
    return err("type must be one of served|rerolled|faded|dismissed|failed");
  }

  const rawDetail = raw.detail;
  let detail: SparkEventDetail | undefined;
  if (rawDetail !== undefined && rawDetail !== null) {
    if (!isEventDetail(rawDetail)) {
      return err("detail is not a known reason");
    }
    detail = rawDetail;
  }

  const coherence = checkDetailCoherence(type, detail);
  if (!coherence.ok) {
    return err(coherence.error);
  }

  const rawLens = raw.lens;
  let lens: SparkLens | undefined;
  if (rawLens !== undefined && rawLens !== null) {
    if (!isSparkLens(rawLens)) {
      return err("lens is not in the taxonomy");
    }
    lens = rawLens;
  }

  const rawQuestion = raw.question;
  let question: string | undefined;
  if (rawQuestion !== undefined && rawQuestion !== null) {
    if (!isString(rawQuestion)) {
      return err("question must be a string");
    }
    if (rawQuestion.length > MAX_EVENT_QUESTION_CHARS) {
      return err("question exceeds maximum length");
    }
    question = rawQuestion;
  }

  const draftWordCount = raw.draftWordCount;
  if (!isNonNegativeInt(draftWordCount)) {
    return err("draftWordCount must be a non-negative integer");
  }

  const sprintElapsedMs = raw.sprintElapsedMs;
  if (!isNonNegativeInt(sprintElapsedMs)) {
    return err("sprintElapsedMs must be a non-negative integer");
  }

  const cacheAge = optionalNonNegInt(raw.cacheAgeMs, "cacheAgeMs");
  if (!cacheAge.ok) {
    return err(cacheAge.error);
  }

  const wordsSince = optionalNonNegInt(
    raw.wordsSincePrepare,
    "wordsSincePrepare",
  );
  if (!wordsSince.ok) {
    return err(wordsSince.error);
  }

  const promptVersion = raw.promptVersion;
  if (!isString(promptVersion)) {
    return err("promptVersion must be a string");
  }

  // `detail`/`lens`/`question`/`cacheAgeMs`/`wordsSincePrepare` are optional in
  // `SparkEvent`; the project does not set exactOptionalPropertyTypes, so a
  // `undefined` value satisfies the optional field and the sink maps it to a
  // NULL column.
  const eventType: SparkEventType = type;
  const event: SparkEvent = {
    sprintId: sid.value,
    type: eventType,
    detail,
    lens,
    question,
    draftWordCount,
    sprintElapsedMs,
    cacheAgeMs: cacheAge.value,
    wordsSincePrepare: wordsSince.value,
    promptVersion,
  };

  return ok({ event, eventId });
}
