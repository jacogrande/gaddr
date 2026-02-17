// Centralized environment checks — single source of truth for runtime flags

export function isE2ETesting(): boolean {
  return process.env.E2E_TESTING === "true" && process.env.NODE_ENV !== "production";
}
