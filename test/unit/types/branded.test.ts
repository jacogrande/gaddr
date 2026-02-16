import { describe, expect, test } from "bun:test";
import { userId, essayId } from "../../../src/domain/types/branded";
import { isOk, isErr } from "../../../src/domain/types/result";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("userId", () => {
  test("accepts valid UUID v4", () => {
    const result = userId(VALID_UUID);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value as string).toBe(VALID_UUID);
    }
  });

  test("rejects empty string", () => {
    const result = userId("");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("userId");
    }
  });

  test("rejects non-UUID string", () => {
    const result = userId("not-a-uuid");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID v1 (wrong version digit)", () => {
    // UUID v1 has version digit 1 in the third group
    const result = userId("550e8400-e29b-11d4-a716-446655440000");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID with invalid variant", () => {
    // variant digit must be 8, 9, a, or b
    const result = userId("550e8400-e29b-41d4-0716-446655440000");
    expect(isErr(result)).toBe(true);
  });
});

describe("essayId", () => {
  test("accepts valid UUID v4", () => {
    const result = essayId(VALID_UUID);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value as string).toBe(VALID_UUID);
    }
  });

  test("rejects invalid string", () => {
    const result = essayId("abc");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("essayId");
    }
  });
});
