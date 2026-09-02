/**
 * Invoice history for the billing page.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Invoice } from "@/types/billing";
import type { OrgId } from "@/types/common";
export async function listInvoices(orgId: OrgId): Promise<readonly Invoice[]> {
  throw new Error("stub: src/server/repositories/invoice-repository.ts");
}

export async function insertInvoice(orgId: OrgId, invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
  throw new Error("stub: src/server/repositories/invoice-repository.ts");
}

export async function findInvoice(orgId: OrgId, invoiceId: string): Promise<Invoice | null> {
  throw new Error("stub: src/server/repositories/invoice-repository.ts");
}
