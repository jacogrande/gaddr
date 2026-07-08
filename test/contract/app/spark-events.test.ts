/**
 * Contract tests for the POST /api/spark/events handler CORE (plan §4.5, §7).
 *
 * Coverage: auth-missing, non-array / over-cap batch rejection, the client-type
 * allowlist (prepared/failed rejected per-item), per-item shape validation
 * (eventId/sprintId UUID), per-item sink-failure isolation, and the 202
 * {accepted, rejected} accounting. Invoked directly with `Request` objects and
 * stub deps — no server, no db.
 */

import { describe, expect, test } from "bun:test";
import { handleSparkEvents } from "../../../src/app/api/spark/events/handler";
import { INT4_MAX } from "../../../src/app/api/spark/validate";
import type { SparkEventsDeps } from "../../../src/app/api/spark/deps";
import type { RequireSession } from "../../../src/app/api/spark/deps";
import {
  userId as makeUserId,
} from "../../../src/domain/types/branded";
import type { UserId } from "../../../src/domain/types/branded";
import { ok, err } from "../../../src/domain/types/result";
import type { SparkEvent } from "../../../src/domain/spark/types";
import type { SparkEventSink } from "../../../src/domain/spark/ports";

const SID_RAW = "11111111-1111-1111-1111-111111111111";
const EID = "22222222-2222-2222-2222-222222222222";

function uidOf(raw: string): UserId {
  const r = makeUserId(raw);
  if (!r.ok) throw new Error("bad test user id");
  return r.value;
}

const okSession: RequireSession = () =>
  Promise.resolve(ok({ userId: uidOf("user-1"), email: "a@b.c", name: "A", image: null }));
const noSession: RequireSession = () =>
  Promise.resolve(err({ kind: "AuthError", message: "no session" }));

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

function makeDeps(o: Partial<SparkEventsDeps> = {}): SparkEventsDeps {
  return {
    requireSession: o.requireSession ?? okSession,
    eventSink: o.eventSink ?? recordingSink().sink,
  };
}

function req(
  body: unknown,
  raw = false,
  headers?: HeadersInit,
): Request {
  return new Request("http://test/api/spark/events", {
    method: "POST",
    headers,
    body: raw && typeof body === "string" ? body : JSON.stringify(body),
  });
}
function eventItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: EID,
    sprintId: SID_RAW,
    type: "served",
    lens: "economic",
    question: "What would this cost?",
    draftWordCount: 20,
    sprintElapsedMs: 1000,
    promptVersion: "spark-v1",
    ...overrides,
  };
}
async function readCounts(res: Response): Promise<{ accepted: number; rejected: number }> {
  return (await res.json()) as { accepted: number; rejected: number };
}

describe("handleSparkEvents — auth & batch shape", () => {
  test("missing session → 401", async () => {
    const res = await handleSparkEvents(req([eventItem()]), makeDeps({ requireSession: noSession }));
    expect(res.status).toBe(401);
  });

  test("malformed JSON → 400", async () => {
    const res = await handleSparkEvents(req("{bad", true), makeDeps());
    expect(res.status).toBe(400);
  });

  test("non-array body → 400", async () => {
    const res = await handleSparkEvents(req({ not: "an array" }), makeDeps());
    expect(res.status).toBe(400);
  });

  test("over-cap batch (21 items) → 400 wholesale", async () => {
    const batch = Array.from({ length: 21 }, () => eventItem());
    const res = await handleSparkEvents(req(batch), makeDeps());
    expect(res.status).toBe(400);
  });

  test("empty batch → 202 {0,0}", async () => {
    const res = await handleSparkEvents(req([]), makeDeps());
    expect(res.status).toBe(202);
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 0 });
  });

  test("declared Content-Length over the byte cap → 413 BEFORE parsing", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkEvents(
      req([eventItem()], false, { "content-length": "9999999" }),
      makeDeps({ eventSink: sink }),
    );
    expect(res.status).toBe(413);
    expect(records.length).toBe(0); // nothing was parsed or recorded
  });
});

