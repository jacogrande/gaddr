/**
 * Contract tests for the POST /api/spark handler CORE (plan §4.5, §7).
 *
 * The core is invoked directly with `Request` objects and stub deps — no Next
 * server, no db, no SDK. Coverage: auth-missing, every validation reject, the
 * draft cap, SERVER-side served-lens derivation (never the client body),
 * prepare-vs-summon rate-cap behaviour, InferenceError → HTTP mapping, and the
 * loss-tolerant event write (a sink failure never fails the response).
 */

import { describe, expect, test } from "bun:test";
import { handleSparkGenerate } from "../../../src/app/api/spark/handler";
import type {
  GenerationPortFor,
  RequireSession,
  SparkGenerateDeps,
} from "../../../src/app/api/spark/deps";
import {
  createRateLimiter,
  SUMMON_RATE_LIMIT,
  SUMMON_RATE_WINDOW_MS,
} from "../../../src/app/api/spark/rate-limit";
import { INT4_MAX } from "../../../src/app/api/spark/validate";
import {
  sprintId as makeSprintId,
  userId as makeUserId,
} from "../../../src/domain/types/branded";
import type { SprintId, UserId } from "../../../src/domain/types/branded";
import { countWords } from "../../../src/domain/spark/select-spark";
import { ok, err } from "../../../src/domain/types/result";
import type {
  SparkCandidate,
  SparkCandidateSet,
  SparkEvent,
  SparkLens,
} from "../../../src/domain/spark/types";
import type { SparkEventSink } from "../../../src/domain/spark/ports";
import type { InferenceError } from "../../../src/domain/types/errors";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SID_RAW = "11111111-1111-1111-1111-111111111111";

function sidOf(raw: string): SprintId {
  const r = makeSprintId(raw);
  if (!r.ok) throw new Error("bad test sprint id");
  return r.value;
}
function uidOf(raw: string): UserId {
  const r = makeUserId(raw);
  if (!r.ok) throw new Error("bad test user id");
  return r.value;
}

const SID = sidOf(SID_RAW);

const okSession: RequireSession = () =>
  Promise.resolve(
    ok({
      userId: uidOf("user-1"),
      email: "a@b.c",
      name: "A",
      image: null,
    }),
  );
const noSession: RequireSession = () =>
  Promise.resolve(err({ kind: "AuthError", message: "no session" }));

function candidate(lens: SparkLens): SparkCandidate {
  return { lens, question: "What about it?", grounding: "mass production" };
}
function setOf(candidates: readonly SparkCandidate[]): SparkCandidateSet {
  return { sprintId: SID, candidates, draftWordCount: 20, promptVersion: "spark-v1" };
}
const DEFAULT_SET = setOf([candidate("economic"), candidate("historical")]);

interface RecordedEvent {
  readonly userId: UserId;
  readonly event: SparkEvent;
  readonly eventId?: string;
}
function recordingSink(): {
  readonly sink: SparkEventSink;
  readonly records: RecordedEvent[];
} {
  const records: RecordedEvent[] = [];
  const sink: SparkEventSink = {
    record(userId, event, eventId) {
      records.push({ userId, event, eventId });
      return Promise.resolve(ok(undefined));
    },
  };
  return { sink, records };
}
const failingSink: SparkEventSink = {
  record: () => Promise.resolve(err({ kind: "PersistenceError", message: "boom" })),
};

interface GeneratedInput {
  readonly draft: string;
  readonly sprintId: SprintId;
  readonly servedLenses: readonly SparkLens[];
}
function okPort(
  set: SparkCandidateSet,
  spy?: (input: GeneratedInput) => void,
): GenerationPortFor {
  return () => ({
    generate(input) {
      spy?.(input);
      return Promise.resolve(ok(set));
    },
  });
}
function errPort(reason: InferenceError["reason"]): GenerationPortFor {
  return () => ({
    generate: () =>
      Promise.resolve(err({ kind: "InferenceError", reason, message: "x" })),
  });
}

function makeDeps(o: Partial<SparkGenerateDeps> = {}): SparkGenerateDeps {
  return {
    requireSession: o.requireSession ?? okSession,
    generationPortFor: o.generationPortFor ?? okPort(DEFAULT_SET),
    eventSink: o.eventSink ?? recordingSink().sink,
    servedLensQuery: o.servedLensQuery ?? (() => Promise.resolve(ok([]))),
    prepareLimiter: o.prepareLimiter ?? createRateLimiter(),
    summonLimiter:
      o.summonLimiter ??
      createRateLimiter(SUMMON_RATE_LIMIT, SUMMON_RATE_WINDOW_MS),
    now: o.now ?? (() => 1000),
  };
}

