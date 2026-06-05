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
