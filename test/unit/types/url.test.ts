import { describe, expect, test } from "bun:test";
import { isSafeUrl } from "../../../src/domain/types/url";

describe("isSafeUrl", () => {
  // ── Valid URLs ──
  test("accepts http URL", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  test("accepts https URL", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  test("accepts https URL with path and query", () => {
    expect(isSafeUrl("https://example.com/path?q=1")).toBe(true);
  });

  // The regex is case-sensitive — uppercase protocols are rejected.
  // This is acceptable since browser-submitted URLs are lowercase.
  test("rejects HTTPS uppercase (case-sensitive regex)", () => {
    expect(isSafeUrl("HTTPS://EXAMPLE.COM")).toBe(false);
  });

  // ── Invalid URLs ──
  test("rejects javascript: protocol", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  test("rejects ftp: protocol", () => {
    expect(isSafeUrl("ftp://files.example.com")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });

  test("rejects data: URI", () => {
    expect(isSafeUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  test("rejects protocol-relative URL", () => {
    expect(isSafeUrl("//example.com")).toBe(false);
  });

  // ── Edge cases ──
  test("rejects URL with spaces before protocol", () => {
    expect(isSafeUrl(" https://example.com")).toBe(false);
  });

  test("accepts URL with special characters in path", () => {
    expect(isSafeUrl("https://example.com/path%20with%20spaces")).toBe(true);
  });

  test("accepts URL with fragment", () => {
    expect(isSafeUrl("https://example.com/page#section")).toBe(true);
  });
});