function req(
  body: unknown,
  raw = false,
  headers?: HeadersInit,
): Request {
  return new Request("http://test/api/spark", {
    method: "POST",
    headers,
    body: raw && typeof body === "string" ? body : JSON.stringify(body),
  });
}
// A draft comfortably ABOVE the minimum-ground floor (server-computed), so the
// default generate flow reaches the model (finding 7 added a server-side floor).
const GROUNDED_DRAFT =
  "Mass production made goods affordable for ordinary people and slowly " +
  "reshaped how households across the whole country bought everyday things.";
const GROUNDED_DRAFT_WORDS = countWords(GROUNDED_DRAFT);
// A draft BELOW the floor — the server must refuse to call the model.
const THIN_DRAFT = "Only a few words here.";

function generateBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    draft: GROUNDED_DRAFT,
    draftWordCount: 20,
    sprintElapsedMs: 1000,
    sprintId: SID_RAW,
    reason: "prepare",
    ...overrides,
  };
}
async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

describe("handleSparkGenerate — auth", () => {
  test("missing session → 401, no draft echoed", async () => {
    const res = await handleSparkGenerate(
      req(generateBody()),
      makeDeps({ requireSession: noSession }),
    );
    expect(res.status).toBe(401);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).not.toContain("Mass production");
  });
});

// ── Validation ───────────────────────────────────────────────────────────────

describe("handleSparkGenerate — validation", () => {
  test("malformed JSON → 400", async () => {
    const res = await handleSparkGenerate(req("{not json", true), makeDeps());
    expect(res.status).toBe(400);
  });

  test("non-object body → 400", async () => {
    const res = await handleSparkGenerate(req("hello"), makeDeps());
    expect(res.status).toBe(400);
  });

  test("draft not a string → 400", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ draft: 5 })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  test("draft over the cap → 413", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ draft: "a".repeat(50_001) })),
      makeDeps(),
    );
    expect(res.status).toBe(413);
  });

  test("negative draftWordCount → 400", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ draftWordCount: -1 })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  test("non-integer sprintElapsedMs → 400", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ sprintElapsedMs: 1.5 })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  test("non-UUID sprintId → 400", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ sprintId: "sprint-1" })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  test("unknown reason → 400", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ reason: "explode" })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  test("declared Content-Length over the byte cap → 413 BEFORE parsing", async () => {
    // The body itself is tiny and valid; only the header is oversized. json()
    // must never run: a generation call would be observable via the port spy.
    let generated = false;
    const res = await handleSparkGenerate(
      req(generateBody(), false, { "content-length": "9999999" }),
      makeDeps({
        generationPortFor: okPort(DEFAULT_SET, () => {
          generated = true;
        }),
      }),
    );
    expect(res.status).toBe(413);
    expect(generated).toBe(false);
  });

  test("INT4 boundary: draftWordCount = INT4_MAX passes, INT4_MAX+1 → 400", async () => {
    const atMax = await handleSparkGenerate(
      req(generateBody({ draftWordCount: INT4_MAX })),
      makeDeps(),
    );
    expect(atMax.status).toBe(200);

    const overMax = await handleSparkGenerate(
      req(generateBody({ draftWordCount: INT4_MAX + 1 })),
      makeDeps(),
    );
    expect(overMax.status).toBe(400);
  });

  test("INT4 boundary: sprintElapsedMs = INT4_MAX+1 → 400 (would overflow int4)", async () => {
    const res = await handleSparkGenerate(
      req(generateBody({ sprintElapsedMs: INT4_MAX + 1 })),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });
});

// ── Served-lens derivation ────────────────────────────────────────────────────

describe("handleSparkGenerate — served lenses are server-derived", () => {
  test("the port receives lenses from the query, NOT from the client body", async () => {
    let captured: GeneratedInput | undefined;
    const deps = makeDeps({
      // Server says economic was served…
      servedLensQuery: () =>
        Promise.resolve(ok<readonly SparkLens[]>(["economic"])),
      generationPortFor: okPort(DEFAULT_SET, (input) => {
        captured = input;
      }),
    });
    // …while the client tries to inject a different lens list, which must be ignored.
    const res = await handleSparkGenerate(
      req(generateBody({ servedLenses: ["adversarial"] })),
      deps,
    );
    expect(res.status).toBe(200);
    expect(captured?.servedLenses).toEqual(["economic"]);
  });
});

