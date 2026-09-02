/**
 * Current usage and limit checks for one organization.
 *
 * Owner D. Returns the raw counters *and* the plan ceilings side by side, so a
 * dashboard can render a meter without knowing the plan table itself.
 *
 * Must call (do not reimplement): can, assertOrgScope, getPlanLimits
 */

import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getPlanLimits } from "@/config/plan-limits";
import { requireActorFor } from "@/lib/actor";
import { can } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import { orgIdSchema } from "@/schemas/common";
import { checkLimit } from "@/server/services/billing-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { getUsage } from "@/server/services/usage-service";
import type { LimitedResource } from "@/types/billing";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orgId: string }> };

const REPORTED: readonly LimitedResource[] = [
  "seats",
  "projects",
  "storageMb",
  "webhooks",
];

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  void request;

  try {
    // Next.js 16: route `params` is a Promise and MUST be awaited.
    const { orgId } = await context.params;
    const parsed = orgIdSchema.safeParse(orgId);
    if (!parsed.success) {
      return failure("validation_failed", "Malformed organization id.");
    }

    const actor = await requireActorFor(parsed.data);
    assertOrgScope(actor, parsed.data);

    if (!can(actor, "org:read", { kind: "organization", orgId: parsed.data })) {
      return failure("forbidden", "You cannot read this organization.");
    }

    const [{ organization }, usage] = await Promise.all([
      getOrganizationSummary(actor, parsed.data),
      getUsage(actor, parsed.data),
    ]);

    const limits = getPlanLimits(organization.plan);
    const checks = await Promise.all(
      REPORTED.map((resource) => checkLimit(parsed.data, resource, 0)),
    );

    return Response.json({ plan: organization.plan, limits, usage, checks });
  } catch (error) {
    return errorResponse(error);
  }
}
