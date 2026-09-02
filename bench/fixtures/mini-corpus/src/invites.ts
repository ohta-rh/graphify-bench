import { limitsFor, type PlanTier } from "./limits.js";

export interface Org {
  id: string;
  tier: PlanTier;
  seatsUsed: number;
}

export class SeatLimitError extends Error {}

/**
 * Refuses an invitation once the organization has consumed every seat its plan
 * allows. This is the seat-cap enforcement point.
 */
export function inviteMember(org: Org, email: string): { orgId: string; email: string } {
  const limits = limitsFor(org.tier);
  if (org.seatsUsed >= limits.maxSeats) {
    throw new SeatLimitError(`organization ${org.id} has no seats left on the ${org.tier} plan`);
  }
  return { orgId: org.id, email };
}
