/**
 * validate-node.ts — the structural validator for constellation nodes (plan
 * §4.3). It is to nodes what `validateFinding` is to findings and
 * `validateSparkCandidate` is to sparks: the prompt asks nicely; this proves it
 * (architecture.md §6.6). In Run 1, with no retrieval, the validator IS the
 * hallucination defense (D7) — there is nothing to demote to, so a node that
 * asserts the world is REJECTED, not downgraded.
 *
 * The rules, each with a machine-readable `NodeRejectReason` so a starving or
 * mis-tuned prompt shows up as a reason DISTRIBUTION, not just a low yield
 * number (plan §5.5). D7 pre-budgets `speculative-attribution` as the top reject
 * reason on dense philosophy/economics freewrites — that is expected, not a bug.
 *
 * Checks run cheapest-and-most-structural first, so a single-fault node reports
 * the fault a human would name first, exactly as the spark validator does.
 *
 * Two heuristic checks — citation-shape (rule 5) and verdict-language (rule 7) —
 * are deliberately conservative STRUCTURAL APPROXIMATIONS, documented as such
 * (like the spark rhetorical-question gap). They must not fire on the register
 * D7 explicitly ALLOWS: named schools of thought as lenses ("the Austrian
 * objection", "a Keynesian would answer"). The real quality bar — is the
 * steelman sincere, is the register right — lives in the human rubric lane
 * (plan §7), never in a regex. A false reject here costs a dropped node (the run
 * has spares); a false accept costs the writer's trust, so we err toward
 * rejection everywhere the allowed register is not at risk.
 */

import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type {
  NodeKind,
  Star,
  ValidatedNode,
  WireConstellationNode,
} from "./node-types";
import {
  NODE_BODY_MAX_CHARS,
  NODE_GHOST_ECHO_NGRAM,
  NODE_GROUNDING_MIN_TOKENS,
  NODE_KINDS,
  NODE_PAYOFF_MAX_CHARS,
  OFF_MAP_NODE_KINDS,
  SOURCED_TIER_KINDS,
} from "./node-types";
import {
  echoesSourceBeyondSpan,
  indexOfSubsequence,
  matchTokens,
  ngramSet,
} from "../text/span-matching";
import { opensInterrogativeMood } from "../text/interrogative";

/**
 * The closed set of reasons a node can be rejected (plan §4.3). Closed union so
 * phase-later code pattern-matches and telemetry aggregates cleanly.
 */
export type NodeRejectReason =
  | "unknown-kind"
  | "unknown-star"
  | "sourced-kind"
  | "empty-payoff"
  | "payoff-too-long"
  | "empty-body"
  | "body-too-long"
  | "off-map-kind"
  | "pushback-on-wondering"
  | "argument-on-asserted"
  | "speculative-attribution"
  | "verdict-language"
  | "missing-question-mark"
  | "not-interrogative"
  | "empty-grounding"
  | "ungrounded"
  | "ghost-echo";

/** A rejected node: the machine-readable code plus a human-readable why (the
 * text is fed verbatim into the repair prompt, so it must tell the model what
 * to fix). */
export type NodeRejection = {
  readonly reason: NodeRejectReason;
  readonly message: string;
};

const KIND_SET: ReadonlySet<string> = new Set<string>(NODE_KINDS);
const SOURCED_SET: ReadonlySet<NodeKind> = new Set(SOURCED_TIER_KINDS);
const OFF_MAP_KIND_SET: ReadonlySet<NodeKind> = new Set(OFF_MAP_NODE_KINDS);

function isNodeKind(value: string): value is NodeKind {
  return KIND_SET.has(value);
}

