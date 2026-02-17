// Anthropic tool definitions for essay review

import type Anthropic from "@anthropic-ai/sdk";

export const reviewTools = [
  {
    name: "add_inline_comment",
    description:
      "Add an inline comment on a specific passage in the essay. Quote the exact text for client-side highlighting.",
    input_schema: {
      type: "object",
      properties: {
        quotedText: {
          type: "string",
          description:
            "Exact substring from the essay to highlight. Must match verbatim.",
        },
        problem: {
          type: "string",
          description: "What the issue is with this passage.",
        },
        why: {
          type: "string",
          description: "Why this issue matters for the essay.",
        },
        question: {
          type: "string",
          description:
            "A question to prompt the writer to think about the issue.",
        },
        suggestedAction: {
          type: "string",
          description:
            "What the writer should do (NOT replacement text). Describe the action, never provide the prose.",
        },
      },
      required: ["quotedText", "problem", "why", "question", "suggestedAction"],
    },
  },
  {
    name: "add_issue",
    description:
      "Flag a broader essay-level issue with category tag and severity.",
    input_schema: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          enum: ["clarity", "evidence", "structure", "argument", "style"],
          description: "Issue category.",
        },
        severity: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "How much this issue impacts the essay.",
        },
        description: {
          type: "string",
          description: "What the issue is.",
        },
        suggestedAction: {
          type: "string",
          description:
            "What the writer should do (NOT replacement text). Describe the action, never provide the prose.",
        },
      },
      required: ["tag", "severity", "description", "suggestedAction"],
    },
  },
  {
    name: "ask_question",
    description:
      "Ask the writer a Socratic question to deepen their thinking. Must end with a question mark.",
    input_schema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "An open-ended question that pushes the writer to think deeper. Must end with '?'.",
        },
        context: {
          type: "string",
          description: "Why this question is relevant to the essay.",
        },
      },
      required: ["question", "context"],
    },
  },
  {
    name: "score_rubric",
    description:
      "Score one rubric dimension from 1-5 with a rationale. Call once per dimension.",
    input_schema: {
      type: "object",
      properties: {
        dimension: {
          type: "string",
          enum: [
            "clarity",
            "evidence",
            "structure",
            "argument",
            "originality",
          ],
          description: "The rubric dimension to score.",
        },
        score: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "Score from 1 (needs work) to 5 (excellent).",
        },
        rationale: {
          type: "string",
          description: "Brief explanation for the score.",
        },
      },
      required: ["dimension", "score", "rationale"],
    },
  },
] satisfies Anthropic.Tool[];
