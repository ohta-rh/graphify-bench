/**
 * UFX2 — attachment storage: running figure, removals, recount and trial end.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { runTrialExpiryJob } from "@/server/jobs/trial-expiry-job";
import * as attachmentRepo from "@/server/repositories/attachment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as attachmentService from "@/server/services/attachment-service";
import * as billingService from "@/server/services/billing-service";
import * as usageService from "@/server/services/usage-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { PlanId } from "@/types/billing";
import type { AttachmentId, OrgId, ProjectId } from "@/types/common";
import type { Issue, IssueAttachment } from "@/types/issue";
import type { Actor } from "@/types/member";

const MB = 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

/** A workspace with only its owner, so seats and projects stay inside Free. */
async function soloWorkspace(
  slug: string,
  plan: PlanId,
): Promise<{ orgId: OrgId; projectId: ProjectId; owner: Actor }> {
  const user = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, user.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");
  await memberRepo.insertMember(org.id, user.id, "owner", null);
  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: user.id,
    color: "#6366f1",
    targetDate: null,
  });
  return {
    orgId: org.id,
    projectId: project.id,
    owner: { userId: user.id, orgId: org.id, role: "owner" },
  };
}

async function newIssue(orgId: OrgId, projectId: ProjectId, author: Actor, title = "Has files"): Promise<Issue> {
  const number = await issueRepo.nextIssueNumber(orgId, projectId);
  return issueRepo.insertIssue(issueInput(orgId, projectId, { title }), author.userId, number);
}

async function upload(actor: Actor, issue: Issue, sizeBytes: number): Promise<IssueAttachment> {
  return attachmentService.addAttachment(actor, {
    orgId: actor.orgId,
    issueId: issue.id,
    filename: `file-${sizeBytes}.bin`,
    contentType: "application/octet-stream",
    sizeBytes,
  });
}

async function drop(actor: Actor, attachmentId: AttachmentId): Promise<void> {
  await attachmentService.removeAttachment(actor, { orgId: actor.orgId, attachmentId });
}

/** The storage figure shown on the billing page. */
async function billedStorage(owner: Actor): Promise<number> {
  const summary = await billingService.getBillingSummary(owner, owner.orgId);
  const check = summary.checks.find((row) => row.resource === "storageMb");
  if (!check) throw new Error("no storage meter");
  return check.used;
}

describe("UFX2 running storage figure", () => {
  let tenant: Tenant;
  let issue: Issue;

  beforeAll(async () => {
    tenant = await createTenant("ufx2-running", "growth");
    issue = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner);
  });

  it("charges each upload whole megabytes and shows exactly that on the billing page", async () => {
    await upload(tenant.actors.member, issue, Math.round(0.4 * MB));
    await upload(tenant.actors.member, issue, Math.round(2.5 * MB));

    expect(await billedStorage(tenant.actors.owner)).toBe(4);
    const check = await billingService.checkLimit(tenant.org.id, "storageMb", 0);
    expect(check.used).toBe(4);
  });

  it("gives back exactly what a removed file was charged, small files included", async () => {
    const small = await upload(tenant.actors.member, issue, Math.round(0.3 * MB));
    const mid = await upload(tenant.actors.member, issue, Math.round(1.5 * MB));
    expect(await billedStorage(tenant.actors.owner)).toBe(4 + 1 + 2);

    await drop(tenant.actors.member, small.id);
    expect(await billedStorage(tenant.actors.owner)).toBe(4 + 2);

    await drop(tenant.actors.member, mid.id);
    expect(await billedStorage(tenant.actors.owner)).toBe(4);
  });
});

describe("UFX2 upload quota", () => {
  it("accepts an upload that fills the quota exactly and refuses one byte more", async () => {
    const free = await createTenant("ufx2-quota", "free");
    const issue = await newIssue(free.org.id, free.project.id, free.actors.owner);
    for (let i = 0; i < 3; i += 1) await upload(free.actors.member, issue, 25 * MB);
    await upload(free.actors.member, issue, 24 * MB + 1);

    expect(await billedStorage(free.actors.owner)).toBe(100);
    await expect(upload(free.actors.member, issue, 1)).rejects.toThrow();
    expect(await billedStorage(free.actors.owner)).toBe(100);
  });
});

