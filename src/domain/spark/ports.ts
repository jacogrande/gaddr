/**
 * Ports the Spark core needs from infrastructure (plan §3.5).
 *
 * Same interface-segregation stance as the constellation tier ports: generation
 * and event-recording have different inputs, outputs, and failure semantics, so
 * they are two interfaces, not one fat "spark port". Adapters implement these;
 * the domain never sees an SDK type and never sees a thrown exception — every
 * call resolves to a `Result`.
 *
 * `SparkGenerationPort` is deliberately shaped like a miniature constellation
 * stage ("read the draft, emit typed structured candidates") — the first
 * concrete instance of the pattern every harness stage will follow. The port
 * stays ignorant of the database: the route composes the `servedLenses` query
 * (derived from `spark_event`, never trusted from the client) with this call.
 */

import type { Result } from "../types/result";
import type { InferenceError, PersistenceError } from "../types/errors";
import type { SprintId, UserId } from "../types/branded";
import type { SparkCandidateSet, SparkEvent, SparkLens } from "./types";

/**
 * Generate a ranked candidate set for the current draft. `servedLenses` is
 * supplied by the route (from `spark_event`) so the adapter can exclude
 * already-served dimensions at generation time; the pure `selectSpark` enforces
 * rotation again at serve time as a second line of defence.
 */
export interface SparkGenerationPort {
  generate(input: {
    readonly draft: string;
    readonly sprintId: SprintId;
    readonly servedLenses: readonly SparkLens[];
  }): Promise<Result<SparkCandidateSet, InferenceError>>;
}

/**
 * Record one durable spark telemetry event. Insert-only and idempotent at the
 * adapter (insert on-conflict-do-nothing on the event id), so at-least-once
 * delivery from the client cannot double-count metrics (plan §4.4).
 *
 * Tenancy (`userId`) and dedup identity (`eventId`) travel on the CALL, not on
 * `SparkEvent` — that seam is deliberate. They are delivery-envelope concerns:
 * who owns the row comes from the authenticated session at the route, and how
 * at-least-once delivery collapses comes from the client's generated UUID.
 * Putting them on the event type would let a client claim another user's
 * tenancy and would pollute the pure semantic payload the reducer and metrics
 * consume; putting them on the port keeps the event pure while giving the
 * adapter everything persistence needs.
 *
 * `eventId` is the client-generated UUID for client-originated events
 * (`served`/`rerolled`/`faded`/`dismissed`); server-originated events
 * (`prepared`/`failed` from the route) omit it and the adapter generates one.
 */
export interface SparkEventSink {
  record(
    userId: UserId,
    event: SparkEvent,
    eventId?: string,
  ): Promise<Result<void, PersistenceError>>;
}
