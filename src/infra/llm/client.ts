import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }

  return cachedClient;
}
