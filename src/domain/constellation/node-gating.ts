/**
 * node-gating.ts — the D9 intent gate, as a PURE decision the runner reads to
 * decide whether to make a per-kind S3 call at all (plan §5.4, D9).
 *
 * "A kind call with zero eligible stars is skipped by the runner, not
 * generated-and-rejected" (D9): an all-`wondering` draft makes the
 * counterargument call pointless, and skipping saves the spend AND the telemetry
 * noise. This module answers only ONE question — "is there at least one star this
 * kind could validly attach to?" — and it MUST agree with `validate-node.ts`'s
 * reject rules (rule 8 intent gating, rule 9 off-map-kind), or the runner would
 * make a call every node of which the validator then throws away.
 *
 * IMPORTANT — this is the SKIP decision only. The runner still passes the FULL
 * star list to `NodeGenerationPort.generate` (never a filtered subset): the S3
 * system prompt `[draft + brief + stars]` is the shared cache prefix and must be
 * byte-identical across the four kind calls, so filtering the stars per kind
 * would shatter the cache (plan §5.5 / model-routing §4.1). The prompt's own
 * boundary language + the validator enforce which stars each kind may touch.
 */

import type { NodeKind, Star } from "./node-types";

/**
 * The stars a given kind may VALIDLY attach to, mirroring `validate-node.ts`
 * exactly:
 *  - `counterargument` — core stars (`kind: "star"`) the writer is `asserting`
 *    or `testing`; never `wondering` (rule 8 `pushback-on-wondering`), never
 *    off-map (rule 9 `off-map-kind`).
 *  - `argument` — core stars the writer is `testing` or `wondering`; never
 *    `asserting` (rule 8 `argument-on-asserted`), never off-map (rule 9).
 *  - `question` / `direction` — not intent-gated by the validator; they may
 *    attach to any core star AND to off-map stars (rule 9 allows exactly these
 *    two kinds off-map). So every star is eligible.
 *  - `evidence` / `citation` — sourced-gated, no Run 1 generator (rule 4);
 *    nothing is eligible, so the runner never calls them.
 */
export function eligibleStarsForKind(
  stars: readonly Star[],
  kind: NodeKind,
): readonly Star[] {
  switch (kind) {
    case "counterargument":
      return stars.filter(
        (s) =>
          s.kind === "star" &&
          (s.intent === "asserting" || s.intent === "testing"),
      );
    case "argument":
      return stars.filter(
        (s) =>
          s.kind === "star" &&
          (s.intent === "testing" || s.intent === "wondering"),
      );
    case "question":
    case "direction":
      // Ungated by intent; off-map takes exactly these two kinds (rule 9).
      return stars;
    case "evidence":
    case "citation":
      // No Run 1 generator — always skipped.
      return [];
  }
}

/**
 * Whether the runner should make the S3 call for this kind: true iff at least
 * one star is a valid attachment target. The runner iterates
 * `NODE_GEN_KINDS` and skips a kind for which this is false (D9).
 */
export function shouldGenerateKind(
  stars: readonly Star[],
  kind: NodeKind,
): boolean {
  return eligibleStarsForKind(stars, kind).length > 0;
}
