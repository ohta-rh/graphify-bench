/**
 * Sent when someone is @-mentioned in a comment. The excerpt is produced by
 * `excerpt()` in `@/lib/markdown`, so the email never contains raw Markdown.
 */
import { Section, Text } from "@react-email/components";
import type { ReactElement } from "react";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type MentionEmailProps = {
  actorName: string;
  issueTitle: string;
  excerpt: string;
  issueUrl: string;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  quote: {
    backgroundColor: "#f9fafb",
    borderLeft: "3px solid #6366f1",
    borderRadius: "4px",
    padding: "12px 16px",
  },
  quoteText: {
    color: "#374151",
    fontSize: "14px",
    lineHeight: "22px",
    margin: 0,
  },
};

export function MentionEmail(props: MentionEmailProps): ReactElement | null {
  const { actorName, issueTitle, excerpt, issueUrl } = props;

  return (
    <EmailLayout
      preview={`${actorName} mentioned you on "${issueTitle}"`}
      heading={`${actorName} mentioned you`}
    >
      <Text style={styles.paragraph}>
        On <strong>{issueTitle}</strong>:
      </Text>
      <Section style={styles.quote}>
        <Text style={styles.quoteText}>{excerpt}</Text>
      </Section>
      <EmailButton href={issueUrl} label="Reply on the issue" />
    </EmailLayout>
  );
}
