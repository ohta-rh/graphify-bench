import type {
  IsoTimestamp,
  ProjectId,
  SoftDeletable,
  TenantScoped,
  Timestamps,
  UserId,
} from "./common";

export type ProjectVisibility = "private" | "org" | "public";

export type ProjectStatus = "active" | "paused" | "completed";

export interface Project extends Timestamps, TenantScoped, SoftDeletable {
  readonly id: ProjectId;
  readonly name: string;
  readonly slug: string;
  readonly key: string;
  readonly description: string | null;
  readonly visibility: ProjectVisibility;
  readonly status: ProjectStatus;
  readonly leadId: UserId | null;
  readonly color: string;
  readonly startsAt: IsoTimestamp | null;
  readonly targetDate: IsoTimestamp | null;
}

export interface ProjectMemberLink extends TenantScoped {
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly addedAt: IsoTimestamp;
}

export interface ProjectStats {
  readonly projectId: ProjectId;
  readonly openIssues: number;
  readonly closedIssues: number;
  readonly overdueIssues: number;
  readonly lastActivityAt: IsoTimestamp | null;
}

export interface ProjectWithStats {
  readonly project: Project;
  readonly stats: ProjectStats;
}
