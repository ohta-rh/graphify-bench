/**
 * Invoice history table.
 */
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/date";
import { formatCents } from "@/lib/format";
import type { Invoice } from "@/types/billing";
import type { ReactElement } from "react";

export type InvoiceTableProps = { invoices: readonly Invoice[] };

export function InvoiceTable(props: InvoiceTableProps): ReactElement | null {
  const { invoices } = props;

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Invoices appear here at the end of each billing period."
      />
    );
  }

  // Newest period first — nobody scrolls to the bottom for last month.
  const ordered = [...invoices].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  );

  return (
    <Table caption="Invoices">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Number</TableHeaderCell>
          <TableHeaderCell>Period</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {ordered.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-mono text-sm">
              {invoice.number}
            </TableCell>
            <TableCell>
              {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </TableCell>
            <TableCell>
              {formatCents(invoice.amountCents, invoice.currency)}
            </TableCell>
            <TableCell>
              {invoice.paidAt === null ? (
                <Badge tone="warning" size="sm">
                  Due
                </Badge>
              ) : (
                <Badge tone="success" size="sm">
                  Paid {formatDate(invoice.paidAt)}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
