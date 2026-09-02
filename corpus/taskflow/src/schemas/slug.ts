import { z } from "zod";
import {
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_PATTERN,
  isReservedSlug,
} from "@/lib/slug";

/**
 * Slug validation, reusing the predicates from `@/lib/slug` so the form
 * preview, the Server Action and the repository uniqueness check all agree.
 */
export const slugSchema = z
  .string()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, "use lowercase letters, digits and single hyphens")
  .refine((value) => !isReservedSlug(value), {
    message: "that slug is reserved",
  });

export const projectKeySchema = z
  .string()
  .min(2)
  .max(4)
  .regex(/^[A-Z][A-Z0-9]*$/, "use 2-4 uppercase letters or digits");

export type SlugInput = z.infer<typeof slugSchema>;
