import { describe, expect, test } from "bun:test";
import {
  validateDiscovery,
  validateStar,
  type DiscoveryRejectReason,
} from "../../../src/domain/constellation/validate-discovery";
import type {
  Discovery,
  Star,
  StarKind,
  WireDiscovery,
  WireStar,
} from "../../../src/domain/constellation/node-types";
import type { Result } from "../../../src/domain/types/result";
import type { DiscoveryRejection } from "../../../src/domain/constellation/validate-discovery";

const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Craftsmanship became a luxury only the wealthy could afford. " +
  "The market rewards scale over care in almost every industry now.";

function wireStar(overrides: Partial<WireStar> = {}): WireStar {
  return {
    id: "s1",
    label: "Mass production democratized goods",
    intent: "asserting",
    weight: 5,
    grounding: "mass production made goods affordable",
    kind: "star",
    ...overrides,
  };
}

function wireDiscovery(overrides: Partial<WireDiscovery> = {}): WireDiscovery {
  return {
    brief: "The draft argues scale traded craft for access.",
    confidence: "high",
    stars: [
      wireStar(),
      wireStar({
        id: "s2",
        label: "Craft as luxury",
        intent: "wondering",
        weight: 3,
        grounding: "craftsmanship became a luxury",
      }),
      wireStar({
        id: "s3",
        label: "Scale vs care",
        intent: "testing",
        weight: 4,
        grounding: "the market rewards scale over care",
      }),
    ],
    offMapSeeds: [
      wireStar({
        id: "off1",
        label: "What you didn't write: labor conditions",
        intent: "wondering",
        weight: 1,
        grounding: "the human cost of factory labor",
        kind: "off-map",
      }),
    ],
    ...overrides,
  };
}

function starReason(
  result: Result<Star, DiscoveryRejection>,
): DiscoveryRejectReason | "OK" {
  return result.ok ? "OK" : result.error.reason;
}
function discoveryReason(
  result: Result<Discovery, DiscoveryRejection>,
): DiscoveryRejectReason | "OK" {
  return result.ok ? "OK" : result.error.reason;
}

// ── validateStar ─────────────────────────────────────────────────────────────

describe("validateStar", () => {
  test("accepts a well-formed core star grounded in the draft", () => {
    const result = validateStar(wireStar(), DRAFT, "star");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.intent).toBe("asserting");
      expect(result.value.kind).toBe("star");
    }
  });

  test("accepts an off-map seed grounded on a topic rationale (no draft match)", () => {
    const result = validateStar(
      wireStar({ id: "off1", grounding: "the human cost of factory labor", kind: "off-map" }),
      DRAFT,
      "off-map",
    );
    expect(starReason(result)).toBe("OK");
  });

  test.each<[string, Partial<WireStar>, StarKind, DiscoveryRejectReason]>([
    ["kind mismatch", { kind: "off-map" }, "star", "star-kind-mismatch"],
    ["empty label", { label: "  " }, "star", "empty-label"],
    ["unknown intent", { intent: "insisting" }, "star", "unknown-intent"],
    ["weight below range", { weight: 0 }, "star", "bad-weight"],
    ["weight above range", { weight: 6 }, "star", "bad-weight"],
    ["fractional weight", { weight: 2.5 }, "star", "bad-weight"],
    ["empty grounding", { grounding: "" }, "star", "empty-grounding"],
    ["single-word grounding", { grounding: "goods" }, "star", "ungrounded"],
    ["over-long grounding", { grounding: Array.from({ length: 41 }, (_, i) => `w${String(i)}`).join(" ") }, "star", "grounding-too-long"],
    ["grounding off-draft", { grounding: "quantum foam bubbles" }, "star", "ungrounded"],
    ["empty off-map rationale", { grounding: "", kind: "off-map" }, "off-map", "empty-grounding"],
  ])("rejects %s", (_label, overrides, expectedKind, reason) => {
    expect(starReason(validateStar(wireStar(overrides), DRAFT, expectedKind))).toBe(reason);
  });
});

