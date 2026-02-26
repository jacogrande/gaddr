import { headers } from "next/headers";
import { auth } from "./auth";
import { userId } from "../../domain/types/branded";
import { isErr } from "../../domain/types/result";
import type { Session } from "../../domain/auth/session";
import type { AuthError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";
import { isE2ETesting } from "../env";

export async function requireSession(): Promise<Result<Session, AuthError>> {
  if (isE2ETesting() && process.env.E2E_BYPASS_AUTH === "true") {
    const uid = userId("e2e-user");
    if (isErr(uid)) {
      return err({
        kind: "AuthError",
        message: "Invalid E2E user ID",
      });
    }

    return ok({
      userId: uid.value,
      email: "e2e@gaddr.local",
      name: "E2E User",
      image: null,
    });
  }

  try {
    const response = await auth.api.getSession({
      headers: await headers(),
    });

    if (!response) {
      return err({ kind: "AuthError", message: "No active session" });
    }

    const uid = userId(response.user.id);
    if (isErr(uid)) {
      return err({
        kind: "AuthError",
        message: "Invalid user ID in session",
      });
    }

    return ok({
      userId: uid.value,
      email: response.user.email,
      name: response.user.name,
      image: response.user.image ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? `Session verification failed: ${error.message}`
        : "Session verification failed";
    return err({ kind: "AuthError", message, cause: error });
  }
}
