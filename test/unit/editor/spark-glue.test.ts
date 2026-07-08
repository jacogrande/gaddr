import { describe, expect, test } from "bun:test";
import { sprintId as toSprintId } from "../../../src/domain/types/branded";
import type { SprintId } from "../../../src/domain/types/branded";
import type { SparkCandidate } from "../../../src/domain/spark/types";
import {
  initialSparkSession,
  sparkSession,
  type SparkSessionState,
} from "../../../src/domain/spark/spark-session";
import { parseEventItem } from "../../../src/app/api/spark/validate";
import {
  MEANINGFUL_PREPARE_BOUNDARIES,
  PREPARE_WORD_DELTA,
  buildDismissedEvent,
  buildFadedEvent,
  buildInsufficientGroundEvent,
  buildRerolledEvent,
  buildServedEvent,
  cacheAgeMs,
  classifyTransition,
  elapsedMs,
  eventCandidate,
  parseGenerateResponse,
  shouldPrepare,
  shouldSettlePrepare,
  telemetryForTransition,
  toCandidateSet,
  wordsSincePrepare,
} from "../../../src/app/(protected)/editor/spark-glue";

// The MINIMUM_GROUND_WORDS the pre-warm gate reuses (kept in sync with the domain).
const MIN_GROUND = 15;

function makeSprintId(): SprintId {
  const result = toSprintId("11111111-2222-4333-8444-555555555555");
  if (!result.ok) {
    throw new Error("fixture sprint id must be a valid UUID");
  }
  return result.value;
}

const SID = makeSprintId();
const EVENT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function makeOtherSprintId(): SprintId {
  const result = toSprintId("99999999-8888-4777-8666-555555555555");
  if (!result.ok) {
    throw new Error("fixture sprint id must be a valid UUID");
  }
  return result.value;
}

const OTHER_SID = makeOtherSprintId();

function candidate(overrides: Partial<SparkCandidate> = {}): SparkCandidate {
  return {
    lens: "economic",
    question: "What would this cost in practice?",
    grounding: "mass production",
    ...overrides,
  };
}

// Build the reducer states through the reducer itself, so the tests never assert
// on hand-written internal shapes.
const RESTING: SparkSessionState = initialSparkSession();
const SHOWING: SparkSessionState = sparkSession(RESTING, {
  type: "summon",
  candidate: candidate(),
});
const SUMMONING: SparkSessionState = sparkSession(RESTING, {
  type: "summon",
  candidate: null,
});
const SPENT: SparkSessionState = sparkSession(SHOWING, { type: "keystroke" });

describe("shouldPrepare — pre-warm gating", () => {
  const base = {
    reason: "production-pause" as const,
    boundary: "sentence-boundary" as const,
    currentWordCount: 100,
    lastPreparedWordCount: null,
    inFlight: false,
  };

  test("first prepare (no prior) is allowed once there is ground", () => {
    expect(shouldPrepare(base)).toBe(true);
  });

  test("never while a prepare is in flight (one-in-flight)", () => {
    expect(shouldPrepare({ ...base, inFlight: true })).toBe(false);
  });

  test("only on production-pause, not other trigger reasons", () => {
    expect(shouldPrepare({ ...base, reason: "question-posed" })).toBe(false);
    expect(shouldPrepare({ ...base, reason: "max-quiet-time" })).toBe(false);
  });

  test("only on meaningful boundaries", () => {
    for (const boundary of MEANINGFUL_PREPARE_BOUNDARIES) {
      expect(shouldPrepare({ ...base, boundary })).toBe(true);
    }
    expect(shouldPrepare({ ...base, boundary: "between-words" })).toBe(false);
    expect(shouldPrepare({ ...base, boundary: "mid-word" })).toBe(false);
    expect(shouldPrepare({ ...base, boundary: undefined })).toBe(false);
  });

  test("never below minimum ground", () => {
    expect(shouldPrepare({ ...base, currentWordCount: MIN_GROUND - 1 })).toBe(false);
    expect(shouldPrepare({ ...base, currentWordCount: MIN_GROUND })).toBe(true);
  });

  test("word-delta throttle after a prior prepare", () => {
    const lastPreparedWordCount = 100;
    // Below the delta → skip.
    expect(
      shouldPrepare({
        ...base,
        lastPreparedWordCount,
        currentWordCount: 100 + PREPARE_WORD_DELTA - 1,
      }),
    ).toBe(false);
    // Exactly the delta → allowed.
    expect(
      shouldPrepare({
        ...base,
        lastPreparedWordCount,
        currentWordCount: 100 + PREPARE_WORD_DELTA,
      }),
    ).toBe(true);
  });
});

