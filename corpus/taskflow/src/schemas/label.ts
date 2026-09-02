import { z } from "zod";
import { hexColorSchema, labelIdSchema, orgIdSchema } from "./common";

export const createLabelSchema = z.object({
  orgId: orgIdSchema,
  name: z.string().min(1).max(40),
  color: hexColorSchema.default("#94a3b8"),
  description: z.string().max(200).nullable().default(null),
});

export const updateLabelSchema = z.object({
  orgId: orgIdSchema,
  labelId: labelIdSchema,
  name: z.string().min(1).max(40).optional(),
  color: hexColorSchema.optional(),
  description: z.string().max(200).nullable().optional(),
});

export const deleteLabelSchema = z.object({
  orgId: orgIdSchema,
  labelId: labelIdSchema,
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
