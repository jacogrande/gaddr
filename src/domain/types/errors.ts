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
  readonly cause?: unknown;
};

export type RenderError = {
  readonly kind: "RenderError";
  readonly message: string;
  readonly cause?: unknown;
};

export type PublishError =
  | { readonly kind: "EmptyContent" }
  | { readonly kind: "EmptyTitle" }
  | { readonly kind: "AlreadyPublished" };

export type UnpublishError = { readonly kind: "AlreadyDraft" };

export type UpdateError = { readonly kind: "NotDraft" };

export type LlmError = {
  readonly kind: "LlmError";
  readonly message: string;
  readonly cause?: unknown;
};

export type AuthorshipViolation = {
  readonly kind: "AuthorshipViolation";
  readonly message: string;
};

export type DomainError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | PersistenceError
  | AuthError
  | RenderError
  | PublishError
  | UnpublishError
  | UpdateError
  | LlmError
  | AuthorshipViolation;