describe("clock / count helpers clamp to non-negative", () => {
  test("elapsedMs", () => {
    expect(elapsedMs(1000, 4000)).toBe(3000);
    expect(elapsedMs(4000, 1000)).toBe(0); // clock skew → 0, never negative
  });

  test("cacheAgeMs", () => {
    expect(cacheAgeMs(1000, 1500)).toBe(500);
    expect(cacheAgeMs(1500, 1000)).toBe(0);
  });

  test("wordsSincePrepare", () => {
    expect(wordsSincePrepare(40, 62)).toBe(22);
    expect(wordsSincePrepare(62, 40)).toBe(0); // a deletion never yields negative
  });
});

describe("classifyTransition — which durable event a transition emits", () => {
  test("resting + summon(candidate) → served", () => {
    expect(classifyTransition(RESTING, { type: "summon", candidate: candidate() })).toEqual({
      kind: "served",
    });
  });

  test("resting + summon(null) → nothing (goes to summoning, no card yet)", () => {
    expect(classifyTransition(RESTING, { type: "summon", candidate: null })).toBeNull();
  });

  test("summoning + candidatesReady(candidate) → served", () => {
    expect(
      classifyTransition(SUMMONING, { type: "candidatesReady", candidate: candidate() }),
    ).toEqual({ kind: "served" });
  });

  test("summoning + candidatesReady(null) → nothing (fizzle, no card shown)", () => {
    expect(
      classifyTransition(SUMMONING, { type: "candidatesReady", candidate: null }),
    ).toBeNull();
  });

  test("summoning + failed → nothing (fizzle, no card shown)", () => {
    expect(classifyTransition(SUMMONING, { type: "failed" })).toBeNull();
  });

  test("showing + reroll(candidate) → rerolled", () => {
    expect(classifyTransition(SHOWING, { type: "reroll", candidate: candidate() })).toEqual({
      kind: "rerolled",
    });
  });

  test("showing + reroll(null) → nothing (no alternative to log)", () => {
    expect(classifyTransition(SHOWING, { type: "reroll", candidate: null })).toBeNull();
  });

  test("showing + keystroke → faded", () => {
    expect(classifyTransition(SHOWING, { type: "keystroke" })).toEqual({ kind: "faded" });
  });

  test("showing + edit → faded", () => {
    expect(classifyTransition(SHOWING, { type: "edit" })).toEqual({ kind: "faded" });
  });

  test("showing + escape → dismissed/escape", () => {
    expect(classifyTransition(SHOWING, { type: "escape" })).toEqual({
      kind: "dismissed",
      detail: "escape",
    });
  });

  test("showing + sprintEnd → dismissed/sprint-end", () => {
    expect(classifyTransition(SHOWING, { type: "sprintEnd" })).toEqual({
      kind: "dismissed",
      detail: "sprint-end",
    });
  });

  test("resting + edit (re-arm no-op) → nothing", () => {
    expect(classifyTransition(RESTING, { type: "edit" })).toBeNull();
  });

  test("spent + edit (re-arm) → nothing", () => {
    expect(classifyTransition(SPENT, { type: "edit" })).toBeNull();
  });
});

