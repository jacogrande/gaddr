// Domain Session type — decoupled from Better Auth's session shape

import type { UserId } from "../types/branded";

export type Session = {
  readonly userId: UserId;
  readonly email: string;
  readonly name: string;
  readonly image: string | null;
};
