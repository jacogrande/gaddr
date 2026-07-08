/**
 * POST /api/spark route entry. Thin composition only: resolve the real-vs-mock
 * dependencies (per `isE2ETesting()`), then delegate to the pure-ish handler
 * core. All logic and every status-code decision live in `./handler`; the
 * composition lives in `./deps`.
 */

import { resolveSparkGenerateDeps } from "./deps";
import { handleSparkGenerate } from "./handler";

export async function POST(request: Request): Promise<Response> {
  const deps = await resolveSparkGenerateDeps();
  return handleSparkGenerate(request, deps);
}
