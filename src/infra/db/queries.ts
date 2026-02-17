import { eq } from "drizzle-orm";
import { db } from "./client";
import { user } from "./schema";
import type { PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";

type UserProfile = {
  id: string;
  name: string;
  image: string | null;
};

export async function findUserById(id: string): Promise<Result<UserProfile | null, PersistenceError>> {
  try {
    const rows = await db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return ok(rows[0] ?? null);
  } catch (cause: unknown) {
    return err({ kind: "PersistenceError", message: "Failed to find user", cause });
  }
}
