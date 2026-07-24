/**
 * validate-discovery.ts — the S1 discovery validator (plan §4.2). S1 determines
 * everything downstream (the star set the four S3 calls generate against), so its
 * structural invariants are enforced in pure code, not left to the prompt:
 *
 *  - the star COUNT is bounded (1–6 core stars), and a LOW-confidence discovery
 *    collapses to at most two broad stars (Journey C graceful degradation) — the
 *    hedged *phrasing* lives in the prompt and rubric (a validator cannot check
 *    "hedged"), but the count it can and does enforce;
 *  - each star narrows a wire `intent`/`kind` string to the domain union, carries
 *    a non-empty label and an in-range weight, and grounds correctly for its
 *    kind — a core star on a verbatim draft span (the spark contract, reused via
 *    `span-matching`), an off-map seed on a non-empty topic rationale;
 *  - the off-map cluster is capped at three (an over-eager S1 does not flood the
 *    board); its minimum is a prompt/rubric contract, not a hard reject (§4.4).
 *
 * Like the node validator, every rejection carries a machine-readable reason so
 * a mis-tuned S1 prompt shows up as a reason distribution in telemetry.
 */

import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type { PositionIntent } from "./types";
import { POSITION_INTENTS } from "./types";
import type {
  Discovery,
  Star,
  StarKind,
  WireDiscovery,
  WireStar,
} from "./node-types";
import {
  NODE_GROUNDING_MIN_TOKENS,
  OFF_MAP_MAX,
  STAR_MAX,
  STAR_MAX_LOW_CONFIDENCE,
  STAR_MIN,
  STAR_WEIGHT_MAX,
  STAR_WEIGHT_MIN,
} from "./node-types";
import { indexOfSubsequence, matchTokens } from "../text/span-matching";

/** The closed set of reasons a discovery (or one of its stars) can be rejected. */
export type DiscoveryRejectReason =
  | "empty-brief"
  | "bad-confidence"
  | "star-count"
  | "low-confidence-star-count"
  | "off-map-count"
  | "duplicate-star-id"
  | "star-kind-mismatch"
  | "unknown-intent"
  | "empty-label"
  | "bad-weight"
  | "empty-grounding"
  | "ungrounded";

export type DiscoveryRejection = {
  readonly reason: DiscoveryRejectReason;
  readonly message: string;
};

const INTENT_SET: ReadonlySet<string> = new Set<string>(POSITION_INTENTS);

function isPositionIntent(value: string): value is PositionIntent {
  return INTENT_SET.has(value);
}

function rejectStar(
  reason: DiscoveryRejectReason,
  message: string,
): Result<Star, DiscoveryRejection> {
  return err({ reason, message });
}

/**
 * Narrow one wire star to a `Star`, checked against the draft and the kind the
 * caller expects it in (`"star"` for the core set, `"off-map"` for a seed). A
 * wire `kind` that disagrees with `expectedKind` is a mislabelled star, rejected
 * — the two arrays are validated separately so a core star can never sneak in as
 * off-map (skipping the grounding requirement) or vice versa.
 */
export function validateStar(
  wire: WireStar,
  draft: string,
  expectedKind: StarKind,
): Result<Star, DiscoveryRejection> {
  if (wire.kind !== expectedKind) {
    return rejectStar(
      "star-kind-mismatch",
      `Star "${wire.id}" is labelled "${wire.kind}" but was emitted as a ${expectedKind}`,
    );
  }
  const label = wire.label.trim();
  if (label.length === 0) {
    return rejectStar("empty-label", "A star must carry a label");
  }
  if (!isPositionIntent(wire.intent)) {
    return rejectStar(
      "unknown-intent",
      `Intent "${wire.intent}" is not on the position axis`,
    );
  }
  if (
    !Number.isInteger(wire.weight) ||
    wire.weight < STAR_WEIGHT_MIN ||
    wire.weight > STAR_WEIGHT_MAX
  ) {
    return rejectStar(
      "bad-weight",
      `A star weight must be an integer ${String(STAR_WEIGHT_MIN)}–${String(STAR_WEIGHT_MAX)}`,
    );
  }

  const grounding = wire.grounding.trim();
  if (grounding.length === 0) {
    return rejectStar(
      "empty-grounding",
      expectedKind === "off-map"
        ? "An off-map seed must carry a topic rationale"
        : "A core star must ground in a verbatim draft span",
    );
  }
  // Off-map seeds ground on the topic, not the draft — a non-empty rationale is
  // all that is required. Core stars must appear in the draft verbatim.
  if (expectedKind === "star") {
    const groundingTokens = matchTokens(grounding);
    if (groundingTokens.length < NODE_GROUNDING_MIN_TOKENS) {
      return rejectStar(
        "ungrounded",
        `A grounding span must be at least ${String(NODE_GROUNDING_MIN_TOKENS)} words`,
      );
    }
    if (indexOfSubsequence(matchTokens(draft), groundingTokens) < 0) {
      return rejectStar(
        "ungrounded",
        `Star "${wire.id}" grounding does not appear in the draft`,
      );
    }
  }

  return ok({
    id: wire.id,
    label,
    intent: wire.intent,
    weight: wire.weight,
    grounding,
    kind: expectedKind,
  });
}

