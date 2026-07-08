/**
 * spark-glue.ts — the pure, framework-free decisions the `use-spark` hook makes.
 *
 * Architecture.md §8.3: a client component (and its hook) owns interaction state,
 * never business rules. The genuinely *pure* decisions the hook drives —
 * "should this trigger pre-warm?", "what telemetry does this reducer transition
 * emit?", "what does a served-event payload look like?" — are extracted here so
 * they are unit-testable without React or a browser, in the spirit of
 * `sprint-persistence.ts` (app-layer pure code, tested under `test/unit/editor/`).
 *
 * Nothing here renders, fetches, or touches the DOM. The reducer, selection, and
 * staleness rules already live in `domain/spark/*` and are tested there; this
 * module is ONLY the glue logic the hook would otherwise inline and leave
 * untested.
 */

import type {
  BoundaryType,
  TriggerReason,
} from "../../../domain/editor/trigger-detector";
import type { SprintId } from "../../../domain/types/branded";
import { MINIMUM_GROUND_WORDS } from "../../../domain/spark/select-spark";
import type {
  SparkSessionEvent,
  SparkSessionState,
} from "../../../domain/spark/spark-session";
import {
  SPARK_LENSES,
  type SparkCandidate,
  type SparkCandidateSet,
  type SparkEventDetail,
  type SparkLens,
} from "../../../domain/spark/types";

// ── Tuning constants (documented decisions; the plan left these to us) ─────────

/**
 * Pre-warm is throttled to at most one prepare per this many NEW words since the
 * last prepare (plan §5.1: "≥N new words … ~40–60"). 45 sits deliberately below
 * `CACHE_MAX_GROWTH_WORDS` (60) so a fresh prepare lands *before* the previous
 * cache goes stale — the writer's summon almost always hits a warm cache. TUNE
 * LATER against `spark_event.words_since_prepare`.
 */
export const PREPARE_WORD_DELTA = 45;

/**
 * The boundary types that qualify a `production-pause` trigger for pre-warm
 * (plan §5.1: "a meaningful boundary — not mid-word … you decide"). We qualify
 * the three genuine thought boundaries where planning happens (Flower & Hayes:
 * clause/sentence breaks). `between-words` (a bare space pause) is too weak to
 * spend a call on, and `mid-word` never fires a production-pause anyway. This is
 * the "meaningful" gate; the word-delta above is the rate gate.
 */
export const MEANINGFUL_PREPARE_BOUNDARIES: ReadonlySet<BoundaryType> = new Set<BoundaryType>([
  "paragraph-break",
  "sentence-boundary",
  "clause-boundary",
]);

/** Summon-fallback fizzle timeout (plan §5.2: "~4s timeout → fizzle"). */
export const SUMMON_FALLBACK_TIMEOUT_MS = 4000;

/** Card fade-out duration. MUST equal the `.gaddr-spark-card` CSS transition in
 * `globals.css` — the JS timer unmounts the node after the CSS opacity fade
 * finishes (plan §5.2: "~300–500ms, pure CSS transition"). */
export const SPARK_CARD_FADE_MS = 400;

/** Flush the client event queue once it reaches this size (plan §5.1: "small
 * queue, flush on size/interval"). */
export const SPARK_EVENT_FLUSH_BATCH_SIZE = 8;

/** …or after this long, whichever comes first. */
export const SPARK_EVENT_FLUSH_INTERVAL_MS = 4000;

/** Hard per-request cap — the events route rejects a batch larger than this
 * wholesale (`MAX_EVENT_BATCH` in the route validator), so a flush chunks to it. */
export const SPARK_EVENT_MAX_BATCH = 20;

// ── The cached candidate set plus the metadata telemetry needs ────────────────

/** A prepared set held in the hook, with the two fields the `served`/`faded`
 * events carry for staleness calibration (plan §4.4). */
export type SparkCache = {
  readonly set: SparkCandidateSet;
  readonly preparedAtMs: number;
  readonly preparedWordCount: number;
};

/** The context of the card currently on screen, captured at serve time so the
 * later `faded`/`dismissed` event reports the same spark it served. */
export type ActiveCard = {
  readonly lens: SparkLens;
  readonly question: string;
  readonly promptVersion: string;
  readonly preparedAtMs: number;
  readonly preparedWordCount: number;
};

