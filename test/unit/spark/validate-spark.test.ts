import { describe, expect, test } from "bun:test";
import {
  QUESTION_MAX_CHARS,
  validateSparkCandidate,
  validateSparkCandidateSet,
  type SparkRejectReason,
} from "../../../src/domain/spark/validate-spark";
import type { SparkCandidate, WireSparkCandidate } from "../../../src/domain/spark/types";
import type { Result } from "../../../src/domain/types/result";

/**
 * A draft with two distinct clause-length runs we can ground in and echo:
 *  A: "mass production made goods affordable for ordinary people"
 *  B: "who could afford craftsmanship before the factories"
 * plus "handmade objects" as a short groundable span.
 */
const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Handmade objects slowly became a luxury only the rich could buy. " +
  "Nobody asks who could afford craftsmanship before the factories arrived.";

function wire(overrides: Partial<WireSparkCandidate> = {}): WireSparkCandidate {
  return {
    lens: "economic",
    question: "What about affordability?",
    grounding: "handmade objects",
    ...overrides,
  };
}

function reasonOf(
  result: Result<SparkCandidate, { readonly reason: SparkRejectReason }>,
): SparkRejectReason | "OK" {
  return result.ok ? "OK" : result.error.reason;
}

describe("validateSparkCandidate — accepts", () => {
  test("the archetype: one short grounded dimensional question", () => {
    const result = validateSparkCandidate(wire(), DRAFT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lens).toBe("economic");
      expect(result.value.question).toBe("What about affordability?");
    }
  });

  test("trims surrounding whitespace from the stored question", () => {
    const result = validateSparkCandidate(
      wire({ question: "  What about affordability?  " }),
      DRAFT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.question).toBe("What about affordability?");
    }
  });

  test("a causal question containing 'because' passes (not a connective blacklist)", () => {
    const result = validateSparkCandidate(
      wire({
        lens: "causal",
        question: "Did craftsmanship decline because handmade objects grew costly?",
      }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("documented gap: a rhetorical/leading question passes structurally", () => {
    // "Isn't … the real cause?" presupposes a stance, but opens in
    // interrogative mood with no preamble — no regex catches this. Prompt
    // boundaries + the human rubric are the guards (plan §3.2).
    const result = validateSparkCandidate(
      wire({
        lens: "adversarial",
        question: "Isn't mass production the real cause?",
        grounding: "mass production",
      }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("a fronted interrogative phrase ('For whom …?') passes", () => {
    const result = validateSparkCandidate(
      wire({
        lens: "personal",
        question: "For whom were handmade objects ever affordable?",
      }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("every lens in the taxonomy is accepted", () => {
    const lenses = [
      "economic",
      "historical",
      "personal",
      "adversarial",
      "definitional",
      "causal",
      "comparative",
      "scale",
      "temporal",
      "ethical",
    ];
    for (const lens of lenses) {
      const result = validateSparkCandidate(wire({ lens }), DRAFT);
      expect(reasonOf(result)).toBe("OK");
    }
  });
});

describe("validateSparkCandidate — grounding normalization", () => {
  test("paraphrase drift WITHIN normalization (case/punctuation/spacing) passes", () => {
    const result = validateSparkCandidate(
      wire({ grounding: "Mass  production, made GOODS affordable — for ordinary people!" }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("drift BEYOND normalization (a changed word) is rejected as ungrounded", () => {
    const result = validateSparkCandidate(
      wire({ grounding: "mass production created goods affordable for ordinary people" }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("ungrounded");
  });

  test("a grounding span absent from the draft is rejected", () => {
    const result = validateSparkCandidate(
      wire({ grounding: "the industrial revolution in britain" }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("ungrounded");
  });

  test("token-subsequence matching does not match inside a larger word", () => {
    // "before the factorie" IS a raw substring of "before the factories", but
    // the token "factorie" ≠ "factories" — subsequence matching rejects what
    // substring matching would have silently accepted.
    const result = validateSparkCandidate(
      wire({ grounding: "before the factorie" }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("ungrounded");
  });

  test("empty grounding is rejected before the draft is consulted", () => {
    expect(reasonOf(validateSparkCandidate(wire({ grounding: "" }), DRAFT))).toBe(
      "empty-grounding",
    );
    expect(reasonOf(validateSparkCandidate(wire({ grounding: "   " }), DRAFT))).toBe(
      "empty-grounding",
    );
  });

  test("a single stopword is not a specific span (grounding: 'the' rejects)", () => {
    expect(reasonOf(validateSparkCandidate(wire({ grounding: "the" }), DRAFT))).toBe(
      "ungrounded",
    );
  });

  test("a single content word is still below the grounding floor", () => {
    // "factories" IS in the draft, but one token grounds nothing specific.
    expect(
      reasonOf(validateSparkCandidate(wire({ grounding: "factories" }), DRAFT)),
    ).toBe("ungrounded");
  });

  test("a two-token grounding span passes the floor", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ grounding: "ordinary people" }), DRAFT)),
    ).toBe("OK");
  });
});

describe("validateSparkCandidate — ghost-echo (draft mirroring)", () => {
  test("rejects a question echoing a clause-length draft run that is not its grounding", () => {
    // Echoes run B, grounded in run A → the echo is not exempt → rejected.
    const result = validateSparkCandidate(
      wire({
        question: "Isn't who could afford craftsmanship before the factories the real question?",
        grounding: "mass production made goods affordable for ordinary",
      }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("ghost-echo");
  });

  test("exempts the grounding span: echoing the grounded run itself passes", () => {
    // Embeds run A verbatim, but run A IS the grounding → exempt → passes.
    const result = validateSparkCandidate(
      wire({
        question: "Was mass production made goods affordable for ordinary people inevitable?",
        grounding: "mass production made goods affordable for ordinary people",
      }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("a short question sharing only a few words with the draft is not an echo", () => {
    // "What about affordability?" shares no 7-word run with the draft.
    expect(reasonOf(validateSparkCandidate(wire(), DRAFT))).toBe("OK");
  });
});

describe("validateSparkCandidate — structural rejections", () => {
  test("rejects a lens outside the taxonomy", () => {
    expect(reasonOf(validateSparkCandidate(wire({ lens: "spiritual" }), DRAFT))).toBe(
      "unknown-lens",
    );
    expect(reasonOf(validateSparkCandidate(wire({ lens: "" }), DRAFT))).toBe(
      "unknown-lens",
    );
  });

  test("rejects an empty question", () => {
    expect(reasonOf(validateSparkCandidate(wire({ question: "   " }), DRAFT))).toBe(
      "empty-question",
    );
  });

  test("rejects a multi-line question", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "What about\naffordability?" }), DRAFT)),
    ).toBe("not-single-line");
  });

  test("a trailing newline is harmless framing, not a second line", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "What about affordability?\n" }), DRAFT)),
    ).toBe("OK");
  });

  test("a leading newline is harmless framing, not a second line", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "\nWhat about affordability?" }), DRAFT)),
    ).toBe("OK");
  });

  test("an internal carriage return still rejects", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "What about\r\naffordability?" }), DRAFT)),
    ).toBe("not-single-line");
  });

  test("rejects a question that does not end in '?'", () => {
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "What about affordability." }), DRAFT)),
    ).toBe("missing-question-mark");
    expect(
      reasonOf(validateSparkCandidate(wire({ question: "What about affordability" }), DRAFT)),
    ).toBe("missing-question-mark");
  });

  test("rejects a compound with more than one question", () => {
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "What about affordability? Or cost?" }),
          DRAFT,
        ),
      ),
    ).toBe("multiple-questions");
  });

  test("rejects a question longer than the cap", () => {
    const longQuestion = `What ${"about affordability ".repeat(8)}here?`;
    expect(longQuestion.length).toBeGreaterThan(QUESTION_MAX_CHARS);
    expect(reasonOf(validateSparkCandidate(wire({ question: longQuestion }), DRAFT))).toBe(
      "too-long",
    );
  });

  test("accepts a question exactly at the length cap", () => {
    const filler = "a".repeat(QUESTION_MAX_CHARS - "What about ?".length);
    const atCap = `What about ${filler}?`;
    expect(atCap.length).toBe(QUESTION_MAX_CHARS);
    // Grounded and interrogative-leading, so length is the only variable here.
    const result = validateSparkCandidate(
      wire({ question: atCap, grounding: "handmade objects" }),
      DRAFT,
    );
    expect(reasonOf(result)).toBe("OK");
  });
});

