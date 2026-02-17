// Branded types — nominal typing for domain identifiers

import type { Result } from "./result";
import type { ValidationError } from "./errors";
import { ok, err } from "./result";

// ── Brand symbol ──

declare const brand: unique symbol;

// ── Branded types ──

export type UserId = string & { readonly [brand]: "UserId" };
export type EssayId = string & { readonly [brand]: "EssayId" };
export type EvidenceCardId = string & { readonly [brand]: "EvidenceCardId" };
export type ClaimEvidenceLinkId = string & {
  readonly [brand]: "ClaimEvidenceLinkId";
};
export type EssayVersionId = string & {
  readonly [brand]: "EssayVersionId";
};

// ── Validation ──

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

// UserId: accepts any non-empty string (Better Auth generates nanoid-style IDs)
export function userId(raw: string): Result<UserId, ValidationError> {
  return validateNonEmpty<UserId>(raw, "userId");
}

// EssayId: requires UUID v4 (we control generation)
export function essayId(raw: string): Result<EssayId, ValidationError> {
  return validateUuid<EssayId>(raw, "essayId");
}

// EvidenceCardId: requires UUID v4 (we control generation)
export function evidenceCardId(
  raw: string,
): Result<EvidenceCardId, ValidationError> {
  return validateUuid<EvidenceCardId>(raw, "evidenceCardId");
}

// ClaimEvidenceLinkId: requires UUID v4 (we control generation)
export function claimEvidenceLinkId(
  raw: string,
): Result<ClaimEvidenceLinkId, ValidationError> {
  return validateUuid<ClaimEvidenceLinkId>(raw, "claimEvidenceLinkId");
}

// EssayVersionId: requires UUID v4 (we control generation)
export function essayVersionId(
  raw: string,
): Result<EssayVersionId, ValidationError> {
  return validateUuid<EssayVersionId>(raw, "essayVersionId");
}
