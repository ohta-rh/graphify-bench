/**
 * Recomputes the usage counters that every `LimitCheck` compares against.
 *
 * Must call (do not reimplement): assertOrgScope, subscribe, getPlanLimits
 */
import { getPlanLimits } from "@/config/plan-limits";
import { emit, subscribe } from "@/lib/event-bus";
import { assertOrgScope } from "@/lib/tenant";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { toIsoTimestamp } from "@/types/common";
import type { OrgId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Actor } from "@/types/member";
import type { OrganizationUsage } from "@/types/organization";

/** Fraction of a quota at which the "approaching limit" event fires. */
const WARN_THRESHOLD = 0.9;

export async function getUsage(
  actor: Actor,
  orgId: OrgId,
): Promise<OrganizationUsage> {
  assertOrgScope(actor, orgId);
  return usageRepo.getUsage(orgId);
}

/**
 * Full recount from the source tables. Called by the rollup job and by every
 * event that could have moved a counter — after recounting, the seat and
 * project totals are checked against the plan so a breach surfaces as an
 * event rather than waiting for the next write to be rejected.
 */
export async function recomputeUsage(
  orgId: OrgId,
): Promise<OrganizationUsage> {
  const usage = await usageRepo.recomputeUsage(orgId);
  const org = await orgRepo.findOrgById(orgId);
  if (!org) return usage;

  const limits = getPlanLimits(org.plan);

  if (usage.seatsUsed >= limits.seats * WARN_THRESHOLD) {
    await emit("billing.limit_exceeded", {
      orgId,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date()),
      resource: "seats",
      limit: limits.seats,
      used: usage.seatsUsed,
    });
  }

  if (usage.projectsUsed >= limits.projects * WARN_THRESHOLD) {
    await emit("billing.limit_exceeded", {
      orgId,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date()),
      resource: "projects",
      limit: limits.projects,
      used: usage.projectsUsed,
    });
  }

  return usage;
}

/**
 * Every event that changes a counted resource nudges the cache. The deltas are
 * cheap; the periodic rollup is what corrects any drift they accumulate.
 */
export function registerUsageListeners(): Unsubscribe {
  const offs: Unsubscribe[] = [
    subscribe("issue.created", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, { issuesUsed: 1 });
    }),
    subscribe("issue.archived", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, { issuesUsed: -1 });
    }),
    subscribe("project.created", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, { projectsUsed: 1 });
    }),
    subscribe("project.archived", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, {
        projectsUsed: -1,
        issuesUsed: -payload.issuesArchived,
      });
    }),
    subscribe("member.joined", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, { seatsUsed: 1 });
    }),
    subscribe("member.removed", async (payload) => {
      await usageRepo.incrementUsage(payload.orgId, { seatsUsed: -1 });
    }),
  ];

  return () => {
    for (const off of offs) off();
  };
}
