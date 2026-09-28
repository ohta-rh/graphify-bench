/**
 * Hidden test for UFX6-plan-drift: the subscription is the single authority on
 * a workspace's plan, and the trial sweep only touches subscriptions on trial.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { eq } from "drizzle-orm";
import { resetRateLimits } from "@/lib/rate-limit";
import { getDb, subscriptions } from "@/server/db";
import { runTrialExpiryJob } from "@/server/jobs/trial-expiry-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as activityService from "@/server/services/activity-service";
import * as billingService from "@/server/services/billing-service";
import * as commentService from "@/server/services/comment-service";
import * as invitationService from "@/server/services/invitation-service";
import * as organizationService from "@/server/services/organization-service";
import * as projectService from "@/server/services/project-service";
import * as webhookService from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CreateProjectInput } from "@/schemas/project";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { Actor } from "@/types/member";

let cleanup: () => void;
let keySeq = 0;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  vi.useRealTimers();
  cleanup();
});

beforeEach(() => {
  vi.useRealTimers();
  resetRateLimits();
});

function projectInput(orgId: OrgId, name: string): CreateProjectInput {
  keySeq += 1;
  const key = `K${String(keySeq).padStart(3, "0")}`;
  return {
    orgId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key,
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  };
}

async function createProjects(actor: Actor, orgId: OrgId, count: number, prefix: string) {
  for (let i = 0; i < count; i += 1) {
    await projectService.createProject(actor, projectInput(orgId, `${prefix} ${i + 1}`));
  }
}

const EXPORT_WINDOW = {
  since: "2000-01-01T00:00:00.000Z" as IsoTimestamp,
  until: "2100-01-01T00:00:00.000Z" as IsoTimestamp,
};

function exportCsv(actor: Actor, orgId: OrgId) {
  return activityService.exportActivity(actor, { orgId, format: "csv", ...EXPORT_WINDOW });
}

function addWebhook(actor: Actor, orgId: OrgId, n: number) {
  return webhookService.createWebhook(actor, {
    orgId,
    url: `https://hooks.example.com/${orgId}/${n}`,
    eventTypes: ["issue.created"],
  });
}

async function summaryPlan(actor: Actor, orgId: OrgId): Promise<PlanId> {
  return (await organizationService.getOrganizationSummary(actor, orgId)).organization.plan;
}

/** A workspace with only its owner, created through the real sign-up path. */
async function soloWorkspace(slug: string, plan: PlanId): Promise<{ orgId: OrgId; owner: Actor }> {
  const user = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });
  const org = await organizationService.createOrganization(user.id, {
    name: `${slug} inc`,
    slug,
    plan,
  });
  return { orgId: org.id, owner: { userId: user.id, orgId: org.id, role: "owner" } };
}

