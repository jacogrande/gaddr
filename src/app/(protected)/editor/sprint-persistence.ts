import { isSprintPhase, type SprintPhase } from "../../../domain/editor/sprint";

export type { SprintPhase } from "../../../domain/editor/sprint";

// v2 adds `sprintId` (the durable, client-generated UUID). Old v1 payloads —
// which have no `sprintId` field — fail `isPersistedShape` on the version check
// below and are treated as "no persisted state". That drops one in-flight
// sprint on the version-bump deploy, which is acceptable per the plan (§3.6):
// a sprint mid-flight at deploy time simply restarts at the wizard.
export const SPRINT_STATE_SCHEMA_VERSION = 2;

export type PersistedSprintState = {
  readonly schemaVersion: typeof SPRINT_STATE_SCHEMA_VERSION;
  readonly phase: SprintPhase;
  readonly endsAtMs: number | null;
  readonly pausedRemainingMs: number | null;
  readonly optionId: string;
  readonly lastActiveAtMs: number;
  /**
   * The durable sprint id. Stored as a raw string (JSON carries no brand); the
   * app layer re-validates it through `sprintId()` on rehydrate. Null when the
   * persisted sprint has no identity yet (idle / pre-start).
   */
  readonly sprintId: string | null;
};

const STORAGE_KEY = "gaddr:sprint-state";

export const SPRINT_STALE_THRESHOLD_MS = 60 * 60 * 1000;

export function isPersistedShape(value: unknown): value is PersistedSprintState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== SPRINT_STATE_SCHEMA_VERSION) {
    return false;
  }
  if (!isSprintPhase(candidate.phase)) {
    return false;
  }
  if (candidate.endsAtMs !== null && typeof candidate.endsAtMs !== "number") {
    return false;
  }
  if (
    candidate.pausedRemainingMs !== null &&
    typeof candidate.pausedRemainingMs !== "number"
  ) {
    return false;
  }
  if (typeof candidate.optionId !== "string") {
    return false;
  }
  if (typeof candidate.lastActiveAtMs !== "number") {
    return false;
  }
  if (candidate.sprintId !== null && typeof candidate.sprintId !== "string") {
    return false;
  }
  // A sprint with a phase but no identity cannot exist on the write path
  // (start/resume always mint or carry an id). Rejecting it here keeps the
  // "non-idle ⇒ sprintId present" invariant enforced at the trust boundary,
  // not assumed — a null id restored into a running sprint would leave the
  // inference runner on its placeholder substrate for the whole session.
  if (candidate.phase !== "idle" && candidate.sprintId === null) {
    return false;
  }
  return true;
}

export function loadSprintState(): PersistedSprintState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isPersistedShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSprintState(
  state: Omit<PersistedSprintState, "schemaVersion">,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: PersistedSprintState = {
      schemaVersion: SPRINT_STATE_SCHEMA_VERSION,
      ...state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be full, blocked, or disabled — ignore.
  }
}
