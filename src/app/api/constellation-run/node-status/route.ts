/**
 * PATCH /api/constellation-run/node-status route entry (plan §6, D12). Thin
 * composition only: resolve the real-vs-mock dependencies, then delegate to the
 * handler core. The node lifecycle transition + the Run 1 reaction write live in
 * `./handler`; tenancy and transition legality are enforced atomically at the
 * persistence boundary (`updateNode`).
 */

import { resolveNodeStatusDeps } from "../deps";
import { handleNodeStatusUpdate } from "../handler";

export async function PATCH(request: Request): Promise<Response> {
  const deps = await resolveNodeStatusDeps();
  return handleNodeStatusUpdate(request, deps);
}
