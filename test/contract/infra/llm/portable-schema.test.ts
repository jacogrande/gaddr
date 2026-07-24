/**
 * Contract tests for the shared strict-dialect schema lint
 * (llm-provider-portability §2 P4) — and the standing assertion that every
 * shipped wire schema stays inside the two-provider intersection, so a
 * provider flip can never 400 on schema shape. Every future prompt module's
 * schema gets a line in the "shipped schemas" block below.
 */

import { describe, expect, test } from "bun:test";
import {
  assertPortableSchema,
  portableSchemaViolations,
} from "../../../../src/infra/llm/portable-schema";
import { SPARK_WIRE_SCHEMA } from "../../../../src/infra/llm/prompts/spark";

describe("portableSchemaViolations — shipped schemas", () => {
  test("SPARK_WIRE_SCHEMA is portable as-is", () => {
    expect(portableSchemaViolations(SPARK_WIRE_SCHEMA)).toEqual([]);
  });
});

describe("assertPortableSchema — the enforcement gate", () => {
  test("passes a portable schema silently (the spark adapter's module-load call)", () => {
    expect(() => assertPortableSchema("spark", SPARK_WIRE_SCHEMA)).not.toThrow();
  });

  test("throws, naming the schema and the violations, on a non-portable one", () => {
    expect(() =>
      assertPortableSchema("bad", {
        type: "object",
        additionalProperties: false,
        required: ["a"],
        properties: { a: { type: "string", minLength: 1 } },
      }),
    ).toThrow(/"bad" is not portable[\s\S]*minLength/);
  });
});

describe("portableSchemaViolations — the rules", () => {
  test("a non-object root is rejected", () => {
    expect(
      portableSchemaViolations({ type: "array", items: { type: "string" } }),
    ).not.toEqual([]);
  });

  test("objects without additionalProperties:false are rejected", () => {
    const violations = portableSchemaViolations({
      type: "object",
      required: ["a"],
      properties: { a: { type: "string" } },
    });
    expect(violations.some((v) => v.includes("additionalProperties"))).toBe(
      true,
    );
  });

  test("a property missing from required is rejected (optional = nullable union)", () => {
    const violations = portableSchemaViolations({
      type: "object",
      additionalProperties: false,
      required: ["a"],
      properties: { a: { type: "string" }, b: { type: "string" } },
    });
    expect(violations.some((v) => v.includes("root.b"))).toBe(true);
  });

  test.each([
    ["minLength", { type: "string", minLength: 1 }],
    ["format", { type: "string", format: "uri" }],
    ["oneOf", { oneOf: [{ type: "string" }, { type: "number" }] }],
    ["$ref", { $ref: "#/$defs/x" }],
    ["minItems", { type: "array", minItems: 1, items: { type: "string" } }],
  ])("the forbidden keyword %s is rejected wherever it appears", (keyword, prop) => {
    const violations = portableSchemaViolations({
      type: "object",
      additionalProperties: false,
      required: ["a"],
      properties: { a: prop },
    });
    expect(violations.some((v) => v.includes(`"${keyword}"`))).toBe(true);
  });

  test("non-primitive enum values are rejected", () => {
    const violations = portableSchemaViolations({
      type: "object",
      additionalProperties: false,
      required: ["a"],
      properties: { a: { type: "object", enum: [{ nested: true }] } },
    });
    expect(violations.some((v) => v.includes("enum"))).toBe(true);
  });

  test("nesting beyond the portable depth limit is rejected", () => {
    // depth 1: root … depth 6: the innermost object — one past the limit of 5.
    const deep = {
      type: "object",
      additionalProperties: false,
      required: ["a"],
      properties: {
        a: {
          type: "object",
          additionalProperties: false,
          required: ["b"],
          properties: {
            b: {
              type: "object",
              additionalProperties: false,
              required: ["c"],
              properties: {
                c: {
                  type: "object",
                  additionalProperties: false,
                  required: ["d"],
                  properties: {
                    d: {
                      type: "object",
                      additionalProperties: false,
                      required: ["e"],
                      properties: { e: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const violations = portableSchemaViolations(deep);
    expect(violations.some((v) => v.includes("nesting depth"))).toBe(true);
  });
});
