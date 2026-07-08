/**
 * E2E-MODE composition test (plan §4.5 / Phase 7) — the load-bearing guarantee.
 *
 * With `isE2ETesting()` true, the ACTUAL exported route `POST`s must work with
 * NO `DATABASE_URL`, NO `ANTHROPIC_API_KEY`, and NO `BETTER_AUTH_*`: the mock
 * generation port + in-memory sink + in-memory served-lens store are wired, and
 * the db client (which throws at import) is never imported. This test deletes
 * those env vars, then drives the real routes end-to-end — proving the import
 * graph stays clean and the shared in-memory store connects `/events` to
 * `/api/spark`'s served-lens derivation.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { POST as sparkPost } from "../../../src/app/api/spark/route";
import { POST as eventsPost } from "../../../src/app/api/spark/events/route";

const STRIPPED_ENV = [
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of STRIPPED_ENV) {
    saved[key] = process.env[key];
    Reflect.deleteProperty(process.env, key);
  }
  process.env.E2E_TESTING = "true";
  process.env.E2E_BYPASS_AUTH = "true";
});

afterAll(() => {
  for (const key of STRIPPED_ENV) {
    const original = saved[key];
    if (original === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = original;
    }
  }
});

function generateReq(sprintId: string, reason = "prepare"): Request {
  return new Request("http://test/api/spark", {
    method: "POST",
    body: JSON.stringify({
      draft: "Mass production made goods affordable for ordinary people at scale.",
      draftWordCount: 20,
      sprintElapsedMs: 1000,
      sprintId,
      reason,
    }),
  });
}
function servedEventReq(sprintId: string, lens: string): Request {
  return new Request("http://test/api/spark/events", {
    method: "POST",
    body: JSON.stringify([
      {
        eventId: crypto.randomUUID(),
        sprintId,
        type: "served",
        lens,
        question: "What would this cost?",
        draftWordCount: 20,
        sprintElapsedMs: 1000,
        promptVersion: "spark-v1",
      },
    ]),
  });
}
async function candidates(res: Response): Promise<readonly { lens: string }[]> {
  const body = (await res.json()) as { candidates: readonly { lens: string }[] };
  return body.candidates;
}

describe("spark routes — E2E mode with NO db/model env", () => {
  test("prepare returns 200 with candidates, no env at all", async () => {
    const res = await sparkPost(generateReq("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
    expect(res.status).toBe(200);
    expect((await candidates(res)).length).toBeGreaterThan(0);
  });

  test("a served event logged via /events excludes that lens from the next prepare", async () => {
    const sid = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const first = await sparkPost(generateReq(sid));
    const firstLenses = (await candidates(first)).map((c) => c.lens);
    expect(firstLenses).toContain("economic");

    const logged = await eventsPost(servedEventReq(sid, "economic"));
    expect(logged.status).toBe(202);

    // Server derives servedLenses from the shared in-memory store — economic is
    // now excluded even though the client body says nothing about it.
    const second = await sparkPost(generateReq(sid));
    const secondLenses = (await candidates(second)).map((c) => c.lens);
    expect(secondLenses).not.toContain("economic");
    expect(secondLenses.length).toBeGreaterThan(0);
  });

  test("without the auth bypass, E2E mode still returns 401", async () => {
    process.env.E2E_BYPASS_AUTH = "false";
    try {
      const res = await sparkPost(generateReq("cccccccc-cccc-cccc-cccc-cccccccccccc"));
      expect(res.status).toBe(401);
    } finally {
      process.env.E2E_BYPASS_AUTH = "true";
    }
  });
});
