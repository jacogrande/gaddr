/**
 * Contract tests for the Spark event sink (plan §4.4/§4.5, §8 step 4).
 *
 * Placed under test/contract (NOT test/unit): the eslint boundary forbids
 * test/unit from importing infra, and these exercise the infra row-mapping and
 * the sink factory. No live Postgres is available here, so coverage is:
 *   1. the PURE `toSparkEventRow` mapping, exhaustively (every SparkEventType,
 *      null-field handling, eventId precedence, UUID-shape rejection);
 *   2. the sink factory against a STUBBED drizzle client (insert path, dedup
 *      clause, PersistenceError on DB failure, no-DB-roundtrip on bad eventId).
 */

import { describe, expect, test } from "bun:test";
import {
  userId as makeUserId,
  sprintId as makeSprintId,
} from "../../../../src/domain/types/branded";
import type { UserId, SprintId } from "../../../../src/domain/types/branded";
import type {
  SparkEvent,
  SparkEventType,
} from "../../../../src/domain/spark/types";
import {
  createSparkEventSink,
  toSparkEventRow,
  type SparkDb,
} from "../../../../src/infra/db/spark-event-repo";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uid(raw: string): UserId {
  const r = makeUserId(raw);
  if (!r.ok) throw new Error("bad test user id");
  return r.value;
}

function sid(raw: string): SprintId {
  const r = makeSprintId(raw);
  if (!r.ok) throw new Error("bad test sprint id");
  return r.value;
}

const UID = uid("user-123");
const SID = sid("11111111-1111-1111-1111-111111111111");
const CLIENT_EVENT_ID = "22222222-2222-2222-2222-222222222222";
const FALLBACK_ID = "33333333-3333-3333-3333-333333333333";

/** A fully-populated `served` event — every optional field present. */
const SERVED_EVENT: SparkEvent = {
  sprintId: SID,
  type: "served",
  lens: "economic",
  question: "What would this cost in practice?",
  draftWordCount: 120,
  sprintElapsedMs: 45_000,
  cacheAgeMs: 3_200,
  wordsSincePrepare: 8,
  promptVersion: "spark-v1",
};

/** A `prepared` event — no lens/question/detail/staleness fields. */
const PREPARED_EVENT: SparkEvent = {
  sprintId: SID,
  type: "prepared",
  draftWordCount: 60,
  sprintElapsedMs: 20_000,
  promptVersion: "spark-v1",
};

// ── Stubbed drizzle client ───────────────────────────────────────────────────

interface RecordedInsert {
  readonly table: unknown;
  readonly row: Record<string, unknown>;
}