// ── Citation-shape detection (D7, rule 5) ────────────────────────────────────
//
// Reject any node whose payoff or body asserts the world through a source it
// cannot have in Run 1: a URL, a year-stamped attribution, a "studies show"
// empirical claim, or a named THINKER's published position. The line D7 draws:
// a named SCHOOL as a lens is allowed ("a Keynesian would answer", "the Austrian
// objection"); a named THINKER asserting a position is not ("Hayek argued X").
// The heuristics below are tuned to that line — the school-adjective forms
// (-ian/-ist/-ism) and a stoplist of capitalized non-thinker subjects are
// carved out so the allowed register survives. The residual (a thinker whose
// surname is an ordinary capitalized word, or a school named without its
// adjectival suffix) is documented, not silently handled — the rubric owns it.

/** URLs and bare domains — the unambiguous "I have a source" tell. */
const URL_SHAPE =
  /\bhttps?:\/\/|\bwww\.\p{L}|\b[\p{L}\d-]{2,}\.(?:com|org|net|edu|gov|io|co|uk|ac)\b/iu;

/** A parenthesized 4-digit year (1500–2099) — the academic citation stamp. */
const YEAR_PAREN_SHAPE = /\(\s*(?:1[5-9]\d{2}|20\d{2})\s*\)/u;

/** "et al" — only ever a citation. */
const ET_AL_SHAPE = /\bet\s+al\b/iu;

/**
 * The empirical-source family: a study/research/data noun paired with an
 * evidential verb ("studies show", "research suggests", "a recent study
 * found"). This is the citation-stripped "assert the world" shape — it implies
 * evidence exists without carrying it. Distinct from a school-of-thought lens,
 * which claims no empirical backing.
 */
const EMPIRICAL_SOURCE_SHAPE =
  /\b(?:studies|research|data|evidence|surveys?|polls?|statistics|scientists|researchers|experiments?)\s+(?:show|shows|showed|suggest|suggests|found|find|finds|indicate|indicates|prove|proves|proved|demonstrate|demonstrates|reveal|reveals|confirm|confirms|report|reports)\b/iu;

/** A referenced study/paper/report — "a recent study", "the paper", "one
 * experiment" — an implied specific source. The `(?!\s+of)` guard spares the
 * common-noun "the study OF economics" / "a paper OF record" uses, which name no
 * source. */
const STUDY_REFERENCE_SHAPE =
  /\b(?:a|an|the|one|another|recent|this|that)\s+(?:study|paper|report|experiment|survey|poll|meta-analysis|dataset)(?!\s+of\b)\b/iu;

/**
 * A study/paper noun followed within a clause by an evidential verb — "a study
 * of 500 patients FOUND no effect", "the survey SHOWED a drop". Catches the
 * "study OF <cohort> found" citations that `STUDY_REFERENCE_SHAPE`'s `of`-guard
 * deliberately lets through, without re-flagging "the study OF economics tells
 * a different story" (a non-evidential verb).
 */
const STUDY_FINDING_SHAPE =
  /\b(?:a|an|the|one|another|recent)\s+(?:study|studies|survey|surveys|experiment|analysis|paper|report)\b[^.?!]{0,48}?\b(?:found|find|finds|showed|shows|revealed|reveals|reported|reports|concluded|concludes|demonstrated|demonstrates|suggested|suggests|indicated|indicates|confirmed|confirms|proved|proves)\b/iu;

/** A quoted span followed by a dashed attribution: `"…" — Someone`. */
const QUOTE_ATTRIBUTION_SHAPE =
  /["“”'][^"“”']{4,}["“”']\s*[—–-]\s*\p{Lu}/u;

/**
 * Assertion verbs that mark "this named source HELD this position" — the
 * published-attribution shape, as opposed to a hypothetical lens ("would
 * answer", "might object", which are absent here by design). Deliberately
 * EXCLUDES the common-prose verbs (showed/found/proved/demonstrated/revealed):
 * those follow capitalized non-thinkers all the time ("Markets showed
 * resilience", "Prices found a floor") and would false-positive; the empirical
 * "studies show/research found" shape is caught by its own detector instead.
 */
