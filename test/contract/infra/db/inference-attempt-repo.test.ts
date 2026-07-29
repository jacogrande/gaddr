/**
 * Contract tests for the inference_attempt sink (plan §4.4, §8 step 4).
 *
 * Under test/contract (infra imports forbidden in test/unit). No live Postgres,
 * so coverage is the PURE `toInferenceAttemptRow` mapping, the sink factory
 * against a stubbed drizzle client, and — the load-bearing behaviour — the
 * `toOnAttempt` bridge that fires the async insert behind structured-call's
 * synchronous fire-and-forget `onAttempt` callback and NEVER throws.
 */

import { describe, expect, test } from "bun:test";
import { userId as makeUserId } from "../../../../src/domain/types/branded";
import type { UserId } from "../../../../src/domain/types/branded";
import type { PersistenceError } from "../../../../src/domain/types/errors";
import type { Result } from "../../../../src/domain/types/result";
import { ok, err } from "../../../../src/domain/types/result";
import type { InferenceAttempt } from "../../../../src/infra/llm/structured-call";
import {
  createInferenceAttemptSink,
  toInferenceAttemptRow,
  toOnAttempt,
  type AttemptDb,
  type InferenceAttemptSink,
} from "../../../../src/infra/db/inference-attempt-repo";

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uid(raw: string): UserId {
  const r = makeUserId(raw);
  if (!r.ok) throw new Error("bad test user id");
  return r.value;
}

const UID = uid("user-123");
const ID = "44444444-4444-4444-4444-444444444444";

/** A spark parse-path attempt with yield fields + reject reasons. */
const SPARK_ATTEMPT: InferenceAttempt = {
  stage: "spark",
  inputHash: "abc123",
  promptVersion: "spark-v1",
  modelId: "claude-haiku-4-5",
  outcome: "validation-failed",
  retryCount: 0,
  candidatesReturned: 3,
  candidatesValid: 1,
  rejectReasons: ["ungrounded", "compound-question"],
  latencyMs: 640,
  inputTokens: 40,
  outputTokens: 30,
};

/** A transport-failure attempt: no yield fields, zero-filled usage. */
const TRANSPORT_ATTEMPT: InferenceAttempt = {
  stage: "spark",
  inputHash: "def456",
  promptVersion: "spark-v1",
  modelId: "claude-haiku-4-5",
  outcome: "transport",
  retryCount: 0,
  latencyMs: 12,
  inputTokens: 0,
  outputTokens: 0,
};

// ── Stubbed drizzle client (insert chain has no onConflict for attempts) ──────

interface RecordedInsert {
  readonly row: Record<string, unknown>;
}

function fakeAttemptDb(behavior: "ok" | "throw" = "ok"): {
  readonly db: AttemptDb;
  readonly inserts: RecordedInsert[];
} {
  const inserts: RecordedInsert[] = [];
  const db = {
    insert(_table: unknown) {
      return {
        values(row: Record<string, unknown>) {
          if (behavior === "throw") {
            return Promise.reject(new Error("db down"));
          }
          inserts.push({ row });
          return Promise.resolve([]);
        },
      };
    },
  } as unknown as AttemptDb;
  return { db, inserts };
}

// ── Pure mapping ─────────────────────────────────────────────────────────────

describe("toInferenceAttemptRow — full parse-path attempt", () => {
  test("maps yield fields and joins reject reasons with commas", () => {
    const row = toInferenceAttemptRow(UID, SPARK_ATTEMPT, ID);
    expect(row.id).toBe(ID);
    expect(row.userId).toBe(UID);
    expect(row.stage).toBe("spark");
    expect(row.outcome).toBe("validation-failed");
    expect(row.candidatesReturned).toBe(3);
    expect(row.candidatesValid).toBe(1);
    expect(row.rejectReasons).toBe("ungrounded,compound-question");
    expect(row.inputTokens).toBe(40);
    expect(row.outputTokens).toBe(30);
    expect(row.latencyMs).toBe(640);
  });
});

describe("toInferenceAttemptRow — null-field handling", () => {
  test("transport attempt: absent yield fields map to null", () => {
    const row = toInferenceAttemptRow(UID, TRANSPORT_ATTEMPT, ID);
    expect(row.candidatesReturned).toBeNull();
    expect(row.candidatesValid).toBeNull();
    expect(row.rejectReasons).toBeNull();
    // Zero-filled usage is written as reported (0), not null.
    expect(row.inputTokens).toBe(0);
    expect(row.outputTokens).toBe(0);
  });

  test("sprintId maps to sprint_id when present, null when absent", () => {
    const withSprint = toInferenceAttemptRow(
      UID,
      { ...SPARK_ATTEMPT, sprintId: "11111111-2222-4333-8444-555555555555" },
      ID,
    );
    expect(withSprint.sprintId).toBe("11111111-2222-4333-8444-555555555555");

    // Stage-agnostic attempts (future non-spark stages) carry no sprint.
    const withoutSprint = toInferenceAttemptRow(UID, TRANSPORT_ATTEMPT, ID);
    expect(withoutSprint.sprintId).toBeNull();
  });

  test("an empty rejectReasons list maps to null, not an empty string", () => {
    const row = toInferenceAttemptRow(
      UID,
      { ...SPARK_ATTEMPT, outcome: "ok", rejectReasons: [] },
      ID,
    );
    expect(row.rejectReasons).toBeNull();
  });

  test("candidatesValid 0 is preserved (a starving-yield signal, not null)", () => {
    const row = toInferenceAttemptRow(
      UID,
      { ...SPARK_ATTEMPT, candidatesReturned: 2, candidatesValid: 0 },
      ID,
    );
    expect(row.candidatesReturned).toBe(2);
    expect(row.candidatesValid).toBe(0);
  });

  test("effort maps through when set, null when the stage set none", () => {
    const withEffort = toInferenceAttemptRow(
      UID,
      { ...SPARK_ATTEMPT, effort: "high" },
      ID,
    );
    expect(withEffort.effort).toBe("high");
    // Spark sets "none"; a truly-absent effort persists as null.
    expect(toInferenceAttemptRow(UID, TRANSPORT_ATTEMPT, ID).effort).toBeNull();
  });

  test("runId and cachedInputTokens map through, null when absent", () => {
    const enriched = toInferenceAttemptRow(
      UID,
      {
        ...SPARK_ATTEMPT,
        runId: "11111111-2222-4333-8444-555555555555",
        cachedInputTokens: 4096,
      },
      ID,
    );
    expect(enriched.runId).toBe("11111111-2222-4333-8444-555555555555");
    expect(enriched.cachedInputTokens).toBe(4096);
    // Spark carries neither — both persist as null.
    const spark = toInferenceAttemptRow(UID, SPARK_ATTEMPT, ID);
    expect(spark.runId).toBeNull();
    expect(spark.cachedInputTokens).toBeNull();
  });
});

