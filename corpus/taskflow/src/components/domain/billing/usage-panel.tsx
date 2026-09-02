/**
 * All quota meters for the organization.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanLimits } from "@/config/plan-limits";
import { formatDate } from "@/lib/date";
import type { BillingSummary, LimitedResource } from "@/types/billing";
import type { ReactElement } from "react";
import { UsageMeter } from "./usage-meter";

export type UsagePanelProps = { summary: BillingSummary };

/** Human labels for the quota dimensions, in the order the panel shows them. */
export const RESOURCE_LABELS: Readonly<Record<LimitedResource, string>> = {
  seats: "Seats",
  projects: "Projects",
  issuesPerProject: "Issues per project",
  storageMb: "Storage (MB)",
  apiRequestsPerHour: "API requests / hour",
  webhooks: "Webhooks",
};

const RESOURCE_ORDER: readonly LimitedResource[] = [
  "seats",
  "projects",
  "issuesPerProject",
  "storageMb",
  "apiRequestsPerHour",
  "webhooks",
];

export function UsagePanel(props: UsagePanelProps): ReactElement | null {
  const { summary } = props;
  // The subscription says which plan; the plan table says what it includes.
  const limits = getPlanLimits(summary.subscription.plan);

  const byResource = new Map(
    summary.checks.map((check) => [check.resource, check]),
  );

  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Usage on the {limits.plan} plan</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {RESOURCE_ORDER.map((resource) => {
            const check = byResource.get(resource);
            if (check === undefined) return null;
            return (
              <UsageMeter
                key={resource}
                check={check}
                label={RESOURCE_LABELS[resource]}
              />
            );
          })}
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          Data is retained for {limits.retentionDays} days. Current period ends{" "}
          {formatDate(summary.subscription.currentPeriodEnd)}.
        </p>
      </CardContent>
    </Card>
  );
}
