/**
 * Deterministic factories for actors, orgs, projects, issues and comments
 * used across the suite.
 *
 * Every factory seeds from the same `idFactory`, so a test that does not care
 * about ids gets stable ones, and a test that does can override them. All
 * default rows live in `ORG_A` — cross-tenant tests pass `orgId: ORG_B`.
 */
import { idFactory } from "@/lib/id";
import type { LimitCheck } from "@/types/billing";
import type { Comment } from "@/types/comment";
import type {
  CommentId,
  IsoTimestamp,
  IssueId,
  MemberId,
  OrgId,
  ProjectId,
  UserId,
} from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Actor, MemberWithUser, User } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const nextId = idFactory(42);

/** The default tenant every factory row belongs to. */
export const ORG_A = "01HZZZAAAAAAAAAAAAAAAAAAAA" as OrgId;
/** A second tenant, for cross-tenant assertions. */
export const ORG_B = "01HZZZBBBBBBBBBBBBBBBBBBBB" as OrgId;

export const ALICE = "01HZZZAAAAAAAAAAAAAAAAAAA1" as UserId;
export const BOB = "01HZZZBBBBBBBBBBBBBBBBBBB2" as UserId;

const EPOCH = "2026-03-01T09:00:00.000Z" as IsoTimestamp;

export function makeActor(overrides: Partial<Actor> = {}): Actor {
  return { userId: ALICE, orgId: ORG_A, role: "member", ...overrides };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: ALICE,
    email: "alice@example.com",
    name: "Alice Alvarez",
    avatarUrl: null,
    timezone: "UTC",
    emailVerifiedAt: EPOCH,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

export function makeOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    id: ORG_A,
    name: "Acme",
    slug: "acme",
    ownerId: ALICE,
    plan: "free",
    logoUrl: null,
    trialEndsAt: null,
    archivedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    settings: {
      defaultIssueStatus: "backlog",
      allowPublicProjects: false,
      requireTwoFactor: false,
      digestHourUtc: 8,
      enabledFlagOverrides: [],
    },
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: nextId() as ProjectId,
    orgId: ORG_A,
    name: "Website relaunch",
    slug: "website-relaunch",
    key: "WEB",
    description: null,
    visibility: "org",
    status: "active",
    leadId: ALICE,
    color: "#6366f1",
    startsAt: null,
    targetDate: null,
    archivedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: nextId() as IssueId,
    orgId: ORG_A,
    projectId: "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId,
    number: 1,
    title: "Fix the broken sign-up link",
    description: null,
    status: "todo",
    priority: "medium",
    authorId: ALICE,
    assigneeId: null,
    parentId: null,
    estimate: null,
    dueAt: null,
    startedAt: null,
    completedAt: null,
    labelIds: [],
    archivedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: nextId() as CommentId,
    orgId: ORG_A,
    issueId: "01HZZZSSSSSSSSSSSSSSSSSSSS" as IssueId,
    authorId: ALICE,
    body: "Looking at this now.",
    parentId: null,
    editedAt: null,
    mentionedUserIds: [],
    archivedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

export function makeMember(
  overrides: Partial<MemberWithUser> = {},
): MemberWithUser {
  const user = overrides.user ?? makeUser();
  return {
    id: nextId() as MemberId,
    orgId: ORG_A,
    userId: user.id,
    role: "member",
    status: "active",
    invitedBy: null,
    joinedAt: EPOCH,
    lastSeenAt: EPOCH,
    archivedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
    user,
  };
}

export function makeLimitCheck(overrides: Partial<LimitCheck> = {}): LimitCheck {
  const limit = overrides.limit ?? 3;
  const used = overrides.used ?? 1;
  return {
    resource: "seats",
    plan: "free",
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exceeded: used >= limit,
    ...overrides,
  };
}
