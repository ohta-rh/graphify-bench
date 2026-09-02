export type PlanTier = "free" | "team";

export interface PlanLimits {
  maxSeats: number;
  maxProjects: number;
}

const LIMITS: Record<PlanTier, PlanLimits> = {
  free: { maxSeats: 3, maxProjects: 2 },
  team: { maxSeats: 25, maxProjects: 50 },
};

export function limitsFor(tier: PlanTier): PlanLimits {
  return LIMITS[tier];
}