/**
 * Narrow a wire discovery to a validated `Discovery`, enforcing the brief,
 * confidence, star counts, and per-star shape. Fails on the FIRST problem it
 * hits (a discovery is atomic — a bad star set is not partially usable),
 * carrying that problem's coded reason.
 */
export function validateDiscovery(
  wire: WireDiscovery,
  draft: string,
): Result<Discovery, DiscoveryRejection> {
  if (wire.brief.trim().length === 0) {
    return err({ reason: "empty-brief", message: "S1 must return a brief" });
  }
  if (wire.confidence !== "high" && wire.confidence !== "low") {
    return err({
      reason: "bad-confidence",
      message: `Confidence "${wire.confidence}" must be "high" or "low"`,
    });
  }
  const confidence = wire.confidence;

  // Core star count. The floor is 1 — a run that anchored nothing is a failure,
  // not an empty success.
  if (wire.stars.length < STAR_MIN || wire.stars.length > STAR_MAX) {
    return err({
      reason: "star-count",
      message: `A discovery carries ${String(STAR_MIN)}–${String(STAR_MAX)} core stars, not ${String(wire.stars.length)}`,
    });
  }
  // Low confidence collapses to broad stars (Journey C).
  if (
    confidence === "low" &&
    wire.stars.length > STAR_MAX_LOW_CONFIDENCE
  ) {
    return err({
      reason: "low-confidence-star-count",
      message: `A low-confidence discovery emits at most ${String(STAR_MAX_LOW_CONFIDENCE)} broad stars, not ${String(wire.stars.length)}`,
    });
  }
  // Off-map cap (the minimum is a prompt/rubric contract, not a hard reject).
  if (wire.offMapSeeds.length > OFF_MAP_MAX) {
    return err({
      reason: "off-map-count",
      message: `The off-map cluster carries at most ${String(OFF_MAP_MAX)} seeds, not ${String(wire.offMapSeeds.length)}`,
    });
  }

  // Star ids must be unique across BOTH arrays: they are model-assigned local
  // refs that nodes point back at, and assembly groups on them. A collision
  // would silently merge two stars in assembly's `starById` map — rendering
  // duplicate cards and mis-attributing crux scores — so reject it here.
  const seenIds = new Set<string>();
  for (const wireStar of [...wire.stars, ...wire.offMapSeeds]) {
    if (seenIds.has(wireStar.id)) {
      return err({
        reason: "duplicate-star-id",
        message: `Star id "${wireStar.id}" is used more than once`,
      });
    }
    seenIds.add(wireStar.id);
  }

  const stars: Star[] = [];
  for (const wireStar of wire.stars) {
    const result = validateStar(wireStar, draft, "star");
    if (!result.ok) {
      return result;
    }
    stars.push(result.value);
  }
  const offMapSeeds: Star[] = [];
  for (const wireSeed of wire.offMapSeeds) {
    const result = validateStar(wireSeed, draft, "off-map");
    if (!result.ok) {
      return result;
    }
    offMapSeeds.push(result.value);
  }

  return ok({ brief: wire.brief.trim(), stars, offMapSeeds, confidence });
}
