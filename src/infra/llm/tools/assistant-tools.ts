// Anthropic tool definitions for assistant chatbot

import type Anthropic from "@anthropic-ai/sdk";
import { reviewTools } from "./review-tools";

const suggestSourceTool: Anthropic.Tool = {
  name: "suggest_source",
  description:
    "Suggest a source the writer could use to support or challenge a claim. Use after searching the web for relevant sources.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the source (article, paper, book, etc.).",
      },
      url: {
        type: "string",
        description: "URL of the source.",
      },
      snippet: {
        type: "string",
        description:
          "Key quote or summary from the source relevant to the essay.",
      },
      relevance: {
        type: "string",
        description: "Why this source matters for the essay.",
      },
      stance: {
        type: "string",
        enum: ["supporting", "opposing", "neutral"],
        description:
          "Whether the source supports, opposes, or is neutral to the essay's argument.",
      },
    },
    required: ["title", "url", "snippet", "relevance", "stance"],
  },
};

export const assistantTools: Anthropic.Tool[] = [
  ...reviewTools,
  suggestSourceTool,
];

export const webSearchTool: Anthropic.WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
};
