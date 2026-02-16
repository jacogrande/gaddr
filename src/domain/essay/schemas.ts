// Essay input validation schemas — Zod at the boundary

import { z } from "zod";

const TipTapMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const TipTapNodeSchema: z.ZodType = z.object({
  type: z.string(),
  text: z.string().optional(),
  content: z.lazy(() => z.array(TipTapNodeSchema)).optional(),
  marks: z.array(TipTapMarkSchema).optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

export const TipTapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(TipTapNodeSchema).optional(),
});

export const CreateEssayInputSchema = z.object({});

export const UpdateEssayInputSchema = z
  .object({
    title: z.string().optional(),
    content: TipTapDocSchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "At least one of title or content must be provided",
  });
