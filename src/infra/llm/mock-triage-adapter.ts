/**
 * Mock TriagePort — deterministic, no SDK, no network.
 *
 * Stands in for the Tier-1 Haiku triage adapter so the whole background
 * inference system can run and be tested before any real model is wired. It
 * classifies a burst by scanning for the same surface cues the real triage
 * prompt would weigh, so the routing/substrate behaviour downstream is
 * realistic. Swap this for the Anthropic adapter at the composition root; the
 * `TriagePort` contract does not change.
 *
 * Pure given its input (same burst -> same result), which keeps evals and unit
 * tests free of flaky external state.
 */

import { ok, type Result } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type { TriagePort, SprintContext } from "../../domain/constellation/ports";
import type {
  PBurst,
  PositionIntent,
  RetrievalSignal,
  ThemeDelta,
  TriageResult,
} from "../../domain/constellation/types";

const NEAR_CITATION_RE =
  /\b(studies show|research suggests?|evidence|data show|argued that|according to|shown that|found that)\b/i;
const NAMED_ENTITY_RE = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
const EMOTIONAL_RE = /(!|\b(never|always|everyone|no one|must|outrageous|terrify\w*)\b)/i;
const HEDGING_RE = /\b(maybe|perhaps|i think|i guess|sort of|kind of|possibly)\b/i;
const ASSERTING_RE = /\b(clearly|obviously|the (real|whole) (issue|point|truth)|in fact|undeniabl\w*|certainly)\b/i;
const DECLARATIVE_RE = /\b(is|are|was|were)\b/i;

function classifyIntent(text: string): PositionIntent {
  if (/\?\s*$/.test(text.trim()) || /\bi wonder\b/i.test(text)) {
    return "wondering";
  }
  if (ASSERTING_RE.test(text)) {
    return "asserting";
  }
  if (HEDGING_RE.test(text)) {
    return "testing";
  }
  return DECLARATIVE_RE.test(text) ? "asserting" : "testing";
}

function classifySignals(
  text: string,
  intent: PositionIntent,
): readonly RetrievalSignal[] {
  const signals: RetrievalSignal[] = [];
  if (NEAR_CITATION_RE.test(text)) signals.push("near-citation");
  if (NAMED_ENTITY_RE.test(text)) signals.push("named-entity");
  if (EMOTIONAL_RE.test(text)) signals.push("emotional-marker");
  if (HEDGING_RE.test(text)) signals.push("hedging-shift");
  if (intent === "asserting" && DECLARATIVE_RE.test(text)) {
    signals.push("declarative-claim");
  }
  return signals;
}

/**
 * Best-effort theme label: the first capitalised entity, else the longest word
 * over four characters. A real adapter gets this from the model; the mock just
 * needs something stable so theme/tension folding is exercised.
 */
function deriveTheme(text: string): string | undefined {
  const entity = NAMED_ENTITY_RE.exec(text);
  if (entity) return entity[0];
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  if (words.length === 0) return undefined;
  return words.reduce((longest, word) =>
    word.length > longest.length ? word : longest,
  );
}

function classifyThemeDelta(text: string): ThemeDelta {
  return text.trim().length < 12 ? "none" : "new-direction";
}

export function createMockTriagePort(): TriagePort {
  return {
    triage(
      burst: PBurst,
      _ctx: SprintContext,
    ): Promise<Result<TriageResult, InferenceError>> {
      const text = burst.text;
      const intent = classifyIntent(text);
      const result: TriageResult = {
        intent,
        themeDelta: classifyThemeDelta(text),
        retrievalSignals: classifySignals(text, intent),
        tier: "inferred",
        theme: deriveTheme(text),
      };
      return Promise.resolve(ok(result));
    },
  };
}
