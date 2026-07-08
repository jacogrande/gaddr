/**
 * POST /api/spark/events route entry. Thin composition only: resolve the
 * real-vs-mock event sink (per `isE2ETesting()`), then delegate to the pure-ish
 * handler core in `./handler`.
 */

import { resolveSparkEventsDeps } from "../deps";
import { handleSparkEvents } from "./handler";

export async function POST(request: Request): Promise<Response> {
  const deps = await resolveSparkEventsDeps();
  return handleSparkEvents(request, deps);
}