// ── Pre-warm gating ───────────────────────────────────────────────────────────

/**
 * Should a trigger observation kick off a background pre-warm? (plan §5.1). Pure:
 * every input is a value the hook reads from a ref. Order encodes the gates:
 * one-in-flight, qualifying reason, meaningful boundary, minimum ground, then the
 * word-delta throttle (first prepare is always allowed once there is ground).
 *
 * Known limitation (documented, not fixed here): `countWords` — which feeds
 * `currentWordCount` and the min-ground gate below — is whitespace-delimited, so
 * space-less scripts (CJK, Thai, …) count a whole run as one "word" and
 * drastically under-count. Spark is effectively English-first until a
 * domain-level segmenter (e.g. `Intl.Segmenter`) lands in `select-spark.ts`;
 * the domain validator's interrogative-mood grammar is English-only anyway, so
 * the gate is not the binding constraint.
 */
export function shouldPrepare(params: {
  readonly reason: TriggerReason;
  readonly boundary: BoundaryType | undefined;
  readonly currentWordCount: number;
  readonly lastPreparedWordCount: number | null;
  readonly inFlight: boolean;
}): boolean {
  if (params.inFlight) {
    return false; // one-in-flight; the next qualifying trigger catches up (keep-freshest)
  }
  if (params.reason !== "production-pause") {
    return false; // only the generic production-pause pre-warms
  }
  if (params.boundary === undefined || !MEANINGFUL_PREPARE_BOUNDARIES.has(params.boundary)) {
    return false; // weak or mid-word boundary — not worth a call
  }
  if (params.currentWordCount < MINIMUM_GROUND_WORDS) {
    return false; // nothing to ground on yet
  }
  if (params.lastPreparedWordCount === null) {
    return true; // never prepared this sprint — the first prepare is free of the throttle
  }
  return params.currentWordCount - params.lastPreparedWordCount >= PREPARE_WORD_DELTA;
}

// ── Clocks & counts (clamped to the non-negative int the routes accept) ───────

/** Wall-clock ms since the sprint id was first observed. APPROXIMATE telemetry:
 * it does not subtract paused time and resets on reload (a new id observation),
 * so it undercounts across reloads — acceptable, and never used for any logic. */
export function elapsedMs(startedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - startedAtMs);
}

/** Age of the cache the card was served from (plan §4.4 staleness field). */
export function cacheAgeMs(preparedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - preparedAtMs);
}

/** Words written since the served card's set was prepared (plan §4.4). */
export function wordsSincePrepare(
  preparedWordCount: number,
  currentWordCount: number,
): number {
  return Math.max(0, currentWordCount - preparedWordCount);
}

// ── Reducer-transition → telemetry classification ─────────────────────────────

/** The durable event a reducer transition warrants, or nothing. The hook fills
 * in the data (lens, counts, ids); this decides only *which* event, from the
 * (previous state, event) pair. */
export type TransitionTelemetry =
  | { readonly kind: "served" }
  | { readonly kind: "rerolled" }
  | { readonly kind: "faded" }
  | { readonly kind: "dismissed"; readonly detail: "escape" | "sprint-end" };

/**
 * Classify what durable event, if any, a spark-session transition emits (plan
 * §5.1 event logging). Mirrors the reducer's own laws:
 *  - a candidate-bearing summon from `resting`, or a `candidatesReady` from
 *    `summoning`, SERVES;
 *  - a candidate-bearing `reroll` in `showing` REROLLS;
 *  - a keystroke/edit that ends a `showing` card FADES (it landed);
 *  - an escape or sprint-end over a `showing` card is DISMISSED with the reason.
 * Everything else (ignored events, empty reroll, summoning abandonment before a
 * card ever showed) emits nothing — losing those is acceptable (plan §5.1).
 */
export function classifyTransition(
  prev: SparkSessionState,
  event: SparkSessionEvent,
): TransitionTelemetry | null {
  if (prev.status === "resting" && event.type === "summon" && event.candidate !== null) {
    return { kind: "served" };
  }
  if (
    prev.status === "summoning" &&
    event.type === "candidatesReady" &&
    event.candidate !== null
  ) {
    return { kind: "served" };
  }
  if (prev.status === "showing") {
    if (event.type === "reroll" && event.candidate !== null) {
      return { kind: "rerolled" };
    }
    if (event.type === "keystroke" || event.type === "edit") {
      return { kind: "faded" };
    }
    if (event.type === "escape") {
      return { kind: "dismissed", detail: "escape" };
    }
    if (event.type === "sprintEnd") {
      return { kind: "dismissed", detail: "sprint-end" };
    }
  }
  return null;
}

