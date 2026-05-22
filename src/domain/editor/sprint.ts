export type SprintPhase = "idle" | "running" | "paused" | "completed";

export const SPRINT_PHASES = [
  "idle",
  "running",
  "paused",
  "completed",
] as const satisfies readonly SprintPhase[];

export function isSprintPhase(value: unknown): value is SprintPhase {
  return (
    value === "idle" ||
    value === "running" ||
    value === "paused" ||
    value === "completed"
  );
}
