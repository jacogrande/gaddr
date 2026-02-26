// Coaching adapter — implements CoachingPort using Anthropic API

import type { CoachingPort, CoachingRequest } from "../../domain/coaching/port";
import type { CoachingResult } from "../../domain/coaching/coaching";
import type { LlmError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";
import { CoachingResultSchema } from "../../domain/coaching/schemas";
import { validateCoachingResult } from "../../domain/coaching/pipeline";
import { anthropic } from "./client";
import { COACHING_MODEL } from "./config";
import { COACHING_PROMPT } from "./prompts/coaching-prompt";
import { extractJson } from "./extract-json";

async function generate(
  request: CoachingRequest,
): Promise<Result<CoachingResult, LlmError>> {
  let responseText: string;

  const claimsList = request.claims
    .map((c, i) => `${String(i + 1)}. [${c.claimType}] "${c.quotedText}"`)
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      // 5 notes × ~2 sentences × ~50 tokens ≈ 500; 1024 is comfortable headroom
      max_tokens: 1024,
      system: COACHING_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are the claims detected in the essay:\n\n${claimsList}\n\nEssay context:\n\n${request.essayText}\n\nGenerate coaching notes for these claims.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return err({ kind: "LlmError", message: "No text in coaching response" });
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
    return err({ kind: "LlmError", message: "Invalid JSON in coaching response" });
  }

  const validated = CoachingResultSchema.safeParse(parsed);
  if (!validated.success) {
    return err({
      kind: "LlmError",
      message: `Invalid coaching schema: ${validated.error.message}`,
    });
  }

  return ok(validateCoachingResult(validated.data, request.claims));
}

export const coachingAdapter: CoachingPort = {
  generateCoaching: generate,
};
