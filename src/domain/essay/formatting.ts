// Pure display formatting for essays — no side effects, no Date.now(), no locale-dependent APIs

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Human-readable relative time (e.g., "just now", "5m ago", "2d ago").
 * Pure: requires `now` as parameter, no locale-dependent calls.
 */
export function relativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHr < 24) return `${String(diffHr)}h ago`;
  if (diffDay < 30) return `${String(diffDay)}d ago`;
  return formatDate(date);
}

/**
 * Format a date as "January 15, 2026". Pure: uses UTC accessors and
 * a static month table — no locale or timezone dependency.
 */
export function formatPublishedDate(date: Date): string {
  return formatDate(date);
}

function formatDate(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${String(month)} ${String(day)}, ${String(year)}`;
}
