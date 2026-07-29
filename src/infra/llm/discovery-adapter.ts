/**
 * discovery-adapter.ts — the real `DiscoveryPort` (plan §4.5/§5.1). A THIN
 * composition over `structured-call` (architecture §7.1): build the S1 prompt →
 * structuredCall (outcome discipline, repair, telemetry) → assign star ids →
 * `validateDiscovery` (the DOMAIN validator) → a `Discovery`.
 *
 * IDS ARE ASSIGNED HERE, not by the model (plan §5.1): core stars become
 * `s1…sN`, off-map seeds `o1…oN`, by emission order — so a hostile local ref can
 * never reach the persistence id scheme. The `kind` is set from which array the
 * star came in (`stars` → "star", `offMapSeeds` → "off-map").
 *
 * The draft never leaves as telemetry: only `hash(draft + versions + modelId)`
 * (the spark content posture). Model + effort are injected at the composition
 * root (Sonnet + effort, D6); nothing is hardcoded here.
 */

import { createHash } from "node:crypto";

import { err, ok } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type { DiscoveryPort } from "../../domain/constellation/ports";
import type {
  Discovery,
  WireDiscovery,
  WireStar,
} from "../../domain/constellation/node-types";
import { validateDiscovery } from "../../domain/constellation/validate-discovery";
import {
  structuredCall,
  type InferenceAttempt,
  type ReasoningEffort,
  type StructuredCallClient,
  type StructuredParseOutcome,
} from "./structured-call";
import {
  buildDiscoveryUserContent,
  DISCOVERY_MAX_TOKENS,
  DISCOVERY_PROMPT_VERSION,
  DISCOVERY_SCHEMA_VERSION,
  DISCOVERY_SYSTEM_PROMPT,
  DISCOVERY_WIRE_SCHEMA,
} from "./prompts/discovery";
import { assertPortableSchema } from "./portable-schema";

// Enforcement gate (portability §2 P4): the wire schema must live in the
// two-provider strict subset, checked once at module load.
assertPortableSchema("discovery", DISCOVERY_WIRE_SCHEMA);

export interface DiscoveryAdapterDeps {
  readonly modelId: string;
  readonly effort?: ReasoningEffort;
  /** Validation-repair cap for S1 (§5.2: S1/S3 pass their own). S1 gates the
   * whole run (its atomic validator fails on the first of several possible
   * per-star faults), so the composition root may afford it more than the
   * default of 1. Absent inherits structured-call's default. */
  readonly repairCap?: number;
  readonly onAttempt?: (attempt: InferenceAttempt) => void;
  readonly clock?: () => number;
}

/** `hash(draft + brief-less versions + modelId)` — content-free attempt identity
 * (spark pattern; NUL-separated so field splits can't collide). */
export function computeDiscoveryInputHash(input: {
  readonly draft: string;
  readonly modelId: string;
}): string {
  const material = `${input.draft}\u0000${DISCOVERY_PROMPT_VERSION}\u0000${DISCOVERY_SCHEMA_VERSION}\u0000${input.modelId}`;
  return createHash("sha256").update(material).digest("hex");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function asInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

/** Coerce one raw wire star into a `WireStar`, assigning the id + kind (the
 * model supplies neither). Off-map seeds are PINNED to `wondering` intent — an
 * unwritten topic has no stance the writer is leaning on, and pinning it means
 * the model can never present an off-map seed as `asserting`/`testing` that the
 * counterargument/argument passes would then (wrongly) target and the validator
 * reject as `off-map-kind`. The domain validator decides if the rest is good. */
function toWireStar(
  item: unknown,
  id: string,
  kind: "star" | "off-map",
): WireStar {
  const record =
    typeof item === "object" && item !== null
      ? (item as Record<string, unknown>)
      : {};
  return {
    id,
    label: asString(record.label),
    intent: kind === "off-map" ? "wondering" : asString(record.intent),
    weight: asInt(record.weight),
    grounding: asString(record.grounding),
    kind,
  };
}

function toWireStars(
  field: unknown,
  prefix: string,
  kind: "star" | "off-map",
): WireStar[] {
  if (!Array.isArray(field)) return [];
  return (field as readonly unknown[]).map((item, i) =>
    toWireStar(item, `${prefix}${String(i + 1)}`, kind),
  );
}

/** Parse the model text into a validated `Discovery`, carrying yield telemetry
 * and the validator's exact reject message for the repair prompt. */
export function parseDiscovery(
  rawText: string,
  draft: string,
): StructuredParseOutcome<Discovery> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      result: err({ reasons: ["The response was not valid JSON."] }),
      candidatesReturned: 0,
      candidatesValid: 0,
    };
  }
  const record =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  const wire: WireDiscovery = {
    brief: asString(record.brief),
    confidence: asString(record.confidence),
    stars: toWireStars(record.stars, "s", "star"),
    offMapSeeds: toWireStars(record.offMapSeeds, "o", "off-map"),
  };
  const returned = wire.stars.length + wire.offMapSeeds.length;
  const result = validateDiscovery(wire, draft);
  if (result.ok) {
    return {
      result: ok(result.value),
      candidatesReturned: returned,
      candidatesValid:
        result.value.stars.length + result.value.offMapSeeds.length,
    };
  }
  return {
    result: err({ reasons: [result.error.message] }),
    candidatesReturned: returned,
    candidatesValid: 0,
    rejectReasons: [result.error.reason],
  };
}

export function createDiscoveryPort(
  client: StructuredCallClient,
  deps: DiscoveryAdapterDeps,
): DiscoveryPort {
  return {
    async discover(input) {
      const { draft, substrateSnapshot, servedSparks } = input;
      const inputHash = computeDiscoveryInputHash({
        draft,
        modelId: deps.modelId,
      });
      const generated = await structuredCall<Discovery>({
        client,
        modelId: deps.modelId,
        system: DISCOVERY_SYSTEM_PROMPT,
        userContent: buildDiscoveryUserContent(
          draft,
          substrateSnapshot,
          servedSparks,
        ),
        schema: DISCOVERY_WIRE_SCHEMA,
        maxTokens: DISCOVERY_MAX_TOKENS,
        effort: deps.effort,
        repairCap: deps.repairCap,
        parse: (rawText) => parseDiscovery(rawText, draft),
        telemetry: {
          stage: "discovery",
          inputHash,
          promptVersion: DISCOVERY_PROMPT_VERSION,
        },
        onAttempt: deps.onAttempt,
        clock: deps.clock,
      });
      if (!generated.ok) {
        return err<InferenceError>(generated.error);
      }
      return ok(generated.value);
    },
  };
}
