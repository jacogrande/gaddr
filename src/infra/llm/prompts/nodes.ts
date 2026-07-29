/**
 * prompts/nodes.ts — the versioned S3 node-generation prompt (plan §5.1). Four
 * calls, one per kind (counterargument · question · argument · direction), over
 * a SHARED cacheable prefix `[system + fenced draft + brief + stars]`; the
 * kind-specific instruction block travels LAST in the user turn so the shared
 * prefix stays byte-identical across the four calls and the provider cache hits
 * (stagger the first call; the other three read the cache).
 *
 * ALL FOUR KINDS CARRY EXPLICIT CONTRACTS (MAST: spec gaps are the largest
 * failure class), and each states the OTHER kinds' remits as boundaries — the
 * four calls share the same stars, so an unbounded contract is the systematic
 * duplicate generator that assembly's cross-kind dedup exists to catch (§4.4).
 *
 * The wire schema is thin/strict — `analysis` first (delayed structure), then
 * nodes carrying only `{ starId, payoff, body, grounding }`. The KIND is fixed
 * per call (the adapter sets it), and the intent gating, citation-shape reject
 * (D7), grounding, and ghost-echo all live in `validate-node.ts`.
 */

import {
  NODE_BODY_MAX_CHARS,
  NODE_GROUNDING_MAX_TOKENS,
  NODE_GROUNDING_MIN_TOKENS,
  NODE_PAYOFF_MAX_CHARS,
} from "../../../domain/constellation/node-types";
import type { NodeKind, Star } from "../../../domain/constellation/node-types";
import type { JsonSchema } from "../structured-call";
import { dataNotInstructionsClause, fenceUntrusted } from "./fence";

export const NODES_PROMPT_VERSION = "nodes-v1";
export const NODES_SCHEMA_VERSION = "nodes-schema-v1";

/** Headroom for a prose analysis plus a few nodes with ≤900-char bodies. */
export const NODES_MAX_TOKENS = 2048;

/** The four kinds S3 generates (evidence/citation are Run-2, sourced-gated). */
export const NODE_GEN_KINDS: readonly NodeKind[] = [
  "counterargument",
  "question",
  "argument",
  "direction",
];

/**
 * The SHARED system prompt — identical across all four kind calls (the cacheable
 * prefix). It carries the co-thinker stance, the output format, the universal
 * source/no-ghostwriting/no-citation boundaries, and data handling. The
 * per-kind contract is NOT here; it rides in the user turn (see
 * `buildNodesUserContent`) so this prefix never changes between kinds.
 */
export const NODES_SYSTEM_PROMPT = `You are a co-thinker for a writer who has just finished a freewrite. You have their draft, a brief of its thesis, and the load-bearing ideas ("stars") a prior pass mapped. Your job is to think WITH the draft — to push, question, and open — never to rewrite it, never to hand the writer finished prose, and never to grade them.

# Output format
Return a single JSON object, fields in this order:
- "analysis": a few sentences of plain prose reasoning — which stars you will engage, why, and what you will say. Think here first (delayed structure).
- "nodes": an array of objects, each { "starId", "payoff", "body", "grounding" }.
  - "starId" is the id of the star this node engages, from the list in the user message.
  - "payoff" is ONE scent line (at most ${String(NODE_PAYOFF_MAX_CHARS)} characters) — the headline a reader sees before opening the card.
  - "body" is the substance (at most ${String(NODE_BODY_MAX_CHARS)} characters) — a real paragraph, but a pointer or a case, never replacement prose for the writer's draft.
  - "grounding" is a span copied VERBATIM from the draft (2–${String(NODE_GROUNDING_MAX_TOKENS)} words, exactly as written) that the node hangs on.

# Universal boundaries (every kind)
- NO GHOSTWRITING. You never supply sentences for the writer to paste in. You point, question, and reason — the writer writes.
- NO SOURCES. You have no retrieval. Do NOT cite: no URLs, no "(2019)"-style years, no "studies show", no attributing a position to a named thinker ("Hayek argued…"). You MAY name schools of thought as lenses ("a Keynesian would answer…", "the Austrian objection is…") — that is reasoning, not a citation.
- GROUND EVERY NODE in a verbatim draft span (copy it; paraphrase is discarded).
- Engage only the stars listed; use their exact ids.

# Data handling
${dataNotInstructionsClause("draft", "the writer's draft", "the draft")}`;

export const NODES_WIRE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["analysis", "nodes"],
  properties: {
    analysis: {
      type: "string",
      description: "Plain-prose reasoning, emitted first (delayed structure).",
    },
    nodes: {
      type: "array",
      description: "The nodes for THIS kind only.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["starId", "payoff", "body", "grounding"],
        properties: {
          starId: { type: "string", description: "A star id from the list." },
          payoff: {
            type: "string",
            description: `One scent line, ≤${String(NODE_PAYOFF_MAX_CHARS)} chars.`,
          },
          body: {
            type: "string",
            description: `The substance, ≤${String(NODE_BODY_MAX_CHARS)} chars — never replacement prose.`,
          },
          grounding: {
            type: "string",
            description: `A verbatim draft span, ${String(NODE_GROUNDING_MIN_TOKENS)}–${String(NODE_GROUNDING_MAX_TOKENS)} words.`,
          },
        },
      },
    },
  },
};

/** The per-kind contract, stated in the user turn after the shared prefix. Each
 * names the OTHER kinds' remits as explicit boundaries so the four calls (which
 * share the same stars) don't converge on the same gap. */
