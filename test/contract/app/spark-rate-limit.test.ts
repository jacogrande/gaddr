/**
 * Contract tests for the spark rate limiter (review fixes 1/6): sliding-window
 * behaviour, Retry-After derivation, and — the memory fix — eviction of keys
 * whose hits have all aged out of the window, probed via the `size()` surface.
 */

import { describe, expect, test } from "bun:test";
import { createRateLimiter } from "../../../src/app/api/spark/rate-limit";

describe("createRateLimiter — window behaviour", () => {
  test("allows up to the limit, denies past it, re-allows after the window", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("u1", 0).allowed).toBe(true);
    expect(limiter.check("u1", 1_000).allowed).toBe(true);
    expect(limiter.check("u1", 2_000).allowed).toBe(false);
    // Oldest hit (t=0) ages out at t=60_000.
    expect(limiter.check("u1", 60_001).allowed).toBe(true);
  });

  test("denied checks consume no capacity", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("u1", 0).allowed).toBe(true);
    // Hammering while denied must not extend the lockout.
    for (let at = 1_000; at < 60_000; at += 1_000) {
      expect(limiter.check("u1", at).allowed).toBe(false);
    }
    expect(limiter.check("u1", 60_001).allowed).toBe(true);
  });

  test("Retry-After counts down toward the oldest hit's expiry", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("u1", 0);
    const denied = limiter.check("u1", 45_000);
    expect(denied.allowed).toBe(false);
    // Oldest hit at t=0 expires at t=60_000 → 15s away.
    expect(denied.retryAfterSeconds).toBe(15);
  });

  test("keys are independent buckets", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("u1", 0).allowed).toBe(true);
    expect(limiter.check("u2", 0).allowed).toBe(true);
    expect(limiter.check("u1", 1).allowed).toBe(false);
    expect(limiter.check("u2", 1).allowed).toBe(false);
  });
});

describe("createRateLimiter — idle-key eviction (memory bound)", () => {
  test("keys whose hits have all aged out are evicted on the next check", () => {
    const limiter = createRateLimiter(10, 60_000);
    // Three distinct users hit once each.
    limiter.check("u1", 0);
    limiter.check("u2", 0);
    limiter.check("u3", 0);
    expect(limiter.size()).toBe(3);

    // Past the window, ANY check sweeps the fully-aged keys — only the
    // just-checked key remains tracked.
    limiter.check("u4", 61_000);
    expect(limiter.size()).toBe(1);
  });

  test("keys with a still-live hit survive the sweep", () => {
    const limiter = createRateLimiter(10, 60_000);
    limiter.check("stale", 0);
    limiter.check("live", 30_000);
    // At t=61_000: "stale"'s hit (t=0) is out of window, "live"'s (t=30_000) is not.
    limiter.check("other", 61_000);
    expect(limiter.size()).toBe(2); // live + other
    // And "live" still has its capacity accounted (not reset by the sweep).
    const liveLimiter = createRateLimiter(1, 60_000);
    liveLimiter.check("live", 30_000);
    liveLimiter.check("other", 61_000);
    expect(liveLimiter.check("live", 62_000).allowed).toBe(false);
  });
});
