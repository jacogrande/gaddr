import { describe, expect, test } from "bun:test";
import { sprintId, userId } from "../../../src/domain/types/branded";

describe("sprintId — UUID shape validator", () => {
  test("accepts a canonical lowercase UUID", () => {
    const result = sprintId("11111111-2222-4333-8444-555555555555");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(String(result.value)).toBe("11111111-2222-4333-8444-555555555555");
    }
  });

  test("accepts uppercase and mixed-case UUIDs (case-insensitive)", () => {
    expect(sprintId("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE").ok).toBe(true);
    expect(sprintId("AaBbCcDd-1234-4f6a-8bCd-0123456789Ab").ok).toBe(true);
  });

  test("accepts the deterministic fixtures used across the test suite", () => {
    // Structural-only: these are not RFC-4122 v4 (version/variant nibbles are
    // arbitrary) yet must pass, since tests rely on them.
    expect(sprintId("11111111-1111-1111-1111-111111111111").ok).toBe(true);
    expect(sprintId("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").ok).toBe(true);
  });

  test("accepts the output of crypto.randomUUID()", () => {
    const result = sprintId(crypto.randomUUID());
    expect(result.ok).toBe(true);
  });

  test("rejects the retired counter id format", () => {
    for (const legacy of ["sprint-1", "sprint-2", "sprint-pending", "sprint-test"]) {
      const result = sprintId(legacy);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("ValidationError");
        expect(result.error.field).toBe("sprintId");
      }
    }
  });

  test("rejects empty and junk strings", () => {
    for (const junk of ["", "   ", "not-a-uuid", "12345", "aaaa", "bbbb"]) {
      expect(sprintId(junk).ok).toBe(false);
    }
  });

  test("rejects structurally-close-but-wrong shapes", () => {
    // wrong group lengths / missing hyphens / non-hex / trailing junk
    expect(sprintId("1111111-2222-4333-8444-555555555555").ok).toBe(false); // 7 in group 1
    expect(sprintId("11111111-2222-4333-8444-55555555555").ok).toBe(false); // 11 in last group
    expect(sprintId("111111112222433384445555555555555").ok).toBe(false); // no hyphens
    expect(sprintId("gggggggg-2222-4333-8444-555555555555").ok).toBe(false); // non-hex
    expect(sprintId("11111111-2222-4333-8444-555555555555 ").ok).toBe(false); // trailing space
    expect(sprintId("11111111-2222-4333-8444-555555555555-extra").ok).toBe(false);
  });
});

describe("userId — unchanged non-empty validator", () => {
  test("accepts any non-empty string", () => {
    expect(userId("user_123").ok).toBe(true);
    expect(userId("x").ok).toBe(true);
  });

  test("rejects the empty string", () => {
    const result = userId("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("userId");
    }
  });
});
