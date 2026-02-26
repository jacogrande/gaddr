// Deterministic coaching fixture for E2E testing — no LLM calls

import type { CoachingPort } from "../../domain/coaching/port";
import type { CoachingResult } from "../../domain/coaching/coaching";
import type { LlmError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok } from "../../domain/types/result";

// Fixture notes match the fixture claim adapter's quotedTexts
const FIXTURE_RESULT: CoachingResult = {
  notes: [
    {
      claimQuotedText: "This is an important claim",
      note: "This is a bold claim \u2014 got a source to back it up?",
      category: "needs-evidence",
    },
    {
      claimQuotedText: "This policy is the best approach",
      note: "Interesting point. What would someone who disagrees say?",
      category: "counterargument",
    },
    {
      claimQuotedText: "This leads to increased flooding",
      note: "This is specific and well-supported. Nice work.",
      category: "strong-point",
    },
  ],
};

const FIXTURE_LATENCY_MS = 150; // simulate realistic Haiku response time for E2E

async function generate(): Promise<Result<CoachingResult, LlmError>> {
  await new Promise((r) => setTimeout(r, FIXTURE_LATENCY_MS));
  return ok(FIXTURE_RESULT);
}

export const fixtureCoachingAdapter: CoachingPort = {
  generateCoaching: generate,
};
