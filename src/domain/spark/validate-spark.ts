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
// A "declarative preamble" is a declarative independent clause before the
// question. Because we already require the candidate to be a single line ending
// in exactly one "?", any such preamble makes the string *open* with the
// declarative clause. So the structural test for "no declarative preamble" is
// exactly: does the sentence open in interrogative mood? This is a check on
// sentence shape (plan §3.2) — recognising interrogative openers — NOT a
// connective blacklist: `because`/`which means` remain legal *inside* a causal
// or comparative question, because they never appear as the first word.
//
// Three refinements keep the opener check honest on real English:
//  - a leading discourse marker ("So what about…?", "Well, what…?") carries no
//    clause of its own and is stripped before the opener check;
//  - aux HOMONYMS ("Being…", "Need…", "Have…") open declaratives too, so an
//    aux-opener pass is additionally screened for the declarative-clause
//    signature: a clause comma followed by a discourse pivot ("Being cheap
//    made goods popular, but what about quality?"). Genuinely interrogative
//    aux uses ("Have prices ever fallen?") carry no such comma+pivot;
//  - a fronted prepositional/participial phrase before a comma ("In an age of
//    factories, what happened to repair?") is accepted when the clause after
//    the comma is itself interrogative and not pivot-led — such a prefix
//    cannot head a finite verb of its own, so it cannot be an independent
//    clause. A noun-led prefix ("Craftsmanship declined, …") stays rejected.

/** wh-question openers. */
const WH_OPENERS: ReadonlySet<string> = new Set<string>([
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "whom",
  "whose",
  "which",
]);

/**
 * Yes/no question openers: auxiliaries, copulas, modals, and their negative
 * contractions. A generous set — the validator errs toward rejection, but a
 * false reject here starves the pool, so we recognise the full range of ways an
 * English question can legitimately begin.
 */
const AUX_OPENERS: ReadonlySet<string> = new Set<string>([
  // be
  "is",
  "are",
  "was",
  "were",
  "am",
  "be",
  "been",
  "being",
  // do
  "do",
  "does",
  "did",
  // have
  "have",
  "has",
  "had",
  // modals
  "can",
  "could",
  "shall",
  "should",
  "will",
  "would",
  "may",
  "might",
  "must",
  "ought",
  "need",
  "dare",
  // negative contractions
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "don't",
  "doesn't",
  "didn't",
  "haven't",
  "hasn't",
  "hadn't",
  "can't",
  "couldn't",
  "shouldn't",
  "wouldn't",
  "won't",
  "mustn't",
  "mightn't",
  "needn't",
  "shan't",
  "ain't",
  "daren't",
]);

/**
 * Prepositions that can lead a fronted interrogative phrase: "For whom…?",
 * "To what extent…?", "Under what conditions…?". Accepted only when the next
 * word is a wh-word — a bare leading preposition is not itself a question.
 */
const PREP_LEADINS: ReadonlySet<string> = new Set<string>([
  "for",
  "in",
  "to",
  "under",
  "at",
  "by",
  "against",
  "on",
  "with",
  "about",
  "from",
  "of",
  "into",
  "over",
  "upon",
  "without",
  "through",
  "among",
  "within",
  "toward",
  "towards",
  "beyond",
  "behind",
  "beside",
  "besides",
]);

/**
 * Discourse markers a writerly question may open with ("So what about
 * affordability?", "Well, what changed?"). They carry no clause of their own,
 * so they are stripped — with any trailing comma — before the opener check.
 */
const DISCOURSE_MARKERS: ReadonlySet<string> = new Set<string>([
  "so",
  "but",
  "and",
  "well",
  "now",
  "then",
]);

/**
 * The pivot conjunctions that, straight after a clause comma, mark the join
 * between a declarative independent clause and a trailing question ("…, but
 * what about quality?"). The comma+pivot shape is the declarative-clause
 * signature the aux-homonym screen and the fronted-prefix check both key on.
 */
