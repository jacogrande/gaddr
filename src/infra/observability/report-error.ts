import * as Sentry from "@sentry/nextjs";
import type { UserId, EssayId, EvidenceCardId } from "../../domain/types/branded";

type ErrorContext = {
  action: string;
  userId?: UserId;
  essayId?: EssayId;
  evidenceCardId?: EvidenceCardId;
};

function extractMessage(cause: unknown): string {
  if (typeof cause === "object" && cause !== null && "message" in cause) {
    const msg: unknown = (cause as { message: unknown }).message;
    return typeof msg === "string" ? msg : String(msg);
  }
  return String(cause);
}

/**
 * Report an error to Sentry with structured context.
 * Accepts Error instances or Result error objects (e.g. PersistenceError).
 */
export function reportError(cause: unknown, context: ErrorContext): void {
  const error =
    cause instanceof Error ? cause : new Error(extractMessage(cause));

  Sentry.withScope((scope) => {
    scope.setTag("action", context.action);
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.essayId) scope.setTag("essayId", context.essayId);
    if (context.evidenceCardId) scope.setTag("evidenceCardId", context.evidenceCardId);
    Sentry.captureException(error);
  });
}
