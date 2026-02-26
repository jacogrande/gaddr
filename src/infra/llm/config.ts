// Shared LLM configuration — single source of truth for model selection

export const LLM_MODEL = process.env["LLM_MODEL"] ?? "claude-sonnet-4-5-20250929";
export const CLAIM_DETECTOR_MODEL = process.env["CLAIM_DETECTOR_MODEL"] ?? "claude-haiku-4-5-20251001";
export const COACHING_MODEL = process.env["COACHING_MODEL"] ?? "claude-haiku-4-5-20251001";
