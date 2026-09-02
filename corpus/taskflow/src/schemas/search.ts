import { z } from "zod";
import { orgIdSchema, pageRequestSchema, projectIdSchema } from "./common";

export const searchSubjectKindSchema = z.enum(["issue", "comment", "project"]);

export const searchQuerySchema = z
  .object({
    orgId: orgIdSchema,
    q: z.string().min(1, "type something to search").max(200),
    kinds: z.array(searchSubjectKindSchema).default(["issue"]),
    projectId: projectIdSchema.optional(),
  })
  .extend(pageRequestSchema.shape);

export const reindexRequestSchema = z.object({
  orgId: orgIdSchema,
  subjectKind: searchSubjectKindSchema,
  subjectId: z.string().min(1),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ReindexRequestInput = z.infer<typeof reindexRequestSchema>;
