// Deterministic review fixture for E2E testing — no LLM calls

import type { ReviewPort, ReviewRequest } from "../../domain/review/port";
import type { ReviewEvent } from "../../domain/review/review";
import { validateArtifact } from "../../domain/review/constraints";
import { isErr } from "../../domain/types/result";

const RAW_EVENTS: readonly ReviewEvent[] = [
  {
    type: "inline_comment",
    data: {
      quotedText: "This is an important claim",
      problem: "The claim lacks supporting evidence",
      why: "Readers need concrete evidence to evaluate the strength of arguments",
      question: "What specific data or sources support this assertion?",
      suggestedAction: "Add a citation or evidence card linking to a credible source",
    },
  },
  {
    type: "inline_comment",
    data: {
      quotedText: "many people believe",
      problem: "Vague attribution weakens the argument",
      why: "Unspecified appeals to popularity are a logical fallacy",
      question: "Who specifically holds this view, and in what context?",
      suggestedAction: "Identify the specific group or cite a survey or study",
    },
  },
  {
    type: "issue",
    data: {
      tag: "structure",
      severity: "medium",
      description: "The essay transitions abruptly between the second and third paragraphs",
      suggestedAction: "Add a transitional sentence that connects the two ideas",
    },
  },
  {
    type: "question",
    data: {
      question: "What would someone who disagrees with your main argument say?",
      context: "Considering counterarguments strengthens your position by showing you have engaged with opposing views",
    },
  },
  {
    type: "rubric_score",
    data: { dimension: "clarity", score: 3, rationale: "Generally clear prose with a few ambiguous passages" },
  },
  {
    type: "rubric_score",
    data: { dimension: "evidence", score: 2, rationale: "Claims are asserted without sufficient supporting evidence" },
  },
  {
    type: "rubric_score",
    data: { dimension: "structure", score: 3, rationale: "Logical organization with one weak transition" },
  },
  {
    type: "rubric_score",
    data: { dimension: "argument", score: 3, rationale: "Central argument is identifiable but would benefit from addressing counterpoints" },
  },
  {
    type: "rubric_score",
    data: { dimension: "originality", score: 4, rationale: "Fresh perspective on the topic with a distinctive voice" },
  },
  { type: "done" },
];

// Validate fixture data at module load — fail fast if authorship constraints change
const FIXTURE_EVENTS: readonly ReviewEvent[] = RAW_EVENTS.map((event) => {
  const result = validateArtifact(event);
  if (isErr(result)) {
    throw new Error(`Fixture event violates authorship constraint: ${result.error.message}`);
  }
  return result.value;
});

async function* fixtureReviewGenerator(
  _request: ReviewRequest,
): AsyncIterable<ReviewEvent> {
  for (const event of FIXTURE_EVENTS) {
    await new Promise((r) => setTimeout(r, 50));
    yield event;
  }
}

export const fixtureReviewAdapter: ReviewPort = {
  review: fixtureReviewGenerator,
};
