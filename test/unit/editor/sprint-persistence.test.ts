import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SPRINT_STATE_SCHEMA_VERSION,
  isPersistedShape,
  loadSprintState,
  saveSprintState,
} from "../../../src/app/(protected)/editor/sprint-persistence";

const STORAGE_KEY = "gaddr:sprint-state";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const originalWindow = globalThis.window;

beforeEach(() => {
  const storage = new MemoryStorage();
  // Inject a minimal window with localStorage for the module's SSR guards.
  (globalThis as { window?: { localStorage: Storage } }).window = {
    localStorage: storage,
  };
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

const SPRINT_UUID = "11111111-2222-4333-8444-555555555555";

function validState() {
  return {
    schemaVersion: SPRINT_STATE_SCHEMA_VERSION,
    phase: "running" as const,
    endsAtMs: 1_700_000_000_000,
    pausedRemainingMs: null,
    optionId: "10m",
    lastActiveAtMs: 1_699_999_990_000,
    sprintId: SPRINT_UUID,
  };
}

describe("isPersistedShape", () => {
  test("accepts a fully valid state", () => {
    expect(isPersistedShape(validState())).toBe(true);
  });

  test("rejects null and non-object values", () => {
    expect(isPersistedShape(null)).toBe(false);
    expect(isPersistedShape("string")).toBe(false);
    expect(isPersistedShape(42)).toBe(false);
  });

  test("rejects missing or wrong schemaVersion", () => {
    const without = { ...validState() } as Record<string, unknown>;
    delete without.schemaVersion;
    expect(isPersistedShape(without)).toBe(false);

    expect(isPersistedShape({ ...validState(), schemaVersion: 0 })).toBe(false);
    expect(isPersistedShape({ ...validState(), schemaVersion: "1" })).toBe(false);
  });

  test("rejects unknown phase", () => {
    expect(isPersistedShape({ ...validState(), phase: "bogus" })).toBe(false);
  });

  test("rejects wrong-typed numeric fields", () => {
    expect(isPersistedShape({ ...validState(), endsAtMs: "1700" })).toBe(false);
    expect(isPersistedShape({ ...validState(), pausedRemainingMs: "0" })).toBe(false);
    expect(isPersistedShape({ ...validState(), lastActiveAtMs: null })).toBe(false);
  });

  test("accepts null for endsAtMs and pausedRemainingMs", () => {
    expect(
      isPersistedShape({
        ...validState(),
        endsAtMs: null,
        pausedRemainingMs: null,
      }),
    ).toBe(true);
  });

  test("rejects missing optionId", () => {
    const candidate = { ...validState() } as Record<string, unknown>;
    delete candidate.optionId;
    expect(isPersistedShape(candidate)).toBe(false);
  });

  test("accepts a string sprintId, and null only alongside an idle phase", () => {
    expect(isPersistedShape({ ...validState(), sprintId: SPRINT_UUID })).toBe(true);
    expect(
      isPersistedShape({
        ...validState(),
        phase: "idle" as const,
        endsAtMs: null,
        sprintId: null,
      }),
    ).toBe(true);
  });

  test("rejects a non-idle phase paired with a null sprintId", () => {
    // A sprint with a phase but no identity cannot exist on the write path;
    // restoring one would strand the inference runner on its placeholder id.
    expect(isPersistedShape({ ...validState(), sprintId: null })).toBe(false);
    expect(
      isPersistedShape({
        ...validState(),
        phase: "completed" as const,
        endsAtMs: null,
        sprintId: null,
      }),
    ).toBe(false);
  });

  test("rejects a non-string, non-null sprintId", () => {
    expect(isPersistedShape({ ...validState(), sprintId: 42 })).toBe(false);
    expect(isPersistedShape({ ...validState(), sprintId: {} })).toBe(false);
  });

  test("rejects missing sprintId (undefined is neither string nor null)", () => {
    const candidate = { ...validState() } as Record<string, unknown>;
    delete candidate.sprintId;
    expect(isPersistedShape(candidate)).toBe(false);
  });

  test("rejects a v1 payload (no sprintId field, old schema version)", () => {
    // The exact shape written before the durable-SprintId migration.
    const v1Payload = {
      schemaVersion: 1,
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_699_999_990_000,
    };
    expect(isPersistedShape(v1Payload)).toBe(false);
  });
});

describe("saveSprintState / loadSprintState round-trip", () => {
  test("a saved state can be loaded back", () => {
    const state = {
      phase: "paused" as const,
      endsAtMs: null,
      pausedRemainingMs: 5 * 60_000,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: SPRINT_UUID,
    };
    saveSprintState(state);
    const loaded = loadSprintState();
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe("paused");
    expect(loaded?.pausedRemainingMs).toBe(5 * 60_000);
    expect(loaded?.optionId).toBe("10m");
    expect(loaded?.schemaVersion).toBe(SPRINT_STATE_SCHEMA_VERSION);
  });

  test("the durable sprintId survives the round-trip", () => {
    saveSprintState({
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: SPRINT_UUID,
    });
    expect(loadSprintState()?.sprintId).toBe(SPRINT_UUID);
  });

  test("a null sprintId round-trips only with an idle phase", () => {
    saveSprintState({
      phase: "idle",
      endsAtMs: null,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: null,
    });
    expect(loadSprintState()?.sprintId).toBeNull();

    // The same null identity under a running phase is rejected on load.
    saveSprintState({
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: null,
    });
    expect(loadSprintState()).toBeNull();
  });

  test("save always attaches the current schema version", () => {
    saveSprintState({
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: SPRINT_UUID,
    });
    const raw = (globalThis as { window?: { localStorage: Storage } }).window?.localStorage.getItem(
      STORAGE_KEY,
    );
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as { schemaVersion?: number };
    expect(parsed.schemaVersion).toBe(SPRINT_STATE_SCHEMA_VERSION);
  });
});

describe("loadSprintState error handling", () => {
  test("returns null when the storage is empty", () => {
    expect(loadSprintState()).toBeNull();
  });

  test("returns null when the stored value is not valid JSON", () => {
    (globalThis as { window?: { localStorage: Storage } }).window?.localStorage.setItem(
      STORAGE_KEY,
      "{not json",
    );
    expect(loadSprintState()).toBeNull();
  });

  test("returns null when the stored value has the wrong shape", () => {
    (globalThis as { window?: { localStorage: Storage } }).window?.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ phase: "running" }),
    );
    expect(loadSprintState()).toBeNull();
  });

  test("returns null when schemaVersion mismatches", () => {
    (globalThis as { window?: { localStorage: Storage } }).window?.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...validState(), schemaVersion: 99 }),
    );
    expect(loadSprintState()).toBeNull();
  });

  test("returns null for a persisted v1 payload (migration drops it cleanly)", () => {
    (globalThis as { window?: { localStorage: Storage } }).window?.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        phase: "running",
        endsAtMs: 1_700_000_000_000,
        pausedRemainingMs: null,
        optionId: "10m",
        lastActiveAtMs: 1_699_999_990_000,
      }),
    );
    expect(loadSprintState()).toBeNull();
  });
});

describe("SSR safety", () => {
  test("loadSprintState returns null when window is undefined", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(loadSprintState()).toBeNull();
  });

  test("saveSprintState is a no-op when window is undefined", () => {
    delete (globalThis as { window?: unknown }).window;
    // Should not throw.
    saveSprintState({
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
      sprintId: SPRINT_UUID,
    });
  });
});
