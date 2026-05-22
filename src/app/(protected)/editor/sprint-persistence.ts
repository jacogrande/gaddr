import { isSprintPhase, type SprintPhase } from "../../../domain/editor/sprint";

export type { SprintPhase } from "../../../domain/editor/sprint";

export const SPRINT_STATE_SCHEMA_VERSION = 1;

export type PersistedSprintState = {
  readonly schemaVersion: typeof SPRINT_STATE_SCHEMA_VERSION;
  readonly phase: SprintPhase;
  readonly endsAtMs: number | null;
  readonly pausedRemainingMs: number | null;
  readonly optionId: string;
  readonly lastActiveAtMs: number;
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
