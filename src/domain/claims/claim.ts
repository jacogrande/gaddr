// Domain claim types — pure types, no framework imports

export const CLAIM_TYPES = ["factual", "causal", "evaluative", "definitional"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export type DetectedClaim = {
  readonly quotedText: string;
  readonly claimType: ClaimType;
  readonly confidence: number; // 0.0–1.0
};

export type ClaimDetectionResult = {
  readonly claims: readonly DetectedClaim[];
};
