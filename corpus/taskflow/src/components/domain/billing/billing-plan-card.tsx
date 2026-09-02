/**
 * One plan tile rendering quotas straight from `PlanLimits`.
 *
 * Must call (do not reimplement): getPlanLimits, can
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanLimits, type PlanLimits } from "@/config/plan-limits";
import { FEATURE_FLAG_DEFINITIONS } from "@/config/feature-flags";
import { formatCents, formatLimit } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { PlanId } from "@/types/billing";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
import { billingResource } from "../permission/resources";

export type BillingPlanCardProps = {
  plan: PlanId;
  limits: PlanLimits;
  current: boolean;
  actor: Actor;
  onSelect: (plan: PlanId) => void;
};

export function BillingPlanCard(
  props: BillingPlanCardProps,
): ReactElement | null {
  const { plan, limits, current, actor, onSelect } = props;

  // The caller passes the limits it already has; re-reading the canonical row
  // keeps a stale prop from advertising a quota that no longer exists.
  const canonical = getPlanLimits(plan);
  const effective = canonical.plan === limits.plan ? limits : canonical;

  // Changing plans is an owner-only action; everyone else sees the tile
  // read-only rather than a button that would be refused.
  const mayChangePlan = can(actor, "org:manage_billing", billingResource(actor.orgId));

  return (
    <Card padded className={current ? "ring-2 ring-indigo-500" : undefined}>
      <CardHeader>
        <CardTitle>{plan}</CardTitle>
        {current ? (
          <Badge tone="brand" size="sm">
            Current
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        <p className="text-lg font-semibold">
          {formatCents(effective.priceCentsPerSeatMonthly)}
          <span className="text-sm font-normal text-neutral-500">
            {" "}
            / seat / month
          </span>
        </p>

        <ul className="mt-2 space-y-1 text-sm">
          <li>{formatLimit(effective.seats)} seats</li>
          <li>{formatLimit(effective.projects)} projects</li>
          <li>{formatLimit(effective.issuesPerProject)} issues per project</li>
          <li>{formatLimit(effective.storageMb)} MB storage</li>
          <li>{formatLimit(effective.webhooks)} webhooks</li>
          <li>{effective.retentionDays} days of history</li>
        </ul>

        {effective.includedFlags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {effective.includedFlags.map((flag) => (
              <Badge key={flag} tone="neutral" size="sm">
                {FEATURE_FLAG_DEFINITIONS[flag].label}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button
          variant={current ? "secondary" : "primary"}
          disabled={current || !mayChangePlan}
          onClick={() => onSelect(plan)}
        >
          {current ? "Current plan" : `Switch to ${plan}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