describe("UFX6 plan follows the subscription", () => {
  it("an upgrade from Free lifts the project quota at once", async () => {
    const t = await createTenant("ufx6-up-projects", "free");
    // The fixture already created one project; Free allows two.
    await createProjects(t.actors.admin, t.org.id, 1, "Second");
    await expect(
      projectService.createProject(t.actors.admin, projectInput(t.org.id, "Third before")),
    ).rejects.toThrow();

    await billingService.changePlan(t.actors.owner, {
      orgId: t.org.id,
      plan: "growth",
      interval: "monthly",
    });

    await expect(
      projectService.createProject(t.actors.admin, projectInput(t.org.id, "Third after")),
    ).resolves.toMatchObject({ orgId: t.org.id });
    expect(await summaryPlan(t.actors.viewer, t.org.id)).toBe("growth");
  });

  it("an upgrade lifts the seat quota for invitations", async () => {
    const t = await createTenant("ufx6-up-seats", "free");
    await usageRepo.recomputeUsage(t.org.id);

    await expect(
      invitationService.inviteMembers(t.actors.admin, {
        orgId: t.org.id,
        invites: [{ email: "early@ufx6.test", role: "member" }],
      }),
    ).rejects.toThrow();

    await billingService.changePlan(t.actors.owner, {
      orgId: t.org.id,
      plan: "starter",
      interval: "monthly",
    });

    const invited = await invitationService.inviteMembers(t.actors.admin, {
      orgId: t.org.id,
      invites: [
        { email: "one@ufx6.test", role: "member" },
        { email: "two@ufx6.test", role: "viewer" },
      ],
    });
    expect(invited).toHaveLength(2);
  });

  it("plan-gated features follow an upgrade", async () => {
    const t = await createTenant("ufx6-up-features", "free");
    await expect(exportCsv(t.actors.admin, t.org.id)).rejects.toThrow();

    await billingService.changePlan(t.actors.owner, {
      orgId: t.org.id,
      plan: "starter",
      interval: "annual",
    });

    await expect(exportCsv(t.actors.admin, t.org.id)).resolves.toEqual(expect.any(String));
  });

  it("a downgrade takes features and quotas away", async () => {
    const t = await createTenant("ufx6-down", "growth");
    await usageRepo.recomputeUsage(t.org.id);
    await addWebhook(t.actors.admin, t.org.id, 1);

    await billingService.changePlan(t.actors.owner, {
      orgId: t.org.id,
      plan: "starter",
      interval: "monthly",
    });

    await expect(addWebhook(t.actors.admin, t.org.id, 2)).rejects.toThrow();
    // Starter still includes the CSV export.
    await expect(exportCsv(t.actors.admin, t.org.id)).resolves.toEqual(expect.any(String));
    const listed = await organizationService.listOrganizationsForUser(t.userIds.member);
    expect(listed.find((org) => org.id === t.org.id)?.plan).toBe("starter");
  });

  it("a refused downgrade changes nothing", async () => {
    const t = await createTenant("ufx6-refused", "growth");
    await usageRepo.recomputeUsage(t.org.id);

    await expect(
      billingService.changePlan(t.actors.owner, {
        orgId: t.org.id,
        plan: "free",
        interval: "monthly",
      }),
    ).rejects.toThrow();

    expect((await subscriptionRepo.findSubscription(t.org.id))?.plan).toBe("growth");
    expect(await summaryPlan(t.actors.owner, t.org.id)).toBe("growth");
    await expect(addWebhook(t.actors.admin, t.org.id, 1)).resolves.toBeDefined();
  });

  it("one workspace's plan change never affects another workspace", async () => {
    const a = await createTenant("ufx6-iso-a", "free");
    const b = await createTenant("ufx6-iso-b", "free");
    await createProjects(b.actors.admin, b.org.id, 1, "B second");

    await billingService.changePlan(a.actors.owner, {
      orgId: a.org.id,
      plan: "growth",
      interval: "monthly",
    });
    await createProjects(a.actors.admin, a.org.id, 3, "A extra");

    await expect(
      projectService.createProject(b.actors.admin, projectInput(b.org.id, "B third")),
    ).rejects.toThrow();
    expect(await summaryPlan(b.actors.owner, b.org.id)).toBe("free");
    await expect(exportCsv(b.actors.admin, b.org.id)).rejects.toThrow();
  });

  it("workspaces whose records already disagree follow their subscription", async () => {
    const t = await createTenant("ufx6-drifted", "free");
    await createProjects(t.actors.admin, t.org.id, 1, "Drift second");
    // The state affected workspaces are already in: the subscription moved on,
    // nothing else did.
    getDb()
      .update(subscriptions)
      .set({ plan: "growth", status: "active" })
      .where(eq(subscriptions.orgId, t.org.id))
      .run();

    await expect(
      projectService.createProject(t.actors.admin, projectInput(t.org.id, "Drift third")),
    ).resolves.toMatchObject({ orgId: t.org.id });
    await expect(exportCsv(t.actors.admin, t.org.id)).resolves.toEqual(expect.any(String));
    await expect(addWebhook(t.actors.admin, t.org.id, 1)).resolves.toBeDefined();
    expect(await summaryPlan(t.actors.member, t.org.id)).toBe("growth");
  });

  it("a workspace without a subscription keeps its own plan", async () => {
    const owner = await userRepo.insertUser({
      email: "owner@ufx6-nosub.test",
      name: "nosub owner",
      passwordHash: "seed",
    });
    const org = await orgRepo.insertOrg(
      { name: "nosub inc", slug: "ufx6-nosub", plan: "starter" },
      owner.id,
    );
    await memberRepo.insertMember(org.id, owner.id, "owner", null);
    const actor: Actor = { userId: owner.id as UserId, orgId: org.id, role: "owner" };

    expect(await summaryPlan(actor, org.id)).toBe("starter");
    await expect(exportCsv(actor, org.id)).resolves.toEqual(expect.any(String));
  });
});

