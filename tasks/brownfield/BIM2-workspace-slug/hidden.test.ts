/**
 * BIM2 — renaming a workspace's URL slug.
 *
 * A chosen slug is validated and must be available (refused, never suffixed);
 * the old slug is retired for ORG_SLUG_HOLD_DAYS, resolving everywhere a slug
 * is resolved and unavailable to others; a workspace's own retired slugs are
 * available to it; one event and one audit entry.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ORG_SLUG_HOLD_DAYS } from "@/config/constants";
import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { InvalidSlugError } from "@/lib/slug";
import { TenantScopeError } from "@/lib/tenant";
import { activityFilterSchema } from "@/schemas/activity";
import { runMigrations } from "@/server/db/migrate";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { listActivity, registerActivityListeners } from "@/server/services/activity-service";
import {
  createOrganization,
  getOrganizationSummary,
  listOrganizationsForUser,
  renameOrganizationSlug,
  resolveOrgBySlug,
} from "@/server/services/organization-service";
import { resolveActorForOrg } from "@/server/services/session-service";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, UserId } from "@/types/common";
import type { TaskflowEventMap, Unsubscribe } from "@/types/event";
import type { Actor, SessionPrincipal } from "@/types/member";
import type { Organization } from "@/types/organization";

type Tenant = {
  org: Organization;
  owner: Actor;
  admin: Actor;
  member: Actor;
  ownerId: UserId;
};

const NOW = new Date("2026-06-01T09:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HOLD_MS = ORG_SLUG_HOLD_DAYS * MS_PER_DAY;

let dir: string;
let detachActivity: Unsubscribe;
const detachers: Unsubscribe[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bim2-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  detachActivity = registerActivityListeners();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.useRealTimers();
});

afterAll(() => {
  detachActivity();
  rmSync(dir, { recursive: true, force: true });
});

function at(offsetMs: number): void {
  vi.setSystemTime(new Date(NOW.getTime() + offsetMs));
}

async function makeTenant(slug: string, plan: PlanId = "growth"): Promise<Tenant> {
  const owner = await userRepo.insertUser({ email: `owner@${slug}.test`, name: `${slug} owner`, passwordHash: "seed" });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");
  await memberRepo.insertMember(org.id, owner.id, "owner", null);

  const admin = await userRepo.insertUser({ email: `admin@${slug}.test`, name: `${slug} admin`, passwordHash: "seed" });
  await memberRepo.insertMember(org.id, admin.id, "admin", null);
  const member = await userRepo.insertUser({ email: `member@${slug}.test`, name: `${slug} member`, passwordHash: "seed" });
  await memberRepo.insertMember(org.id, member.id, "member", null);

  return {
    org,
    owner: { userId: owner.id, orgId: org.id, role: "owner" },
    admin: { userId: admin.id, orgId: org.id, role: "admin" },
    member: { userId: member.id, orgId: org.id, role: "member" },
    ownerId: owner.id,
  };
}

function principalOf(tenant: Tenant): SessionPrincipal {
  return {
    userId: tenant.ownerId,
    email: `owner@${tenant.org.slug}.test`,
    activeOrgId: null,
    expiresAt: "2030-01-01T00:00:00.000Z" as IsoTimestamp,
  };
}

async function rename(tenant: Tenant, actor: Actor, slug: string): Promise<Organization> {
  return renameOrganizationSlug(actor, { orgId: tenant.org.id, slug });
}

function captureRenames(): TaskflowEventMap["organization.slug_changed"][] {
  const seen: TaskflowEventMap["organization.slug_changed"][] = [];
  detachers.push(subscribe("organization.slug_changed", (payload) => { seen.push(payload); }));
  return seen;
}

async function currentSlug(tenant: Tenant): Promise<string> {
  const org = await orgRepo.findOrgById(tenant.org.id);
  if (!org) throw new Error("tenant vanished");
  return org.slug;
}

describe("BIM2 renaming a workspace slug", () => {
  it("renames the workspace, publishing and auditing the change once and touching nothing else", async () => {
    const tenant = await makeTenant("bim2-basic");
    const seen = captureRenames();

    const renamed = await rename(tenant, tenant.admin, "bim2-rebranded");

    expect(renamed.id).toBe(tenant.org.id);
    expect(renamed.slug).toBe("bim2-rebranded");
    expect(renamed.name).toBe(tenant.org.name);
    expect(renamed.plan).toBe(tenant.org.plan);
    expect(renamed.settings).toEqual(tenant.org.settings);
    expect(await currentSlug(tenant)).toBe("bim2-rebranded");

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.admin.userId,
      from: "bim2-basic",
      to: "bim2-rebranded",
    });

    const rows = await listActivity(tenant.owner, {
      orgId: tenant.org.id,
      action: ["organization.slug_changed"],
      limit: 25,
      cursor: null,
    });
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]).toMatchObject({
      actorId: tenant.admin.userId,
      subjectKind: "organization",
      subjectId: tenant.org.id,
    });
    expect(rows.items[0]?.metadata).toMatchObject({ from: "bim2-basic", to: "bim2-rebranded" });
    expect(
      activityFilterSchema.safeParse({
        orgId: tenant.org.id,
        action: ["organization.slug_changed"],
        limit: 25,
        cursor: null,
      }).success,
    ).toBe(true);

    const summary = await getOrganizationSummary(tenant.owner, tenant.org.id);
    expect(summary.organization.slug).toBe("bim2-rebranded");
    const listed = await listOrganizationsForUser(tenant.ownerId);
    expect(listed.map((org) => org.slug)).toEqual(["bim2-rebranded"]);
  });

  it("needs the workspace-settings permission and the right workspace", async () => {
    const tenant = await makeTenant("bim2-permission");
    const stranger = await makeTenant("bim2-permission-other");
    const seen = captureRenames();

    await expect(rename(tenant, tenant.member, "bim2-member-try")).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(rename(tenant, stranger.owner, "bim2-stranger-try")).rejects.toBeInstanceOf(TenantScopeError);
    expect(await currentSlug(tenant)).toBe("bim2-permission");
    expect(seen).toHaveLength(0);

    await expect(rename(tenant, tenant.admin, "bim2-admin-ok")).resolves.toMatchObject({ slug: "bim2-admin-ok" });
    await expect(rename(tenant, tenant.owner, "bim2-owner-ok")).resolves.toMatchObject({ slug: "bim2-owner-ok" });
    expect(seen).toHaveLength(2);
  });

  it("refuses a malformed or reserved slug, changing nothing", async () => {
    const tenant = await makeTenant("bim2-invalid");
    const seen = captureRenames();

    await expect(rename(tenant, tenant.owner, "Not Valid")).rejects.toBeInstanceOf(InvalidSlugError);
    await expect(rename(tenant, tenant.owner, "settings")).rejects.toBeInstanceOf(InvalidSlugError);
    await expect(rename(tenant, tenant.owner, "x")).rejects.toBeInstanceOf(InvalidSlugError);

    expect(await currentSlug(tenant)).toBe("bim2-invalid");
    expect(seen).toHaveLength(0);
  });

  it("is a no-op when the slug is unchanged", async () => {
    const tenant = await makeTenant("bim2-noop");
    const seen = captureRenames();

    const result = await rename(tenant, tenant.owner, "bim2-noop");

    expect(result.slug).toBe("bim2-noop");
    expect(seen).toHaveLength(0);
    const rows = await listActivity(tenant.owner, {
      orgId: tenant.org.id,
      action: ["organization.slug_changed"],
      limit: 25,
      cursor: null,
    });
    expect(rows.total).toBe(0);
  });

  it("refuses a slug held by another workspace, live or deleted, rather than suffixing it", async () => {
    const tenant = await makeTenant("bim2-taken");
    const other = await makeTenant("bim2-taken-other");
    const gone = await makeTenant("bim2-taken-gone");
    await orgRepo.archiveOrg(gone.org.id);
    const seen = captureRenames();

    await expect(rename(tenant, tenant.owner, "bim2-taken-other")).rejects.toBeInstanceOf(InvalidSlugError);
    await expect(rename(tenant, tenant.owner, "bim2-taken-gone")).rejects.toBeInstanceOf(InvalidSlugError);

    expect(await currentSlug(tenant)).toBe("bim2-taken");
    expect(await currentSlug(other)).toBe("bim2-taken-other");
    expect(seen).toHaveLength(0);
    expect(await orgRepo.listTakenOrgSlugs("bim2-taken")).toContain("bim2-taken");
  });

  it("keeps the old slug resolving for the hold and releases it exactly when the hold ends", async () => {
    const tenant = await makeTenant("bim2-hold");

    await rename(tenant, tenant.owner, "bim2-hold-new");

    expect((await resolveOrgBySlug("bim2-hold"))?.id).toBe(tenant.org.id);
    expect((await resolveOrgBySlug("bim2-hold-new"))?.id).toBe(tenant.org.id);

    at(HOLD_MS - 1_000);
    expect((await resolveOrgBySlug("bim2-hold"))?.id).toBe(tenant.org.id);

    at(HOLD_MS);
    expect(await resolveOrgBySlug("bim2-hold")).toBeNull();
    expect((await resolveOrgBySlug("bim2-hold-new"))?.id).toBe(tenant.org.id);
  });

  it("resolves a session against the old slug during the hold, and not after", async () => {
    const tenant = await makeTenant("bim2-session");
    const principal = principalOf(tenant);

    await rename(tenant, tenant.owner, "bim2-session-new");

    const viaOld = await resolveActorForOrg(principal, "bim2-session");
    expect(viaOld).toEqual<Actor>({ userId: tenant.ownerId, orgId: tenant.org.id, role: "owner" });
    const viaNew = await resolveActorForOrg(principal, "bim2-session-new");
    expect(viaNew).toMatchObject({ orgId: tenant.org.id, role: "owner" });

    at(HOLD_MS + 1_000);
    expect(await resolveActorForOrg(principal, "bim2-session")).toBeNull();
    expect(await resolveActorForOrg(principal, "bim2-session-new")).toMatchObject({ orgId: tenant.org.id });
  });

  it("keeps every earlier slug of a chain resolving, each for its own hold", async () => {
    const tenant = await makeTenant("bim2-chain-a");

    await rename(tenant, tenant.owner, "bim2-chain-b");
    at(10 * MS_PER_DAY);
    await rename(tenant, tenant.owner, "bim2-chain-c");

    expect((await resolveOrgBySlug("bim2-chain-a"))?.id).toBe(tenant.org.id);
    expect((await resolveOrgBySlug("bim2-chain-b"))?.id).toBe(tenant.org.id);
    expect((await resolveOrgBySlug("bim2-chain-c"))?.id).toBe(tenant.org.id);
    expect(await currentSlug(tenant)).toBe("bim2-chain-c");

    at(HOLD_MS + 1_000);
    expect(await resolveOrgBySlug("bim2-chain-a")).toBeNull();
    expect((await resolveOrgBySlug("bim2-chain-b"))?.id).toBe(tenant.org.id);

    at(10 * MS_PER_DAY + HOLD_MS + 1_000);
    expect(await resolveOrgBySlug("bim2-chain-b")).toBeNull();
    expect((await resolveOrgBySlug("bim2-chain-c"))?.id).toBe(tenant.org.id);
  });

  it("keeps a held slug away from other workspaces until the hold ends", async () => {
    const holder = await makeTenant("bim2-held");
    const other = await makeTenant("bim2-held-other");
    const seen = captureRenames();

    await rename(holder, holder.owner, "bim2-held-new");
    expect(seen).toHaveLength(1);

    await expect(rename(other, other.owner, "bim2-held")).rejects.toBeInstanceOf(InvalidSlugError);
    expect(await currentSlug(other)).toBe("bim2-held-other");
    expect((await resolveOrgBySlug("bim2-held"))?.id).toBe(holder.org.id);
    expect(seen).toHaveLength(1);

    at(HOLD_MS + 1_000);
    const taken = await rename(other, other.owner, "bim2-held");
    expect(taken.slug).toBe("bim2-held");
    expect((await resolveOrgBySlug("bim2-held"))?.id).toBe(other.org.id);
    expect(seen).toHaveLength(2);
  });

  it("lets a workspace take back a slug it retired itself, and retires the one it leaves", async () => {
    const tenant = await makeTenant("bim2-back");
    const principal = principalOf(tenant);

    await rename(tenant, tenant.owner, "bim2-back-tmp");
    const back = await rename(tenant, tenant.owner, "bim2-back");

    expect(back.slug).toBe("bim2-back");
    expect((await resolveOrgBySlug("bim2-back"))?.id).toBe(tenant.org.id);
    expect((await resolveOrgBySlug("bim2-back-tmp"))?.id).toBe(tenant.org.id);
    expect(await resolveActorForOrg(principal, "bim2-back-tmp")).toMatchObject({ orgId: tenant.org.id });

    at(HOLD_MS + 1_000);
    expect(await resolveOrgBySlug("bim2-back-tmp")).toBeNull();
    expect((await resolveOrgBySlug("bim2-back"))?.id).toBe(tenant.org.id);
  });

  it("suffixes a derived slug past a held one at creation, and not once the hold has ended", async () => {
    const tenant = await makeTenant("bim2-derive");
    await rename(tenant, tenant.owner, "bim2-derive-new");
    const newcomer = await userRepo.insertUser({ email: "newcomer@bim2-derive.test", name: "Newcomer", passwordHash: "seed" });

    const during = await createOrganization(newcomer.id, { name: "Derive Inc", slug: "bim2-derive", plan: "free" });
    expect(during.slug).not.toBe("bim2-derive");
    expect(during.slug.startsWith("bim2-derive")).toBe(true);
    expect((await resolveOrgBySlug("bim2-derive"))?.id).toBe(tenant.org.id);

    at(HOLD_MS + 1_000);
    const later = await userRepo.insertUser({ email: "later@bim2-derive.test", name: "Later", passwordHash: "seed" });
    const after = await createOrganization(later.id, { name: "Derive Later", slug: "bim2-derive", plan: "free" });
    expect(after.slug).toBe("bim2-derive");
    expect((await resolveOrgBySlug("bim2-derive"))?.id).toBe(after.id);
  });

  it("never lets a deleted workspace's slug resolve, held or current", async () => {
    const tenant = await makeTenant("bim2-deleted");
    await rename(tenant, tenant.owner, "bim2-deleted-new");
    expect((await resolveOrgBySlug("bim2-deleted"))?.id).toBe(tenant.org.id);

    await orgRepo.archiveOrg(tenant.org.id);

    expect(await resolveOrgBySlug("bim2-deleted")).toBeNull();
    expect(await resolveOrgBySlug("bim2-deleted-new")).toBeNull();
    expect(await resolveActorForOrg(principalOf(tenant), "bim2-deleted")).toBeNull();
  });

  it("applies the hold to the current time of the rename, not of the lookup", async () => {
    const tenant = await makeTenant("bim2-clock");
    at(5 * MS_PER_DAY);
    await rename(tenant, tenant.owner, "bim2-clock-new");

    at(5 * MS_PER_DAY + HOLD_MS - 1_000);
    expect((await resolveOrgBySlug("bim2-clock"))?.id).toBe(tenant.org.id);
    expect(await orgRepo.listTakenOrgSlugs("bim2-clock")).toContain("bim2-clock");

    at(5 * MS_PER_DAY + HOLD_MS + 1_000);
    expect(await resolveOrgBySlug("bim2-clock")).toBeNull();
    expect(await orgRepo.listTakenOrgSlugs("bim2-clock")).not.toContain("bim2-clock");
    expect(await orgRepo.listTakenOrgSlugs("bim2-clock")).toContain("bim2-clock-new");
  });

  it("refuses a slug another workspace retired in the middle of a chain until its own hold ends", async () => {
    const holder = await makeTenant("bim2-mid-a");
    const other = await makeTenant("bim2-mid-other");

    await rename(holder, holder.owner, "bim2-mid-b");
    at(3 * MS_PER_DAY);
    await rename(holder, holder.owner, "bim2-mid-c");

    await expect(rename(other, other.owner, "bim2-mid-b")).rejects.toBeInstanceOf(InvalidSlugError);
    await expect(rename(other, other.owner, "bim2-mid-a")).rejects.toBeInstanceOf(InvalidSlugError);

    at(3 * MS_PER_DAY + HOLD_MS + 1_000);
    const taken = await rename(other, other.owner, "bim2-mid-b");
    expect(taken.slug).toBe("bim2-mid-b");
    expect((await resolveOrgBySlug("bim2-mid-b"))?.id).toBe(other.org.id);
    expect((await resolveOrgBySlug("bim2-mid-c"))?.id).toBe(holder.org.id);
  });

  it("records one audit entry per rename and keeps earlier ones", async () => {
    const tenant = await makeTenant("bim2-audit");
    await rename(tenant, tenant.owner, "bim2-audit-two");
    await rename(tenant, tenant.admin, "bim2-audit-three");

    const rows = await listActivity(tenant.owner, {
      orgId: tenant.org.id,
      action: ["organization.slug_changed"],
      limit: 25,
      cursor: null,
    });
    expect(rows.total).toBe(2);
    const changes = rows.items
      .map((row) => `${String(row.metadata.from)}>${String(row.metadata.to)}`)
      .sort();
    expect(changes).toEqual(["bim2-audit-two>bim2-audit-three", "bim2-audit>bim2-audit-two"]);
  });
});
