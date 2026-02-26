// Claim detection adapter — implements ClaimDetectionPort using Anthropic API

import type { ClaimDetectionPort, ClaimDetectionRequest } from "../../domain/claims/port";
import type { ClaimDetectionResult } from "../../domain/claims/claim";
import type { LlmError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";
import { ClaimDetectionResultSchema } from "../../domain/claims/schemas";
import { validateClaimDetectionResult } from "../../domain/claims/pipeline";
import { anthropic } from "./client";
import { CLAIM_DETECTOR_MODEL } from "./config";
import { CLAIM_DETECTION_PROMPT } from "./prompts/claim-detection-prompt";
import { extractJson } from "./extract-json";

async function detect(
  request: ClaimDetectionRequest,
): Promise<Result<ClaimDetectionResult, LlmError>> {
  let responseText: string;

  try {
    const response = await anthropic.messages.create({
      model: CLAIM_DETECTOR_MODEL,
      // ~10 claims × ~100 tokens each — 2048 is generous headroom
      max_tokens: 2048,
      system: CLAIM_DETECTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Identify the claims in this essay (${String(request.wordCount)} words):\n\n${request.essayText}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return err({ kind: "LlmError", message: "No text in claim detection response" });
    }
    responseText = textBlock.text;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown LLM error";
    return err({ kind: "LlmError", message, cause: error });
  }

  const jsonStr = extractJson(responseText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return err({ kind: "LlmError", message: "Invalid JSON in claim detection response" });
  }

  const validated = ClaimDetectionResultSchema.safeParse(parsed);
  if (!validated.success) {
    return err({
      kind: "LlmError",
      message: `Invalid claim detection schema: ${validated.error.message}`,
    });
  }

  return ok(validateClaimDetectionResult(validated.data));
}

export const claimDetectionAdapter: ClaimDetectionPort = {
  detectClaims: detect,
};
