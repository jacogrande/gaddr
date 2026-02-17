import { describe, expect, test } from "bun:test";
import { userId, essayId, evidenceCardId, claimEvidenceLinkId } from "../../../src/domain/types/branded";
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

  test("accepts nanoid-style string (Better Auth IDs)", () => {
    const result = userId("V1StGXR8_Z5jdHi6B-myT");
    expect(isOk(result)).toBe(true);
  });

  test("rejects empty string", () => {
    const result = userId("");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("userId");
    }
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

  test("rejects empty string", () => {
    const result = essayId("");
    expect(isErr(result)).toBe(true);
  });

  test("rejects non-UUID string", () => {
    const result = essayId("not-a-uuid");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID v1 (wrong version digit)", () => {
    const result = essayId("550e8400-e29b-11d4-a716-446655440000");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID with invalid variant", () => {
    const result = essayId("550e8400-e29b-41d4-0716-446655440000");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("ValidationError");
      expect(result.error.field).toBe("essayId");
    }
  });
});

describe("evidenceCardId", () => {
  test("accepts valid UUID v4", () => {
    const result = evidenceCardId(VALID_UUID);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value as string).toBe(VALID_UUID);
    }
  });

  test("rejects empty string", () => {
    const result = evidenceCardId("");
    expect(isErr(result)).toBe(true);
  });

  test("rejects non-UUID string", () => {
    const result = evidenceCardId("not-a-uuid");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID v1", () => {
    const result = evidenceCardId("550e8400-e29b-11d4-a716-446655440000");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("evidenceCardId");
    }
  });
});

describe("claimEvidenceLinkId", () => {
  test("accepts valid UUID v4", () => {
    const result = claimEvidenceLinkId(VALID_UUID);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value as string).toBe(VALID_UUID);
    }
  });

  test("rejects empty string", () => {
    const result = claimEvidenceLinkId("");
    expect(isErr(result)).toBe(true);
  });

  test("rejects non-UUID string", () => {
    const result = claimEvidenceLinkId("not-a-uuid");
    expect(isErr(result)).toBe(true);
  });

  test("rejects UUID v1", () => {
    const result = claimEvidenceLinkId("550e8400-e29b-11d4-a716-446655440000");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.field).toBe("claimEvidenceLinkId");
    }
  });
});
