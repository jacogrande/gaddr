// Domain error union — exhaustive switch-friendly discriminated union

export type NotFoundError = {
  readonly kind: "NotFoundError";
  readonly entity: string;
  readonly id: string;
};

export type UnauthorizedError = {
  readonly kind: "UnauthorizedError";
  readonly message: string;
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
};

export type PublishError =
  | { readonly kind: "empty_content" }
  | { readonly kind: "already_published" };

export type UnpublishError = { readonly kind: "already_draft" };

export type DomainError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | PersistenceError
  | AuthError
  | PublishError
  | UnpublishError;
