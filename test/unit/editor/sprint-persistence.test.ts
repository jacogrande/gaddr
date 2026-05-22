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

function validState() {
  return {
    schemaVersion: SPRINT_STATE_SCHEMA_VERSION,
    phase: "running" as const,
    endsAtMs: 1_700_000_000_000,
    pausedRemainingMs: null,
    optionId: "10m",
    lastActiveAtMs: 1_699_999_990_000,
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
});

describe("saveSprintState / loadSprintState round-trip", () => {
  test("a saved state can be loaded back", () => {
    const state = {
      phase: "paused" as const,
      endsAtMs: null,
      pausedRemainingMs: 5 * 60_000,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
    };
    saveSprintState(state);
    const loaded = loadSprintState();
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe("paused");
    expect(loaded?.pausedRemainingMs).toBe(5 * 60_000);
    expect(loaded?.optionId).toBe("10m");
    expect(loaded?.schemaVersion).toBe(SPRINT_STATE_SCHEMA_VERSION);
  });

  test("save always attaches the current schema version", () => {
    saveSprintState({
      phase: "running",
      endsAtMs: 1_700_000_000_000,
      pausedRemainingMs: null,
      optionId: "10m",
      lastActiveAtMs: 1_700_000_000_000,
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
    });
  });
});
