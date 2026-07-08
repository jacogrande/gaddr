/**
 * Coarse in-memory per-user sliding-window rate limiter (plan §4.5 + review).
 *
 * TWO CAPS, TWO BUCKETS, TWO PURPOSES (the composition wires one limiter
 * INSTANCE per reason, so the buckets are physically separate Maps):
 *  - `prepare` (~10/min): protects model COST from background pre-warm traffic.
 *    The client hook's word-delta / one-in-flight throttle is primary; this is
 *    the backstop.
 *  - `summon` (~15/min): protects model cost from RAW-ENDPOINT ABUSE by a
 *    hostile authenticated client (review major: the reducer's self-limiting is
 *    client-side only, so an unthrottled summon is unbounded spend). The plan's
 *    "summon is exempt" rule (§4.5) means the writer's conscious request must
 *    never 429 because background work was noisy — SEPARATE buckets preserve
 *    exactly that, while still bounding a client that skips the reducer.
 *    Legitimate summon volume is ~1–2/min (one card, one re-roll, re-arm
 *    requires typing), so a REAL writer can never reach 15/min. Neither cap is
 *    reachable through the shipped client.
 *
 * HARD LIMITATION — this is a BACKSTOP, not a guarantee. The window lives in a
 * module-level Map inside a single server instance. On Vercel each concurrent
 * lambda instance has its OWN Map, so the effective global rate is
 * `limit × instances`, and an instance recycle resets it entirely. Do not treat
 * it as a fair or durable quota — that would need a shared store
 * (Redis/Postgres) and is out of scope.
 *
 * MEMORY: `check` opportunistically evicts every key whose hits have ALL aged
 * out of the window, so the Map tracks only currently-active users instead of
 * growing without bound in distinct users on a long-lived instance (review
 * minor). The sweep is O(tracked users) per check — trivially cheap at these
 * volumes and amortized across all callers.
 *
 * PURITY: the current time is passed IN to `check` (the handler injects its
 * `now`), so this module keeps no clock of its own and is trivially testable.
 */

/** Prepare cap: ten background pre-warms per user per minute. */
export const PREPARE_RATE_LIMIT = 10;
export const PREPARE_RATE_WINDOW_MS = 60_000;

/**
 * Summon cap: fifteen conscious summons per user per minute — an abuse bound
 * deliberately generous against legitimate usage (~1–2/min) so a real writer
 * can never hit it, while a scripted client can no longer spend unboundedly.
 */
export const SUMMON_RATE_LIMIT = 15;
export const SUMMON_RATE_WINDOW_MS = 60_000;

/**
 * Events-route cap: 120 telemetry POSTs per user per minute (review: the events
 * route had NO limiter, so a hostile client — or a ⌘. auto-repeat flood that
 * slipped the client latch — could write durable rows without bound). This caps
 * REQUESTS, not individual events; each request is already batch-capped at
 * `MAX_EVENT_BATCH` (20), so total events are bounded too. Generous against the
 * real client, which flushes only every few seconds (~15/min). Over the cap →
 * 429; the client fire-and-forgets its telemetry, so a dropped beacon is a
 * non-event.
 */
export const EVENTS_RATE_LIMIT = 120;
export const EVENTS_RATE_WINDOW_MS = 60_000;

export interface RateLimitVerdict {
  readonly allowed: boolean;
  /** Seconds until the oldest hit ages out of the window; set only when denied. */
  readonly retryAfterSeconds?: number;
}

export interface RateLimiter {
  /** Record-and-check for `key` at time `now` (ms). Denied checks do NOT count
   * against the window (a rejected request consumed no capacity). */
  check(key: string, now: number): RateLimitVerdict;
  /** Number of tracked keys — the observability surface the eviction tests
   * probe. Not consulted by the handlers. */
  size(): number;
}

/**
 * Build a sliding-window limiter. Each `check` first evicts every key whose
 * pruned hit list would be empty (all hits aged out — see MEMORY above), then
 * prunes the checked key's hits; if the survivor count is below `limit` it
 * records the new hit and allows, otherwise it denies with a `Retry-After`
 * derived from the oldest survivor.
 */
export function createRateLimiter(
  limit: number = PREPARE_RATE_LIMIT,
  windowMs: number = PREPARE_RATE_WINDOW_MS,
): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key, now) {
      const cutoff = now - windowMs;

      // Opportunistic eviction: a key whose NEWEST hit is at or before the
      // cutoff would prune to an empty list — delete the entry so idle users
      // do not accumulate. (Deleting during Map iteration is safe in JS.)
      for (const [trackedKey, trackedHits] of hits) {
        const newest = trackedHits[trackedHits.length - 1];
        if (newest === undefined || newest <= cutoff) {
          hits.delete(trackedKey);
        }
      }

      const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);

      if (recent.length >= limit) {
        const oldest = recent[0] ?? now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + windowMs - now) / 1000),
        );
        // Persist the pruned list so stale hits don't linger forever.
        hits.set(key, recent);
        return { allowed: false, retryAfterSeconds };
      }

      recent.push(now);
      hits.set(key, recent);
      return { allowed: true };
    },

    size() {
      return hits.size;
    },
  };
}