const ATTRIBUTION_VERBS: ReadonlySet<string> = new Set<string>([
  "argued",
  "argues",
  "claimed",
  "claims",
  "wrote",
  "writes",
  "contended",
  "contends",
  "posited",
  "posits",
  "theorized",
  "hypothesized",
  "postulated",
  "maintained",
  "maintains",
  "asserted",
  "asserts",
  "insisted",
  "insists",
]);

/**
 * Capitalized words that are NOT named thinkers — pronouns, determiners,
 * discourse connectives, and (the large group) common capitalized abstractions
 * and collective agents used as sentence subjects. Stoplisted so "This
 * showed…", "History suggests…", "Markets argued…", "Institutions maintained
 * their grip…", "Governments asserted control…" are not mistaken for source
 * attribution: the validator targets attribution to a NAMED SOURCE, and a
 * personified abstraction is not one (its vagueness, if any, is the rubric's
 * job). This closed set is not exhaustive — a rare capitalized common noun used
 * with an assertion verb can still be flagged; that residual errs toward
 * rejection (D7) and costs a dropped node, never a hallucination.
 */
const NON_THINKER_CAPS: ReadonlySet<string> = new Set<string>([
  // pronouns / determiners / discourse
  "this", "that", "these", "those", "it", "they", "he", "she", "we", "you",
  "one", "some", "many", "most", "few", "all", "both", "each", "others",
  "everyone", "someone", "anyone", "nobody", "the", "there", "here", "when",
  "while", "since", "because", "but", "and", "so", "now", "then", "thus",
  "hence", "therefore", "everything", "nothing", "something",
  // abstractions
  "history", "society", "science", "nature", "culture", "time", "money",
  "power", "progress", "technology", "capitalism", "socialism", "communism",
  "industry", "industries", "people", "humanity", "reality", "life", "work",
  "economy", "economies", "capital", "labor", "labour", "demand", "supply",
  "competition", "trade", "policy", "regulation", "inflation", "growth",
  "productivity", "innovation", "globalization", "automation", "religion",
  // collective agents (personified subjects)
  "markets", "market", "prices", "wages", "governments", "government",
  "institutions", "institution", "corporations", "corporation", "companies",
  "company", "firms", "firm", "banks", "bank", "consumers", "consumer",
  "producers", "producer", "workers", "worker", "employers", "employer",
  "debtors", "debtor", "creditors", "creditor", "states", "state", "nations",
  "nation", "countries", "country", "cities", "city", "voters", "voter",
  "citizens", "citizen", "unions", "union", "republicans", "democrats",
  "conservatives", "progressives", "liberals",
]);

/**
 * Adverbs and auxiliaries that may sit between a named thinker and the
 * attribution verb ("Hayek FAMOUSLY argued", "Marx HAS LONG argued", "Smith
 * WOULD LATER claim"). Skipped when walking back from a verb to its subject, so
 * an intervening adverb does not hide the attribution. Any `-ly` adverb is
 * skippable too.
 */
const ATTR_SKIP: ReadonlySet<string> = new Set<string>([
  "has", "have", "had", "having", "would", "will", "also", "then", "later",
  "once", "long", "indeed", "further", "instead", "rather", "thus",
  "therefore", "already", "still", "even", "often", "sometimes", "never",
]);

function isAttrSkippable(token: string): boolean {
  const lower = token.toLowerCase();
  return ATTR_SKIP.has(lower) || /ly$/u.test(lower);
}

