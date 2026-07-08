/**
 * mock-spark-adapter.ts — deterministic `SparkGenerationPort`, no SDK, no network.
 *
 * Selected by the route in eval/E2E mode (`isE2ETesting()`), the mock-behind-the-
 * real-route pattern that will later template the `/api/triage` migration. Same
 * idiom as the existing mocks (`mock-triage-adapter.ts`): a factory returning a
 * port whose output is a pure function of its input, so evals and tests are free
 * of external flakiness.
 *
 * CRITICAL CORRECTNESS REQUIREMENT: its candidates MUST pass the real domain
 * validator (`validateSparkCandidateSet`) — the mock's tests run the validator on
 * its output to prove it. Concretely, each candidate is engineered to satisfy the
 * grammar structurally:
 *  - the question opens in interrogative mood, is one line, ends in exactly one
 *    "?", and is kept under seven word-tokens so it can NEVER ghost-echo a
 *    clause-length run of the draft, for ANY draft;
 *  - the grounding is the first two word-tokens of the draft's last sentence,
 *    taken verbatim — so it is always a real ≥2-token span present in the draft;
 *  - lenses are distinct and rotated to respect `servedLenses`;
 *  - the same draft + servedLenses always yields the same set.
 */

import { ok, err, type Result } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type { SparkGenerationPort } from "../../domain/spark/ports";
import { inferenceLog } from "../debug-log";
import type {
  SparkCandidate,
  SparkCandidateSet,
  SparkLens,
} from "../../domain/spark/types";
import { SPARK_LENSES } from "../../domain/spark/types";
import { countWords } from "../../domain/spark/select-spark";
import { GROUNDING_MIN_TOKENS } from "../../domain/spark/validate-spark";
import { SPARK_PROMPT_VERSION } from "./prompts/spark";

/** Up to this many candidates per set, matching the real adapter. */
const MOCK_MAX_CANDIDATES = 3;

/**
 * One canonical question per lens. Every question is kept to at most six
 * word-tokens on purpose: the validator's ghost-echo rule looks for a shared
 * seven-word run with the draft, so a sub-seven-token question is structurally
 * incapable of echoing, whatever the draft says. Each opens with a wh-word, is a
 * single line, and ends in exactly one "?".
 */
const QUESTION_BY_LENS: Record<SparkLens, string> = {
  economic: "What would this cost in practice?",
  historical: "When has this happened before?",
  personal: "How would this feel firsthand?",
  adversarial: "What is the strongest objection?",
  definitional: "What exactly counts as this?",
  causal: "What is actually driving this?",
  comparative: "How does this compare elsewhere?",
  scale: "How large is this really?",
  temporal: "What changes about this over time?",
  ethical: "Who bears the cost here?",
};

/** Word tokens (letters/digits), the same granularity the validator normalizes to. */
function wordTokens(text: string): readonly string[] {
  return text.match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Grounding = the first two word-tokens of the draft's last sentence, verbatim.
 * These are consecutive tokens of the draft, so they match the validator's
 * normalized-subsequence grounding check. Falls back to the draft's first two
 * tokens if the last sentence is too short, and to `null` if the whole draft
 * cannot supply a two-token span.
 */
function deriveGrounding(draft: string): string | null {
  const sentences = draft
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const lastSentence = sentences[sentences.length - 1];
  const fromLast = lastSentence ? wordTokens(lastSentence) : [];
  const source =
    fromLast.length >= GROUNDING_MIN_TOKENS ? fromLast : wordTokens(draft);
  if (source.length < GROUNDING_MIN_TOKENS) {
    return null;
  }
  return source.slice(0, GROUNDING_MIN_TOKENS).join(" ");
}

function mockError(message: string): InferenceError {
  return { kind: "InferenceError", reason: "malformed-output", message };
}

function buildSet(
  draft: string,
  sprintId: SparkCandidateSet["sprintId"],
  servedLenses: readonly SparkLens[],
): Result<SparkCandidateSet, InferenceError> {
  const grounding = deriveGrounding(draft);
  if (grounding === null) {
    return err(mockError("Draft has no groundable two-word span"));
  }

  const served = new Set<SparkLens>(servedLenses);
  const chosen = SPARK_LENSES.filter((lens) => !served.has(lens)).slice(
    0,
    MOCK_MAX_CANDIDATES,
  );
  if (chosen.length === 0) {
    // Every lens already served → a legitimate NOTHING-TO-SERVE outcome, not a
    // generation defect. Mirror the real adapter (spark-adapter.ts:166-172),
    // which returns ok with an EMPTY set here (200 + a `prepared` row), NOT an
    // err (which would 502 + a `validation-exhausted` row). The genuinely
    // ungenerable case — no groundable span — stays `err` above, matching the
    // real adapter's zero-validator-survivors path.
    return ok({
      sprintId,
      candidates: [],
      draftWordCount: countWords(draft),
      promptVersion: SPARK_PROMPT_VERSION,
    });
  }

  const candidates: readonly SparkCandidate[] = chosen.map((lens) => ({
    lens,
    question: QUESTION_BY_LENS[lens],
    grounding,
  }));

  return ok({
    sprintId,
    candidates,
    draftWordCount: countWords(draft),
    promptVersion: SPARK_PROMPT_VERSION,
  });
}

/**
 * Build the deterministic mock Spark generation port. Same interface as the real
 * adapter; swap at the route by `isE2ETesting()`.
 */
export function createMockSparkGenerationPort(): SparkGenerationPort {
  return {
    generate(input) {
      const result = buildSet(input.draft, input.sprintId, input.servedLenses);
      inferenceLog(
        "spark",
        result.ok
          ? `mock prepared ${String(result.value.candidates.length)} candidate(s) ` +
              `[${result.value.candidates.map((candidate) => candidate.lens).join(",")}]`
          : `mock produced no candidates: ${result.error.message}`,
      );
      return Promise.resolve(result);
    },
  };
}
