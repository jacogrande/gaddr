/**
 * E2E-mode session resolution for the spark routes.
 *
 * WHY THIS EXISTS (import-graph constraint, plan §4.5 / Phase 7): the real
 * `requireSession` lives in `infra/auth/require-session`, which imports
 * `infra/auth/auth`, which imports the db client — and BOTH the db client and
 * `auth` throw at IMPORT time when their env vars (`DATABASE_URL`,
 * `BETTER_AUTH_SECRET`, …) are unset. E2E mode must run with none of those set,
 * so the composition MUST NOT statically import `requireSession`. Real mode
 * imports it dynamically (its env is present there); E2E mode uses the resolver
 * below, which mints the SAME identity the real bypass mints without touching
 * infra/auth.
 *
 * This mirrors `require-session.ts`'s bypass branch EXACTLY, including its
 * CONJUNCTION: the bypass session is minted only when `isE2ETesting()` AND
 * `E2E_BYPASS_AUTH === "true"` — checked HERE, not just at the call site
 * (review fix: defence in depth; if a future caller reaches this outside E2E
 * mode, it gets an AuthError, not a free session). Anything else is an
 * `AuthError`. (The real fall-through to OAuth needs the db and is not a
 * supported no-DB path — the eval always sets `E2E_BYPASS_AUTH=true` per
 * CLAUDE.md.)
 */

import { isE2ETesting } from "../../../infra/env";
import { userId } from "../../../domain/types/branded";
import { ok, err, isErr } from "../../../domain/types/result";
import type { Result } from "../../../domain/types/result";
import type { Session } from "../../../domain/auth/session";
import type { AuthError } from "../../../domain/types/errors";

export function resolveE2ESession(): Result<Session, AuthError> {
  if (!isE2ETesting() || process.env.E2E_BYPASS_AUTH !== "true") {
    return err({ kind: "AuthError", message: "No active session" });
  }
  const uid = userId("e2e-user");
  if (isErr(uid)) {
    return err({ kind: "AuthError", message: "Invalid E2E user ID" });
  }
  return ok({
    userId: uid.value,
    email: "e2e@gaddr.local",
    name: "E2E User",
    image: null,
  });
}
