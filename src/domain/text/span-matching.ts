/**
 * span-matching.ts — shared normalized-span primitives (constellation plan §8
 * step 1). Extracted verbatim from `validate-spark.ts`, where they were born,
 * so BOTH validators — spark's and the constellation node validator — enforce
 * grounding and ghost-echo with the same machinery. The extraction proof is
 * the spark suite staying green unchanged.
 *
 * Two jobs, both pure:
 *
 *  1. **Verbatim-span matching.** "The grounding span appears in the source
 *     after normalization" — lowercase, punctuation stripped to spaces,
 *     whitespace collapsed, matched as a token *subsequence* (never a raw
 *     substring, so "car" cannot match inside "oscar"). Normalization absorbs
 *     the paraphrase drift a model introduces even when told to copy
 *     character-for-character.
 *  2. **Ghost-echo detection.** "The candidate must not reproduce source
 *     n-grams beyond its grounding exemption" — the structural no-ghostwriting
 *     check (architecture §6.6 as code). The exempt span is excised before the
 *     check, or the rule would contradict the grounding rule.
 *
 * The n-gram size is the CALLER's constant (spark's `GHOST_ECHO_NGRAM`, the
 * node validator's own) — this module takes it as a parameter and owns no
 * policy.
 */

/** NFC-normalize, lowercase, strip punctuation to spaces, collapse whitespace.
 * NFC comes FIRST: an accented character written in decomposed form (NFD, e.g.
 * "cafe" + U+0301) would otherwise have its combining mark — a Mark, not a
 * Letter — stripped to a space, so an NFD source and an NFC span (or vice
 * versa) would never match and a genuinely grounded candidate would be dropped
 * as ungrounded. Folding both sides to NFC before tokenizing fixes that. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized word tokens of `text`; empty array for whitespace/punctuation-only input. */
export function matchTokens(text: string): readonly string[] {
  const normalized = normalizeForMatch(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/**
 * The start index of `needle` as a contiguous subsequence of `haystack`, or -1.
 */
export function indexOfSubsequence(
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
export function ngramSet(list: readonly string[], size: number): ReadonlySet<string> {
  const grams = new Set<string>();
  for (let i = 0; i + size <= list.length; i++) {
    grams.add(list.slice(i, i + size).join(" "));
  }
  return grams;
}

/**
 * Does the candidate echo a `size`-length token run of the source, over and
 * above its exempt span? The exempt span (the grounding quote) is a legitimate
 * verbatim citation, so its first occurrence is excised from the candidate
 * before the check. Any *other* shared `size`-word run means the candidate is
 * mirroring the source rather than adding something of its own.
 */
export function echoesSourceBeyondSpan(
  candidateTokens: readonly string[],
  exemptSpanTokens: readonly string[],
  sourceGrams: ReadonlySet<string>,
  size: number,
): boolean {
  const at = indexOfSubsequence(candidateTokens, exemptSpanTokens);
  const residual =
    at >= 0
      ? [
          ...candidateTokens.slice(0, at),
          ...candidateTokens.slice(at + exemptSpanTokens.length),
        ]
      : candidateTokens;
  for (let i = 0; i + size <= residual.length; i++) {
    if (sourceGrams.has(residual.slice(i, i + size).join(" "))) {
      return true;
    }
  }
  return false;
}
