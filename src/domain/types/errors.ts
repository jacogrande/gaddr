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

export type DomainError =
  | NotFoundError
  | ValidationError
  | PersistenceError
  | AuthError;
