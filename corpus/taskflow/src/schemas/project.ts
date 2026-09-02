import { z } from "zod";
import {
  archiveScopeSchema,
  hexColorSchema,
  isoTimestampSchema,
  orgIdSchema,
  pageRequestSchema,
  projectIdSchema,
  userIdSchema,
} from "./common";
import { projectKeySchema, slugSchema } from "./slug";

export const projectVisibilitySchema = z.enum(["private", "org", "public"]);
export const projectStatusSchema = z.enum(["active", "paused", "completed"]);

export const createProjectSchema = z.object({
  orgId: orgIdSchema,
  name: z.string().min(2).max(80),
  slug: slugSchema,
  key: projectKeySchema,
  description: z.string().max(2_000).nullable().default(null),
  visibility: projectVisibilitySchema.default("org"),
  leadId: userIdSchema.nullable().default(null),
  color: hexColorSchema.default("#6366f1"),
  targetDate: isoTimestampSchema.nullable().default(null),
});

export const updateProjectSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema,
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2_000).nullable().optional(),
  visibility: projectVisibilitySchema.optional(),
  status: projectStatusSchema.optional(),
  leadId: userIdSchema.nullable().optional(),
  color: hexColorSchema.optional(),
  targetDate: isoTimestampSchema.nullable().optional(),
});

export const archiveProjectSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema,
  archiveIssues: z.boolean().default(true),
});

export const listProjectsSchema = z
  .object({
    orgId: orgIdSchema,
    status: projectStatusSchema.optional(),
    query: z.string().max(200).optional(),
  })
  .extend(pageRequestSchema.shape)
  .extend(archiveScopeSchema.shape);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ArchiveProjectInput = z.infer<typeof archiveProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
