/**
 * interrogative.ts — shared interrogative-mood detection (constellation plan §8
 * step 2, §4.3 rule 6). Extracted verbatim from `validate-spark.ts`, where it
 * was born, so BOTH validators — spark's dimensional-question grammar and the
 * constellation `question`-node grammar — recognise "opens as a question, not a
 * declarative-then-question preamble" with the same machinery instead of each
 * re-deriving 250 lines of subtle English-grammar heuristics and drifting apart.
 * The extraction proof is the spark suite staying green unchanged.
 *
 * The one exported predicate is `opensInterrogativeMood`. Everything else — the
 * opener sets, the participle/finite-verb screens, the discourse-marker strip —
 * is private policy this module owns; a caller states only "does this open as a
 * question?" and gets a structural yes/no.
 *
 * A "declarative preamble" is a declarative independent clause before the
 * question. When the caller has already required a single line ending in exactly
 * one "?", any such preamble makes the string *open* with the declarative
 * clause — so the structural test for "no declarative preamble" is exactly:
 * does the sentence open in interrogative mood? This is a check on sentence
 * SHAPE (recognising interrogative openers), NOT a connective blacklist:
 * `because`/`which means` remain legal *inside* a causal or comparative
 * question, because they never appear as the first word.
 *
 * Three refinements keep the opener check honest on real English:
 *  - a leading discourse marker ("So what about…?", "Well, what…?") carries no
 *    clause of its own and is stripped before the opener check;
 *  - aux HOMONYMS ("Being…", "Need…", "Have…") open declaratives too, so an
 *    aux-opener pass is additionally screened for the declarative-clause
 *    signature: a clause comma followed by a discourse pivot ("Being cheap
 *    made goods popular, but what about quality?"). Genuinely interrogative
 *    aux uses ("Have prices ever fallen?") carry no such comma+pivot;
 *  - a fronted prepositional/participial phrase before a comma ("In an age of
 *    factories, what happened to repair?") is accepted when the clause after
 *    the comma is itself interrogative and not pivot-led — such a prefix
 *    cannot head a finite verb of its own, so it cannot be an independent
 *    clause. A noun-led prefix ("Craftsmanship declined, …") stays rejected.
 *
 * Known, documented gap (carried over from spark): a leading/rhetorical
 * question ("Isn't mass production the real cause?") passes every structural
 * check while asserting a stance — it opens in interrogative mood and contains
 * no preamble. No regex catches a presupposition; the prompt boundaries and the
 * human quality rubric are the guards for that vector.
 */

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
 *    acceptable cost since the set always has spares.
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

/**
 * Does `question` open in interrogative mood — either directly (wh/aux/prep+wh)
 * or via a fronted adverbial prefix ("In an age of factories, what happened?")?
 * A declarative independent clause before the question ("Craftsmanship declined,
 * but what replaced it?") returns false. See the module header for the full set
 * of refinements this composes.
 */
export function opensInterrogativeMood(question: string): boolean {
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
