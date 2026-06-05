/**
 * Mock AnalysisPort — deterministic, no SDK, no network.
 *
 * Stands in for the Tier-2 Sonnet retrieval/analysis adapter. It turns a
 * triage-flagged burst into a single Finding whose kind and tier follow the
 * burst's strongest signal, so the no-ghostwriting validator and the
 * substrate's finding ranking are exercised end to end.
 *
 * Every note here is intentionally a pointer or a question — never replacement
 * prose — so the mock's output passes `validateFinding`. Swap for the real
 * adapter at the composition root without touching the contract.
 */

import { ok, type Result } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type {
  AnalysisPort,
  SprintContext,
} from "../../domain/constellation/ports";
import type {
  Finding,
  PBurst,
  TriageResult,
} from "../../domain/constellation/types";

function pointerFor(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").slice(0, 6);
  const phrase = words.join(" ");
  return phrase.length > 0 ? `“${phrase}…”` : "this passage";
}

function buildFinding(burst: PBurst, triage: TriageResult): Finding {
  const pointer = pointerFor(burst.text);
  const signals = new Set(triage.retrievalSignals);

  if (signals.has("near-citation")) {
    return {
      kind: "citation",
      tier: "sourced",
      claimSeq: burst.seq,
      pointer,
      note: "You gesture at evidence here — this source makes a closely related claim worth grounding against.",
      source: {
        title: "(mock) A relevant study",
        url: "https://example.org/mock-source",
        span: burst.text.replace(/\s+/g, " ").trim().slice(0, 80),
      },
    };
  }

  if (signals.has("named-entity")) {
    return {
      kind: "further-reading",
      tier: "sourced",
      claimSeq: burst.seq,
      pointer,
      note: "A named figure surfaces here — this is the primary source where they set out that position.",
      source: {
        title: "(mock) Primary source",
        url: "https://example.org/mock-thinker",
        span: burst.text.replace(/\s+/g, " ").trim().slice(0, 80),
      },
    };
  }

  if (triage.intent === "asserting") {
    return {
      kind: "counter-position",
      tier: "inferred",
      claimSeq: burst.seq,
      pointer,
      note: "What is the strongest honest case against this — would it survive that?",
    };
  }

  return {
    kind: "assumption",
    tier: "inferred",
    claimSeq: burst.seq,
    pointer,
    note: "What is this leaning on that hasn't been said out loud yet?",
  };
}

export function createMockAnalysisPort(): AnalysisPort {
  return {
    analyze(
      burst: PBurst,
      triage: TriageResult,
      _ctx: SprintContext,
    ): Promise<Result<Finding, InferenceError>> {
      return Promise.resolve(ok(buildFinding(burst, triage)));
    },
  };
}