describe("handleSparkEvents — per-item validation & accounting", () => {
  test("valid items accepted; eventId passed to the sink as the dedup key", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkEvents(
      req([eventItem(), eventItem({ eventId: "33333333-3333-3333-3333-333333333333", type: "faded" })]),
      makeDeps({ eventSink: sink }),
    );
    expect(res.status).toBe(202);
    expect(await readCounts(res)).toEqual({ accepted: 2, rejected: 0 });
    expect(records[0]?.eventId).toBe(EID);
  });

  test("server-authored types are rejected per-item; valid siblings still land", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkEvents(
      req([
        eventItem({ type: "prepared" }),
        // 'failed' with a server-only detail is forgery — rejected (fix 3).
        eventItem({ type: "failed", detail: "transport" }),
        eventItem(),
      ]),
      makeDeps({ eventSink: sink }),
    );
    expect(await readCounts(res)).toEqual({ accepted: 1, rejected: 2 });
    expect(records.length).toBe(1);
    expect(records[0]?.event.type).toBe("served");
  });

  test("client 'failed' with detail 'insufficient-ground' IS accepted (the below-minimum-ground no-op)", async () => {
    const { sink, records } = recordingSink();
    const res = await handleSparkEvents(
      req([
        eventItem({
          type: "failed",
          detail: "insufficient-ground",
          lens: undefined,
          question: undefined,
          draftWordCount: 8,
        }),
      ]),
      makeDeps({ eventSink: sink }),
    );
    expect(await readCounts(res)).toEqual({ accepted: 1, rejected: 0 });
    expect(records[0]?.event.type).toBe("failed");
    expect(records[0]?.event.detail).toBe("insufficient-ground");
  });

  test("(type, detail) coherence matrix", async () => {
    const cases: ReadonlyArray<{
      readonly item: Record<string, unknown>;
      readonly accepted: boolean;
    }> = [
      // served/rerolled/faded must carry NO detail.
      { item: eventItem({ type: "served", detail: "escape" }), accepted: false },
      { item: eventItem({ type: "rerolled", detail: "transport" }), accepted: false },
      // The probe from the review: faded+rate-limited must not validate.
      { item: eventItem({ type: "faded", detail: "rate-limited" }), accepted: false },
      { item: eventItem({ type: "faded" }), accepted: true },
      // dismissed REQUIRES escape or sprint-end.
      { item: eventItem({ type: "dismissed", detail: "escape" }), accepted: true },
      { item: eventItem({ type: "dismissed", detail: "sprint-end" }), accepted: true },
      { item: eventItem({ type: "dismissed" }), accepted: false },
      { item: eventItem({ type: "dismissed", detail: "transport" }), accepted: false },
      // client failed: ONLY insufficient-ground.
      { item: eventItem({ type: "failed", detail: "insufficient-ground" }), accepted: true },
      { item: eventItem({ type: "failed", detail: "validation-exhausted" }), accepted: false },
      { item: eventItem({ type: "failed", detail: "rate-limited" }), accepted: false },
      { item: eventItem({ type: "failed" }), accepted: false },
    ];
    for (const c of cases) {
      const res = await handleSparkEvents(req([c.item]), makeDeps());
      const counts = await readCounts(res);
      expect({ item: c.item.type, detail: c.item.detail, ok: counts.accepted === 1 }).toEqual({
        item: c.item.type,
        detail: c.item.detail,
        ok: c.accepted,
      });
    }
  });

  test("question over 200 chars → item rejected; exactly 200 accepted", async () => {
    const over = await handleSparkEvents(
      req([eventItem({ question: "q".repeat(201) })]),
      makeDeps(),
    );
    expect(await readCounts(over)).toEqual({ accepted: 0, rejected: 1 });

    const atCap = await handleSparkEvents(
      req([eventItem({ question: "q".repeat(200) })]),
      makeDeps(),
    );
    expect(await readCounts(atCap)).toEqual({ accepted: 1, rejected: 0 });
  });

  test("INT4 boundary: draftWordCount = INT4_MAX accepted, INT4_MAX+1 rejected", async () => {
    const atMax = await handleSparkEvents(
      req([eventItem({ draftWordCount: INT4_MAX })]),
      makeDeps(),
    );
    expect(await readCounts(atMax)).toEqual({ accepted: 1, rejected: 0 });

    const overMax = await handleSparkEvents(
      req([eventItem({ draftWordCount: INT4_MAX + 1 })]),
      makeDeps(),
    );
    expect(await readCounts(overMax)).toEqual({ accepted: 0, rejected: 1 });
  });

  test("INT4 boundary: optional cacheAgeMs over INT4_MAX rejected", async () => {
    const res = await handleSparkEvents(
      req([eventItem({ cacheAgeMs: INT4_MAX + 1 })]),
      makeDeps(),
    );
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 1 });
  });

  test("bad eventId → item rejected", async () => {
    const res = await handleSparkEvents(
      req([eventItem({ eventId: "not-a-uuid" })]),
      makeDeps(),
    );
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 1 });
  });

  test("bad sprintId → item rejected", async () => {
    const res = await handleSparkEvents(
      req([eventItem({ sprintId: "sprint-7" })]),
      makeDeps(),
    );
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 1 });
  });

  test("unknown lens → item rejected", async () => {
    const res = await handleSparkEvents(
      req([eventItem({ lens: "vibes" })]),
      makeDeps(),
    );
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 1 });
  });

  test("a per-item sink failure is counted rejected but does NOT fail the batch", async () => {
    const res = await handleSparkEvents(
      req([eventItem()]),
      makeDeps({ eventSink: failingSink }),
    );
    expect(res.status).toBe(202);
    expect(await readCounts(res)).toEqual({ accepted: 0, rejected: 1 });
  });
});
