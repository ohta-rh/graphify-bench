/**
 * Hidden test for UIM3: personal API tokens.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { ZodError } from "zod";
import { hashToken } from "@/lib/hash";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { activityFilterSchema } from "@/schemas/activity";
import * as memberRepo from "@/server/repositories/member-repository";
import { NotFoundError } from "@/server/services/_support";
import * as activityService from "@/server/services/activity-service";
import * as tokenService from "@/server/services/api-token-service";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as memberService from "@/server/services/member-service";
import * as organizationService from "@/server/services/organization-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { ActivityEvent } from "@/types/activity";
import type { UserId } from "@/types/common";
import type { Actor } from "@/types/member";

let cleanup: () => void;
let seq = 0;

const T0 = "2026-03-01T12:00:00.000Z";

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(T0));
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
});

beforeEach(() => {
  vi.setSystemTime(new Date(T0));
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  cleanup();
});

async function tenant(): Promise<Tenant> {
  seq += 1;
  return createTenant(`uim3t${seq}`, "growth");
}

function mint(
  actor: Actor,
  overrides: Partial<{ name: string; scope: "read" | "write"; expiresInDays: number }> = {},
) {
  return tokenService.createApiToken(actor, {
    orgId: actor.orgId,
    name: overrides.name ?? "CI",
    scope: overrides.scope ?? "write",
    expiresInDays: overrides.expiresInDays ?? 30,
  });
}

async function memberIdOf(t: Tenant, userId: UserId) {
  const member = await memberRepo.findMember(t.org.id, userId);
  if (!member) throw new Error("fixture member missing");
  return member.id;
}

async function auditRows(t: Tenant): Promise<ActivityEvent[]> {
  const filter = activityFilterSchema.parse({
    orgId: t.org.id,
    action: ["api_token.created", "api_token.revoked"],
    subjectKind: "api_token",
    limit: 100,
  });
  return [...(await activityService.listActivity(t.actors.admin, filter)).items];
}

describe("UIM3 createApiToken / listApiTokens", () => {
  it("returns the secret once and exposes only metadata afterwards", async () => {
    const t = await tenant();
    const { token, apiToken } = await mint(t.actors.member, { name: "Deploy bot", expiresInDays: 30 });

    expect(token.startsWith("tfk_")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
    expect(apiToken).toMatchObject({
      orgId: t.org.id,
      userId: t.userIds.member,
      name: "Deploy bot",
      scope: "write",
      prefix: token.slice(0, 12),
      expiresAt: "2026-03-31T12:00:00.000Z",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: T0,
    });

    vi.setSystemTime(new Date("2026-03-01T12:00:05.000Z"));
    const second = await mint(t.actors.member, { name: "Laptop", scope: "read" });

    const listed = await tokenService.listApiTokens(t.actors.member, t.org.id);
    expect(listed.map((row) => row.id)).toEqual([second.apiToken.id, apiToken.id]);
    const serialized = JSON.stringify(listed);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(second.token);
    expect(serialized).not.toContain(hashToken(token));

    expect(await tokenService.listApiTokens(t.actors.admin, t.org.id)).toEqual([]);
  });

  it("validates the request with the schema", async () => {
    const t = await tenant();
    await expect(mint(t.actors.member, { expiresInDays: 0 })).rejects.toBeInstanceOf(ZodError);
    await expect(mint(t.actors.member, { expiresInDays: 366 })).rejects.toBeInstanceOf(ZodError);
    await expect(mint(t.actors.member, { expiresInDays: 1.5 })).rejects.toBeInstanceOf(ZodError);
    await expect(mint(t.actors.member, { name: "   " })).rejects.toBeInstanceOf(ZodError);
    await expect(
      mint(t.actors.member, { scope: "admin" as unknown as "read" }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await tokenService.listApiTokens(t.actors.member, t.org.id)).toEqual([]);
  });

  it("scopes to the actor's organization and keeps write tokens from viewers", async () => {
    const t = await tenant();
    const other = await tenant();

    await expect(
      tokenService.createApiToken(t.actors.member, {
        orgId: other.org.id,
        name: "Foreign",
        scope: "read",
        expiresInDays: 10,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      tokenService.listApiTokens(t.actors.member, other.org.id),
    ).rejects.toBeInstanceOf(TenantScopeError);

    await expect(mint(t.actors.viewer, { scope: "write" })).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    const read = await mint(t.actors.viewer, { scope: "read" });
    expect(await tokenService.authenticateApiToken(read.token)).toEqual({
      userId: t.userIds.viewer,
      orgId: t.org.id,
      role: "viewer",
    });
  });

  it("allows five usable tokens per member; revoked and expired ones do not count", async () => {
    const t = await tenant();
    const minted = [];
    for (let i = 0; i < 4; i += 1) minted.push(await mint(t.actors.member, { name: `long ${i}` }));
    const shortLived = await mint(t.actors.member, { name: "short", expiresInDays: 1 });

    await expect(mint(t.actors.member, { name: "sixth" })).rejects.toThrow();
    // Another member of the same organization has their own allowance.
    await mint(t.actors.admin, { name: "admin token" });

    const first = minted[0];
    if (!first) throw new Error("mint failed");
    await tokenService.revokeApiToken(t.actors.member, t.org.id, first.apiToken.id);
    await mint(t.actors.member, { name: "after revoke" });
    await expect(mint(t.actors.member, { name: "over again" })).rejects.toThrow();

    vi.setSystemTime(new Date(shortLived.apiToken.expiresAt));
    await mint(t.actors.member, { name: "after expiry" });
    await expect(mint(t.actors.member, { name: "full again" })).rejects.toThrow();

    expect(await tokenService.listApiTokens(t.actors.member, t.org.id)).toHaveLength(7);
  });
});

describe("UIM3 authenticateApiToken", () => {
  it("caps read tokens at viewer and gives write tokens the member's current role", async () => {
    const t = await tenant();
    const ownerRead = await mint(t.actors.owner, { scope: "read" });
    const memberWrite = await mint(t.actors.member, { scope: "write" });

    expect(await tokenService.authenticateApiToken(ownerRead.token)).toEqual({
      userId: t.userIds.owner,
      orgId: t.org.id,
      role: "viewer",
    });
    expect((await tokenService.authenticateApiToken(memberWrite.token))?.role).toBe("member");

    const memberId = await memberIdOf(t, t.userIds.member);
    await memberService.updateMemberRole(t.actors.owner, { orgId: t.org.id, memberId, role: "viewer" });
    expect((await tokenService.authenticateApiToken(memberWrite.token))?.role).toBe("viewer");

    await memberService.updateMemberRole(t.actors.owner, { orgId: t.org.id, memberId, role: "admin" });
    expect(await tokenService.authenticateApiToken(memberWrite.token)).toEqual({
      userId: t.userIds.member,
      orgId: t.org.id,
      role: "admin",
    });

    expect(await tokenService.authenticateApiToken("tfk_not-a-real-token")).toBeNull();
    expect(await tokenService.authenticateApiToken("")).toBeNull();
  });

  it("stamps lastUsedAt on successful use only", async () => {
    const t = await tenant();
    const used = await mint(t.actors.member, { name: "used" });
    const dead = await mint(t.actors.member, { name: "dead" });
    await tokenService.revokeApiToken(t.actors.member, t.org.id, dead.apiToken.id);

    vi.setSystemTime(new Date("2026-03-02T08:00:00.000Z"));
    expect(await tokenService.authenticateApiToken(used.token)).not.toBeNull();
    expect(await tokenService.authenticateApiToken(dead.token)).toBeNull();

    const rows = await tokenService.listApiTokens(t.actors.member, t.org.id);
    expect(rows.find((row) => row.id === used.apiToken.id)?.lastUsedAt).toBe(
      "2026-03-02T08:00:00.000Z",
    );
    expect(rows.find((row) => row.id === dead.apiToken.id)?.lastUsedAt).toBeNull();
  });

  it("stops working at the exact expiry instant", async () => {
    const t = await tenant();
    const { token, apiToken } = await mint(t.actors.member, { expiresInDays: 1 });
    expect(apiToken.expiresAt).toBe("2026-03-02T12:00:00.000Z");

    vi.setSystemTime(new Date("2026-03-02T11:59:59.999Z"));
    expect(await tokenService.authenticateApiToken(token)).not.toBeNull();

    vi.setSystemTime(new Date("2026-03-02T12:00:00.000Z"));
    expect(await tokenService.authenticateApiToken(token)).toBeNull();
  });

  it("refuses tokens of a deleted organization", async () => {
    const t = await tenant();
    const { token } = await mint(t.actors.owner, { scope: "write" });
    await organizationService.deleteOrganization(t.actors.owner, {
      orgId: t.org.id,
      confirmSlug: t.org.slug,
    });
    expect(await tokenService.authenticateApiToken(token)).toBeNull();
  });
});

describe("UIM3 revokeApiToken and the audit trail", () => {
  it("lets owners of a token or admins revoke it, once", async () => {
    const t = await tenant();
    const other = await tenant();
    const mine = await mint(t.actors.member, { name: "mine" });
    const adminOwned = await mint(t.actors.admin, { name: "admin's" });
    const foreign = await mint(other.actors.member, { name: "foreign" });

    await expect(
      tokenService.revokeApiToken(t.actors.member, t.org.id, adminOwned.apiToken.id),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      tokenService.revokeApiToken(t.actors.admin, t.org.id, foreign.apiToken.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      tokenService.listApiTokens(t.actors.member, t.org.id, t.userIds.admin),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    vi.setSystemTime(new Date("2026-03-03T09:00:00.000Z"));
    const revoked = await tokenService.revokeApiToken(t.actors.admin, t.org.id, mine.apiToken.id);
    expect(revoked.revokedAt).toBe("2026-03-03T09:00:00.000Z");

    vi.setSystemTime(new Date("2026-03-04T09:00:00.000Z"));
    const again = await tokenService.revokeApiToken(t.actors.member, t.org.id, mine.apiToken.id);
    expect(again.revokedAt).toBe("2026-03-03T09:00:00.000Z");

    expect(await tokenService.authenticateApiToken(mine.token)).toBeNull();
    expect(await tokenService.authenticateApiToken(adminOwned.token)).not.toBeNull();
    expect(await tokenService.authenticateApiToken(foreign.token)).not.toBeNull();

    const seenByAdmin = await tokenService.listApiTokens(t.actors.admin, t.org.id, t.userIds.member);
    expect(seenByAdmin.map((row) => [row.id, row.revokedAt])).toEqual([
      [mine.apiToken.id, "2026-03-03T09:00:00.000Z"],
    ]);

    const revocations = (await auditRows(t)).filter((row) => row.action === "api_token.revoked");
    expect(revocations).toHaveLength(1);
    expect(revocations[0]).toMatchObject({
      subjectKind: "api_token",
      subjectId: mine.apiToken.id,
      actorId: t.userIds.admin,
    });
  });

  it("records creation in the audit log without the secret", async () => {
    const t = await tenant();
    const { token, apiToken } = await mint(t.actors.member, { name: "Audit me", scope: "read" });

    const created = (await auditRows(t)).filter((row) => row.action === "api_token.created");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      orgId: t.org.id,
      subjectKind: "api_token",
      subjectId: apiToken.id,
      actorId: t.userIds.member,
    });
    expect(JSON.stringify(created)).not.toContain(token);
    expect(JSON.stringify(created)).not.toContain(hashToken(token));
  });

  it("revokes a removed member's tokens in that organization only", async () => {
    const t = await tenant();
    const elsewhere = await tenant();
    await memberRepo.insertMember(elsewhere.org.id, t.userIds.member, "member", null);
    const elsewhereActor: Actor = { userId: t.userIds.member, orgId: elsewhere.org.id, role: "member" };

    const live = await mint(t.actors.member, { name: "live" });
    const expiring = await mint(t.actors.member, { name: "expiring", expiresInDays: 1 });
    const early = await mint(t.actors.member, { name: "revoked early" });
    const keep = await mint(elsewhereActor, { name: "other org" });
    const adminToken = await mint(t.actors.admin, { name: "admin keeps this" });

    vi.setSystemTime(new Date("2026-03-01T13:00:00.000Z"));
    await tokenService.revokeApiToken(t.actors.member, t.org.id, early.apiToken.id);

    vi.setSystemTime(new Date("2026-03-05T10:00:00.000Z"));
    await memberService.removeMember(t.actors.admin, {
      orgId: t.org.id,
      memberId: await memberIdOf(t, t.userIds.member),
    });

    const rows = await tokenService.listApiTokens(t.actors.admin, t.org.id, t.userIds.member);
    const revokedAt = Object.fromEntries(rows.map((row) => [row.id, row.revokedAt]));
    expect(revokedAt).toEqual({
      [live.apiToken.id]: "2026-03-05T10:00:00.000Z",
      [expiring.apiToken.id]: "2026-03-05T10:00:00.000Z",
      [early.apiToken.id]: "2026-03-01T13:00:00.000Z",
    });

    const cascade = (await auditRows(t)).filter(
      (row) => row.action === "api_token.revoked" && row.actorId === t.userIds.admin,
    );
    expect(cascade.map((row) => row.subjectId).sort()).toEqual(
      [live.apiToken.id, expiring.apiToken.id].sort(),
    );

    expect(await tokenService.authenticateApiToken(live.token)).toBeNull();
    expect(await tokenService.authenticateApiToken(keep.token)).toEqual({
      userId: t.userIds.member,
      orgId: elsewhere.org.id,
      role: "member",
    });
    expect((await tokenService.listApiTokens(elsewhereActor, elsewhere.org.id))[0]?.revokedAt).toBeNull();
    expect(await tokenService.authenticateApiToken(adminToken.token)).not.toBeNull();
  });
});