describe("telemetryForTransition — reducer no-ops never emit telemetry", () => {
  test("REGRESSION: reroll-spent showing + reroll(candidate) — classifier diverges, gate returns null", () => {
    // Burn the one re-roll: showing(economic) --reroll(historical)--> showing
    // with rerollAvailable=false.
    const rerollSpentShowing = sparkSession(SHOWING, {
      type: "reroll",
      candidate: candidate({ lens: "historical", question: "When has this happened before?" }),
    });
    const event = {
      type: "reroll" as const,
      candidate: candidate({ lens: "personal", question: "How would this feel firsthand?" }),
    };
    const next = sparkSession(rerollSpentShowing, event);

    // The reducer ignores the second reroll (same object back)…
    expect(next).toBe(rerollSpentShowing);
    // …while the bare classifier — reading only (prev, event) — wrongly says
    // "rerolled". This is exactly the divergence the gate exists to close:
    expect(classifyTransition(rerollSpentShowing, event)).toEqual({ kind: "rerolled" });
    // The gated helper the hook actually uses emits nothing, so a reducer no-op
    // can never log telemetry or advance served-lens state.
    expect(telemetryForTransition(rerollSpentShowing, event, next)).toBeNull();
  });

  test("a real transition passes through to the classifier", () => {
    const event = { type: "summon" as const, candidate: candidate() };
    const next = sparkSession(RESTING, event);
    expect(next).not.toBe(RESTING);
    expect(telemetryForTransition(RESTING, event, next)).toEqual({ kind: "served" });
  });

  test("an ignored keystroke in spent emits nothing", () => {
    const event = { type: "keystroke" as const };
    const next = sparkSession(SPENT, event);
    expect(next).toBe(SPENT);
    expect(telemetryForTransition(SPENT, event, next)).toBeNull();
  });
});

describe("shouldSettlePrepare — sprint-scoped in-flight settlement", () => {
  test("a prepare settling in its own sprint may clear the guard and cache", () => {
    expect(shouldSettlePrepare(SID, SID)).toBe(true);
  });

  test("REGRESSION: a stale prepare from sprint A must not settle into sprint B", () => {
    // Sprint A's finally-clear arriving after the id changed to B must not
    // release B's one-in-flight guard (B may have its own prepare running —
    // a foreign clear would allow a double prepare).
    expect(shouldSettlePrepare(SID, OTHER_SID)).toBe(false);
  });

  test("a prepare resolving after the sprint ended to idle (null id) does not settle", () => {
    expect(shouldSettlePrepare(SID, null)).toBe(false);
  });
});

describe("eventCandidate — extracts the candidate a reducer event carries", () => {
  test("returns the candidate for summon / candidatesReady / reroll", () => {
    const c = candidate();
    expect(eventCandidate({ type: "summon", candidate: c })).toBe(c);
    expect(eventCandidate({ type: "candidatesReady", candidate: c })).toBe(c);
    expect(eventCandidate({ type: "reroll", candidate: c })).toBe(c);
  });

  test("returns null for a null-carrying event and for non-candidate events", () => {
    expect(eventCandidate({ type: "summon", candidate: null })).toBeNull();
    expect(eventCandidate({ type: "keystroke" })).toBeNull();
    expect(eventCandidate({ type: "edit" })).toBeNull();
    expect(eventCandidate({ type: "escape" })).toBeNull();
    expect(eventCandidate({ type: "sprintEnd" })).toBeNull();
    expect(eventCandidate({ type: "failed" })).toBeNull();
  });
});