describe("UFX6 burst limits follow the plan", () => {
  const FROZEN = new Date("2026-04-01T12:00:00.000Z");

  async function burstComments(t: Tenant, count: number): Promise<number> {
    const number = await issueRepo.nextIssueNumber(t.org.id, t.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(t.org.id, t.project.id, { title: `Burst target ${t.org.slug}` }),
      t.userIds.owner,
      number,
    );
    let posted = 0;
    for (let i = 0; i < count; i += 1) {
      try {
        await commentService.createComment(t.actors.member, {
          orgId: t.org.id,
          issueId: issue.id,
          body: `burst ${i}`,
          parentId: null,
          mentionedUserIds: [],
        });
        posted += 1;
      } catch {
        break;
      }
    }
    return posted;
  }

  it("an upgraded workspace is no longer throttled like a Free one", async () => {
    const t = await createTenant("ufx6-burst-up", "free");
    await billingService.changePlan(t.actors.owner, {
      orgId: t.org.id,
      plan: "growth",
      interval: "monthly",
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN);
    expect(await burstComments(t, 75)).toBe(75);
  });

  it("a Free workspace keeps the Free burst limit, whatever other workspaces pay", async () => {
    const paying = await createTenant("ufx6-burst-paying", "free");
    const free = await createTenant("ufx6-burst-free", "free");
    await billingService.changePlan(paying.actors.owner, {
      orgId: paying.org.id,
      plan: "enterprise",
      interval: "monthly",
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN);
    expect(await burstComments(paying, 70)).toBe(70);
    expect(await burstComments(free, 70)).toBe(60);
  });
});

describe("UFX6 trial expiry", () => {
  const TRIAL_START = new Date("2020-01-01T10:00:00.000Z");
  const AFTER_TRIAL = new Date("2020-02-01T10:00:00.000Z");

  it("an expired trial loses its trial plan's limits and features", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TRIAL_START);
    const w = await soloWorkspace("ufx6-trial-down", "growth");
    await createProjects(w.owner, w.orgId, 2, "Trial");
    await usageRepo.recomputeUsage(w.orgId);
    vi.useRealTimers();

    await expect(exportCsv(w.owner, w.orgId)).resolves.toEqual(expect.any(String));

    await runTrialExpiryJob(AFTER_TRIAL);

    expect((await subscriptionRepo.findSubscription(w.orgId))?.plan).toBe("free");
    expect(await summaryPlan(w.owner, w.orgId)).toBe("free");
    await expect(
      projectService.createProject(w.owner, projectInput(w.orgId, "Past trial")),
    ).rejects.toThrow();
    await expect(exportCsv(w.owner, w.orgId)).rejects.toThrow();
  });

  it("a workspace that chose a plan during its trial keeps it after the trial window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TRIAL_START);
    const w = await soloWorkspace("ufx6-trial-chose", "growth");
    await usageRepo.recomputeUsage(w.orgId);
    vi.setSystemTime(new Date("2020-01-05T10:00:00.000Z"));
    await billingService.changePlan(w.owner, {
      orgId: w.orgId,
      plan: "starter",
      interval: "monthly",
    });
    vi.useRealTimers();

    await runTrialExpiryJob(AFTER_TRIAL);

    const subscription = await subscriptionRepo.findSubscription(w.orgId);
    expect(subscription?.plan).toBe("starter");
    expect(await summaryPlan(w.owner, w.orgId)).toBe("starter");
    await createProjects(w.owner, w.orgId, 3, "Chosen");
    await expect(exportCsv(w.owner, w.orgId)).resolves.toEqual(expect.any(String));
  });

  it("a trial that outgrew the Free limits is left on its plan", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TRIAL_START);
    const w = await soloWorkspace("ufx6-trial-big", "growth");
    await createProjects(w.owner, w.orgId, 3, "Big");
    await usageRepo.recomputeUsage(w.orgId);
    vi.useRealTimers();

    await runTrialExpiryJob(AFTER_TRIAL);

    expect((await subscriptionRepo.findSubscription(w.orgId))?.plan).toBe("growth");
    expect(await summaryPlan(w.owner, w.orgId)).toBe("growth");
    await expect(exportCsv(w.owner, w.orgId)).resolves.toEqual(expect.any(String));
  });

  it("running the sweep again changes nothing more", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TRIAL_START);
    const w = await soloWorkspace("ufx6-trial-twice", "growth");
    await usageRepo.recomputeUsage(w.orgId);
    vi.useRealTimers();

    await runTrialExpiryJob(AFTER_TRIAL);
    const first = await subscriptionRepo.findSubscription(w.orgId);
    const again = await runTrialExpiryJob(new Date("2020-03-01T10:00:00.000Z"));

    expect(first?.plan).toBe("free");
    expect(again.processed).toBe(0);
    expect(await summaryPlan(w.owner, w.orgId)).toBe("free");
  });
});
