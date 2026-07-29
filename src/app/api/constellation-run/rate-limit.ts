/**
 * rate-limit.ts — the constellation-run rate buckets (plan §6). Reuses the
 * spark sliding-window limiter primitive (`createRateLimiter`) with
 * constellation-appropriate caps. Same HARD LIMITATION applies: a per-instance
 * in-memory backstop, not a durable global quota (see `../spark/rate-limit.ts`).
 */

export {
  createRateLimiter,
  type RateLimiter,
  type RateLimitVerdict,
} from "../spark/rate-limit";

/**
 * A run is orders of magnitude more expensive than a spark (≈5 Sonnet calls), so
 * the START cap is tight: ~6 NOVEL runs per user per hour. Only novel run_keys
 * are charged — resume/retry re-POSTs are exempt (the spark rule "background work
 * must never be the reason the writer's request 429s", applied to the recovery
 * path), enforced in the handler by charging only when `start()` reports the run
 * was newly created. A real writer finishing sprints never approaches it.
 */
export const RUN_RATE_LIMIT = 6;
export const RUN_RATE_WINDOW_MS = 3_600_000;

/**
 * The node-status PATCH is cheap (one UPDATE per item, batch-capped at 20) but
 * writer-driven, so a generous per-user cap backstops route abuse: 120 requests
 * per minute. The real board mutates a card at a time; this is unreachable
 * legitimately.
 */
export const NODE_STATUS_RATE_LIMIT = 120;
export const NODE_STATUS_RATE_WINDOW_MS = 60_000;
