export type NotFoundError = {
  readonly kind: "NotFoundError";
  readonly entity: string;
  readonly id: string;
};

export type ValidationError = {
  readonly kind: "ValidationError";
  readonly message: string;
  readonly field?: string;
};

export type PersistenceError = {
  readonly kind: "PersistenceError";
  readonly message: string;
  readonly cause?: unknown;
};

export type AuthError = {
  readonly kind: "AuthError";
  readonly message: string;
  readonly cause?: unknown;
};

/**
 * A background inference call (triage / analysis) failed in a recoverable way.
 * Adapters translate SDK / transport exceptions into one of these reasons so
 * the orchestration layer can degrade gracefully (drop the burst, keep the
 * partial substrate) instead of seeing a raw throw.
 */
export type InferenceError = {
  readonly kind: "InferenceError";
  readonly reason: "timeout" | "rate-limit" | "malformed-output" | "transport";
  readonly message: string;
  readonly cause?: unknown;
};

export type DomainError =
  | NotFoundError
  | ValidationError
  | PersistenceError
  | AuthError
  | InferenceError;