// ── validateDiscovery ────────────────────────────────────────────────────────

describe("validateDiscovery", () => {
  test("accepts a well-formed high-confidence discovery", () => {
    const result = validateDiscovery(wireDiscovery(), DRAFT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stars).toHaveLength(3);
      expect(result.value.offMapSeeds).toHaveLength(1);
      expect(result.value.confidence).toBe("high");
    }
  });

  test("accepts a low-confidence discovery collapsed to two broad stars", () => {
    const result = validateDiscovery(
      wireDiscovery({ confidence: "low", stars: [wireStar(), wireStar({ id: "s2", grounding: "craftsmanship became a luxury" })] }),
      DRAFT,
    );
    expect(discoveryReason(result)).toBe("OK");
  });

  test("accepts a discovery with no off-map seeds (thin, not invalid)", () => {
    const result = validateDiscovery(wireDiscovery({ offMapSeeds: [] }), DRAFT);
    expect(discoveryReason(result)).toBe("OK");
  });

  test("rejects an empty brief", () => {
    expect(discoveryReason(validateDiscovery(wireDiscovery({ brief: "  " }), DRAFT))).toBe(
      "empty-brief",
    );
  });

  test("rejects an over-long brief (D11 — not a copy of the draft)", () => {
    expect(
      discoveryReason(validateDiscovery(wireDiscovery({ brief: "x".repeat(601) }), DRAFT)),
    ).toBe("brief-too-long");
  });

  test("rejects a brief that reproduces a run of the draft verbatim", () => {
    const brief =
      "The thesis is that mass production made goods affordable for ordinary people, at a cost.";
    expect(discoveryReason(validateDiscovery(wireDiscovery({ brief }), DRAFT))).toBe(
      "brief-echoes-draft",
    );
  });

  test("rejects a bad confidence value", () => {
    expect(discoveryReason(validateDiscovery(wireDiscovery({ confidence: "medium" }), DRAFT))).toBe(
      "bad-confidence",
    );
  });

  test("rejects zero stars and too many stars", () => {
    expect(discoveryReason(validateDiscovery(wireDiscovery({ stars: [] }), DRAFT))).toBe(
      "star-count",
    );
    const seven = Array.from({ length: 7 }, (_, i) =>
      wireStar({ id: `s${String(i)}`, grounding: "mass production made goods affordable" }),
    );
    expect(discoveryReason(validateDiscovery(wireDiscovery({ stars: seven }), DRAFT))).toBe(
      "star-count",
    );
  });

  test("rejects a low-confidence discovery with more than two stars", () => {
    expect(discoveryReason(validateDiscovery(wireDiscovery({ confidence: "low" }), DRAFT))).toBe(
      "low-confidence-star-count",
    );
  });

  test("rejects an over-large off-map cluster", () => {
    const fourSeeds = Array.from({ length: 4 }, (_, i) =>
      wireStar({ id: `off${String(i)}`, grounding: "a topic rationale here", kind: "off-map" }),
    );
    expect(discoveryReason(validateDiscovery(wireDiscovery({ offMapSeeds: fourSeeds }), DRAFT))).toBe(
      "off-map-count",
    );
  });

  test("propagates the first bad star's reason", () => {
    const result = validateDiscovery(
      wireDiscovery({ stars: [wireStar(), wireStar({ id: "s2", weight: 9 })] }),
      DRAFT,
    );
    expect(discoveryReason(result)).toBe("bad-weight");
  });

  test("rejects a star id reused across the core and off-map arrays", () => {
    // "s2" collides with the default core star s2 — assembly would silently
    // merge them, so validation must reject it up front.
    const result = validateDiscovery(
      wireDiscovery({
        offMapSeeds: [
          wireStar({ id: "s2", grounding: "a topic rationale here", kind: "off-map" }),
        ],
      }),
      DRAFT,
    );
    expect(discoveryReason(result)).toBe("duplicate-star-id");
  });
});