// ── Rate caps (separate buckets per reason) ──────────────────────────────────

describe("handleSparkGenerate — prepare rate cap", () => {
  test("prepares beyond the window limit → 429 with Retry-After", async () => {
    const deps = makeDeps({ prepareLimiter: createRateLimiter(2, 60_000), now: () => 1000 });
    expect((await handleSparkGenerate(req(generateBody()), deps)).status).toBe(200);
    expect((await handleSparkGenerate(req(generateBody()), deps)).status).toBe(200);
    const third = await handleSparkGenerate(req(generateBody()), deps);
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).not.toBeNull();
  });

  test("prepare exhaustion does NOT consume summon capacity (separate buckets)", async () => {
    const deps = makeDeps({
      prepareLimiter: createRateLimiter(1, 60_000),
      summonLimiter: createRateLimiter(SUMMON_RATE_LIMIT, SUMMON_RATE_WINDOW_MS),
      now: () => 1000,
    });
    expect((await handleSparkGenerate(req(generateBody()), deps)).status).toBe(200);
    expect((await handleSparkGenerate(req(generateBody()), deps)).status).toBe(429);
    // The writer's conscious summon still succeeds — plan §4.5's guarantee.
    const summon = await handleSparkGenerate(
      req(generateBody({ reason: "summon" })),
      deps,
    );
    expect(summon.status).toBe(200);
  });
});

describe("handleSparkGenerate — summon rate cap (abuse bound)", () => {
  test("a scripted client's 16th summon in a minute → 429 with Retry-After", async () => {
    const deps = makeDeps({ now: () => 1000 }); // real cap: SUMMON_RATE_LIMIT (15)
    for (let i = 0; i < SUMMON_RATE_LIMIT; i++) {
      const res = await handleSparkGenerate(
        req(generateBody({ reason: "summon" })),
        deps,
      );
      expect(res.status).toBe(200);
    }
    const overCap = await handleSparkGenerate(
      req(generateBody({ reason: "summon" })),
      deps,
    );
    expect(overCap.status).toBe(429);
    expect(overCap.headers.get("Retry-After")).not.toBeNull();
  });

  test("legitimate volume (2 summons/min for 30 min) NEVER hits the cap", async () => {
    let clock = 0;
    const deps = makeDeps({ now: () => clock });
    for (let minute = 0; minute < 30; minute++) {
      for (const offset of [0, 30_000]) {
        clock = minute * 60_000 + offset;
        const res = await handleSparkGenerate(
          req(generateBody({ reason: "summon" })),
          deps,
        );
        expect(res.status).toBe(200);
      }
    }
  });
});

// ── Server-side minimum-ground floor (finding 7) ─────────────────────────────

