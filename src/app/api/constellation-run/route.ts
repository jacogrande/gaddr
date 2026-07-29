/**
 * /api/constellation-run route entry (plan §6). Thin composition only: resolve
 * the real-vs-mock dependencies (per `isE2ETesting()`), then delegate to the
 * pure-ish handler cores. All logic and every status-code decision live in
 * `./handler`; the composition lives in `./deps`.
 *
 * POST starts (or resumes) a run and returns 202 immediately; the run continues
 * in the background via `after` (wired in `deps`), so the writer never blocks on
 * the multi-minute pipeline. `maxDuration` sizes the invocation for the worst
 * case (≈5 model calls + repair tails) so the background work is not killed
 * mid-run (§5.4). GET is the board's poll channel.
 */

import {
  resolveConstellationRunReadDeps,
  resolveConstellationRunStartDeps,
} from "./deps";
import {
  handleConstellationRunRead,
  handleConstellationRunStart,
} from "./handler";

/** Worst-case: S1 + four S3 calls + repair tails, each a Sonnet-class call. 300s
 * is generous headroom; the run checkpoints throughout, so a kill past this is
 * survivable by the staleness rule + resume (§5.4). */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const deps = await resolveConstellationRunStartDeps();
  return handleConstellationRunStart(request, deps);
}

export async function GET(request: Request): Promise<Response> {
  const deps = await resolveConstellationRunReadDeps();
  return handleConstellationRunRead(request, deps);
}