function fakeSparkDb(behavior: "ok" | "throw" = "ok"): {
  readonly db: SparkDb;
  readonly inserts: RecordedInsert[];
} {
  const inserts: RecordedInsert[] = [];
  const db = {
    insert(table: unknown) {
      return {
        values(row: Record<string, unknown>) {
          return {
            onConflictDoNothing() {
              if (behavior === "throw") {
                return Promise.reject(new Error("db down"));
              }
              inserts.push({ table, row });
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  } as unknown as SparkDb;
  return { db, inserts };
}

// ── Pure mapping: every SparkEventType ───────────────────────────────────────

describe("toSparkEventRow — every SparkEventType maps its `type`", () => {
  const TYPES: readonly SparkEventType[] = [
    "prepared",
    "served",
    "rerolled",
    "faded",
    "dismissed",
    "failed",
  ];

  for (const type of TYPES) {
    test(`type "${type}" round-trips into the row`, () => {
      const event: SparkEvent = {
        sprintId: SID,
        type,
        draftWordCount: 40,
        sprintElapsedMs: 10_000,
        promptVersion: "spark-v1",
      };
      const result = toSparkEventRow(UID, event, FALLBACK_ID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.type).toBe(type);
      expect(result.value.sprintId).toBe(SID);
      expect(result.value.userId).toBe(UID);
    });
  }
});

// ── Pure mapping: null-field handling ────────────────────────────────────────

describe("toSparkEventRow — null-field handling", () => {
  test("prepared event maps absent optionals to null", () => {
    const result = toSparkEventRow(UID, PREPARED_EVENT, FALLBACK_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.detail).toBeNull();
    expect(result.value.lens).toBeNull();
    expect(result.value.question).toBeNull();
    expect(result.value.cacheAgeMs).toBeNull();
    expect(result.value.wordsSincePrepare).toBeNull();
    // Content-free position fields are always present.
    expect(result.value.draftWordCount).toBe(60);
    expect(result.value.sprintElapsedMs).toBe(20_000);
  });

  test("served event carries every optional field through", () => {
    const result = toSparkEventRow(UID, SERVED_EVENT, FALLBACK_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lens).toBe("economic");
    expect(result.value.question).toBe("What would this cost in practice?");
    expect(result.value.cacheAgeMs).toBe(3_200);
    expect(result.value.wordsSincePrepare).toBe(8);
  });

  test("failed event maps its detail through", () => {
    const failed: SparkEvent = {
      sprintId: SID,
      type: "failed",
      detail: "insufficient-ground",
      draftWordCount: 5,
      sprintElapsedMs: 2_000,
      promptVersion: "spark-v1",
    };
    const result = toSparkEventRow(UID, failed, FALLBACK_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.detail).toBe("insufficient-ground");
    expect(result.value.lens).toBeNull();
  });
});

// ── Pure mapping: eventId precedence + UUID-shape rejection ───────────────────

describe("toSparkEventRow — eventId precedence", () => {
  test("a supplied (valid) eventId wins over the fallback id", () => {
    const result = toSparkEventRow(
      UID,
      SERVED_EVENT,
      FALLBACK_ID,
      CLIENT_EVENT_ID,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(CLIENT_EVENT_ID);
  });

  test("no eventId falls back to the server-minted id", () => {
    const result = toSparkEventRow(UID, PREPARED_EVENT, FALLBACK_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(FALLBACK_ID);
  });
});

describe("toSparkEventRow — UUID-shape rejection (no DB roundtrip)", () => {
  const BAD_IDS = [
    "not-a-uuid",
    "",
    "12345",
    "'; DROP TABLE spark_event; --",
    "22222222-2222-2222-2222-22222222222", // one char short
  ];

  for (const bad of BAD_IDS) {
    test(`rejects malformed eventId ${JSON.stringify(bad)} as PersistenceError`, () => {
      const result = toSparkEventRow(UID, SERVED_EVENT, FALLBACK_ID, bad);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("PersistenceError");
    });
  }

  test("accepts a canonical uppercase UUID (case-insensitive shape)", () => {
    const upper = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
    const result = toSparkEventRow(UID, SERVED_EVENT, FALLBACK_ID, upper);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(upper);
  });
});

// ── Sink factory against a stubbed drizzle client ────────────────────────────

describe("createSparkEventSink — insert path", () => {
  test("client event: inserts the mapped row with onConflictDoNothing", async () => {
    const { db, inserts } = fakeSparkDb();
    const sink = createSparkEventSink(db);

    const result = await sink.record(UID, SERVED_EVENT, CLIENT_EVENT_ID);

    expect(result.ok).toBe(true);
    expect(inserts.length).toBe(1);
    expect(inserts[0]?.row.id).toBe(CLIENT_EVENT_ID);
    expect(inserts[0]?.row.type).toBe("served");
    expect(inserts[0]?.row.userId).toBe(UID);
  });

  test("server event: mints a UUID id when none is supplied", async () => {
    const { db, inserts } = fakeSparkDb();
    const sink = createSparkEventSink(db);

    const result = await sink.record(UID, PREPARED_EVENT);

    expect(result.ok).toBe(true);
    expect(inserts.length).toBe(1);
    const id = inserts[0]?.row.id;
    expect(typeof id).toBe("string");
    expect(UUID_SHAPE.test(String(id))).toBe(true);
  });

  test("a malformed eventId errors WITHOUT touching the database", async () => {
    const { db, inserts } = fakeSparkDb();
    const sink = createSparkEventSink(db);

    const result = await sink.record(UID, SERVED_EVENT, "not-a-uuid");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("PersistenceError");
    expect(inserts.length).toBe(0); // never reached the insert
  });

  test("a DB failure maps to a PersistenceError Result (no throw escapes)", async () => {
    const { db } = fakeSparkDb("throw");
    const sink = createSparkEventSink(db);

    const result = await sink.record(UID, SERVED_EVENT, CLIENT_EVENT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("PersistenceError");
      expect(result.error.cause).toBeInstanceOf(Error);
    }
  });
});
