/**
 * spark-adapter.ts — the real `SparkGenerationPort` (plan §4.3).
 *
 * A THIN composition, no business logic beyond wiring (architecture.md §7.1):
 *
 *   build prompt (with servedLenses exclusion)
 *     → structuredCall (stop_reason discipline, repair, telemetry)
 *       → validateSparkCandidateSet (the DOMAIN validator, unchanged)
 *         → assemble a SparkCandidateSet (rank = model emission order)
 *           → Result
 *
 * The one thing it OWNS is the input hash — crypto is infra's job, never the
 * domain's. The draft itself never leaves as telemetry: only `hash(draft +
 * promptVersion + schemaVersion + modelId)` is surfaced, matching the content
 * posture of plan §4.4 (hashes and counts, never writer prose).
 *
 * Per-attempt telemetry is surfaced via the `onAttempt` seam threaded straight
 * into structured-call — the adapter adds nothing to it, it just supplies the
 * stage/hash/version context.
 */

import { createHash } from "node:crypto";

import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type { SparkGenerationPort } from "../../domain/spark/ports";
import type {
  SparkCandidate,
  SparkCandidateSet,
  SparkLens,
  WireSparkCandidate,
} from "../../domain/spark/types";
import {
  assembleSparkSet,
  countWords,
  hintLensesForSprint,
} from "../../domain/spark/select-spark";
import { validateSparkCandidateSet } from "../../domain/spark/validate-spark";
import {
  structuredCall,
  type InferenceAttempt,
  type StructuredCallClient,
  type StructuredParseOutcome,
} from "./structured-call";
import {
  buildSparkUserContent,
  SPARK_MAX_TOKENS,
  SPARK_MODEL_ID,
  SPARK_PROMPT_VERSION,
  SPARK_SCHEMA_VERSION,
  SPARK_SYSTEM_PROMPT,
  SPARK_WIRE_SCHEMA,
} from "./prompts/spark";

/**
 * `hash(draft + promptVersion + schemaVersion + modelId)` — the content-free
 * attempt identity (plan §4.3/§4.4). Exported so it can be exercised directly:
 * identical inputs hash identically; changing any field (e.g. the prompt version)
 * changes the hash. NUL separators keep the field boundaries unambiguous so two
 * different (draft, version) splits cannot collide.
 */
export function computeSparkInputHash(input: {
  readonly draft: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly modelId: string;
}): string {
  const material = `${input.draft}\u0000${input.promptVersion}\u0000${input.schemaVersion}\u0000${input.modelId}`;
  return createHash("sha256").update(material).digest("hex");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Coerce one raw JSON item into a `WireSparkCandidate`; the domain validator
 * decides whether the coerced shape is any good. */
function toWireCandidate(item: unknown): WireSparkCandidate {
  if (typeof item !== "object" || item === null) {
    return { lens: "", question: "", grounding: "" };
  }
  const record = item as Record<string, unknown>;
  return {
    lens: asString(record.lens),
    question: asString(record.question),
    grounding: asString(record.grounding),
  };
}

/** Pull the wire candidate array out of the model text, tolerating malformed
 * JSON and unexpected shapes (both become an empty list → a parse failure). */
function extractWireCandidates(rawText: string): readonly WireSparkCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }
  const candidatesField: unknown = (parsed as Record<string, unknown>)
    .candidates;
  if (!Array.isArray(candidatesField)) {
    return [];
  }
  const items = candidatesField as readonly unknown[];
  return items.map(toWireCandidate);
}

/**
 * Parse + validate the model text into an assembled candidate list, carrying the
 * yield telemetry and the exact validator error texts for the repair prompt.
 * This is the caller-owned parse the structured-call discipline invokes; the
 * assembly rules themselves (served-lens exclusion, dedupe, cap, rank
 * preservation) are pure and live in the domain (`assembleSparkSet`) — the
 * adapter only wires.
 *
 * Repair semantics (reviewed): a repair retry fires ONLY when ZERO candidates
 * pass the domain validator — that is a generation defect the model can fix.
 * When candidates validate but are then removed by served-lens exclusion or
 * dedupe (including the everything-already-served case), that is a legitimate
 * "nothing to serve" outcome, not a generation failure: return ok with an
 * EMPTY candidate list, outcome "ok", and burn no repair call. Telemetry
 * `candidatesValid` is the POST-exclusION servable count (see the field's doc
 * in `structured-call.ts`), so the record can never read "valid: 2" alongside
 * a failure.
 */
