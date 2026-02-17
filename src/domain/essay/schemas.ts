// Essay input validation schemas — Zod at the boundary

import { z } from "zod";
import type { TipTapDoc, TipTapNode } from "./essay";

const TipTapMarkSchema: z.ZodType<NonNullable<TipTapNode["marks"]>[number]> =
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  });

const TipTapNodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    text: z.string().optional(),
    content: z.array(TipTapNodeSchema).optional(),
    marks: z.array(TipTapMarkSchema).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  }),
);

export const TipTapDocSchema: z.ZodType<TipTapDoc> = z.object({
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
