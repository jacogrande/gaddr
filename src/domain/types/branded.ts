// Branded types — nominal typing for domain identifiers

import type { Result } from "./result";
import type { ValidationError } from "./errors";
import { ok, err } from "./result";

// ── Brand symbol ──

declare const brand: unique symbol;

// ── Branded types ──

export type UserId = string & { readonly [brand]: "UserId" };
export type EssayId = string & { readonly [brand]: "EssayId" };

// ── UUID v4 validation ──

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid<T>(
  raw: string,
  label: string,
): Result<T, ValidationError> {
  const normalized = raw.toLowerCase();
  if (!UUID_V4_RE.test(normalized)) {
    return err({
      kind: "ValidationError",
      message: `Invalid ${label}: must be a valid UUID v4`,
      field: label,
    });
  }
  return ok(normalized as T);
}

// ── Constructors ──

export function userId(raw: string): Result<UserId, ValidationError> {
  return validateUuid<UserId>(raw, "userId");
}

export function essayId(raw: string): Result<EssayId, ValidationError> {
  return validateUuid<EssayId>(raw, "essayId");
}
