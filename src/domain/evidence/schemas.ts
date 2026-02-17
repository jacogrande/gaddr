// Evidence input validation schemas — Zod at the boundary

import { z } from "zod";
import { STANCES } from "./evidence-card";
import {
  MAX_SOURCE_TITLE_LENGTH,
  MAX_QUOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_CAVEATS_LENGTH,
  MAX_CLAIM_TEXT_LENGTH,
} from "./operations";

export const StanceSchema = z.enum(STANCES);

export const CreateEvidenceCardInputSchema = z
  .object({
    sourceUrl: z.string().regex(/^https?:\/\//, "Must start with http:// or https://"),
    sourceTitle: z.string().min(1, "Required").max(MAX_SOURCE_TITLE_LENGTH),
    quoteSnippet: z.string().max(MAX_QUOTE_LENGTH).nullable().optional(),
    userSummary: z.string().max(MAX_SUMMARY_LENGTH).nullable().optional(),
    caveats: z.string().max(MAX_CAVEATS_LENGTH).nullable().optional(),
    stance: StanceSchema,
  })
  .refine(
    (data) => {
      const hasQuote = data.quoteSnippet !== undefined && data.quoteSnippet !== null && data.quoteSnippet.trim().length > 0;
      const hasSummary = data.userSummary !== undefined && data.userSummary !== null && data.userSummary.trim().length > 0;
      return hasQuote || hasSummary;
    },
    { message: "At least one of quote or summary is required" },
  );

export const UpdateEvidenceCardInputSchema = z
  .object({
    sourceUrl: z.string().regex(/^https?:\/\//, "Must start with http:// or https://").optional(),
    sourceTitle: z.string().min(1, "Required").max(MAX_SOURCE_TITLE_LENGTH).optional(),
    quoteSnippet: z.string().max(MAX_QUOTE_LENGTH).nullable().optional(),
    userSummary: z.string().max(MAX_SUMMARY_LENGTH).nullable().optional(),
    caveats: z.string().max(MAX_CAVEATS_LENGTH).nullable().optional(),
    stance: StanceSchema.optional(),
  })
  .refine(
    (data) =>
      data.sourceUrl !== undefined ||
      data.sourceTitle !== undefined ||
      data.quoteSnippet !== undefined ||
      data.userSummary !== undefined ||
      data.caveats !== undefined ||
      data.stance !== undefined,
    { message: "At least one field must be provided" },
  );

export const AttachEvidenceInputSchema = z.object({
  evidenceCardId: z.uuid(),
  claimText: z.string().min(1).max(MAX_CLAIM_TEXT_LENGTH),
  anchorBlockIndex: z.number().int().nonnegative(),
});
