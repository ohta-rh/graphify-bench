/**
 * HFX1 — switching a webhook endpoint off.
 *
 * Switching off must persist (and switching back on must too), stop new
 * events being queued for the endpoint, fail deliveries that were already
 * queued for it, and leave the endpoint counted against the plan allowance.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { eq } from "drizzle-orm";
import { getDb, webhookDeliveries } from "@/server/db";
import { runWebhookDeliveryJob } from "@/server/jobs/webhook-delivery-job";
import * as issueService from "@/server/services/issue-service";
import * as webhookService from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";
import type { WebhookId } from "@/types/common";

let cleanup: () => void;
let detach: Unsubscribe;

const NOW = new Date("2026-06-01T12:00:00.000Z");

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  detach = webhookService.registerWebhookListeners();
});

afterAll(() => {
  detach();
  cleanup();
});

function deliveriesFor(endpointId: string) {
  return getDb()
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.endpointId, endpointId))
    .all();
}

async function createEndpoint(tenant: Tenant, n: number) {
  return webhookService.createWebhook(tenant.actors.admin, {
    orgId: tenant.org.id,
    url: `https://hooks.example.com/${tenant.org.slug}/${n}`,
    eventTypes: ["issue.created"],
  });
}

async function switchEndpoint(tenant: Tenant, webhookId: string, enabled: boolean) {
  return webhookService.updateWebhook(tenant.actors.admin, {
    orgId: tenant.org.id,
    webhookId: webhookId as WebhookId,
    enabled,
  });
}

async function createIssue(tenant: Tenant, title: string) {
  return issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title }),
  );
}

describe("HFX1: switching a webhook endpoint off", () => {
  it("persists the switch in both directions", async () => {
    const tenant = await createTenant("hfx1-persist", "growth");
    const endpoint = await createEndpoint(tenant, 1);
    expect(endpoint.enabled).toBe(true);

    const off = await switchEndpoint(tenant, endpoint.id, false);
    expect(off.enabled).toBe(false);

    const listed = await webhookService.listWebhooks(tenant.actors.admin, tenant.org.id);
    expect(listed.find((row) => row.id === endpoint.id)?.enabled).toBe(false);

    const on = await switchEndpoint(tenant, endpoint.id, true);
    expect(on.enabled).toBe(true);
    const relisted = await webhookService.listWebhooks(tenant.actors.admin, tenant.org.id);
    expect(relisted.find((row) => row.id === endpoint.id)?.enabled).toBe(true);
  });

  it("queues no new events for a switched-off endpoint", async () => {
    const tenant = await createTenant("hfx1-queue", "growth");
    const live = await createEndpoint(tenant, 1);
    const muted = await createEndpoint(tenant, 2);

    await switchEndpoint(tenant, muted.id, false);
    await createIssue(tenant, "After the switch");

    expect(deliveriesFor(live.id)).toHaveLength(1);
    expect(deliveriesFor(muted.id)).toHaveLength(0);
  });

  it("fails, rather than delivers, deliveries queued before the switch", async () => {
    const tenant = await createTenant("hfx1-drain", "growth");
    const live = await createEndpoint(tenant, 1);
    const muted = await createEndpoint(tenant, 2);
    // Drain whatever earlier cases left queued, so the counts below are ours.
    await runWebhookDeliveryJob(NOW);

    await createIssue(tenant, "Queued for both");
    expect(deliveriesFor(live.id)).toHaveLength(1);
    expect(deliveriesFor(muted.id)).toHaveLength(1);

    await switchEndpoint(tenant, muted.id, false);

    const result = await runWebhookDeliveryJob(NOW);

    const [liveRow] = deliveriesFor(live.id);
    const [mutedRow] = deliveriesFor(muted.id);

    expect(liveRow?.status).toBe("delivered");
    expect(liveRow?.deliveredAt).not.toBeNull();
    expect(mutedRow?.status).toBe("failed");
    expect(mutedRow?.deliveredAt).toBeNull();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("keeps switched-off endpoints counted against the plan allowance", async () => {
    const tenant = await createTenant("hfx1-quota", "growth");

    const created = [];
    for (let n = 1; n <= 10; n += 1) {
      created.push(await createEndpoint(tenant, n));
    }
    await expect(createEndpoint(tenant, 11)).rejects.toThrow();

    await switchEndpoint(tenant, created[0]!.id, false);
    await expect(createEndpoint(tenant, 12)).rejects.toThrow();

    const listed = await webhookService.listWebhooks(tenant.actors.admin, tenant.org.id);
    expect(listed).toHaveLength(10);
  });
});
