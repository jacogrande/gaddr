// Anthropic client — validates API key at startup

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env["ANTHROPIC_API_KEY"];
if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY environment variable is required. Set it in your .env or Railway variables.",
  );
}

export const anthropic = new Anthropic({ apiKey });
