/**
 * Overdue-issue reminder produced by the overdue job, one email per assignee
 * covering every issue of theirs that has passed its due date.
 */
import { Link, Section, Text } from "@react-email/components";
import type { ReactElement } from "react";
import { formatDate, formatRelative } from "@/lib/date";
import type { IsoTimestamp } from "@/types/common";
import { EmailLayout } from "./_components/email-layout";

export type OverdueEmailProps = {
  recipientName: string;
  issues: readonly { title: string; url: string; dueAt: IsoTimestamp }[];
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  entry: { borderTop: "1px solid #f3f4f6", padding: "10px 0" },
  entryTitle: { color: "#111827", fontSize: "14px", margin: 0 },
  entryMeta: { color: "#b45309", fontSize: "12px", margin: "2px 0 0" },
  link: { color: "#6366f1", textDecoration: "none" },
};

export function OverdueEmail(props: OverdueEmailProps): ReactElement | null {
  const { recipientName, issues } = props;

  return (
    <EmailLayout
      preview={`${issues.length} overdue issue${issues.length === 1 ? "" : "s"}`}
      heading="Overdue issues"
    >
      <Text style={styles.paragraph}>
        {recipientName}, {issues.length} issue
        {issues.length === 1 ? " is" : "s are"} past the due date.
      </Text>

      {issues.map((issue) => (
        <Section key={issue.url} style={styles.entry}>
          <Text style={styles.entryTitle}>
            <Link href={issue.url} style={styles.link}>
              {issue.title}
            </Link>
          </Text>
          <Text style={styles.entryMeta}>
            Due {formatDate(issue.dueAt)} · {formatRelative(issue.dueAt)}
          </Text>
        </Section>
      ))}
    </EmailLayout>
  );
}
