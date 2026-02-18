// Domain assistant types — pure types, no framework imports

import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
} from "../review/review";

export type SourceSuggestion = {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly relevance: string;
  readonly stance: "supporting" | "opposing" | "neutral";
};

export type AssistantEvent =
  | { readonly type: "text_delta"; readonly text: string }
  | { readonly type: "inline_comment"; readonly data: InlineComment }
  | { readonly type: "issue"; readonly data: ReviewIssue }
  | { readonly type: "question"; readonly data: SocraticQuestion }
  | { readonly type: "rubric_score"; readonly data: RubricScore }
  | { readonly type: "source_suggestion"; readonly data: SourceSuggestion }
  | { readonly type: "review_start" }
  | { readonly type: "review_done" }
  | { readonly type: "done" }
  | { readonly type: "error"; readonly message: string };
