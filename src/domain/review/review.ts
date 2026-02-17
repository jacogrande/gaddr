// Domain review types — pure types, no framework imports

export type InlineComment = {
  readonly quotedText: string;
  readonly problem: string;
  readonly why: string;
  readonly question: string;
  readonly suggestedAction: string;
};

export type ReviewIssue = {
  readonly tag: "clarity" | "evidence" | "structure" | "argument" | "style";
  readonly severity: "high" | "medium" | "low";
  readonly description: string;
  readonly suggestedAction: string;
};

export type SocraticQuestion = {
  readonly question: string;
  readonly context: string;
};

export const RUBRIC_DIMENSIONS = [
  "clarity",
  "evidence",
  "structure",
  "argument",
  "originality",
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export type RubricScore = {
  readonly dimension: RubricDimension;
  readonly score: 1 | 2 | 3 | 4 | 5;
  readonly rationale: string;
};

export type ReviewEvent =
  | { readonly type: "inline_comment"; readonly data: InlineComment }
  | { readonly type: "issue"; readonly data: ReviewIssue }
  | { readonly type: "question"; readonly data: SocraticQuestion }
  | { readonly type: "rubric_score"; readonly data: RubricScore }
  | { readonly type: "done" }
  | { readonly type: "error"; readonly message: string };
