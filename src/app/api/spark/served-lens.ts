/**
 * Served-lens seam for the spark routes (plan §3.3, §4.5, §6).
 *
 * `servedLenses` is derived SERVER-SIDE from `spark_event` — the lenses of
 * prior `served`/`rerolled` rows for (user, sprint) — and NEVER trusted from
 * the client body. That derivation is a database read, so the implementation
 * lives in infra (`infra/db/served-lens-query.ts`, beside the sinks — review
 * fix: drizzle queries are infra's job); this app module only re-exports the
 * seam so the route composition, the handler, and the in-memory E2E store share
 * one type without the handler knowing which implementation it got.
 *
 * The seam is Result-returning (PersistenceError on a failed read): the handler
 * maps the failure by reason — fail-closed for `prepare`, fail-open for
 * `summon` — see `handler.ts` for that asymmetry and its rationale.
 */

export type { ServedLensQuery } from "../../../infra/db/served-lens-query";
export { createServedLensQuery as createDbServedLensQuery } from "../../../infra/db/served-lens-query";
