import type { Result } from "./result";
import type { ValidationError } from "./errors";
import { ok, err } from "./result";

declare const brand: unique symbol;

export type UserId = string & { readonly [brand]: "UserId" };
export type SprintId = string & { readonly [brand]: "SprintId" };
export type RunId = string & { readonly [brand]: "RunId" };

function validateNonEmpty<T>(
  raw: string,
  label: string,
): Result<T, ValidationError> {
  if (raw.length === 0) {
    return err({
      kind: "ValidationError",
      message: `Invalid ${label}: must not be empty`,
      field: label,
    });
  }
  return ok(raw as T);
}

export function userId(raw: string): Result<UserId, ValidationError> {
  return validateNonEmpty<UserId>(raw, "userId");
}

/**
 * Canonical UUID shape: five hyphen-separated hex groups (8-4-4-4-12),
 * case-insensitive. This is a *structural* check only — it does not assert the
 * version/variant nibbles, so both `crypto.randomUUID()` output (RFC 4122 v4)
 * and the deterministic fixtures used in tests pass. Generation is the app
 * layer's job (it owns randomness); the domain only validates the shape, so no
 * crypto import belongs here.
 */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A `SprintId` is a durable, client-generated UUID. The counter ids of the past
 * (`sprint-1`, `sprint-pending`, …) are deliberately rejected: they were a
 * collision-prone stand-in that this validator retires.
 */
export function sprintId(raw: string): Result<SprintId, ValidationError> {
  if (!UUID_SHAPE.test(raw)) {
    return err({
      kind: "ValidationError",
      message: "Invalid sprintId: must be a UUID",
      field: "sprintId",
    });
  }
  return ok(raw as SprintId);
}

/**
 * A `RunId` is the durable identity of one constellation run (plan §4.1),
 * generated server-side when the run row is first persisted. Same structural
 * UUID contract as `SprintId` — the domain validates shape only; the app layer
 * owns generation (it owns randomness), so no crypto import belongs here.
 */
export function runId(raw: string): Result<RunId, ValidationError> {
  if (!UUID_SHAPE.test(raw)) {
    return err({
      kind: "ValidationError",
      message: "Invalid runId: must be a UUID",
      field: "runId",
    });
  }
  return ok(raw as RunId);
}