describe("UFX2 recount", () => {
  let big: Tenant;

  beforeAll(async () => {
    big = await createTenant("ufx2-hoarder", "enterprise");
    const issue = await newIssue(big.org.id, big.project.id, big.actors.owner);
    for (let i = 0; i < 8; i += 1) await upload(big.actors.member, issue, 25 * MB);
  });

  it("agrees with the running figure: every file counts rounded up on its own", async () => {
    const tenant = await createTenant("ufx2-recount", "growth");
    const issue = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner);
    await upload(tenant.actors.member, issue, Math.round(0.4 * MB));
    await upload(tenant.actors.member, issue, Math.round(0.4 * MB));
    await upload(tenant.actors.member, issue, Math.round(1.2 * MB));
    expect(await billedStorage(tenant.actors.owner)).toBe(4);

    const usage = await usageService.recomputeUsage(tenant.org.id);

    expect(usage.storageMbUsed).toBe(4);
    expect(await billedStorage(tenant.actors.owner)).toBe(4);
  });

  it("counts only the workspace's own files", async () => {
    const tenant = await createTenant("ufx2-lean", "growth");
    const issue = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner);
    await upload(tenant.actors.member, issue, 3 * MB);

    const usage = await usageService.recomputeUsage(tenant.org.id);

    expect(usage.storageMbUsed).toBe(3);
    expect(await billedStorage(tenant.actors.owner)).toBe(3);
  });

  it("lets a workspace that deleted files downgrade once it fits, whatever others store", async () => {
    const shop = await soloWorkspace("ufx2-shrink", "starter");
    const issue = await newIssue(shop.orgId, shop.projectId, shop.owner);
    const files: IssueAttachment[] = [];
    for (let i = 0; i < 5; i += 1) files.push(await upload(shop.owner, issue, 24 * MB));

    await expect(
      billingService.changePlan(shop.owner, { orgId: shop.orgId, plan: "free", interval: "monthly" }),
    ).rejects.toThrow();

    await drop(shop.owner, files[0]!.id);
    await drop(shop.owner, files[1]!.id);
    await usageService.recomputeUsage(shop.orgId);

    const subscription = await billingService.changePlan(shop.owner, {
      orgId: shop.orgId,
      plan: "free",
      interval: "monthly",
    });
    expect(subscription.plan).toBe("free");
  });
});

describe("UFX2 removing files", () => {
  it("removes a file attached to an archived issue and frees its space", async () => {
    const tenant = await createTenant("ufx2-archived", "growth");
    const issue = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner);
    const file = await upload(tenant.actors.member, issue, Math.round(0.5 * MB));
    await issueRepo.archiveIssue(tenant.org.id, issue.id);
    expect(await billedStorage(tenant.actors.owner)).toBe(1);

    await drop(tenant.actors.admin, file.id);

    expect(await billedStorage(tenant.actors.owner)).toBe(0);
    expect(await attachmentRepo.listAttachments(tenant.org.id, issue.id)).toEqual([]);
  });

  it("removes a file on an old issue of a workspace with many issues", async () => {
    const tenant = await createTenant("ufx2-busy", "growth");
    const oldest = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner, "Oldest issue");
    const file = await upload(tenant.actors.member, oldest, 2 * MB);
    for (let i = 0; i < 105; i += 1) {
      await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner, `Later issue ${i}`);
    }

    await drop(tenant.actors.member, file.id);

    expect(await billedStorage(tenant.actors.owner)).toBe(0);
    expect(await attachmentRepo.listAttachments(tenant.org.id, oldest.id)).toEqual([]);
  });

  it("treats another workspace's file as not found and frees nothing", async () => {
    const mine = await createTenant("ufx2-mine", "growth");
    const theirs = await createTenant("ufx2-theirs", "growth");
    const theirIssue = await newIssue(theirs.org.id, theirs.project.id, theirs.actors.owner);
    const theirFile = await upload(theirs.actors.member, theirIssue, 5 * MB);

    await expect(drop(mine.actors.owner, theirFile.id)).rejects.toMatchObject({ code: "not_found" });

    expect(await billedStorage(theirs.actors.owner)).toBe(5);
    expect(await attachmentRepo.listAttachments(theirs.org.id, theirIssue.id)).toHaveLength(1);
  });

  it("frees a file's space once, even if the removal is repeated", async () => {
    const tenant = await createTenant("ufx2-twice", "growth");
    const issue = await newIssue(tenant.org.id, tenant.project.id, tenant.actors.owner);
    await upload(tenant.actors.member, issue, 2 * MB);
    const file = await upload(tenant.actors.member, issue, Math.round(0.2 * MB));

    await drop(tenant.actors.member, file.id);
    await expect(drop(tenant.actors.member, file.id)).rejects.toMatchObject({ code: "not_found" });

    expect(await billedStorage(tenant.actors.owner)).toBe(2);
  });
});

describe("UFX2 end of trial", () => {
  const afterTrial = (): Date => new Date(Date.now() + 15 * DAY_MS);

  it("keeps a trial workspace that stores more than Free allows on its plan", async () => {
    const shop = await soloWorkspace("ufx2-trial-heavy", "starter");
    const issue = await newIssue(shop.orgId, shop.projectId, shop.owner);
    for (let i = 0; i < 4; i += 1) await upload(shop.owner, issue, 25 * MB);
    await upload(shop.owner, issue, 1);
    await usageService.recomputeUsage(shop.orgId);

    await runTrialExpiryJob(afterTrial());

    const subscription = await subscriptionRepo.findSubscription(shop.orgId);
    expect(subscription?.plan).toBe("starter");
  });

  it("moves a trial workspace at exactly the Free storage limit down to Free, whatever others store", async () => {
    const shop = await soloWorkspace("ufx2-trial-fits", "starter");
    const issue = await newIssue(shop.orgId, shop.projectId, shop.owner);
    for (let i = 0; i < 4; i += 1) await upload(shop.owner, issue, 25 * MB);
    await usageService.recomputeUsage(shop.orgId);

    await runTrialExpiryJob(afterTrial());

    const subscription = await subscriptionRepo.findSubscription(shop.orgId);
    expect(subscription?.plan).toBe("free");
  });
});