const PIVOT_CONJUNCTIONS: ReadonlySet<string> = new Set<string>([
  "but",
  "so",
  "and",
  "yet",
]);

/** Raw-text form of the comma+pivot signature, position-sensitive. */
const CLAUSE_PIVOT_PATTERN = /,\s*(?:but|so|and|yet)\b/iu;

/**
 * Words that END in "ing" but are NOT participles — indefinite pronouns and
 * common nouns. Without this stoplist, a leading declarative like "Nothing lasts
 * forever, why did repair culture die?" or "Everything is disposable now, who
 * benefits from that?" would pass the fronted-participle heuristic (its first
 * token ends in "ing") and let a stance-asserting preamble through. A genuine
 * fronted participle ("Considering the factories, …") is not in this set.
 */
const ING_NON_PARTICIPLES: ReadonlySet<string> = new Set<string>([
  "nothing",
  "something",
  "everything",
  "anything",
  "thing",
  "things",
  "morning",
  "evening",
  "king",
]);

/**
 * Common finite-verb surface forms whose "-s/-ed" suffix test misses — copulas,
 * auxiliaries, and irregular pasts. A finite verb as the SECOND token of a
 * fronted prefix means the prefix is an independent declarative clause, not an
 * adverbial phrase — so the whole string is a "declarative then question"
 * preamble, not a fronted-adverbial interrogative.
 */
const FINITE_VERB_FORMS: ReadonlySet<string> = new Set<string>([
  "is",
  "was",
  "are",
  "were",
  "am",
  "has",
  "had",
  "have",
  "got",
  "made",
  "said",
  "went",
  "came",
  "did",
  "does",
  "done",
  "will",
  "would",
  "can",
  "could",
  "should",
  "must",
]);

/**
 * Perfect/passive participial heads. "Having …" forces the verb that FOLLOWS it
 * into participial (non-finite) form by construction — "Having said that",
 * "Having considered X" — so a verb-like second token is NOT finiteness
 * evidence under these heads, and the plain second-token screen would falsely
 * reject legitimate fronted phrases ("Having said that, what about quality?" —
 * "said" is a participle there, not a finite verb). "being" is included for
 * symmetry, though in practice `AUX_OPENERS` intercepts "Being …" strings on
 * the direct-opener path first (with the comma+pivot screen).
 */
const PARTICIPIAL_AUX_HEADS: ReadonlySet<string> = new Set<string>([
  "having",
  "being",
]);

/**
 * Is a PARTICIPLE-fronted prefix really a declarative independent clause in
 * disguise — i.e. does it carry a finite verb? A true fronted participial
 * phrase ("Considering the factories") has no finite verb before the comma; a
 * gerund-subject clause ("Painting sells well, …") does.
 *
 * This screen applies ONLY to the participial branch. A preposition cannot
 * head a finite clause, and a plural-noun object right after one ("In
 * factories, …") is ordinary English — running the screen on the preposition
 * branch falsely rejected prep-fronted sparks (probe regressions: "In
 * factories, what changed?", "For workers, what changed?").
 *
 * The signature, per head:
 *  - "having"/"being" head: the second token is participial by construction
 *    (see `PARTICIPIAL_AUX_HEADS`), so it is exempt; finiteness can only
 *    re-enter LATER ("Having doubts IS normal, …"), so the remaining tokens
 *    are screened against the closed finite-form set only — the -s/-ed suffix
 *    heuristic is far too noisy at that distance (most plural nouns trip it).
 *  - any other participle head: a second token that is a known finite form, or
 *    ends in "-s"/"-ed" (a conjugated verb). Errs toward rejection — a phrase
 *    whose second token happens to end in "-s" (a plural noun) is dropped, an
 *    acceptable cost since the set always has spares (plan §3.2).
 */
function participlePrefixHasFiniteVerb(
  prefixTokens: readonly string[],
): boolean {
  const first = prefixTokens[0];
  if (first !== undefined && PARTICIPIAL_AUX_HEADS.has(first)) {
    return prefixTokens.slice(2).some((token) => FINITE_VERB_FORMS.has(token));
  }
  const second = prefixTokens[1];
  if (second === undefined) {
    return false;
  }
  return FINITE_VERB_FORMS.has(second) || /(?:s|ed)$/u.test(second);
}