function isCapWord(token: string): boolean {
  return /^\p{Lu}[\p{L}'’-]*$/u.test(token);
}

/**
 * A school-of-thought ADJECTIVE ("Keynesian", "Marxist", "Hegelian",
 * "Austrian") — allowed as a lens by D7. Keyed by suffix so the whole family is
 * carved out of the named-thinker check without enumerating schools.
 */
const SCHOOL_SUFFIX = /(?:ian|ians|ist|ists|ism|isms)$/iu;

/** Is `word` a named thinker (not a school adjective, not a stoplisted cap)? */
function isNamedThinker(word: string): boolean {
  const lower = word.toLowerCase();
  if (NON_THINKER_CAPS.has(lower)) {
    return false;
  }
  if (SCHOOL_SUFFIX.test(word)) {
    return false;
  }
  return true;
}

/**
 * Does `text` attribute a published position to a named thinker? For every
 * attribution verb ("argued", "wrote", "claimed", …), walk back over any
 * intervening adverbs/auxiliaries to the verb's SUBJECT HEAD — the token right
 * before it — and flag when that head is a named thinker (a capitalized word
 * that is not a school adjective and not a stoplisted abstraction).
 *
 * Keying on the HEAD (the last capitalized word before the verb) is what makes
 * this robust to the cases the old adjacent-pair regex missed:
 *  - full "First Last" names — "Adam Smith wrote", "Karl Marx argued" — the
 *    head is the surname ("Smith"/"Marx"), which is a named thinker;
 *  - adverb-separated attributions — "Hayek famously argued", "Marx has long
 *    argued" — the adverbs/auxiliaries are skipped;
 *  - adjective+common-noun subjects — "Large Institutions maintained their
 *    grip", "European Governments asserted control" — the head is the common
 *    noun ("Institutions"/"Governments"), which is stoplisted, so they pass.
 *  - "A Keynesian would answer" — "would answer" is not an attribution verb, so
 *    no scan fires.
 * Also catches "according to <Thinker>" (the thinker as the phrase's object).
 * A documented residual: a thinker separated from the verb by a full clause
 * ("Krugman, writing in his blog, insisted…") is not reached — an uncommon
 * shape the rubric lane owns.
 */
function attributesToNamedThinker(text: string): boolean {
  const tokens = text.match(/[\p{L}][\p{L}'’-]*/gu) ?? [];
  for (let i = 0; i < tokens.length; i++) {
    const verb = tokens[i];
    if (verb === undefined || !ATTRIBUTION_VERBS.has(verb.toLowerCase())) {
      continue;
    }
    let j = i - 1;
    let skips = 0;
    while (j >= 0 && skips < 3 && isAttrSkippable(tokens[j] ?? "")) {
      j -= 1;
      skips += 1;
    }
    const head = tokens[j];
    if (head !== undefined && isCapWord(head) && isNamedThinker(head)) {
      return true;
    }
  }
  // "according to <Thinker>" — the thinker as the object of the phrase. A
  // lowercase or school-adjective object ("according to the Austrian school")
  // is a lens and passes.
  const accordingTo = /\baccording to\s+(\p{Lu}[\p{L}'’-]+)/giu;
  for (const match of text.matchAll(accordingTo)) {
    const object = match[1];
    if (object !== undefined && isNamedThinker(object)) {
      return true;
    }
  }
  return false;
}

/**
 * Does `text` carry citation-shaped content the sourced tier would earn but Run
 * 1 cannot (D7)? Exported for direct testing — this heuristic is the load-bearing
 * hallucination guard and deserves its own accept/reject table.
 */
export function hasCitationShape(text: string): boolean {
  return (
    URL_SHAPE.test(text) ||
    YEAR_PAREN_SHAPE.test(text) ||
    ET_AL_SHAPE.test(text) ||
    EMPIRICAL_SOURCE_SHAPE.test(text) ||
    STUDY_REFERENCE_SHAPE.test(text) ||
    STUDY_FINDING_SHAPE.test(text) ||
    QUOTE_ATTRIBUTION_SHAPE.test(text) ||
    attributesToNamedThinker(text)
  );
}

// ── Verdict-language detection (rule 7) ──────────────────────────────────────
//
// A counterargument argues the opposing CASE; it does not grade the writer.
// Second-person accusation ("you are wrong", "you ignore…") and "your argument
// fails" are the structural tells of a verdict about the writer rather than a
// steelman of the other side. Conservative on purpose: "markets fail to clear"
// (arguing a mechanism) must pass, so the detector anchors on second person and
// on "your <claim-noun>", never on a bare "this fails".

// `(?:\w+\s+){0,2}` allows a short intensifier/adverb between subject and
// predicate ("you're SIMPLY wrong", "your thesis is FUNDAMENTALLY broken")
// without letting the accusation span a whole clause.
const VERDICT_SHAPES: readonly RegExp[] = [
  /\byou(?:'re|’re|\s+are)\s+(?:\w+\s+){0,2}(?:wrong|mistaken|incorrect|misguided|misinformed|naive|confused)\b/iu,
  /\byou\s+(?:\w+\s+){0,1}(?:fail|failed|ignore|ignored|overlook|overlooked|miss|missed|neglect|neglected|misunderstand|misunderstood)\b/iu,
  /\byour\s+(?:argument|claim|reasoning|point|position|thesis|view|logic|case)\s+(?:is\s+(?:\w+\s+){0,2}(?:wrong|false|flawed|broken|mistaken|incorrect|fallacious|naive|untenable)|fails|collapses|falls\s+apart)\b/iu,
];

/** Does `text` grade the writer instead of arguing the opposing case? Exported
 * for direct testing. */
export function hasVerdictLanguage(text: string): boolean {
  return VERDICT_SHAPES.some((shape) => shape.test(text));
}

// ── The validator ───────────────────────────────────────────────────────────

function reject(
  reason: NodeRejectReason,
  message: string,
): Result<ValidatedNode, NodeRejection> {
  return err({ reason, message });
}

/**
 * Validate one wire node against the draft and its RESOLVED star (the set-level
 * entry resolves `starId` first). Returns the narrowed `ValidatedNode` on
 * success — `kind` a known `NodeKind`, `tier` fixed at `"inferred"` — or a coded
 * rejection.
 */
export function validateNode(
  candidate: WireConstellationNode,
  draft: string,
  star: Star,
): Result<ValidatedNode, NodeRejection> {
  const { kind: rawKind, starId, grounding } = candidate;

  // Kind must be a taxonomy member.
  if (!isNodeKind(rawKind)) {
    return reject("unknown-kind", `Kind "${rawKind}" is not in the taxonomy`);
  }
  const kind = rawKind;

  // Sourced-tier kinds have no Run 1 generator and no retrieval to earn them.
  if (SOURCED_SET.has(kind)) {
    return reject(
      "sourced-kind",
      `Kind "${kind}" is sourced-tier — no generator exists until retrieval (Run 2)`,
    );
  }

  const payoff = candidate.payoff.trim();
  const body = candidate.body.trim();

  // Payoff caps.
  if (payoff.length === 0) {
    return reject("empty-payoff", "A node must carry a one-line payoff");
  }
  if (payoff.length > NODE_PAYOFF_MAX_CHARS) {
    return reject(
      "payoff-too-long",
      `The payoff must be at most ${String(NODE_PAYOFF_MAX_CHARS)} chars — it is a scent line, not a paragraph`,
    );
  }

  // Body caps.
  if (body.length === 0) {
    return reject("empty-body", "A node must carry a body");
  }
  if (body.length > NODE_BODY_MAX_CHARS) {
    return reject(
      "body-too-long",
      `The body must be at most ${String(NODE_BODY_MAX_CHARS)} chars — a node points and questions, it does not draft`,
    );
  }

  // Off-map kind restriction (D10): the least-defended quadrant does not assert
  // positions; only questions and directions attach there.
  if (star.kind === "off-map" && !OFF_MAP_KIND_SET.has(kind)) {
    return reject(
      "off-map-kind",
      `An off-map node must be a question or a direction, not "${kind}"`,
    );
  }

  // Intent gating (D9). These only fire on core stars — off-map stars reach here
  // only with question/direction kinds, which are ungated.
  if (kind === "counterargument" && star.intent === "wondering") {
    return reject(
      "pushback-on-wondering",
      "A counterargument may not push on a wondering star — pushback fires only on positions the writer is leaning on",
    );
  }
  if (kind === "argument" && star.intent === "asserting") {
    return reject(
      "argument-on-asserted",
      "An argument may not reinforce an already-asserted star — that is sycophancy; arguments test testing/wondering stars",
    );
  }

  // Citation-shaped content (D7) — the structural hallucination guard.
  if (hasCitationShape(`${payoff}\n${body}`)) {
    return reject(
      "speculative-attribution",
      "The node cites a source it cannot have in Run 1 — remove URLs, years, study references, and named-thinker attributions; name schools of thought as lenses instead",
    );
  }

  // Provocation shape (rule 7): a counterargument argues the case, never grades
  // the writer.
  if (kind === "counterargument" && hasVerdictLanguage(body)) {
    return reject(
      "verdict-language",
      "A counterargument argues the opposing case; it must not grade the writer ('you are wrong', 'your argument fails')",
    );
  }

  // Question grammar (rule 6): the payoff of a question node IS the question.
  if (kind === "question") {
    const marks = (payoff.match(/\?/g) ?? []).length;
    if (marks !== 1 || !payoff.endsWith("?")) {
      return reject(
        "missing-question-mark",
        "A question node's payoff must be a single question ending in exactly one '?'",
      );
    }
    if (/[\r\n]/.test(payoff) || !opensInterrogativeMood(payoff)) {
      return reject(
        "not-interrogative",
        "A question node's payoff must open as a question, not assert then ask",
      );
    }
  }

  // Grounding. Core stars ground on a verbatim draft span; off-map nodes ground
  // on the topic, so their grounding is a non-empty rationale, not a draft match.
  if (grounding.trim().length === 0) {
    return reject(
      "empty-grounding",
      star.kind === "off-map"
        ? "An off-map node must carry a topic rationale"
        : "A node must ground in a verbatim draft span",
    );
  }
  const groundingTokens = matchTokens(grounding);
  const draftTokens = matchTokens(draft);
  if (star.kind === "star") {
    if (groundingTokens.length < NODE_GROUNDING_MIN_TOKENS) {
      return reject(
        "ungrounded",
        `A grounding span must be at least ${String(NODE_GROUNDING_MIN_TOKENS)} words — a single word is not a specific span`,
      );
    }
    if (indexOfSubsequence(draftTokens, groundingTokens) < 0) {
      return reject(
        "ungrounded",
        "The grounding span does not appear in the draft",
      );
    }
  }

  // Ghost-echo (rule 3): the body must not reproduce a run of the draft beyond
  // its grounding exemption — a node is about the thinking, never replacement
  // prose (architecture §6.6 as code). Runs on the body (the prose that could
  // smuggle a drafted paragraph), not the capped scent-line payoff.
  const draftGrams = ngramSet(draftTokens, NODE_GHOST_ECHO_NGRAM);
  if (
    echoesSourceBeyondSpan(
      matchTokens(body),
      groundingTokens,
      draftGrams,
      NODE_GHOST_ECHO_NGRAM,
    )
  ) {
    return reject(
      "ghost-echo",
      "The body mirrors the draft instead of thinking about it",
    );
  }

  return ok({ kind, tier: "inferred", starId, payoff, body, grounding });
}

/**
 * Validate a whole wire batch against its draft and the run's stars. Resolves
 * each node's `starId` against `stars` (an unresolved reference is rejected
 * `unknown-star`), then validates. Returns a per-node `Result` in input order —
 * the caller (the infra adapter) keeps the `ok` survivors for assembly and logs
 * the rejections' reason codes for the yield metric (plan §5.5). Mirrors
 * `validateSparkCandidateSet`.
 */
export function validateNodeSet(
  candidates: readonly WireConstellationNode[],
  draft: string,
  stars: readonly Star[],
): readonly Result<ValidatedNode, NodeRejection>[] {
  const byId = new Map<string, Star>(stars.map((star) => [star.id, star]));
  return candidates.map((candidate) => {
    const star = byId.get(candidate.starId);
    if (star === undefined) {
      return reject(
        "unknown-star",
        `Node references star "${candidate.starId}", which S1 did not emit`,
      );
    }
    return validateNode(candidate, draft, star);
  });
}
