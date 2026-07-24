/**
 * portable-schema.ts — the shared strict-dialect lint for wire schemas
 * (llm-provider-portability research §2 P4).
 *
 * Both providers' strict structured-output modes accept only a subset of JSON
 * Schema, and the subsets differ: OpenAI rejects `format`, bound keywords, and
 * `oneOf`/`allOf` outright; Anthropic rejects recursion and `oneOf`, tolerates
 * a few things OpenAI doesn't. A wire schema must be authored in the
 * INTERSECTION so a provider flip can never 400 on schema shape. This module
 * checks that intersection; every prompt module's schema gets a contract test
 * asserting zero violations.
 *
 * The rules deliberately mirror the repo's existing "wire schemas
 * strict-mode-thin; richness in validators" split: everything this lint
 * forbids (length caps, value ranges, formats) belongs in the DOMAIN validator
 * anyway — move the constraint into `description` prose for the model and
 * enforce it in code.
 */

import type { JsonSchema } from "./structured-call";

/** Keywords excluded from the two-provider intersection. Each is rejected by
 * at least one provider's strict mode. */
const FORBIDDEN_KEYWORDS = [
  "oneOf",
  "allOf",
  "not",
  "pattern",
  "format",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
  "patternProperties",
  "$ref",
  "$defs",
  "definitions",
] as const;

/** OpenAI documents ~5 supported nesting levels; staying at or under keeps a
 * comfortable margin on both providers. */
const MAX_NESTING_DEPTH = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function walk(
  node: unknown,
  path: string,
  depth: number,
  violations: string[],
): void {
  if (!isRecord(node)) {
    return;
  }

  if (depth > MAX_NESTING_DEPTH) {
    violations.push(
      `${path}: nesting depth ${String(depth)} exceeds the portable limit of ${String(MAX_NESTING_DEPTH)}`,
    );
    return;
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (keyword in node) {
      violations.push(
        `${path}: "${keyword}" is outside the two-provider strict subset — move the constraint into the description and the domain validator`,
      );
    }
  }

  const enumValues = node.enum;
  if (Array.isArray(enumValues) && !enumValues.every(isPrimitive)) {
    violations.push(`${path}: enum values must be primitives`);
  }

  if (node.type === "object") {
    if (node.additionalProperties !== false) {
      violations.push(`${path}: objects must set additionalProperties: false`);
    }
    const properties = isRecord(node.properties) ? node.properties : undefined;
    const required = Array.isArray(node.required)
      ? node.required.filter((key): key is string => typeof key === "string")
      : [];
    if (properties !== undefined) {
      for (const key of Object.keys(properties)) {
        if (!required.includes(key)) {
          violations.push(
            `${path}.${key}: every property must be listed in required (use a nullable union for optional fields)`,
          );
        }
        walk(properties[key], `${path}.${key}`, depth + 1, violations);
      }
    }
  }

  if (node.type === "array") {
    walk(node.items, `${path}[]`, depth + 1, violations);
  }
}

/**
 * Lint a wire schema against the shared strict subset. Returns human-readable
 * violations; an empty array means the schema is safe to send to either
 * provider's strict mode unchanged.
 */
export function portableSchemaViolations(
  schema: JsonSchema,
): readonly string[] {
  const violations: string[] = [];
  if (schema.type !== "object") {
    violations.push("root: the schema root must be an object");
  }
  walk(schema, "root", 1, violations);
  return violations;
}

/**
 * Assert a wire schema is portable, THROWING on any violation. This is the
 * enforcement gate the lint existed to provide: every stage adapter calls it at
 * MODULE LOAD against the schema it will ship (see `spark-adapter.ts`), so a
 * schema that drifts out of the two-provider strict subset fails fast at import
 * — a crash at startup, never a 400 mid-request or a silent cross-provider
 * behavior divergence. A non-portable wire schema is a programmer error, not a
 * runtime condition, so throwing (infra may throw) is correct. The cost is one
 * cheap walk, once per process.
 */
export function assertPortableSchema(name: string, schema: JsonSchema): void {
  const violations = portableSchemaViolations(schema);
  if (violations.length > 0) {
    throw new Error(
      `Wire schema "${name}" is not portable across providers:\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    );
  }
}
