/**
 * Upgrade prompt shown when seats are exhausted.
 *
 * Must call (do not reimplement): can
 */
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { formatCount, formatLimit } from "@/lib/format";
import { can } from "@/lib/permissions";
import { settingsPath } from "@/lib/url";
import type { LimitCheck } from "@/types/billing";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
import { billingResource } from "../permission/resources";

export type SeatLimitBannerProps = {
  check: LimitCheck;
  orgSlug: string;
  actor: Actor;
};

export function SeatLimitBanner(
  props: SeatLimitBannerProps,
): ReactElement | null {
  const { check, orgSlug, actor } = props;

  // Nothing to say until the org is actually at the wall.
  if (check.resource !== "seats" || !check.exceeded) return null;

  // Only the actor who could actually pay is offered the upgrade link.
  const mayUpgrade = can(actor, "org:manage_billing", billingResource(actor.orgId));

  return (
    <Alert tone="warning" title="All seats are in use">
      The {check.plan} plan includes {formatLimit(check.limit)} seats and{" "}
      {formatCount(check.used)} are taken, so new invitations will be refused.
      {mayUpgrade ? (
        <>
          {" "}
          <Link
            href={settingsPath(orgSlug, "billing")}
            className="font-medium underline"
          >
            Upgrade the plan
          </Link>{" "}
          to add more.
        </>
      ) : (
        " Ask an owner to upgrade the plan."
      )}
    </Alert>
  );
}
