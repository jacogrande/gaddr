/**
 * The dimensional-boundary validator for sparks — the structural guard that
 * makes the spark grammar enforceable, not merely requested of the model
 * (architecture.md §6.6, applied to Spark). It is to sparks what
 * `validateFinding` is to findings: the prompt asks nicely; this proves it.
 *
 * The spec's grammar is one question, one unnamed dimension, nothing else
 * (`docs/product/spark.md` §3). A spark must:
 *  - be a single line ending in exactly one "?" (no compounds, no preamble
 *    sentences),
 *  - stay tight — a length cap well under a finding note; "What about
 *    affordability?" is the archetype,
 *  - open in interrogative mood, so no declarative independent clause precedes
 *    the question (the structural reading of "no asserted stance"),
 *  - add a dimension rather than parrot the draft — no clause-length n-gram
 *    echo of the draft, with the grounding span exempt,
 *  - ground in a real span of the draft, matched after normalization so a
 *    Haiku-class model's paraphrase drift does not starve the pool,
 *  - carry a lens from the closed taxonomy.
 *
 * Known, documented gap: a leading/rhetorical question ("Isn't mass production
 * the real cause?") passes every structural check while asserting a stance —
 * it opens in interrogative mood and contains no preamble. No regex catches a
 * presupposition. That vector is handled by the prompt's explicit boundaries
 * (plan §4.2) and is a mandatory reject category in the human quality rubric
 * (plan §7). The validator errs toward rejection everywhere else: a dropped
 * candidate costs nothing (the set has spares), a bad one costs trust.
 *
 * Every rejection carries a machine-readable `SparkRejectReason`. The
 * distribution of these codes across a prepare is a day-one quality signal
 * (the yield metric and reject-reason lane, plan §4.4/§7), not debug noise.
 * A set is servable if at least one candidate survives.
 */

import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type { SparkCandidate, SparkLens, WireSparkCandidate } from "./types";
import { SPARK_LENSES } from "./types";
import {
  echoesSourceBeyondSpan,
  indexOfSubsequence,
  matchTokens,
  ngramSet,
} from "../text/span-matching";
import { opensInterrogativeMood } from "../text/interrogative";

/**
 * Sparks are tighter than finding notes (which cap at 280). A dimensional
 * question is one clause; anything longer has stopped being a question and
 * started being an argument.
 */
export const QUESTION_MAX_CHARS = 120;

/**
 * The clause-length window for the draft-echo check. Roughly a clause: short
 * enough that an incidental shared phrase ("the decline of") does not trip it,
 * long enough that a shared run of this many words is unmistakably the question
 * mirroring the draft rather than adding to it.
 */
export const GHOST_ECHO_NGRAM = 7;

/**
 * A grounding span must carry at least this many normalized tokens. A single
 * word — above all a stopword like "the" — appears in essentially any draft
 * and grounds nothing; two-plus words is the structural floor for "a specific
 * span copied from the draft".
 */
export const GROUNDING_MIN_TOKENS = 2;

/**
 * The closed set of reasons a candidate can be rejected. Logged per attempt so
 * a starving pipeline (over-strict validation) shows up as a reason
 * distribution, not just a low yield number (plan §9). Closed union: phase 3
 * pattern-matches on these.
 */
export type SparkRejectReason =
  | "empty-question"
  | "not-single-line"
  | "missing-question-mark"
  | "multiple-questions"
  | "too-long"
  | "declarative-preamble"
  | "empty-grounding"
  | "ungrounded"
  | "ghost-echo"
  | "unknown-lens";

/** A rejected candidate: the machine-readable code plus a human-readable why. */
export type SparkRejection = {
  readonly reason: SparkRejectReason;
  readonly message: string;
};

// ── Lens taxonomy membership ────────────────────────────────────────────────

const LENS_SET: ReadonlySet<string> = new Set<string>(SPARK_LENSES);

/**
 * Narrow a wire lens string to a `SparkLens`. A type predicate, not a cast, so
 * the domain's no-type-assertion rule holds while we still get the narrowing.
 */
function isSparkLens(value: string): value is SparkLens {
  return LENS_SET.has(value);
}

// ── Interrogative-mood opener detection ─────────────────────────────────────
//
// The declarative-preamble guard — "opens as a question, not assert-then-ask"
// — lives in the SHARED module `domain/text/interrogative.ts` (extracted for
// the constellation `question`-node validator, plan §8 step 2). This file keeps
// only the spark policy that calls it: single line, one terminal "?", tight
// length cap. The extraction is behavior-identical; the spark suite is the proof.

