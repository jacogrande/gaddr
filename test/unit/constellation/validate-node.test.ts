import { describe, expect, test } from "bun:test";
import {
  hasCitationShape,
  hasVerdictLanguage,
  validateNode,
  validateNodeSet,
  type NodeRejectReason,
} from "../../../src/domain/constellation/validate-node";
import type {
  Star,
  ValidatedNode,
  WireConstellationNode,
} from "../../../src/domain/constellation/node-types";
import {
  NODE_BODY_MAX_CHARS,
  NODE_PAYOFF_MAX_CHARS,
} from "../../../src/domain/constellation/node-types";
import type { Result } from "../../../src/domain/types/result";
import type { NodeRejection } from "../../../src/domain/constellation/validate-node";

/**
 * A draft with three distinct clause-length runs to ground in and echo:
 *  s1: "mass production made goods affordable for ordinary people" (asserting)
 *  s2: "craftsmanship became a luxury only the wealthy could afford" (wondering)
 *  s3: "the market rewards scale over care and that trade off shapes what we build" (testing)
 */
const DRAFT =
  "Mass production made goods affordable for ordinary people. " +
  "Craftsmanship became a luxury only the wealthy could afford. " +
  "The market rewards scale over care, and that trade-off shapes what we build.";

const STAR_ASSERT: Star = {
  id: "s1",
  label: "Mass production democratized goods",
  intent: "asserting",
  weight: 5,
  grounding: "mass production made goods affordable",
  kind: "star",
};
const STAR_WONDER: Star = {
  id: "s2",
  label: "Craft as luxury",
  intent: "wondering",
  weight: 3,
  grounding: "craftsmanship became a luxury",
  kind: "star",
};
const STAR_TEST: Star = {
  id: "s3",
  label: "Scale vs care",
  intent: "testing",
  weight: 4,
  grounding: "the market rewards scale over care",
  kind: "star",
};
const STAR_OFFMAP: Star = {
  id: "off1",
  label: "What you didn't write: labor conditions",
  intent: "wondering",
  weight: 1,
  grounding: "the human cost of factory labor",
  kind: "off-map",
};

function node(
  overrides: Partial<WireConstellationNode> = {},
): WireConstellationNode {
  return {
    kind: "counterargument",
    starId: "s1",
    payoff: "Affordability may have shifted costs, not removed them",
    body:
      "The strongest opposing case is that cheap goods pushed costs onto " +
      "workers and the environment rather than eliminating them. What read as " +
      "democratization to the buyer read as precarity to the maker.",
    grounding: "mass production made goods affordable",
    ...overrides,
  };
}

function reasonOf(
  result: Result<ValidatedNode, NodeRejection>,
): NodeRejectReason | "OK" {
  return result.ok ? "OK" : result.error.reason;
}

// ── Accepts ──────────────────────────────────────────────────────────────────

