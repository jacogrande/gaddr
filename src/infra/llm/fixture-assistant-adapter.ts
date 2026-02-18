// Deterministic assistant fixture for E2E testing — no LLM calls

import type { AssistantPort, AssistantRequest } from "../../domain/assistant/port";
import type { AssistantEvent } from "../../domain/assistant/assistant";
import { validateAssistantEvent } from "../../domain/assistant/constraints";
import { isErr } from "../../domain/types/result";

const REVIEW_EVENTS: readonly AssistantEvent[] = [
  { type: "review_start" },
  {
    type: "inline_comment",
    data: {
      quotedText: "This is an important claim",
      problem: "The claim lacks supporting evidence",
      why: "Readers need concrete evidence to evaluate the strength of arguments",
      question: "What specific data or sources support this assertion?",
      suggestedAction:
        "Add a citation or evidence card linking to a credible source",
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
      description:
        "The essay transitions abruptly between the second and third paragraphs",
      suggestedAction:
        "Add a transitional sentence that connects the two ideas",
    },
  },
  {
    type: "question",
    data: {
      question:
        "What would someone who disagrees with your main argument say?",
      context:
        "Considering counterarguments strengthens your position by showing you have engaged with opposing views",
    },
  },
  {
    type: "rubric_score",
    data: {
      dimension: "clarity",
      score: 3,
      rationale: "Generally clear prose with a few ambiguous passages",
    },
  },
  {
    type: "rubric_score",
    data: {
      dimension: "evidence",
      score: 2,
      rationale:
        "Claims are asserted without sufficient supporting evidence",
    },
  },
  {
    type: "rubric_score",
    data: {
      dimension: "structure",
      score: 3,
      rationale: "Logical organization with one weak transition",
    },
  },
  {
    type: "rubric_score",
    data: {
      dimension: "argument",
      score: 3,
      rationale:
        "Central argument is identifiable but would benefit from addressing counterpoints",
    },
  },
  {
    type: "rubric_score",
    data: {
      dimension: "originality",
      score: 4,
      rationale:
        "Fresh perspective on the topic with a distinctive voice",
    },
  },
  { type: "review_done" },
  { type: "done" },
];

const CHAT_EVENTS: readonly AssistantEvent[] = [
  {
    type: "text_delta",
    text: "Your essay has a strong central argument, but the second paragraph could use more concrete evidence to support the claim. Consider what specific examples or data points would strengthen your position. What sources have you consulted so far?",
  },
  { type: "done" },
];

const RESEARCH_EVENTS: readonly AssistantEvent[] = [
  {
    type: "text_delta",
    text: "I found some relevant sources that could strengthen your argument:",
  },
  {
    type: "source_suggestion",
    data: {
      title: "The Impact of Evidence-Based Writing on Critical Thinking",
      url: "https://example.com/evidence-based-writing",
      snippet:
        "Studies show that writers who consistently cite evidence produce more persuasive arguments and develop stronger analytical skills over time.",
      relevance:
        "Directly supports the essay's argument about the importance of evidence in writing",
      stance: "supporting",
    },
  },
  {
    type: "source_suggestion",
    data: {
      title: "Counterpoint: The Role of Intuition in Persuasive Writing",
      url: "https://example.com/intuition-writing",
      snippet:
        "While evidence is important, over-reliance on data can sometimes obscure the human narrative that makes writing compelling.",
      relevance:
        "Provides a counterargument worth addressing in the essay",
      stance: "opposing",
    },
  },
  { type: "done" },
];

// Validate all fixture events at module load — fail fast if constraints change
function validateFixture(events: readonly AssistantEvent[]): readonly AssistantEvent[] {
  return events.map((event) => {
    const result = validateAssistantEvent(event);
    if (isErr(result)) {
      throw new Error(
        `Fixture event violates authorship constraint: ${result.error.message}`,
      );
    }
    return result.value;
  });
}

const VALIDATED_REVIEW = validateFixture(REVIEW_EVENTS);
const VALIDATED_CHAT = validateFixture(CHAT_EVENTS);
const VALIDATED_RESEARCH = validateFixture(RESEARCH_EVENTS);

function selectFixture(request: AssistantRequest): readonly AssistantEvent[] {
  if (request.mode === "full_review") return VALIDATED_REVIEW;
  const lower = request.userMessage.toLowerCase();
  if (
    lower.includes("source") ||
    lower.includes("research") ||
    lower.includes("evidence") ||
    lower.includes("find")
  ) {
    return VALIDATED_RESEARCH;
  }
  return VALIDATED_CHAT;
}

async function* fixtureAssistantGenerator(
  request: AssistantRequest,
): AsyncIterable<AssistantEvent> {
  const events = selectFixture(request);
  for (const event of events) {
    await new Promise((r) => setTimeout(r, 50));
    yield event;
  }
}

export const fixtureAssistantAdapter: AssistantPort = {
  chat: fixtureAssistantGenerator,
};