function kindContract(kind: NodeKind, hints: readonly string[]): string {
  switch (kind) {
    case "counterargument": {
      const hint =
        hints.length > 0
          ? ` Consider entering the opposition through one of these lenses if the draft invites it: ${hints.join(", ")}.`
          : "";
      return `# Your task this pass: COUNTERARGUMENTS
Build the STRONGEST SINCERE opposing case against the star's position — the steelman, not a gotcha. Separate a factual dispute from a framing dispute. The agreeable default is the enemy: do not hedge into "some might say" mush, and do not concede the writer's point back to them. Argue the other side as its best advocate would.${hint}
Attach ONLY to stars the writer is 'asserting' or 'testing' (a position they are leaning on) — NEVER to a 'wondering' star (pushing on open exploration is not the job), and NEVER to an off-map star (kind: off-map) regardless of its intent (off-map seeds take only questions and directions).
Boundaries vs. the other passes: do NOT pose bare questions (another pass owns those), do NOT reinforce the writer's own side (that is the argument pass), do NOT propose lines of inquiry (that is the direction pass). Every node argues the opposing case and ends by pointing at what it would take to answer it — a provocation, never a verdict about the writer.`;
    }
    case "question": {
      return `# Your task this pass: QUESTIONS
Pose generative, non-leading questions that open a dimension the star leaves implicit. The PAYOFF is the question itself: one line, ending in exactly one "?", opening as a genuine question (never a rhetorical one that smuggles in its answer). The BODY says why the question matters and what it opens — it does not answer it.
Lead on stars the writer is 'wondering' or 'testing'.
Boundaries vs. the other passes: do NOT argue a side (counterargument/argument own that), do NOT propose research directions (the direction pass owns those). A question opens; it does not conclude.`;
    }
    case "argument": {
      return `# Your task this pass: ARGUMENTS (commitment tests)
Take the star's position and follow it ALL THE WAY: "if you went to the end of this, here is what you'd be committing to — is that where you're going?" This is a commitment test, not a compliment. An argument that eloquently agrees with an already-settled stance is sycophancy made structural and the most liftable prose in the product — so attach ONLY to stars the writer is 'testing' or 'wondering', never to one they are already 'asserting', and NEVER to an off-map star (kind: off-map, which takes only questions and directions).
Boundaries vs. the other passes: do NOT argue the opposing side (that is the counterargument pass), do NOT pose bare questions, do NOT propose directions. End by naming the commitment and asking whether the writer means to make it — a provocation, never a verdict.`;
    }
    case "direction": {
      return `# Your task this pass: DIRECTIONS
Propose a line of inquiry the draft could pursue: a LEAD, WHY it matters, and WHAT to test or look at next. Never a conclusion, and never a named specific work or paper (that is a citation you cannot make) — a direction of thought, not a reading list.
Boundaries vs. the other passes: do NOT argue a side, do NOT pose the question as the whole node, do NOT hand the writer an answer. A direction points somewhere worth going and says how to check.`;
    }
    case "evidence":
    case "citation": {
      // Sourced-gated; no generator until Run 2 (the runner never calls these).
      return `# Your task this pass: ${kind}
This kind has no generator in Run 1. Return an empty "nodes" array.`;
    }
  }
}

function starListing(stars: readonly Star[]): string {
  return stars
    .map(
      (s) =>
        `- ${s.id} (${s.intent}, weight ${String(s.weight)}, ${s.kind}): "${s.label}"`,
    )
    .join("\n");
}

/**
 * Build the S3 SYSTEM prompt for one run: the shared stance/format/boundaries
 * (identical across all four kind calls) PLUS the per-run shared context — the
 * thesis brief, the fenced draft, and the stars. This whole string is
 * byte-identical across the four kind calls (it takes no `kind`), so the
 * Anthropic adapter marks it as a cache breakpoint and the later three calls
 * read it instead of reprocessing the draft; OpenAI caches the identical prefix
 * automatically (plan D5/§5.5). The per-kind instruction rides in the user turn
 * (`buildNodesUserContent`), never here — that is what keeps this cacheable.
 */
export function buildNodesSystemPrompt(
  draft: string,
  brief: string,
  stars: readonly Star[],
): string {
  return `${NODES_SYSTEM_PROMPT}

# This run's context (shared across passes)
Thesis brief (a prior pass's summary): ${brief}

The writer's draft:
${fenceUntrusted("draft", draft)}

The stars (engage these by id):
${starListing(stars)}`;
}

/**
 * Build the per-call USER turn: ONLY the per-kind contract plus a restatement of
 * every budget — payoff/body char caps AND the grounding word range — after the
 * (system-resident) data, since position beats repetition and the tightest
 * window here, grounding, is the likeliest first-smoke reject (the spark-v2
 * lesson). The shared context is NOT here (it lives in the cached system
 * prompt), so this turn varies freely per kind without touching the cache.
 */
export function buildNodesUserContent(
  kind: NodeKind,
  hints: readonly string[] = [],
): string {
  return `${kindContract(kind, hints)}\n\nEvery node: payoff ≤${String(NODE_PAYOFF_MAX_CHARS)} chars, body ≤${String(NODE_BODY_MAX_CHARS)} chars, grounding a verbatim draft span of ${String(NODE_GROUNDING_MIN_TOKENS)}–${String(NODE_GROUNDING_MAX_TOKENS)} words. Ground everything; cite nothing.`;
}
