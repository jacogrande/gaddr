/**
 * POST /api/spark/events — durable client-side event log (plan §4.5).
 *
 * Accepts a small batch of client-originated lifecycle events, each carrying
 * its client-generated UUID, and inserts each via the `SparkEventSink` (dedup
 * on the event-id pk is already in the sink). Fire-and-forget from the client
 * (`navigator.sendBeacon` on pagehide, batched otherwise) — so losing one is
 * acceptable, blocking the writer is not.
 *
 * BATCH POLICY (decisions, documented):
 *  - Per-ITEM rejection, not whole-batch: a malformed or disallowed item is
 *    counted in `rejected` and skipped; valid siblings still persist. A
 *    heterogeneous best-effort beacon shouldn't lose good telemetry to one bad
 *    row. (An over-CAP batch, by contrast, is rejected wholesale — it signals a
 *    client bug/abuse, not a normal flush.)
 *  - Allowed types: `served`/`rerolled`/`faded`/`dismissed`, plus `failed` ONLY
 *    with detail `insufficient-ground` — the below-minimum-ground summon is a
 *    client-side quiet no-op (no server call happens, plan §3.3/§5.2), so the
 *    client is that event's only possible writer. Every OTHER `failed` detail
 *    and all `prepared` rows remain server-authored and unforgeable (the
 *    validator's coherence rules are the enforcement point).
 *  - Response is 202 with `{ accepted, rejected }` counts. `sendBeacon` cannot
 *    read the response, so the body is for debugging/non-beacon callers, NOT a
 *    client contract — the client never depends on it.
 *
 * ACCEPTED RISK (documented, no behavior — the committed schema is frozen this
 * phase): `spark_event.id` is a single-column pk and the client supplies the
 * eventId, so a CROSS-USER eventId collision is first-writer-wins suppression —
 * a hostile client that GUESSES another user's event UUID could pre-insert it
 * and silently suppress that user's row. The guess is gated on 122 bits of
 * randomness (`crypto.randomUUID`), so it is not a practical attack; if it ever
 * matters, the fix is a composite (user_id, id) primary key.
 */

import { declaredContentLengthExceeds, jsonError } from "../http";
import {
  MAX_EVENT_BATCH,
  MAX_EVENTS_BODY_BYTES,
  parseEventItem,
} from "../validate";
import type { SparkEventsDeps } from "../deps";
import type { SparkEvent } from "../../../../domain/spark/types";
import type { SparkEventSink } from "../../../../domain/spark/ports";
import type { UserId } from "../../../../domain/types/branded";

/** Narrow an unknown JSON body to an array of unknown items, or null. */
function asUnknownArray(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value as readonly unknown[];
}

/**
 * Insert one event, returning whether it was accepted. A sink failure (or the
 * defensive throw guard) counts as rejected but never fails the batch — the same
 * loss-tolerant posture as the rest of spark telemetry.
 */
async function recordAccepted(
  sink: SparkEventSink,
  userId: UserId,
  event: SparkEvent,
  eventId: string,
): Promise<boolean> {
  try {
    const result = await sink.record(userId, event, eventId);
    return result.ok;
  } catch {
    return false;
  }
}

export async function handleSparkEvents(
  request: Request,
  deps: SparkEventsDeps,
): Promise<Response> {
  const session = await deps.requireSession();
  if (!session.ok) {
    return jsonError(401, "authentication required");
  }
  const userId = session.value.userId;

  // Cheap pre-parse gate on the DECLARED size, before json() buffers anything
  // (review major: this route had no size guard at all). The header may be
  // absent or lying — the per-item caps below stay authoritative.
  if (declaredContentLengthExceeds(request, MAX_EVENTS_BODY_BYTES)) {
    return jsonError(413, "request body too large");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const items = asUnknownArray(rawBody);
  if (items === null) {
    return jsonError(400, "expected an array of events");
  }
  if (items.length > MAX_EVENT_BATCH) {
    return jsonError(400, "batch exceeds maximum size");
  }

  let accepted = 0;
  let rejected = 0;
  for (const rawItem of items) {
    const parsed = parseEventItem(rawItem);
    if (!parsed.ok) {
      rejected += 1;
      continue;
    }
    const wasAccepted = await recordAccepted(
      deps.eventSink,
      userId,
      parsed.value.event,
      parsed.value.eventId,
    );
    if (wasAccepted) {
      accepted += 1;
    } else {
      rejected += 1;
    }
  }

  return Response.json({ accepted, rejected }, { status: 202 });
}