/**
 * Telemetry for a reducer transition, gated on the transition being REAL.
 * `classifyTransition` reads only (prev, event) and can diverge from the reducer
 * on ignored events — probe-confirmed case: `showing` with the re-roll already
 * spent plus a candidate-bearing `reroll` is a reducer NO-OP (the same state
 * object comes back), but the classifier alone says "rerolled". A reducer no-op
 * must never emit telemetry or advance served-lens state, so the hook calls
 * THIS, never the classifier directly. The `next === prev` gate leans on the
 * reducer's documented contract that ignored events return the same object by
 * reference.
 */
export function telemetryForTransition(
  prev: SparkSessionState,
  event: SparkSessionEvent,
  next: SparkSessionState,
): TransitionTelemetry | null {
  if (next === prev) {
    return null; // reducer no-op — nothing happened, nothing to log
  }
  return classifyTransition(prev, event);
}

/**
 * Does a resolving prepare still belong to the CURRENT sprint? Used at BOTH ends
 * of a prepare's completion: accepting the response into the cache, and clearing
 * the one-in-flight guard. The clear must be sprint-scoped: a stale prepare
 * fired for sprint A that settles after the id changed to sprint B must NOT
 * clear B's guard — B may have its own prepare in flight, and a foreign clear
 * would allow a double prepare. (On an id change the reset effect owns the
 * guard; only a same-sprint settle may release it otherwise.)
 */
export function shouldSettlePrepare(
  firedForSprintId: SprintId,
  currentSprintId: SprintId | null,
): boolean {
  return firedForSprintId === currentSprintId;
}

/** The candidate a reducer event carries (summon/candidatesReady/reroll), or
 * null — so the hook can record the served lens without re-deriving it. */
export function eventCandidate(event: SparkSessionEvent): SparkCandidate | null {
  if (
    event.type === "summon" ||
    event.type === "candidatesReady" ||
    event.type === "reroll"
  ) {
    return event.candidate;
  }
  return null;
}

// ── Client event payloads (exactly the /api/spark/events item shape) ──────────

/**
 * One item in the `POST /api/spark/events` batch. The shape is the route
 * validator's contract (`parseEventItem`): a client-generated `eventId`, the
 * sprint id, a client-loggable type, and the content-free position fields. The
 * builders below construct these with the field-presence the validator's
 * per-type coherence rules require.
 */
export type ClientSparkEventPayload = {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly type: "served" | "rerolled" | "faded" | "dismissed" | "failed";
  readonly detail?: SparkEventDetail;
  readonly lens?: SparkLens;
  readonly question?: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly cacheAgeMs?: number;
  readonly wordsSincePrepare?: number;
  readonly promptVersion: string;
};

/** `served`: carries the lens/question and both staleness fields (plan §4.4). */
export function buildServedEvent(params: {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly lens: SparkLens;
  readonly question: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly cacheAgeMs: number;
  readonly wordsSincePrepare: number;
  readonly promptVersion: string;
}): ClientSparkEventPayload {
  return {
    eventId: params.eventId,
    sprintId: params.sprintId,
    type: "served",
    lens: params.lens,
    question: params.question,
    draftWordCount: params.draftWordCount,
    sprintElapsedMs: params.sprintElapsedMs,
    cacheAgeMs: params.cacheAgeMs,
    wordsSincePrepare: params.wordsSincePrepare,
    promptVersion: params.promptVersion,
  };
}

/** `rerolled`: lens/question, no staleness fields (§4.4 puts those on served/faded). */
export function buildRerolledEvent(params: {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly lens: SparkLens;
  readonly question: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly promptVersion: string;
}): ClientSparkEventPayload {
  return {
    eventId: params.eventId,
    sprintId: params.sprintId,
    type: "rerolled",
    lens: params.lens,
    question: params.question,
    draftWordCount: params.draftWordCount,
    sprintElapsedMs: params.sprintElapsedMs,
    promptVersion: params.promptVersion,
  };
}