// ── Sink factory against a stubbed drizzle client ────────────────────────────

describe("createInferenceAttemptSink — insert path", () => {
  test("inserts the mapped row with a server-minted UUID id", async () => {
    const { db, inserts } = fakeAttemptDb();
    const sink = createInferenceAttemptSink(db);

    const result = await sink.record(UID, SPARK_ATTEMPT);

    expect(result.ok).toBe(true);
    expect(inserts.length).toBe(1);
    expect(inserts[0]?.row.stage).toBe("spark");
    expect(UUID_SHAPE.test(String(inserts[0]?.row.id))).toBe(true);
  });

  test("a DB failure maps to a PersistenceError Result (no throw escapes)", async () => {
    const { db } = fakeAttemptDb("throw");
    const sink = createInferenceAttemptSink(db);

    const result = await sink.record(UID, SPARK_ATTEMPT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("PersistenceError");
      expect(result.error.cause).toBeInstanceOf(Error);
    }
  });
});

// ── The async-sink-behind-a-sync-callback bridge ─────────────────────────────

describe("toOnAttempt — fire-and-forget, never throws", () => {
  test("returns void synchronously and forwards to the async sink", async () => {
    const calls: Array<{ userId: UserId; attempt: InferenceAttempt }> = [];
    const sink: InferenceAttemptSink = {
      record(userId, attempt) {
        calls.push({ userId, attempt });
        return Promise.resolve(ok(undefined));
      },
    };

    const onAttempt = toOnAttempt(sink, UID);
    // Synchronous, returns nothing.
    expect(onAttempt(SPARK_ATTEMPT)).toBeUndefined();

    // The insert fires on a microtask; flush it.
    await Promise.resolve();
    expect(calls.length).toBe(1);
    expect(calls[0]?.userId).toBe(UID);
    expect(calls[0]?.attempt.stage).toBe("spark");
  });

  test("does not throw when the sink resolves to an err Result", async () => {
    const failing: PersistenceError = {
      kind: "PersistenceError",
      message: "insert failed",
    };
    const sink: InferenceAttemptSink = {
      record(): Promise<Result<void, PersistenceError>> {
        return Promise.resolve(err(failing));
      },
    };

    const onAttempt = toOnAttempt(sink, UID);
    expect(() => onAttempt(SPARK_ATTEMPT)).not.toThrow();
    await Promise.resolve();
  });

  test("does not throw when the sink's promise rejects", async () => {
    const sink: InferenceAttemptSink = {
      record(): Promise<Result<void, PersistenceError>> {
        return Promise.reject(new Error("boom"));
      },
    };

    const onAttempt = toOnAttempt(sink, UID);
    expect(() => onAttempt(SPARK_ATTEMPT)).not.toThrow();
    // Let the rejection settle through the swallowing .catch.
    await Promise.resolve();
    await Promise.resolve();
  });

  test("does not throw when the sink throws synchronously", () => {
    const sink: InferenceAttemptSink = {
      record(): Promise<Result<void, PersistenceError>> {
        throw new Error("sync boom");
      },
    };

    const onAttempt = toOnAttempt(sink, UID);
    expect(() => onAttempt(SPARK_ATTEMPT)).not.toThrow();
  });

  test("drop-log latch: first drop logs, repeats are suppressed, success re-arms", async () => {
    const outcomes: Array<"ok" | "err"> = [];
    const sink: InferenceAttemptSink = {
      record(): Promise<Result<void, PersistenceError>> {
        const next = outcomes.shift() ?? "ok";
        return Promise.resolve(
          next === "ok"
            ? ok(undefined)
            : err({ kind: "PersistenceError", message: "db down" }),
        );
      },
    };
    const onAttempt = toOnAttempt(sink, UID);

    const logged: unknown[][] = [];
    const realError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };
    try {
      // Reset the module-level latch (earlier tests may have tripped it),
      // then: outage of two drops → one log; success re-arms; new outage → one log.
      outcomes.push("ok", "err", "err", "ok", "err");
      for (let i = 0; i < 5; i += 1) {
        onAttempt(SPARK_ATTEMPT);
        // Flush the fire-and-forget microtasks so ordering is deterministic.
        await Promise.resolve();
        await Promise.resolve();
      }
    } finally {
      console.error = realError;
    }

    expect(logged.length).toBe(2);
  });
});
