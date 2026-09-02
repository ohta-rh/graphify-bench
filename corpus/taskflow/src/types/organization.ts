import type {
  IsoTimestamp,
  OrgId,
  SoftDeletable,
  Timestamps,
  UserId,
} from "./common";
import type { PlanId } from "./billing";

export interface Organization extends Timestamps, SoftDeletable {
  readonly id: OrgId;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: UserId;
  readonly plan: PlanId;
  readonly logoUrl: string | null;
  readonly trialEndsAt: IsoTimestamp | null;
  readonly settings: OrganizationSettings;
}

export interface OrganizationSettings {
  readonly defaultIssueStatus: string;
  readonly allowPublicProjects: boolean;
  readonly requireTwoFactor: boolean;
  readonly digestHourUtc: number;
  readonly enabledFlagOverrides: readonly string[];
}

/** Aggregate counters shown on the org dashboard and used by limit checks. */
export interface OrganizationUsage {
  readonly orgId: OrgId;
  readonly seatsUsed: number;
  readonly projectsUsed: number;
  readonly issuesUsed: number;
  readonly storageMbUsed: number;
  readonly measuredAt: IsoTimestamp;
}

/** Org record decorated with the caller's own membership, for the shell UI. */
export interface OrganizationSummary {
  readonly organization: Organization;
  readonly usage: OrganizationUsage;
  readonly memberCount: number;
  readonly projectCount: number;
}