/** `faded`: the card landed on a keystroke; carries lens/question + staleness. */
export function buildFadedEvent(params: {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly lens: SparkLens;
  readonly question: string;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly cacheAgeMs: number;
  readonly wordsSincePrepare: number;
  readonly promptVersion: string;
}): ClientSparkEventPayload {
  return {
    eventId: params.eventId,
    sprintId: params.sprintId,
    type: "faded",
    lens: params.lens,
    question: params.question,
    draftWordCount: params.draftWordCount,
    sprintElapsedMs: params.sprintElapsedMs,
    cacheAgeMs: params.cacheAgeMs,
    wordsSincePrepare: params.wordsSincePrepare,
    promptVersion: params.promptVersion,
  };
}

/** `dismissed`: escape or sprint-end over a live card; detail is REQUIRED by the
 * route's coherence check. */
export function buildDismissedEvent(params: {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly lens: SparkLens;
  readonly question: string;
  readonly detail: "escape" | "sprint-end";
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly promptVersion: string;
}): ClientSparkEventPayload {
  return {
    eventId: params.eventId,
    sprintId: params.sprintId,
    type: "dismissed",
    detail: params.detail,
    lens: params.lens,
    question: params.question,
    draftWordCount: params.draftWordCount,
    sprintElapsedMs: params.sprintElapsedMs,
    promptVersion: params.promptVersion,
  };
}

/**
 * `failed`/`insufficient-ground`: the ONE failure a client may log (the route
 * restricts client `failed` to this detail). It is the below-minimum-ground
 * summon — a client-side quiet no-op with no server call, so the client is the
 * only possible writer (plan §3.3/§5.2). No lens/question (nothing served).
 */
export function buildInsufficientGroundEvent(params: {
  readonly eventId: string;
  readonly sprintId: SprintId;
  readonly draftWordCount: number;
  readonly sprintElapsedMs: number;
  readonly promptVersion: string;
}): ClientSparkEventPayload {
  return {
    eventId: params.eventId,
    sprintId: params.sprintId,
    type: "failed",
    detail: "insufficient-ground",
    draftWordCount: params.draftWordCount,
    sprintElapsedMs: params.sprintElapsedMs,
    promptVersion: params.promptVersion,
  };
}

// ── /api/spark response → domain SparkCandidateSet ────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSparkLensValue(value: unknown): value is SparkLens {
  return (
    typeof value === "string" && (SPARK_LENSES as readonly string[]).includes(value)
  );
}

/** The trusted-but-verified fields of a successful `/api/spark` response. */
export type GenerateResponse = {
  readonly candidates: readonly SparkCandidate[];
  readonly draftWordCount: number;
  readonly promptVersion: string;
};

/**
 * Defensively narrow a `/api/spark` JSON body (`{candidates, draftWordCount,
 * promptVersion}`) into typed candidates, or null if it is malformed. The server
 * already validated the candidates, but the client re-checks shape rather than
 * trust `unknown` — a malformed body becomes a quiet fizzle, never a thrown
 * render error.
 */
export function parseGenerateResponse(data: unknown): GenerateResponse | null {
  if (!isRecord(data)) {
    return null;
  }
  const rawCandidates = data.candidates;
  if (!Array.isArray(rawCandidates)) {
    return null;
  }
  const candidates: SparkCandidate[] = [];
  for (const raw of rawCandidates) {
    if (!isRecord(raw)) {
      return null;
    }
    const { lens, question, grounding } = raw;
    if (
      !isSparkLensValue(lens) ||
      typeof question !== "string" ||
      typeof grounding !== "string"
    ) {
      return null;
    }
    candidates.push({ lens, question, grounding });
  }
  const draftWordCount = data.draftWordCount;
  const promptVersion = data.promptVersion;
  if (typeof draftWordCount !== "number" || typeof promptVersion !== "string") {
    return null;
  }
  return { candidates, draftWordCount, promptVersion };
}

/** Rebuild the domain `SparkCandidateSet` from a parsed response plus the sprint
 * id (the response omits it — the client knows which sprint it asked for). */
export function toCandidateSet(
  sprintId: SprintId,
  response: GenerateResponse,
): SparkCandidateSet {
  return {
    sprintId,
    candidates: response.candidates,
    draftWordCount: response.draftWordCount,
    promptVersion: response.promptVersion,
  };
}