function parseSparkCandidates(
  rawText: string,
  draft: string,
  servedLenses: readonly SparkLens[],
): StructuredParseOutcome<readonly SparkCandidate[]> {
  const wire = extractWireCandidates(rawText);
  const results = validateSparkCandidateSet(wire, draft);

  const valid: SparkCandidate[] = [];
  const rejectReasons: string[] = [];
  const rejectMessages: string[] = [];
  for (const result of results) {
    if (result.ok) {
      valid.push(result.value);
    } else {
      rejectReasons.push(result.error.reason);
      rejectMessages.push(result.error.message);
    }
  }

  if (valid.length === 0) {
    // Zero validator survivors → repairable generation defect. Prefer the
    // validator's own messages (they tell the model exactly what to fix).
    const reasons =
      rejectMessages.length > 0
        ? rejectMessages
        : [
            "The response contained no candidates; return up to three questions.",
          ];
    return {
      result: err({ reasons }),
      candidatesReturned: wire.length,
      candidatesValid: 0,
      rejectReasons,
    };
  }

  const assembled = assembleSparkSet(valid, servedLenses);
  return {
    result: ok(assembled),
    candidatesReturned: wire.length,
    candidatesValid: assembled.length,
    rejectReasons,
  };
}

export interface SparkAdapterDeps {
  /** Per-attempt telemetry sink (the inference_attempt seam, Phase 4). */
  readonly onAttempt?: (attempt: InferenceAttempt) => void;
  /** Injected clock for latency; defaults to Date.now inside structured-call. */
  readonly clock?: () => number;
}

/**
 * Build the real Spark generation port over an injected structured-call client
 * (the Anthropic-backed one in production; a stub in contract tests). Composition
 * only — no business logic beyond wiring the pieces together.
 */
export function createSparkGenerationPort(
  client: StructuredCallClient,
  deps: SparkAdapterDeps = {},
): SparkGenerationPort {
  return {
    async generate(input) {
      const { draft, sprintId, servedLenses } = input;
      const inputHash = computeSparkInputHash({
        draft,
        promptVersion: SPARK_PROMPT_VERSION,
        schemaVersion: SPARK_SCHEMA_VERSION,
        modelId: SPARK_MODEL_ID,
      });

      const generated: Result<readonly SparkCandidate[], InferenceError> =
        await structuredCall<readonly SparkCandidate[]>({
          client,
          modelId: SPARK_MODEL_ID,
          system: SPARK_SYSTEM_PROMPT,
          // The hint is deterministic from (sprintId, servedLenses) — never
          // persisted; telemetry re-derives it when a distribution question
          // needs it (see hintLensesForSprint).
          userContent: buildSparkUserContent(
            draft,
            servedLenses,
            hintLensesForSprint(sprintId, servedLenses),
          ),
          schema: SPARK_WIRE_SCHEMA,
          maxTokens: SPARK_MAX_TOKENS,
          parse: (rawText) =>
            parseSparkCandidates(rawText, draft, servedLenses),
          telemetry: {
            stage: "spark",
            inputHash,
            promptVersion: SPARK_PROMPT_VERSION,
          },
          // Enrich each attempt with the sprint it belongs to before forwarding;
          // structured-call stays sprint-agnostic, and per-sprint yield becomes
          // a plain SQL slice on inference_attempt.sprint_id.
          onAttempt: deps.onAttempt
            ? (attempt) => deps.onAttempt?.({ ...attempt, sprintId })
            : undefined,
          clock: deps.clock,
        });

      if (!generated.ok) {
        return err(generated.error);
      }

      const set: SparkCandidateSet = {
        sprintId,
        candidates: generated.value,
        draftWordCount: countWords(draft),
        promptVersion: SPARK_PROMPT_VERSION,
      };
      return ok(set);
    },
  };
}
