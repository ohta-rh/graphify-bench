/**
 * Side-by-side quota table for all four plans.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { getPlanLimits } from "@/config/plan-limits";
import { formatCents, formatLimit } from "@/lib/format";
import { PLAN_IDS, type LimitedResource, type PlanId } from "@/types/billing";
import type { ReactElement } from "react";
import { RESOURCE_LABELS } from "./usage-panel";

export type PlanComparisonTableProps = {
  currentPlan: PlanId;
  onSelect: (plan: PlanId) => void;
};

const ROWS: readonly LimitedResource[] = [
  "seats",
  "projects",
  "issuesPerProject",
  "storageMb",
  "apiRequestsPerHour",
  "webhooks",
];

export function PlanComparisonTable(
  props: PlanComparisonTableProps,
): ReactElement | null {
  const { currentPlan, onSelect } = props;
  // Every number below comes from the plan table — the marketing page and the
  // billing settings page cannot disagree because neither one owns a literal.
  const plans = PLAN_IDS.map((plan) => getPlanLimits(plan));

  return (
    <Table caption="Plan comparison">
      <TableHead>
        <TableRow>
          <TableHeaderCell></TableHeaderCell>
          {plans.map((limits) => (
            <TableHeaderCell key={limits.plan}>
              {limits.plan}
              {limits.plan === currentPlan ? (
                <Badge tone="brand" size="sm">
                  Current
                </Badge>
              ) : null}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        <TableRow>
          <TableCell>Price per seat</TableCell>
          {plans.map((limits) => (
            <TableCell key={limits.plan}>
              {formatCents(limits.priceCentsPerSeatMonthly)}
            </TableCell>
          ))}
        </TableRow>

        {ROWS.map((resource) => (
          <TableRow key={resource}>
            <TableCell>{RESOURCE_LABELS[resource]}</TableCell>
            {plans.map((limits) => (
              <TableCell key={limits.plan}>
                {formatLimit(limits[resource])}
              </TableCell>
            ))}
          </TableRow>
        ))}

        <TableRow>
          <TableCell>History retained</TableCell>
          {plans.map((limits) => (
            <TableCell key={limits.plan}>{limits.retentionDays} days</TableCell>
          ))}
        </TableRow>

        <TableRow>
          <TableCell></TableCell>
          {plans.map((limits) => (
            <TableCell key={limits.plan}>
              <Button
                variant={limits.plan === currentPlan ? "secondary" : "primary"}
                size="sm"
                disabled={limits.plan === currentPlan}
                onClick={() => onSelect(limits.plan)}
              >
                {limits.plan === currentPlan ? "Current" : "Choose"}
              </Button>
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  );
}
