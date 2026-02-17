// Review port — adapter interface, no framework imports

import type { ReviewEvent } from "./review";

export type ReviewRequest = {
  readonly essayText: string;
  readonly essayTitle: string;
  readonly wordCount: number;
};

export type ReviewPort = {
  review(request: ReviewRequest): AsyncIterable<ReviewEvent>;
};
