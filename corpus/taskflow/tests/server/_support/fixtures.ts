/**
 * Fixtures for the server suite: a throwaway SQLite file plus a helper that
 * builds one fully-populated tenant (org, four members, a project) through the
 * real repositories, so the rows under test are the rows production writes.
 *
 * Kept apart from `tests/helpers/*` — those belong to another owner.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigrations } from "@/server/db/migrate";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import type { PlanId } from "@/types/billing";
import type { OrgId, UserId } from "@/types/common";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

export interface Tenant {
  readonly org: Organization;
  readonly project: Project;
  readonly actors: Readonly<Record<Role, Actor>>;
  readonly userIds: Readonly<Record<Role, UserId>>;
}

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

/**
 * Points the connection at a fresh database file and migrates it. Call from
 * `beforeAll`; the returned function removes the directory again.
 *
 * A file rather than `:memory:` because `runMigrations` and the app client
 * open separate connections, and only a file is shared between the two.
 */
export async function useTemporaryDatabase(): Promise<() => void> {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-test-"));
  const path = join(dir, "taskflow.db");

  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);

  return () => {
    rmSync(dir, { recursive: true, force: true });
  };
}

/**
 * Creates one organization with a member in every role and a single project.
 * `plan` decides which quotas apply — the free plan's three seats is what the
 * invite-limit test leans on.
 */
export async function createTenant(
  slug: string,
  plan: PlanId = "growth",
): Promise<Tenant> {
  const owner = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });

  const org = await orgRepo.insertOrg(
    { name: `${slug} inc`, slug, plan },
    owner.id,
  );

  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");

  const userIds: Partial<Record<Role, UserId>> = {};
  const actors: Partial<Record<Role, Actor>> = {};

  for (const role of ROLES) {
    const user =
      role === "owner"
        ? owner
        : await userRepo.insertUser({
            email: `${role}@${slug}.test`,
            name: `${slug} ${role}`,
            passwordHash: "seed",
          });

    await memberRepo.insertMember(org.id, user.id, role, null);

    userIds[role] = user.id;
    actors[role] = { userId: user.id, orgId: org.id, role };
  }

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: owner.id,
    color: "#6366f1",
    targetDate: null,
  });

  return {
    org,
    project,
    actors: actors as Readonly<Record<Role, Actor>>,
    userIds: userIds as Readonly<Record<Role, UserId>>,
  };
}

/** Minimal `CreateIssueInput` with the schema's defaults already applied. */
export function issueInput(
  orgId: OrgId,
  projectId: Project["id"],
  overrides: Partial<{
    title: string;
    assigneeId: UserId | null;
    dueAt: string | null;
  }> = {},
) {
  return {
    orgId,
    projectId,
    title: overrides.title ?? "Ship the thing",
    description: null,
    status: "backlog" as const,
    priority: "none" as const,
    assigneeId: (overrides.assigneeId ?? null) as UserId | null,
    parentId: null,
    estimate: null,
    dueAt: (overrides.dueAt ?? null) as never,
    labelIds: [],
  };
}
