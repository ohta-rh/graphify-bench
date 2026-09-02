/**
 * Invoice notice for the billing contact.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
import type { ReactElement } from "react";
export type InvoiceEmailProps = { orgName: string; invoiceNumber: string; amountCents: number; periodEnd: IsoTimestamp; invoiceUrl: string };

export function InvoiceEmail(props: InvoiceEmailProps): ReactElement | null {
  return null;
}
