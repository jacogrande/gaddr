import type { Result } from "./result";
import type { ValidationError } from "./errors";
import { ok, err } from "./result";

declare const brand: unique symbol;

export type UserId = string & { readonly [brand]: "UserId" };

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