describe("event builders — field presence per §4.4, accepted by the route validator", () => {
  const counts = { draftWordCount: 42, sprintElapsedMs: 90_000, promptVersion: "spark-v1" };

  test("served carries lens/question + both staleness fields, no detail", () => {
    const payload = buildServedEvent({
      eventId: EVENT_ID,
      sprintId: SID,
      lens: "economic",
      question: candidate().question,
      cacheAgeMs: 1200,
      wordsSincePrepare: 8,
      ...counts,
    });
    expect(payload.type).toBe("served");
    expect(payload.lens).toBe("economic");
    expect(payload.cacheAgeMs).toBe(1200);
    expect(payload.wordsSincePrepare).toBe(8);
    expect(payload.detail).toBeUndefined();
    // The route validator must accept exactly this shape.
    const parsed = parseEventItem(payload);
    expect(parsed.ok).toBe(true);
  });

  test("rerolled carries lens/question, no staleness fields, no detail", () => {
    const payload = buildRerolledEvent({
      eventId: EVENT_ID,
      sprintId: SID,
      lens: "historical",
      question: "When has this happened before?",
      ...counts,
    });
    expect(payload.type).toBe("rerolled");
    expect(payload.cacheAgeMs).toBeUndefined();
    expect(payload.wordsSincePrepare).toBeUndefined();
    expect(payload.detail).toBeUndefined();
    expect(parseEventItem(payload).ok).toBe(true);
  });

  test("faded carries lens/question + staleness fields", () => {
    const payload = buildFadedEvent({
      eventId: EVENT_ID,
      sprintId: SID,
      lens: "economic",
      question: candidate().question,
      cacheAgeMs: 3400,
      wordsSincePrepare: 20,
      ...counts,
    });
    expect(payload.type).toBe("faded");
    expect(payload.cacheAgeMs).toBe(3400);
    expect(payload.wordsSincePrepare).toBe(20);
    expect(parseEventItem(payload).ok).toBe(true);
  });

  test("dismissed requires a detail (escape | sprint-end)", () => {
    for (const detail of ["escape", "sprint-end"] as const) {
      const payload = buildDismissedEvent({
        eventId: EVENT_ID,
        sprintId: SID,
        lens: "economic",
        question: candidate().question,
        detail,
        ...counts,
      });
      expect(payload.type).toBe("dismissed");
      expect(payload.detail).toBe(detail);
      expect(parseEventItem(payload).ok).toBe(true);
    }
  });

  test("insufficient-ground failed: detail set, no lens/question", () => {
    const payload = buildInsufficientGroundEvent({
      eventId: EVENT_ID,
      sprintId: SID,
      ...counts,
    });
    expect(payload.type).toBe("failed");
    expect(payload.detail).toBe("insufficient-ground");
    expect(payload.lens).toBeUndefined();
    expect(payload.question).toBeUndefined();
    expect(parseEventItem(payload).ok).toBe(true);
  });
});

describe("parseGenerateResponse — defensive narrowing of the /api/spark body", () => {
  const good = {
    candidates: [
      { lens: "economic", question: "What would this cost?", grounding: "mass production" },
      { lens: "historical", question: "When did this begin?", grounding: "the decline" },
    ],
    draftWordCount: 120,
    promptVersion: "spark-v1",
  };

  test("accepts a well-formed body and returns typed candidates", () => {
    const parsed = parseGenerateResponse(good);
    expect(parsed).not.toBeNull();
    expect(parsed?.candidates.length).toBe(2);
    expect(parsed?.candidates[0]?.lens).toBe("economic");
    expect(parsed?.draftWordCount).toBe(120);
  });

  test("rejects non-objects and a missing candidates array", () => {
    expect(parseGenerateResponse(null)).toBeNull();
    expect(parseGenerateResponse("nope")).toBeNull();
    expect(parseGenerateResponse({ ...good, candidates: "x" })).toBeNull();
  });

  test("rejects a candidate with a lens outside the taxonomy", () => {
    expect(
      parseGenerateResponse({
        ...good,
        candidates: [{ lens: "vibes", question: "Why?", grounding: "the decline" }],
      }),
    ).toBeNull();
  });

  test("rejects a candidate missing a string field", () => {
    expect(
      parseGenerateResponse({
        ...good,
        candidates: [{ lens: "economic", question: 5, grounding: "the decline" }],
      }),
    ).toBeNull();
  });

  test("rejects a bad draftWordCount or promptVersion", () => {
    expect(parseGenerateResponse({ ...good, draftWordCount: "120" })).toBeNull();
    expect(parseGenerateResponse({ ...good, promptVersion: 1 })).toBeNull();
  });

  test("toCandidateSet threads the sprint id back onto the parsed response", () => {
    const parsed = parseGenerateResponse(good);
    expect(parsed).not.toBeNull();
    if (parsed === null) {
      return;
    }
    const set = toCandidateSet(SID, parsed);
    expect(set.sprintId).toBe(SID);
    expect(set.candidates).toBe(parsed.candidates);
    expect(set.draftWordCount).toBe(120);
    expect(set.promptVersion).toBe("spark-v1");
  });
});