/**
 * Lowercased word tokens (letters, with internal apostrophes for contractions).
 * Curly apostrophes are folded to straight so "isn't" and "isn’t" both match.
 */
function words(text: string): readonly string[] {
  // NFC first so a decomposed letter+combining-mark (NFD) folds to its composed
  // form before tokenizing — the same normalization the grounding path uses, so
  // draft and question tokenize consistently regardless of Unicode form.
  const normalized = text.normalize("NFC").toLowerCase().replace(/[‘’]/g, "'");
  return normalized.match(/[\p{L}]+(?:'[\p{L}]+)?/gu) ?? [];
}

/**
 * Strip leading discourse markers (and their trailing comma/space) so "So what
 * about affordability?" and "Well, what changed?" are judged on the clause
 * that follows the marker. Iterative, so "But then, what…?" also strips.
 */
function stripLeadingDiscourseMarkers(question: string): string {
  let current = question.trim();
  for (;;) {
    const match = /^([\p{L}]+)[,\s]+/u.exec(current);
    const marker = match?.[1];
    if (match === null || marker === undefined) {
      return current;
    }
    if (!DISCOURSE_MARKERS.has(marker.toLowerCase())) {
      return current;
    }
    current = current.slice(match[0].length);
  }
}

/**
 * Does `text` open directly in interrogative mood — wh-word, auxiliary, or
 * preposition+wh? The aux path carries the homonym screen: `being`/`need`/
 * `have`/`will`/… open declaratives just as readily as questions, and the
 * structural tell for the declarative reading is a clause comma followed by a
 * discourse pivot before the terminal "?" ("Have money and you have craft,
 * but who was priced out?"). Reject on that shape; a genuine aux question
 * ("Have prices ever fallen?") has no comma+pivot.
 */
function opensDirectly(text: string): boolean {
  const tokens = words(text);
  const first = tokens[0];
  if (first === undefined) {
    return false;
  }
  if (WH_OPENERS.has(first)) {
    return true;
  }
  if (AUX_OPENERS.has(first)) {
    return !CLAUSE_PIVOT_PATTERN.test(text);
  }
  if (PREP_LEADINS.has(first)) {
    const second = tokens[1];
    if (second !== undefined && WH_OPENERS.has(second)) {
      return true;
    }
  }
  return false;
}

function opensInterrogativeMood(question: string): boolean {
  const stripped = stripLeadingDiscourseMarkers(question);
  if (opensDirectly(stripped)) {
    return true;
  }

  // Fronted adverbial prefix: "<PP / participial phrase>, <interrogative>?"
  // e.g. "In an age of factories, what happened to repair?". Accepted only
  // when (a) the prefix opens with a preposition or a genuine participle —
  // (an "-ing" pronoun/noun like "Nothing"/"Everything" is stoplisted so it is
  // NOT mistaken for a participle; a noun-led prefix like "Craftsmanship
  // declined, …" fails outright), (b) a PARTICIPLE-fronted prefix carries no
  // finite verb (so "Painting sells well, …" — a gerund-subject declarative —
  // is rejected; the screen deliberately does NOT run on the preposition
  // branch, where a plural noun after the preposition is normal and a
  // preposition cannot head a finite clause), and (c) the clause after the
  // comma is not pivot-led (", but what…" is the declarative-clause signature)
  // and itself opens interrogatively.
  const commaIdx = stripped.indexOf(",");
  if (commaIdx < 0) {
    return false;
  }
  const prefixTokens = words(stripped.slice(0, commaIdx));
  const prefixFirst = prefixTokens[0];
  if (prefixFirst === undefined) {
    return false;
  }
  const prepFronted = PREP_LEADINS.has(prefixFirst);
  const participleFronted =
    !prepFronted &&
    /ing$/u.test(prefixFirst) &&
    !ING_NON_PARTICIPLES.has(prefixFirst);
  if (!prepFronted && !participleFronted) {
    return false;
  }
  if (participleFronted && participlePrefixHasFiniteVerb(prefixTokens)) {
    return false; // a finite verb before the comma ⇒ an independent clause, a preamble
  }
  const body = stripped.slice(commaIdx + 1);
  const bodyFirst = words(body)[0];
  if (bodyFirst === undefined || PIVOT_CONJUNCTIONS.has(bodyFirst)) {
    return false;
  }
  return opensDirectly(body);
}

// ── Grounding & draft-echo (normalized token matching) ──────────────────────
//
// Normalization absorbs the paraphrase drift a Haiku-class model introduces
// even when told to copy verbatim (plan §3.2): lowercase, punctuation stripped
// to spaces, whitespace collapsed. Matching is on token *subsequences* rather
// than raw substrings so "car" does not match inside "oscar" — a stricter and
// more correct reading of "appears in the draft after normalization".

/** NFC-normalize, lowercase, strip punctuation to spaces, collapse whitespace.
 * NFC comes FIRST: an accented character written in decomposed form (NFD, e.g.
 * "cafe" + U+0301) would otherwise have its combining mark — a Mark, not a
 * Letter — stripped to a space, so an NFD draft and an NFC grounding span (or
 * vice versa) would never match and a genuinely grounded spark would be dropped
 * as ungrounded. Folding both sides to NFC before tokenizing fixes that. */
function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): readonly string[] {
  const normalized = normalize(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/**
 * The start index of `needle` as a contiguous subsequence of `haystack`, or -1.
 */
function indexOfSubsequence(
  haystack: readonly string[],
  needle: readonly string[],
): number {
  if (needle.length === 0 || needle.length > haystack.length) {
    return -1;
  }
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let matched = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return i;
    }
  }
  return -1;
}

/** The set of contiguous `size`-grams of `list`, joined for equality. */
function ngramSet(list: readonly string[], size: number): ReadonlySet<string> {
  const grams = new Set<string>();
  for (let i = 0; i + size <= list.length; i++) {
    grams.add(list.slice(i, i + size).join(" "));
  }
  return grams;
}

/**
 * Does the question echo a clause-length run of the draft, over and above its
 * grounding span? The grounding span is a legitimate verbatim quote of the
 * draft, so it is excised from the question before the check — otherwise this
 * rule would contradict the grounding rule (plan §3.2). Any *other* shared
 * `GHOST_ECHO_NGRAM`-word run means the question is mirroring the draft rather
 * than adding a dimension.
 */
function echoesDraft(
  questionTokens: readonly string[],
  groundingTokens: readonly string[],
  draftGrams: ReadonlySet<string>,
): boolean {
  const at = indexOfSubsequence(questionTokens, groundingTokens);
  const residual =
    at >= 0
      ? [
          ...questionTokens.slice(0, at),
          ...questionTokens.slice(at + groundingTokens.length),
        ]
      : questionTokens;
  for (let i = 0; i + GHOST_ECHO_NGRAM <= residual.length; i++) {
    if (draftGrams.has(residual.slice(i, i + GHOST_ECHO_NGRAM).join(" "))) {
      return true;
    }
  }
  return false;
}

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
  const groundingTokens = tokens(grounding);
  if (groundingTokens.length < GROUNDING_MIN_TOKENS) {
    return reject(
      "ungrounded",
      `A grounding span must be at least ${String(GROUNDING_MIN_TOKENS)} words — a single word is not a specific span`,
    );
  }
  const draftTokens = tokens(draft);
  if (indexOfSubsequence(draftTokens, groundingTokens) < 0) {
    return reject(
      "ungrounded",
      "The grounding span does not appear in the draft",
    );
  }

  // No draft echo beyond the grounding span.
  const draftGrams = ngramSet(draftTokens, GHOST_ECHO_NGRAM);
  if (echoesDraft(tokens(question), groundingTokens, draftGrams)) {
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