describe("validateNode — accepts", () => {
  test("the archetype: a steelmanned counterargument on an asserting star", () => {
    const result = validateNode(node(), DRAFT, STAR_ASSERT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("counterargument");
      expect(result.value.tier).toBe("inferred");
      expect(result.value.starId).toBe("s1");
    }
  });

  test("a well-formed question node on a wondering star", () => {
    const result = validateNode(
      node({
        kind: "question",
        starId: "s2",
        payoff: "What would repair culture have preserved that scale erased?",
        body:
          "The draft treats craftsmanship's decline as settled. Naming what was " +
          "lost — tacit skill, local repair, durability — opens whether the trade " +
          "was worth it.",
        grounding: "craftsmanship became a luxury",
      }),
      DRAFT,
      STAR_WONDER,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("an argument node on a testing star (the commitment-test posture)", () => {
    const result = validateNode(
      node({
        kind: "argument",
        starId: "s3",
        payoff: "Taken all the way, this says care is a luxury good",
        body:
          "If the market truly rewards scale over care, the honest conclusion is " +
          "that care survives only where buyers pay a premium for it. Is that the " +
          "position being taken?",
        grounding: "the market rewards scale over care",
      }),
      DRAFT,
      STAR_TEST,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("a direction node on an off-map star grounds on a topic rationale", () => {
    const result = validateNode(
      node({
        kind: "direction",
        starId: "off1",
        payoff: "Compare the human cost across two industrialisations",
        body:
          "A line worth pulling: contrast the labor conditions of early factories " +
          "with today's supply chains, and ask what each generation chose not to see.",
        grounding: "the human cost of factory labor",
      }),
      DRAFT,
      STAR_OFFMAP,
    );
    expect(reasonOf(result)).toBe("OK");
  });

  test("named schools of thought as lenses are allowed (D7)", () => {
    for (const body of [
      "A Keynesian would answer that thrift, not production, drove the shortfall.",
      "The Austrian objection is that no planner can compute dispersed prices.",
      "Marxists have long argued that the cost simply moved onto labor.",
    ]) {
      const result = validateNode(node({ body }), DRAFT, STAR_ASSERT);
      expect(reasonOf(result)).toBe("OK");
    }
  });
});

// ── Rejects: kind & tier ─────────────────────────────────────────────────────

describe("validateNode — kind and tier", () => {
  test("an unknown kind is rejected", () => {
    expect(reasonOf(validateNode(node({ kind: "rebuttal" }), DRAFT, STAR_ASSERT))).toBe(
      "unknown-kind",
    );
  });

  test("sourced-tier kinds have no Run 1 generator", () => {
    expect(reasonOf(validateNode(node({ kind: "citation" }), DRAFT, STAR_ASSERT))).toBe(
      "sourced-kind",
    );
    expect(reasonOf(validateNode(node({ kind: "evidence" }), DRAFT, STAR_ASSERT))).toBe(
      "sourced-kind",
    );
  });
});

// ── Rejects: caps ────────────────────────────────────────────────────────────

describe("validateNode — caps", () => {
  test("empty and over-long payoff", () => {
    expect(reasonOf(validateNode(node({ payoff: "   " }), DRAFT, STAR_ASSERT))).toBe(
      "empty-payoff",
    );
    expect(
      reasonOf(
        validateNode(node({ payoff: "x".repeat(NODE_PAYOFF_MAX_CHARS + 1) }), DRAFT, STAR_ASSERT),
      ),
    ).toBe("payoff-too-long");
  });

  test("empty and over-long body", () => {
    expect(reasonOf(validateNode(node({ body: "" }), DRAFT, STAR_ASSERT))).toBe(
      "empty-body",
    );
    expect(
      reasonOf(
        validateNode(node({ body: "x".repeat(NODE_BODY_MAX_CHARS + 1) }), DRAFT, STAR_ASSERT),
      ),
    ).toBe("body-too-long");
  });
});

// ── Rejects: intent gating & off-map (D9, D10) ───────────────────────────────

describe("validateNode — intent gating and off-map", () => {
  test("a counterargument may not push on a wondering star", () => {
    expect(reasonOf(validateNode(node({ starId: "s2" }), DRAFT, STAR_WONDER))).toBe(
      "pushback-on-wondering",
    );
  });

  test("an argument may not reinforce an asserted star (structural sycophancy)", () => {
    const result = validateNode(
      node({
        kind: "argument",
        starId: "s1",
        payoff: "Scale really did democratize access",
        body: "Cheap goods reached households that craft never could — a real gain worth naming.",
        grounding: "mass production made goods affordable",
      }),
      DRAFT,
      STAR_ASSERT,
    );
    expect(reasonOf(result)).toBe("argument-on-asserted");
  });

  test("an off-map star rejects a non-question/direction kind", () => {
    const result = validateNode(
      node({ kind: "counterargument", starId: "off1", grounding: "the human cost of factory labor" }),
      DRAFT,
      STAR_OFFMAP,
    );
    expect(reasonOf(result)).toBe("off-map-kind");
  });
});

// ── Rejects: citation shape & verdict (D7, rule 7) ───────────────────────────

describe("validateNode — hallucination & provocation guards", () => {
  test("named-thinker attribution in the body is rejected", () => {
    const result = validateNode(
      node({ body: "Hayek argued that prices coordinate dispersed knowledge no planner has." }),
      DRAFT,
      STAR_ASSERT,
    );
    expect(reasonOf(result)).toBe("speculative-attribution");
  });

  test("a full first-last name attribution is rejected (regression)", () => {
    const result = validateNode(
      node({ body: "Adam Smith wrote that the division of labor is the engine of growth." }),
      DRAFT,
      STAR_ASSERT,
    );
    expect(reasonOf(result)).toBe("speculative-attribution");
  });

  test("verdict language about the writer is rejected in a counterargument", () => {
    const result = validateNode(
      node({ body: "You are wrong to treat scale as free. Your argument fails on the demand side." }),
      DRAFT,
      STAR_ASSERT,
    );
    // Citation shape is checked before verdict; this body has neither citation
    // shape, so it lands on the verdict guard.
    expect(reasonOf(result)).toBe("verdict-language");
  });
});

// ── Rejects: question grammar (rule 6) ───────────────────────────────────────

describe("validateNode — question grammar", () => {
  test("a question node whose payoff is not a question", () => {
    const result = validateNode(
      node({
        kind: "question",
        starId: "s2",
        payoff: "Craftsmanship became a luxury for the few",
        body: "Worth asking what that cost.",
        grounding: "craftsmanship became a luxury",
      }),
      DRAFT,
      STAR_WONDER,
    );
    expect(reasonOf(result)).toBe("missing-question-mark");
  });

  test("a question node whose payoff asserts then asks", () => {
    const result = validateNode(
      node({
        kind: "question",
        starId: "s2",
        payoff: "Craft declined, but what replaced it?",
        body: "The draft skips the replacement.",
        grounding: "craftsmanship became a luxury",
      }),
      DRAFT,
      STAR_WONDER,
    );
    expect(reasonOf(result)).toBe("not-interrogative");
  });
});

// ── Rejects: grounding & ghost-echo (rules 2, 3) ─────────────────────────────

describe("validateNode — grounding and ghost-echo", () => {
  test("empty grounding on a core star", () => {
    expect(reasonOf(validateNode(node({ grounding: "  " }), DRAFT, STAR_ASSERT))).toBe(
      "empty-grounding",
    );
  });

  test("a single-word grounding is not a specific span", () => {
    expect(reasonOf(validateNode(node({ grounding: "goods" }), DRAFT, STAR_ASSERT))).toBe(
      "ungrounded",
    );
  });

  test("grounding absent from the draft", () => {
    expect(
      reasonOf(validateNode(node({ grounding: "quantum entanglement is spooky" }), DRAFT, STAR_ASSERT)),
    ).toBe("ungrounded");
  });

  test("an over-long grounding span is rejected (D11 — no paragraphs at rest)", () => {
    // 41 tokens > NODE_GROUNDING_MAX_TOKENS (40); the max check fires before the
    // draft-match, so it need not appear in the draft.
    const long = Array.from({ length: 41 }, (_, i) => `w${String(i)}`).join(" ");
    expect(reasonOf(validateNode(node({ grounding: long }), DRAFT, STAR_ASSERT))).toBe(
      "grounding-too-long",
    );
  });

  test("a body echoing a draft run beyond its grounding span", () => {
    const result = validateNode(
      node({
        body:
          "That view understates supply, yet the market rewards scale over care " +
          "and that trade off shapes what we build, so the objection stands.",
        grounding: "mass production made goods affordable",
      }),
      DRAFT,
      STAR_ASSERT,
    );
    expect(reasonOf(result)).toBe("ghost-echo");
  });

  test("an off-map node grounds on a rationale, not a draft span", () => {
    // The rationale need not appear in the draft; only non-empty is required.
    const result = validateNode(
      node({
        kind: "question",
        starId: "off1",
        payoff: "Whose labor paid for the cheap shelf?",
        body: "A dimension the draft never opens: who bore the cost of scale.",
        grounding: "an entirely off-draft topic rationale",
      }),
      DRAFT,
      STAR_OFFMAP,
    );
    expect(reasonOf(result)).toBe("OK");
  });
});

// ── Set-level resolution ─────────────────────────────────────────────────────

describe("validateNodeSet — star resolution", () => {
  test("a node referencing an unknown star is rejected", () => {
    const [result] = validateNodeSet([node({ starId: "ghost" })], DRAFT, [STAR_ASSERT]);
    expect(result && reasonOf(result)).toBe("unknown-star");
  });

  test("validates each node against its resolved star, in input order", () => {
    const results = validateNodeSet(
      [node(), node({ starId: "s2" })],
      DRAFT,
      [STAR_ASSERT, STAR_WONDER],
    );
    expect(results.map(reasonOf)).toEqual(["OK", "pushback-on-wondering"]);
  });
});

// ── Direct detector tables (the load-bearing heuristics) ─────────────────────

describe("hasCitationShape", () => {
  test.each([
    ["url", "See https://example.com/paper for the numbers."],
    ["bare domain", "The data is at exampledata.org and worth a look."],
    ["year in parens", "A later revision (2008) reversed the finding."],
    ["et al", "Doshi et al. mapped this exact convergence."],
    ["studies show", "Studies show that repair extends product life."],
    ["research found", "Recent research found the opposite pattern."],
    ["study reference", "A recent study put the figure far higher."],
    ["named thinker argued", "Keynes argued that thrift can be self-defeating."],
    ["named thinker wrote", "Smith wrote that the division of labor drives growth."],
    ["full first-last name", "Adam Smith wrote about the division of labor."],
    ["full name argued", "Karl Marx argued that class struggle drives history."],
    ["full name claimed", "Milton Friedman claimed inflation is always monetary."],
    ["adverb-separated attribution", "Hayek famously argued that prices coordinate knowledge."],
    ["aux-separated attribution", "Marx has long argued the cost moved onto labor."],
    ["study of a cohort found", "A study of 500 patients found no measurable effect."],
    ["according to a thinker", "According to Hayek, prices coordinate knowledge."],
    ["quote plus attribution", 'The line "prices coordinate knowledge" — Hayek — sums it up.'],
  ])("flags %s", (_label, text) => {
    expect(hasCitationShape(text)).toBe(true);
  });

  test.each([
    ["a school-of-thought lens", "A Keynesian would answer that demand drove the shortfall."],
    ["a named school", "The Austrian objection is that planning cannot compute prices."],
    ["a collective school", "Marxists have long argued the cost simply moved onto labor."],
    ["a capitalized non-thinker + common verb", "Markets showed resilience the model missed."],
    ["a capitalized abstraction", "History suggests the trade was rarely questioned."],
    ["a personified abstraction + assertion verb", "Markets argued for their own efficiency for decades."],
    ["an institution + assertion verb", "Institutions maintained their grip long after their purpose faded."],
    ["a government + assertion verb", "Governments asserted control over currency as markets pushed back."],
    ["debtors contending WITH (not that)", "Debtors contended with rising rates every quarter."],
    ["an adjective + common-noun subject", "Large Institutions maintained their market position."],
    ["the study OF X common noun", "The study of craft economies tells a different story."],
    ["plain steelman prose", "The opposing case is that supply, not thrift, set the floor."],
  ])("does not flag %s", (_label, text) => {
    expect(hasCitationShape(text)).toBe(false);
  });
});

describe("hasVerdictLanguage", () => {
  test.each([
    ["you are wrong", "You are wrong to treat scale as free."],
    ["you ignore", "You ignore the demand side entirely."],
    ["your argument fails", "Your argument fails once supply is priced in."],
    ["adverb before predicate", "You're simply wrong about the elasticity here."],
    ["your thesis is fundamentally broken", "Your thesis is fundamentally broken once demand shifts."],
  ])("flags %s", (_label, text) => {
    expect(hasVerdictLanguage(text)).toBe(true);
  });

  test.each([
    ["arguing a mechanism", "The opposing view holds that markets fail to clear without help."],
    ["neutral pushback", "This account does not price in the demand side at all."],
  ])("does not flag %s", (_label, text) => {
    expect(hasVerdictLanguage(text)).toBe(false);
  });
});
