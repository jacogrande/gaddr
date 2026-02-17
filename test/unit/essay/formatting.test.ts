import { describe, expect, test } from "bun:test";
import { relativeTime, formatPublishedDate, pluralize } from "../../../src/domain/essay/formatting";

// ── relativeTime ──

describe("relativeTime", () => {
  const base = new Date("2026-06-15T12:00:00Z");

  test("returns 'just now' for < 60 seconds", () => {
    const date = new Date(base.getTime() - 30_000);
    expect(relativeTime(date, base)).toBe("just now");
  });

  test("returns 'just now' at 0 seconds", () => {
    expect(relativeTime(base, base)).toBe("just now");
  });

  test("returns minutes for 1m-59m", () => {
    const oneMin = new Date(base.getTime() - 60_000);
    expect(relativeTime(oneMin, base)).toBe("1m ago");

    const thirtyMin = new Date(base.getTime() - 30 * 60_000);
    expect(relativeTime(thirtyMin, base)).toBe("30m ago");

    const fiftyNineMin = new Date(base.getTime() - 59 * 60_000);
    expect(relativeTime(fiftyNineMin, base)).toBe("59m ago");
  });

  test("returns hours for 1h-23h", () => {
    const oneHour = new Date(base.getTime() - 60 * 60_000);
    expect(relativeTime(oneHour, base)).toBe("1h ago");

    const twentyThreeHours = new Date(base.getTime() - 23 * 60 * 60_000);
    expect(relativeTime(twentyThreeHours, base)).toBe("23h ago");
  });

  test("returns days for 1d-29d", () => {
    const oneDay = new Date(base.getTime() - 24 * 60 * 60_000);
    expect(relativeTime(oneDay, base)).toBe("1d ago");

    const twentyNineDays = new Date(base.getTime() - 29 * 24 * 60 * 60_000);
    expect(relativeTime(twentyNineDays, base)).toBe("29d ago");
  });

  test("falls back to formatted date for >= 30 days", () => {
    const thirtyDays = new Date(base.getTime() - 30 * 24 * 60 * 60_000);
    // 30 days before June 15 = May 16, 2026
    expect(relativeTime(thirtyDays, base)).toBe("May 16, 2026");
  });
});

// ── formatPublishedDate ──

describe("formatPublishedDate", () => {
  test("formats UTC date as 'Month Day, Year'", () => {
    expect(formatPublishedDate(new Date("2026-01-15T00:00:00Z"))).toBe("January 15, 2026");
    expect(formatPublishedDate(new Date("2026-12-25T23:59:59Z"))).toBe("December 25, 2026");
  });

  test("uses UTC to avoid timezone drift", () => {
    // Midnight UTC on Jan 1 — should not drift to Dec 31 in any timezone handling
    const date = new Date("2026-01-01T00:00:00Z");
    expect(formatPublishedDate(date)).toBe("January 1, 2026");
  });
});

// ── pluralize ──

describe("pluralize", () => {
  test("returns singular for count=1", () => {
    expect(pluralize(1, "essay", "essays")).toBe("1 essay");
  });

  test("returns plural for count=0", () => {
    expect(pluralize(0, "essay", "essays")).toBe("0 essays");
  });

  test("returns plural for count=2", () => {
    expect(pluralize(2, "word", "words")).toBe("2 words");
  });

  test("returns plural for large counts", () => {
    expect(pluralize(100, "version", "versions")).toBe("100 versions");
  });
});
