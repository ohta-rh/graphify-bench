import { z } from "zod";

/**
 * Coercions for reading pagination out of `searchParams`. Remember that in
 * Next 16 `searchParams` is a Promise — `await` it before parsing.
 */
export const searchParamsPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  perPage: z.coerce.number().int().min(1).max(100).catch(25),
  cursor: z.string().optional(),
});

export const searchParamsSortSchema = z.object({
  sort: z.string().max(40).optional(),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});

export function toOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export type SearchParamsPagination = z.infer<
  typeof searchParamsPaginationSchema
>;
export type SearchParamsSort = z.infer<typeof searchParamsSortSchema>;
