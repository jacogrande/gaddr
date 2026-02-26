// Coaching validation schemas — Zod at the boundary

import { z } from "zod";
import { COACHING_CATEGORIES, type CoachingNote, type CoachingResult } from "./coaching";
import { DetectedClaimSchema } from "../claims/schemas";

export const CoachingNoteSchema: z.ZodType<CoachingNote> = z.object({
  claimQuotedText: z.string().min(1),
  note: z.string().min(1),
  category: z.enum(COACHING_CATEGORIES),
});

export const CoachingResultSchema: z.ZodType<CoachingResult> = z.object({
  notes: z.array(CoachingNoteSchema),
});

// API input schema
// 800-word essay ≈ 5KB; 10KB is generous headroom to reject abuse
export const CoachingRequestApiSchema = z.object({
  essayId: z.uuid(),
  essayText: z.string().min(1).max(10_000),
  claims: z.array(DetectedClaimSchema),
});
