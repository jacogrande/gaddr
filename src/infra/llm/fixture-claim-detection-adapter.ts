// Deterministic claim detection fixture for E2E testing — no LLM calls

import type { ClaimDetectionPort } from "../../domain/claims/port";
import type { ClaimDetectionResult } from "../../domain/claims/claim";
import type { LlmError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok } from "../../domain/types/result";

// Fixture quotedTexts are for display testing only — they won't match editor
// content, so click-to-scroll will be a no-op in E2E fixture mode.
const FIXTURE_RESULT: ClaimDetectionResult = {
  claims: [
    {
      quotedText: "This is an important claim",
      claimType: "factual",
      confidence: 0.92,
    },
    {
      quotedText: "This policy is the best approach",
      claimType: "evaluative",
      confidence: 0.78,
    },
    {
      quotedText: "This leads to increased flooding",
      claimType: "causal",
      confidence: 0.85,
    },
  ],
};

async function detect(): Promise<Result<ClaimDetectionResult, LlmError>> {
  await new Promise((r) => setTimeout(r, 200));
  return ok(FIXTURE_RESULT);
}

export const fixtureClaimDetectionAdapter: ClaimDetectionPort = {
  detectClaims: detect,
};
