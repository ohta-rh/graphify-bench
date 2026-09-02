import { limitsFor, type PlanTier } from "./limits.js";

export interface ProjectInput {
  orgId: string;
  tier: PlanTier;
  existingProjects: number;
  name: string;
}

export function createProject(input: ProjectInput): { orgId: string; name: string } {
  const limits = limitsFor(input.tier);
  if (input.existingProjects >= limits.maxProjects) {
    throw new Error(`project limit reached for ${input.orgId}`);
  }
  return { orgId: input.orgId, name: input.name };
}
