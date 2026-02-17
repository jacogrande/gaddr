// Pure display formatting for essays — no side effects, no Date.now()

/**
 * Human-readable relative time (e.g., "just now", "5m ago", "2d ago").
 * Pure: requires `now` as parameter.
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
  return date.toLocaleDateString();
}

/**
 * Format a published date for public display (e.g., "January 15, 2026").
 */
export function formatPublishedDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
