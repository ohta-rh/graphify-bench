/**
 * Deterministic factories for actors, orgs, projects, issues and comments used across the suite.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { LimitCheck } from "@/types/billing";
import type { Comment } from "@/types/comment";
import type { Issue } from "@/types/issue";
import type { Actor, MemberWithUser } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";
export function makeActor(overrides?: Partial<Actor>): Actor {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeOrganization(overrides?: Partial<Organization>): Organization {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeProject(overrides?: Partial<Project>): Project {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeIssue(overrides?: Partial<Issue>): Issue {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeComment(overrides?: Partial<Comment>): Comment {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeMember(overrides?: Partial<MemberWithUser>): MemberWithUser {
  throw new Error("stub: tests/helpers/factories.ts");
}

export function makeLimitCheck(overrides?: Partial<LimitCheck>): LimitCheck {
  throw new Error("stub: tests/helpers/factories.ts");
}
