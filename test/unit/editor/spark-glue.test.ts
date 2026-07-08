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
  shouldAcceptSettle,
  shouldPrepare,
  shouldSettlePrepare,
  sprintLeaveDetail,
  telemetryEmitMode,
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
  // `currentWordCount` is a THUNK (plan §5.3: the O(1) gates run before any
  // O(draft) counting). `count(n)` builds a constant thunk for the value tests.
  const count = (n: number) => () => n;
  const base = {
    reason: "production-pause" as const,
    boundary: "sentence-boundary" as const,
    currentWordCount: count(100),
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
    expect(shouldPrepare({ ...base, currentWordCount: count(MIN_GROUND - 1) })).toBe(false);
    expect(shouldPrepare({ ...base, currentWordCount: count(MIN_GROUND) })).toBe(true);
  });

  test("word-delta throttle after a prior prepare", () => {
    const lastPreparedWordCount = 100;
    // Below the delta → skip.
    expect(
      shouldPrepare({
        ...base,
        lastPreparedWordCount,
        currentWordCount: count(100 + PREPARE_WORD_DELTA - 1),
      }),
    ).toBe(false);
    // Exactly the delta → allowed.
    expect(
      shouldPrepare({
        ...base,
        lastPreparedWordCount,
        currentWordCount: count(100 + PREPARE_WORD_DELTA),
      }),
    ).toBe(true);
  });

  test("REGRESSION: the word-count thunk runs only after the cheap O(1) gates pass", () => {
    // Typing latency is P0 (plan §5.3): a non-qualifying trigger must not pay
    // the O(draft) word count. The thunk records whether it was called.
    let calls = 0;
    const counting = () => {
      calls += 1;
      return 100;
    };
    // Each cheap gate short-circuits BEFORE the thunk.
    expect(shouldPrepare({ ...base, inFlight: true, currentWordCount: counting })).toBe(false);
    expect(shouldPrepare({ ...base, reason: "question-posed", currentWordCount: counting })).toBe(false);
    expect(shouldPrepare({ ...base, boundary: "between-words", currentWordCount: counting })).toBe(false);
    expect(shouldPrepare({ ...base, boundary: undefined, currentWordCount: counting })).toBe(false);
    expect(calls).toBe(0); // no counting on any non-qualifying trigger
    // A qualifying trigger DOES pay it — exactly once.
    expect(shouldPrepare({ ...base, currentWordCount: counting })).toBe(true);
    expect(calls).toBe(1);
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

  test("showing + sprintEnd (no detail) → dismissed/sprint-end (default)", () => {
    expect(classifyTransition(SHOWING, { type: "sprintEnd" })).toEqual({
      kind: "dismissed",
      detail: "sprint-end",
    });
  });

  test("showing + sprintEnd(detail: sprint-paused) → dismissed/sprint-paused", () => {
    // A card up when the sprint is PAUSED (resumes under the same id) is a pause
    // dismissal, not an end — the detail carried on the event drives it.
    expect(
      classifyTransition(SHOWING, { type: "sprintEnd", detail: "sprint-paused" }),
    ).toEqual({ kind: "dismissed", detail: "sprint-paused" });
  });

  test("showing + sprintEnd(detail: sprint-end) → dismissed/sprint-end", () => {
    expect(
      classifyTransition(SHOWING, { type: "sprintEnd", detail: "sprint-end" }),
    ).toEqual({ kind: "dismissed", detail: "sprint-end" });
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

describe("sprintLeaveDetail — phase→dismissal-detail mapping (finding 1)", () => {
  test("running → paused is a pause dismissal", () => {
    expect(sprintLeaveDetail("paused")).toBe("sprint-paused");
  });

  test("running → idle | completed is an end dismissal", () => {
    expect(sprintLeaveDetail("idle")).toBe("sprint-end");
    expect(sprintLeaveDetail("completed")).toBe("sprint-end");
  });
});

describe("telemetryEmitMode — sync at phase edges, deferred on the keystroke path (review item 2)", () => {
  test("phase-edge dismissals (sprint-end / sprint-paused) are SYNC", () => {
    expect(telemetryEmitMode({ kind: "dismissed", detail: "sprint-end" })).toBe("sync");
    expect(telemetryEmitMode({ kind: "dismissed", detail: "sprint-paused" })).toBe("sync");
  });

  test("keystroke-path telemetry defers (escape, faded, served, rerolled)", () => {
    expect(telemetryEmitMode({ kind: "dismissed", detail: "escape" })).toBe("defer");
    expect(telemetryEmitMode({ kind: "faded" })).toBe("defer");
    expect(telemetryEmitMode({ kind: "served" })).toBe("defer");
    expect(telemetryEmitMode({ kind: "rerolled" })).toBe("defer");
  });

  test("REGRESSION: a phase-edge dismissal lands in the boundary flush, not stranded behind a microtask", async () => {
    // Mirrors the hook's exact wiring at a sprint-phase edge: dispatch computes
    // the transition telemetry, delivers it per telemetryEmitMode, then the
    // phase-edge effect flushes SYNCHRONOUSLY. With the sync mode the dismissal
    // is enqueued before that flush; a deferred (microtask) delivery — which
    // this test also exercises for contrast — would land after it and strand.
    const queue: string[] = [];
    let boundaryBatch: readonly string[] = [];
    const flush = () => {
      boundaryBatch = queue.splice(0, queue.length);
    };
    const deliverPerMode = (kindLabel: string, mode: "sync" | "defer") => {
      const enqueue = () => queue.push(kindLabel);
      if (mode === "sync") {
        enqueue();
      } else {
        queueMicrotask(enqueue);
      }
    };

    // The hook's phase-edge sequence, using the REAL reducer + classifiers:
    const event = { type: "sprintEnd" as const, detail: "sprint-paused" as const };
    const next = sparkSession(SHOWING, event);
    const telemetry = telemetryForTransition(SHOWING, event, next);
    expect(telemetry).toEqual({ kind: "dismissed", detail: "sprint-paused" });
    if (telemetry === null) {
      return;
    }
    deliverPerMode("dismissed", telemetryEmitMode(telemetry));
    flush(); // the phase-edge effect's synchronous boundary flush

    // The dismissal made the boundary flush.
    expect(boundaryBatch).toEqual(["dismissed"]);

    // Contrast: a deferred keystroke-path event does NOT make a synchronous
    // flush issued in the same call stack — exactly why phase edges must not
    // defer. (The deferred event is only visible after the microtask runs.)
    const fadeEvent = { type: "keystroke" as const };
    const fadedNext = sparkSession(SHOWING, fadeEvent);
    const fadedTelemetry = telemetryForTransition(SHOWING, fadeEvent, fadedNext);
    expect(fadedTelemetry).toEqual({ kind: "faded" });
    if (fadedTelemetry === null) {
      return;
    }
    deliverPerMode("faded", telemetryEmitMode(fadedTelemetry));
    flush();
    expect(boundaryBatch).toEqual([]); // deferred → missed the synchronous flush
    await Promise.resolve(); // let the microtask run
    expect(queue).toEqual(["faded"]); // …and it lands in the queue afterward
  });
});

describe("shouldAcceptSettle — a stale settle never regresses a fresher cache (finding 3)", () => {
  test("first write (empty cache) is accepted", () => {
    expect(shouldAcceptSettle(1, null, SID, SID)).toBe(true);
  });

  test("a strictly-newer request (higher seq) wins", () => {
    expect(shouldAcceptSettle(5, 3, SID, SID)).toBe(true);
  });

  test("an equal or older seq is dropped (no self-clobber, no regress)", () => {
    expect(shouldAcceptSettle(3, 3, SID, SID)).toBe(false);
    expect(shouldAcceptSettle(2, 3, SID, SID)).toBe(false);
  });

  test("a settle for a different (or ended) sprint is dropped regardless of seq", () => {
    expect(shouldAcceptSettle(99, 1, SID, OTHER_SID)).toBe(false);
    expect(shouldAcceptSettle(99, null, SID, null)).toBe(false);
  });

  test("REGRESSION: the exact interleaving — a stale prepare cannot overwrite a fresher summon cache", () => {
    // prepare(seq1) fires → summon(seq2) fires and SETTLES (writes the cache at
    // seq2) → prepare(seq1) finally settles. The prepare must be dropped so the
    // fresher summon result survives (plan §3.3).
    const prepareSeq = 1;
    const summonSeq = 2;
    // summon settles first into an empty cache → accepted, cache seq becomes 2.
    expect(shouldAcceptSettle(summonSeq, null, SID, SID)).toBe(true);
    // now the older prepare settles against the seq-2 cache → dropped.
    expect(shouldAcceptSettle(prepareSeq, summonSeq, SID, SID)).toBe(false);
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
