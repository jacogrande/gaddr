// Shared utility to extract JSON from LLM text responses

/**
 * Extracts JSON from an LLM response that may be wrapped in markdown code fences.
 * Handles ```json ... ```, ``` ... ```, or raw JSON text.
 */
export function extractJson(text: string): string {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  return text.trim();
}
