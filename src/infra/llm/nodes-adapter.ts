/**
 * nodes-adapter.ts — the real `NodeGenerationPort` (plan §4.5/§5.1). One kind
 * per call. THIN over `structured-call`: build the kind's prompt → structuredCall
 * → set the (call-fixed) kind on each wire node → `validateNodeSet` against the
 * run's stars → the surviving `ValidatedNode`s. Repair fires when ZERO nodes
 * pass (a generation defect the model can fix), carrying the validator's exact
 * reject messages (D8.5). Cross-kind dedup + assembly are the runner's job.
 *
 * The `kind` is set by the ADAPTER from the call, not emitted by the model — so
 * a call can never produce a node of the wrong kind. `stage` telemetry is
 * `nodes:<kind>` so per-kind yield is one SQL slice (§5.2). Model + effort
 * injected at the composition root (Sonnet + effort, D6).
 */

import { createHash } from "node:crypto";

import { err, ok } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type { NodeGenerationPort } from "../../domain/constellation/ports";
import type {
  NodeKind,
  Star,
  ValidatedNode,
  WireConstellationNode,
} from "../../domain/constellation/node-types";
import { validateNodeSet } from "../../domain/constellation/validate-node";
import {
  structuredCall,
  type InferenceAttempt,
  type ReasoningEffort,
  type StructuredCallClient,
  type StructuredParseOutcome,
} from "./structured-call";
import {
  buildNodesSystemPrompt,
  buildNodesUserContent,
  NODES_MAX_TOKENS,
  NODES_PROMPT_VERSION,
  NODES_SCHEMA_VERSION,
  NODES_WIRE_SCHEMA,
} from "./prompts/nodes";
import { assertPortableSchema } from "./portable-schema";

assertPortableSchema("nodes", NODES_WIRE_SCHEMA);

export interface NodesAdapterDeps {
  readonly modelId: string;
  readonly effort?: ReasoningEffort;
  /** Validation-repair cap for this stage (§5.2: S1/S3 pass their own). Absent
   * inherits structured-call's default (1). */
  readonly repairCap?: number;
  readonly onAttempt?: (attempt: InferenceAttempt) => void;
  readonly clock?: () => number;
}

/** `hash(draft + brief + kind + versions + modelId)` — content-free per-kind
 * attempt identity. The brief and kind are in the hash so each of the four calls
 * has its own identity (§5.2). */
export function computeNodesInputHash(input: {
  readonly draft: string;
  readonly brief: string;
  readonly kind: NodeKind;
  readonly modelId: string;
}): string {
  const material = `${input.draft}\u0000${input.brief}\u0000${input.kind}\u0000${NODES_PROMPT_VERSION}\u0000${NODES_SCHEMA_VERSION}\u0000${input.modelId}`;
  return createHash("sha256").update(material).digest("hex");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Coerce one raw item into a `WireConstellationNode`, stamping the call's kind
 * (the model never emits kind). */
function toWireNode(item: unknown, kind: NodeKind): WireConstellationNode {
  const record =
    typeof item === "object" && item !== null
      ? (item as Record<string, unknown>)
      : {};
  return {
    kind,
    starId: asString(record.starId),
    payoff: asString(record.payoff),
    body: asString(record.body),
    grounding: asString(record.grounding),
  };
}

function extractWireNodes(
  rawText: string,
  kind: NodeKind,
): readonly WireConstellationNode[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return [];
  }
  const nodesField =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>).nodes
      : undefined;
  if (!Array.isArray(nodesField)) return [];
  return (nodesField as readonly unknown[]).map((item) =>
    toWireNode(item, kind),
  );
}

/**
 * Parse + validate the model text for one kind. Repair fires only when ZERO
 * nodes survive `validateNodeSet` (a fixable generation defect); a call that
 * legitimately produces no eligible nodes for its kind returns an EMPTY list
 * with outcome ok (the runner's assembly handles thin runs). `candidatesValid`
 * is the survivor count.
 */
export function parseNodes(
  rawText: string,
  draft: string,
  stars: readonly Star[],
  kind: NodeKind,
): StructuredParseOutcome<readonly ValidatedNode[]> {
  const wire = extractWireNodes(rawText, kind);
  const results = validateNodeSet(wire, draft, stars);
  const valid: ValidatedNode[] = [];
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
  // Zero wire nodes at all is a legitimate "nothing for this kind" outcome, not
  // a repairable defect — return empty ok. Only nodes-emitted-but-all-rejected
  // triggers repair.
  if (wire.length > 0 && valid.length === 0) {
    return {
      result: err({ reasons: rejectMessages }),
      candidatesReturned: wire.length,
      candidatesValid: 0,
      rejectReasons,
    };
  }
  return {
    result: ok(valid),
    candidatesReturned: wire.length,
    candidatesValid: valid.length,
    rejectReasons,
  };
}

export function createNodeGenerationPort(
  client: StructuredCallClient,
  deps: NodesAdapterDeps,
): NodeGenerationPort {
  return {
    async generate(input) {
      const { draft, brief, stars, kind, hints } = input;
      const inputHash = computeNodesInputHash({
        draft,
        brief,
        kind,
        modelId: deps.modelId,
      });
      const generated = await structuredCall<readonly ValidatedNode[]>({
        client,
        modelId: deps.modelId,
        system: buildNodesSystemPrompt(draft, brief, stars),
        userContent: buildNodesUserContent(kind, hints),
        schema: NODES_WIRE_SCHEMA,
        maxTokens: NODES_MAX_TOKENS,
        effort: deps.effort,
        repairCap: deps.repairCap,
        parse: (rawText) => parseNodes(rawText, draft, stars, kind),
        telemetry: {
          stage: `nodes:${kind}`,
          inputHash,
          promptVersion: NODES_PROMPT_VERSION,
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
