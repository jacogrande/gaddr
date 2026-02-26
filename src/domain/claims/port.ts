// Claim detection port — adapter interface, no framework imports

import type { Result } from "../types/result";
import type { LlmError } from "../types/errors";
import type { ClaimDetectionResult } from "./claim";

export type ClaimDetectionRequest = {
  readonly essayText: string;
  readonly wordCount: number;
};

export type ClaimDetectionPort = {
  detectClaims(request: ClaimDetectionRequest): Promise<Result<ClaimDetectionResult, LlmError>>;
};
