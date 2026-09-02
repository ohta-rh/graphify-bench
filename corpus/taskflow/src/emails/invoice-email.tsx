/**
 * Invoice notice for the billing contact. Amounts are rendered through
 * `formatCents()` so the email and the billing page never disagree.
 */
import { Row, Column, Section, Text } from "@react-email/components";
import type { ReactElement } from "react";
import { formatDate } from "@/lib/date";
import { formatCents } from "@/lib/format";
import type { IsoTimestamp } from "@/types/common";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type InvoiceEmailProps = {
  orgName: string;
  invoiceNumber: string;
  amountCents: number;
  periodEnd: IsoTimestamp;
  invoiceUrl: string;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  table: {
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    padding: "16px 18px",
  },
  label: { color: "#6b7280", fontSize: "13px", margin: "4px 0" },
  value: {
    color: "#111827",
    fontSize: "13px",
    fontWeight: 600,
    margin: "4px 0",
    textAlign: "right" as const,
  },
};

export function InvoiceEmail(props: InvoiceEmailProps): ReactElement | null {
  const { orgName, invoiceNumber, amountCents, periodEnd, invoiceUrl } = props;

  return (
    <EmailLayout
      preview={`Invoice ${invoiceNumber} for ${orgName}`}
      heading={`Invoice ${invoiceNumber}`}
    >
      <Text style={styles.paragraph}>
        Here is the invoice for <strong>{orgName}</strong>.
      </Text>

      <Section style={styles.table}>
        <Row>
          <Column>
            <Text style={styles.label}>Amount due</Text>
          </Column>
          <Column>
            <Text style={styles.value}>{formatCents(amountCents)}</Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={styles.label}>Billing period ends</Text>
          </Column>
          <Column>
            <Text style={styles.value}>{formatDate(periodEnd)}</Text>
          </Column>
        </Row>
      </Section>

      <EmailButton href={invoiceUrl} label="View invoice" />
    </EmailLayout>
  );
}
