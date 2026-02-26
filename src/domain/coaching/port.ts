// Coaching port — adapter interface, no framework imports

import type { Result } from "../types/result";
import type { LlmError } from "../types/errors";
import type { DetectedClaim } from "../claims/claim";
import type { CoachingResult } from "./coaching";

export type CoachingRequest = {
  readonly essayText: string;
  readonly claims: readonly DetectedClaim[];
};

export type CoachingPort = {
  generateCoaching(request: CoachingRequest): Promise<Result<CoachingResult, LlmError>>;
};
