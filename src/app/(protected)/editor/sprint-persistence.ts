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

/** Canonical UUID shape (structural, case-insensitive) — kept byte-identical to
 * the domain and route copies so `crypto.randomUUID()` output and test fixtures
 * pass. A non-idle persisted sprint MUST carry a UUID id (below). */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // A sprint with a phase but no VALID identity cannot exist on the write path
  // (start/resume always mint or carry a UUID id). Rejecting it here keeps the
  // "non-idle ⇒ sprintId is a UUID" invariant enforced at the trust boundary,
  // not assumed — a null OR malformed (e.g. legacy `sprint-1`) id restored into
  // a running sprint would leave the inference runner on its placeholder
  // substrate for the whole session. Tightened to the full UUID shape, not just
  // "present": a non-UUID string would fail the domain brand on rehydrate and
  // strand the session on a null id despite this guard passing.
  if (
    candidate.phase !== "idle" &&
    (typeof candidate.sprintId !== "string" || !UUID_SHAPE.test(candidate.sprintId))
  ) {
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