describe("handleSparkGenerate — server-authoritative minimum-ground floor", () => {
  test("prepare below the server-computed floor → 200 empty, NO model call, failed/insufficient-ground with SERVER count", async () => {
    const { sink, records } = recordingSink();
    let generated = false;
    const res = await handleSparkGenerate(
      // The client LIES with a high word count; the server counts the draft.
      req(generateBody({ draft: THIN_DRAFT, draftWordCount: 500 })),
      makeDeps({
        eventSink: sink,
        generationPortFor: okPort(DEFAULT_SET, () => {
          generated = true;
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(generated).toBe(false); // the model was never called
    const body = await readJson<{ candidates: readonly SparkCandidate[] }>(res);
    expect(body.candidates).toEqual([]); // client fizzles quietly

    const failed = records.find((r) => r.event.type === "failed");
    expect(failed?.event.detail).toBe("insufficient-ground");
    // The row records the server's own count, not the client's inflated claim.
    expect(failed?.event.draftWordCount).toBe(countWords(THIN_DRAFT));
    expect(failed?.event.draftWordCount).not.toBe(500);
  });

  test("summon below the floor is refused the same way (200 empty, no model call)", async () => {
    let generated = false;
    const res = await handleSparkGenerate(
      req(generateBody({ draft: THIN_DRAFT, reason: "summon" })),
      makeDeps({
        generationPortFor: okPort(DEFAULT_SET, () => {
          generated = true;
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(generated).toBe(false);
    const body = await readJson<{ candidates: readonly SparkCandidate[] }>(res);
    expect(body.candidates).toEqual([]);
  });
});

// ── Success ──────────────────────────────────────────────────────────────────

describe("handleSparkGenerate — success", () => {
  test("200 with the cacheable set shape; a 'prepared' event is recorded", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkGenerate(
      req(generateBody({ draftWordCount: 42 })),
      makeDeps({ eventSink: sink, generationPortFor: okPort(DEFAULT_SET) }),
    );
    expect(res.status).toBe(200);
    const body = await readJson<{
      candidates: readonly SparkCandidate[];
      draftWordCount: number;
      promptVersion: string;
    }>(res);
    expect(body.candidates.map((c) => c.lens)).toEqual(["economic", "historical"]);
    expect(body.promptVersion).toBe("spark-v1");

    const prepared = records.find((r) => r.event.type === "prepared");
    expect(prepared).toBeDefined();
    // draftWordCount is SERVER-derived (finding 7): the client claimed 42, but
    // the row records the server's own count of the draft. promptVersion comes
    // from the returned set.
    expect(prepared?.event.draftWordCount).toBe(GROUNDED_DRAFT_WORDS);
    expect(prepared?.event.draftWordCount).not.toBe(42);
    expect(prepared?.event.promptVersion).toBe("spark-v1");
    expect(prepared?.event.lens).toBeUndefined();
  });

  test("an OK-but-EMPTY set is still 200 (legitimate nothing-to-serve)", async () => {
    const res = await handleSparkGenerate(
      req(generateBody()),
      makeDeps({ generationPortFor: okPort(setOf([])) }),
    );
    expect(res.status).toBe(200);
    const body = await readJson<{ candidates: readonly SparkCandidate[] }>(res);
    expect(body.candidates).toEqual([]);
  });

  test("an event-sink failure does NOT fail the response", async () => {
    const res = await handleSparkGenerate(
      req(generateBody()),
      makeDeps({ eventSink: failingSink }),
    );
    expect(res.status).toBe(200);
  });

  test("prepare: a served-lens read failure is FAIL-CLOSED → 502, never a framework 500", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkGenerate(
      req(generateBody()),
      makeDeps({
        eventSink: sink,
        servedLensQuery: () =>
          Promise.resolve(err({ kind: "PersistenceError", message: "db down" })),
      }),
    );
    expect(res.status).toBe(502);
    expect(records.find((r) => r.event.type === "failed")?.event.detail).toBe(
      "transport",
    );
  });

  test("summon: a served-lens read failure is FAIL-OPEN → 200 with EMPTY servedLenses", async () => {
    // The writer's conscious request must survive a DB blip; the cost is a
    // possible double-served lens (variety, not safety).
    let captured: GeneratedInput | undefined;
    const res = await handleSparkGenerate(
      req(generateBody({ reason: "summon" })),
      makeDeps({
        servedLensQuery: () =>
          Promise.resolve(err({ kind: "PersistenceError", message: "db down" })),
        generationPortFor: okPort(DEFAULT_SET, (input) => {
          captured = input;
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(captured?.servedLenses).toEqual([]);
  });

  test("a served-lens query THROW (contract-breaking stub) still maps, never a 500", async () => {
    const res = await handleSparkGenerate(
      req(generateBody()),
      makeDeps({
        servedLensQuery: () => Promise.reject(new Error("db down")),
      }),
    );
    expect(res.status).toBe(502);
  });
});

// ── Error mapping ────────────────────────────────────────────────────────────

describe("handleSparkGenerate — InferenceError → HTTP", () => {
  const cases: ReadonlyArray<{
    readonly reason: InferenceError["reason"];
    readonly status: number;
    readonly detail: string;
  }> = [
    { reason: "transport", status: 502, detail: "transport" },
    { reason: "timeout", status: 502, detail: "transport" },
    { reason: "malformed-output", status: 502, detail: "validation-exhausted" },
    { reason: "rate-limit", status: 503, detail: "rate-limited" },
  ];

  for (const c of cases) {
    test(`${c.reason} → ${String(c.status)}, failed event detail '${c.detail}'`, async () => {
      const { sink, records } = recordingSink();
      const res = await handleSparkGenerate(
        req(generateBody()),
        makeDeps({ eventSink: sink, generationPortFor: errPort(c.reason) }),
      );
      expect(res.status).toBe(c.status);
      if (c.reason === "rate-limit") {
        expect(res.headers.get("Retry-After")).not.toBeNull();
      }
      const failed = records.find((r) => r.event.type === "failed");
      expect(failed?.event.detail).toBe(c.detail as SparkEvent["detail"]);
    });
  }
});
