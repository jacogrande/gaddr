/**
 * Ports the background-inference core needs from infrastructure.
 *
 * Each tier is its own interface (interface segregation): the tiers have
 * different inputs, outputs, and failure semantics, so they should not be
 * unioned into one fat "LLM port". Adapters implement these; the domain never
 * sees an SDK type and never sees a thrown exception — every call resolves to a
 * `Result`.
 */

import type { Result } from "../types/result";
import type { InferenceError } from "../types/errors";
import type { Finding, PBurst, TriageResult } from "./types";
import type {
  Discovery,
  NodeKind,
  Star,
  WireConstellationNode,
} from "./node-types";

/**
 * Context shared across a sprint's inference calls. `fullText` is the
 * freewrite-so-far, which a real adapter caches as a stable prompt prefix
 * (see the prompt-caching section of background-inference-during-freewrite.md).
 */
export type SprintContext = {
  readonly fullText: string;
};

/** Tier 1 — cheap, fires on every trigger, classifies and routes. */
export interface TriagePort {
  triage(
    burst: PBurst,
    ctx: SprintContext,
  ): Promise<Result<TriageResult, InferenceError>>;
}

/** Tier 2 — expensive, retrieval-grounded, only on escalated bursts. */
export interface AnalysisPort {
  analyze(
    burst: PBurst,
    triage: TriageResult,
    ctx: SprintContext,
  ): Promise<Result<Finding, InferenceError>>;
}

// ── Sprint-end constellation run (plan §4.5) ─────────────────────────────────
//
// The sprint-end regime (D2). These ports are consumed by the checkpointed
// runner, never by the during-sprint drip. Each resolves to a `Result` — the
// domain never sees an SDK type or a thrown exception. The adapters own prompt
// assembly, `structured-call` discipline, validation, and telemetry; the ports
// expose only the domain-shaped input and output.

/** S1 discovery — one call over the full draft (D5). Warm-started from the
 * client-sent substrate snapshot and the server-queried served sparks; returns
 * the validated `Discovery` (brief, stars, off-map seeds, confidence). */
export interface DiscoveryPort {
  discover(input: {
    readonly draft: string;
    readonly substrateSnapshot: string;
    readonly servedSparks: readonly string[];
  }): Promise<Result<Discovery, InferenceError>>;
}

/** S3 node generation — one call per kind (D5), so the runner can skip a kind
 * with zero eligible stars (D9) and stagger the calls to share the cached
 * prefix. Returns the model's UNVALIDATED nodes; the runner validates
 * (`validateNodeSet`) and assembles (`assembleConstellation`) purely afterward,
 * because assembly is cross-kind and cannot happen inside a single-kind call. */
export interface NodeGenerationPort {
  generate(input: {
    readonly draft: string;
    readonly brief: string;
    readonly stars: readonly Star[];
    readonly kind: NodeKind;
    readonly hints: readonly string[];
  }): Promise<Result<readonly WireConstellationNode[], InferenceError>>;
}