describe("validateSparkCandidate — declarative preamble (no asserted stance)", () => {
  test("rejects a declarative independent clause before the question", () => {
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({
            question: "Mass production made goods affordable, but what about craftsmanship?",
            grounding: "mass production",
          }),
          DRAFT,
        ),
      ),
    ).toBe("declarative-preamble");
  });

  test("rejects a statement dressed up with a trailing question", () => {
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({
            question: "Handmade objects became a luxury, so who benefited?",
            grounding: "handmade objects",
          }),
          DRAFT,
        ),
      ),
    ).toBe("declarative-preamble");
  });

  test("accepts a yes/no question opening with an auxiliary", () => {
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "Were handmade objects ever truly affordable?" }),
          DRAFT,
        ),
      ),
    ).toBe("OK");
  });
});

describe("validateSparkCandidate — aux-homonym preambles (comma+pivot signature)", () => {
  // "being"/"need"/"have" open declaratives as readily as questions. The
  // declarative reading carries a clause comma followed by a discourse pivot;
  // the genuine question carries neither.
  test.each([
    "Being cheap made goods popular, but what about quality?",
    "Need for repair drove costs, so what changed?",
    "Have money and you have craft, but who was priced out?",
  ])("rejects the declarative aux-homonym preamble: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe(
      "declarative-preamble",
    );
  });

  test.each([
    "Have prices ever fallen?",
    "Can repair scale?",
  ])("keeps the genuinely interrogative aux use passing: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe("OK");
  });
});