// ── Grounding & draft-echo (normalized token matching) ──────────────────────
//
// The machinery lives in the SHARED module `domain/text/span-matching.ts`
// (extracted for the constellation node validator — plan §8 step 1); this file
// keeps only the spark policy: which checks run, in what order, with what
// constants. Normalization absorbs the paraphrase drift a Haiku-class model
// introduces even when told to copy verbatim (plan §3.2); matching is on token
// subsequences rather than raw substrings so "car" does not match inside
// "oscar".

// ── The validator ───────────────────────────────────────────────────────────

function reject(
  reason: SparkRejectReason,
  message: string,
): Result<SparkCandidate, SparkRejection> {
  return err({ reason, message });
}

/**
 * Validate one wire candidate against the draft it was generated for. Returns
 * the narrowed `SparkCandidate` on success, or a coded rejection. Checks run
 * cheapest-and-most-structural first so a single-fault candidate reports the
 * fault a human would name first.
 */
export function validateSparkCandidate(
  candidate: WireSparkCandidate,
  draft: string,
): Result<SparkCandidate, SparkRejection> {
  const { lens, grounding } = candidate;

  // Lens must be a taxonomy member (a wire value outside the enum is dropped).
  if (!isSparkLens(lens)) {
    return reject("unknown-lens", `Lens "${lens}" is not in the taxonomy`);
  }

  const question = candidate.question.trim();

  // Non-empty.
  if (question.length === 0) {
    return reject("empty-question", "A spark must carry a question");
  }

  // Single line — a spark is one line (plan §3.2). Checked on the trimmed
  // question: a model's stray leading/trailing newline is harmless framing,
  // only an INTERNAL line break makes the spark multi-line.
  if (/[\r\n]/.test(question)) {
    return reject("not-single-line", "A spark must be a single line");
  }

  // Terminal question mark.
  if (!question.endsWith("?")) {
    return reject("missing-question-mark", "A spark must end in a question");
  }

  // Exactly one question — reject compounds.
  if ((question.match(/\?/g) ?? []).length > 1) {
    return reject(
      "multiple-questions",
      "A spark asks one question, not a compound",
    );
  }

  // Length cap — a spark is tight.
  if (question.length > QUESTION_MAX_CHARS) {
    return reject(
      "too-long",
      `A spark must be at most ${String(QUESTION_MAX_CHARS)} chars`,
    );
  }

  // No declarative preamble — the question must open in interrogative mood.
  if (!opensInterrogativeMood(question)) {
    return reject(
      "declarative-preamble",
      "A spark must open as a question, not assert then ask",
    );
  }

  // Grounding must be present and appear in the draft after normalization.
  if (grounding.trim().length === 0) {
    return reject("empty-grounding", "A spark must ground in the draft");
  }
  const groundingTokens = matchTokens(grounding);
  if (groundingTokens.length < GROUNDING_MIN_TOKENS) {
    return reject(
      "ungrounded",
      `A grounding span must be at least ${String(GROUNDING_MIN_TOKENS)} words — a single word is not a specific span`,
    );
  }
  const draftTokens = matchTokens(draft);
  if (indexOfSubsequence(draftTokens, groundingTokens) < 0) {
    return reject(
      "ungrounded",
      "The grounding span does not appear in the draft",
    );
  }

  // No draft echo beyond the grounding span.
  const draftGrams = ngramSet(draftTokens, GHOST_ECHO_NGRAM);
  if (
    echoesSourceBeyondSpan(
      matchTokens(question),
      groundingTokens,
      draftGrams,
      GHOST_ECHO_NGRAM,
    )
  ) {
    return reject(
      "ghost-echo",
      "The question mirrors the draft instead of adding a dimension",
    );
  }

  return ok({ lens, question, grounding });
}

/**
 * Validate a whole wire set against its draft, returning a per-candidate
 * `Result` list in input order. The caller (the infra adapter) keeps the `ok`
 * survivors, ranks them into a `SparkCandidateSet`, and logs the rejections'
 * reason codes for the yield metric (plan §4.4). A set is servable iff at least
 * one result is `ok`; all-fail triggers the infra repair loop (plan §3.2).
 */
export function validateSparkCandidateSet(
  candidates: readonly WireSparkCandidate[],
  draft: string,
): readonly Result<SparkCandidate, SparkRejection>[] {
  return candidates.map((candidate) =>
    validateSparkCandidate(candidate, draft),
  );
}
