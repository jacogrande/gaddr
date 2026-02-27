export const LLM_MODEL = process.env["LLM_MODEL"] ?? "claude-sonnet-4-5-20250929";
export const CLAIM_DETECTOR_MODEL = process.env["CLAIM_DETECTOR_MODEL"] ?? "claude-haiku-4-5-20251001";

const gadflyModelFromLegacyEnv = process.env["COACHING_MODEL"];
export const GADFLY_MODEL = process.env["GADFLY_MODEL"] ?? gadflyModelFromLegacyEnv ?? "claude-haiku-4-5-20251001";