describe("validateSparkCandidate — discourse markers and fronted prefixes", () => {
  test.each([
    "So what about affordability?",
    "But what about repair?",
    "And who could afford it?",
    "Well, what about affordability?",
  ])("a leading discourse marker is not a preamble: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe("OK");
  });

  test.each([
    "In an age of factories, what happened to repair?",
    "Considering the factories, what changed?",
  ])("a fronted PP/participial phrase before the question passes: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe("OK");
  });

  test.each([
    // PROBE-CONFIRMED regressions (review round 2, item 1): the finite-verb
    // screen must NOT run on the preposition branch — a plural-noun object
    // right after a preposition is ordinary English, and a preposition cannot
    // head a finite clause. All five were accepted before the finding-5 fix
    // and must stay accepted.
    "In factories, what changed?",
    "For workers, what changed?",
    "In cities, who benefited?",
    "About costs, who paid?",
    "Among consumers, what shifted?",
  ])("a prep-fronted prefix with a plural-noun object passes: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe("OK");
  });

  test.each([
    // PROBE-CONFIRMED false-accepts (finding 5): an "-ing" pronoun/noun leading a
    // declarative clause used to slip past the fronted-participle heuristic.
    "Nothing lasts forever, why did repair culture die?",
    "Everything is disposable now, who benefits from that?",
    // Belt-and-suspenders: a gerund subject + finite verb is still a declarative.
    "Painting sells well, who buys it?",
  ])("an '-ing'-led declarative preamble is rejected: %s", (question) => {
    expect(reasonOf(validateSparkCandidate(wire({ question }), DRAFT))).toBe(
      "declarative-preamble",
    );
  });

  test("a perfect-participial 'Having …' head is not a finite clause (review item 5)", () => {
    // "Having" forces the verb that follows into participial form — "said" here
    // is a participle, not a finite verb — so the second-token finite screen is
    // exempt under this head.
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "Having said that, what about quality?" }),
          DRAFT,
        ),
      ),
    ).toBe("OK");
  });

  test("a 'Having …' head with a LATER finite verb is still a declarative preamble", () => {
    // Finiteness re-enters after the participle position ("is") — the
    // gerund-subject clause reading. The closed finite-form scan past token 2
    // catches it, so the having/being exemption does not re-open finding 5.
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "Having doubts is normal, why worry about repair?" }),
          DRAFT,
        ),
      ),
    ).toBe("declarative-preamble");
  });

  test("a fronted prefix followed by a pivot-led clause is still a preamble", () => {
    // Comma + pivot conjunction is the declarative-clause signature even when
    // the prefix itself is prepositional.
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "In an age of factories, but what changed?" }),
          DRAFT,
        ),
      ),
    ).toBe("declarative-preamble");
  });

  test("a noun-led prefix before a comma is still a preamble (finite clause)", () => {
    // "Craftsmanship declined" is an independent clause — a comma alone does
    // not make it a fronted adverbial.
    expect(
      reasonOf(
        validateSparkCandidate(
          wire({ question: "Craftsmanship declined, what about repair?" }),
          DRAFT,
        ),
      ),
    ).toBe("declarative-preamble");
  });
});

describe("validateSparkCandidate — Unicode normalization (finding 6)", () => {
  const ACUTE = "́"; // combining acute accent (produces NFD when appended)
  // Draft with "café" written in DECOMPOSED form: "cafe" + U+0301.
  const nfdDraft = `The town has a lively cafe${ACUTE} culture that draws crowds nightly.`;
  // Same phrase written in COMPOSED (NFC) form: U+00E9.
  const nfcGrounding = "café culture";

  test("an NFD draft matches an NFC grounding span (not falsely ungrounded)", () => {
    const result = validateSparkCandidate(
      wire({ question: "What about affordability?", grounding: nfcGrounding }),
      nfdDraft,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("NFC draft + NFC grounding control still matches", () => {
    const nfcDraft = "The town has a lively café culture that draws crowds nightly.";
    const result = validateSparkCandidate(
      wire({ question: "What about affordability?", grounding: nfcGrounding }),
      nfcDraft,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("a genuinely-absent grounding span is still rejected under normalization", () => {
    const result = validateSparkCandidate(
      wire({ question: "What about affordability?", grounding: "berlin nightlife" }),
      nfdDraft,
    );
    expect(reasonOf(result)).toBe("ungrounded");
  });
});

describe("validateSparkCandidateSet", () => {
  test("returns a per-candidate result in input order", () => {
    const results = validateSparkCandidateSet(
      [
        wire(),
        wire({ lens: "nonsense" }),
        wire({ question: "not a question" }),
      ],
      DRAFT,
    );
    expect(results.map(reasonOf)).toEqual(["OK", "unknown-lens", "missing-question-mark"]);
  });

  test("a set is servable when at least one candidate survives", () => {
    const results = validateSparkCandidateSet([wire({ lens: "bogus" }), wire()], DRAFT);
    expect(results.some((r) => r.ok)).toBe(true);
  });

  test("an empty wire set yields an empty result list", () => {
    expect(validateSparkCandidateSet([], DRAFT)).toHaveLength(0);
  });
});
