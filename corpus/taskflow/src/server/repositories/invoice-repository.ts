/**
 * Invoice history for the billing page.
 */
import { and, desc, eq } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, invoices } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { toInvoice } from "./_mappers";
import type { Invoice } from "@/types/billing";
import type { OrgId } from "@/types/common";

export async function listInvoices(
  orgId: OrgId,
): Promise<readonly Invoice[]> {
  const rows = getDb()
    .select()
    .from(invoices)
    .where(orgPredicate(invoices.orgId, orgId))
    .orderBy(desc(invoices.periodStart))
    .all();
  return rows.map(toInvoice);
}

export async function insertInvoice(
  orgId: OrgId,
  invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">,
): Promise<Invoice> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(invoices)
    .values({
      id: newId(),
      orgId,
      number: invoice.number,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      paidAt: invoice.paidAt,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toInvoice(row);
}

export async function findInvoice(
  orgId: OrgId,
  invoiceId: string,
): Promise<Invoice | null> {
  const row = getDb()
    .select()
    .from(invoices)
    .where(and(orgPredicate(invoices.orgId, orgId), eq(invoices.id, invoiceId)))
    .get();
  return row ? toInvoice(row) : null;
}
