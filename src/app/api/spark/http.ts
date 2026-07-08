/**
 * Tiny HTTP helpers shared by the two spark routes.
 *
 * Error bodies are DELIBERATELY terse and content-free: `{ error: "<reason>" }`
 * only. The draft — the writer's most private artifact — must NEVER appear in a
 * response body, a header, or a log (plan §4.4 content posture; the route task's
 * hard constraint). So callers pass a short, fixed reason string, never anything
 * derived from the request payload.
 */

/**
 * A terse JSON error response. `status` is the HTTP code; `message` is a fixed,
 * content-free reason. Optional `headers` carry things like `Retry-After` on 429.
 */
export function jsonError(
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: message }, { status, headers });
}

/**
 * Cheap pre-parse size gate (review major: the char caps run only AFTER
 * `request.json()` has buffered the whole body into memory). Checks the
 * Content-Length HEADER against a route-level byte cap BEFORE any body read.
 *
 * The header can be absent (chunked encoding) or lying, so a `false` here is
 * NOT a guarantee of a small body — this is the cheap first gate; the
 * parse-level char caps (`MAX_DRAFT_CHARS`, `MAX_EVENT_QUESTION_CHARS`,
 * `MAX_EVENT_BATCH`) remain the authoritative checks. Honest clients (and every
 * browser fetch/sendBeacon with a buffered body) always send Content-Length,
 * so the common oversized case is rejected before buffering.
 */
export function declaredContentLengthExceeds(
  request: Request,
  maxBytes: number,
): boolean {
  const header = request.headers.get("content-length");
  if (header === null) {
    return false;
  }
  const declared = Number(header);
  return Number.isFinite(declared) && declared > maxBytes;
}
