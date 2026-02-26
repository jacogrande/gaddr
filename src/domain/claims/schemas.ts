// Claim detection validation schemas — Zod at the boundary

import { z } from "zod";
import { CLAIM_TYPES, type DetectedClaim, type ClaimDetectionResult } from "./claim";

export const DetectedClaimSchema: z.ZodType<DetectedClaim> = z.object({
  quotedText: z.string().min(1),
  claimType: z.enum(CLAIM_TYPES),
  confidence: z.number().min(0).max(1),
});

export const ClaimDetectionResultSchema: z.ZodType<ClaimDetectionResult> = z.object({
  claims: z.array(DetectedClaimSchema),
});

// API input schema — wordCount is computed server-side, not accepted from client
// 800-word essay ≈ 5KB; 10KB is generous headroom to reject abuse
export const ClaimDetectRequestSchema = z.object({
  essayId: z.uuid(),
  essayText: z.string().min(1).max(10_000),
});
