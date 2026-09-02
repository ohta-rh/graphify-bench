/**
 * Daily digest built by the digest job from a `DigestBundle`. Entries are
 * capped at `DIGEST_MAX_ENTRIES` so one noisy day cannot produce an
 * unbounded email.
 */
import { Link, Section, Text } from "@react-email/components";
import type { ReactElement } from "react";
import { DIGEST_MAX_ENTRIES } from "@/config/constants";
import { formatRelative } from "@/lib/date";
import type { DigestEntry } from "@/types/notification";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type DigestEmailProps = {
  recipientName: string;
  orgName: string;
  entries: readonly DigestEntry[];
  inboxUrl: string;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  entry: { borderTop: "1px solid #f3f4f6", padding: "10px 0" },
  entryTitle: { color: "#111827", fontSize: "14px", margin: 0 },
  entryMeta: { color: "#6b7280", fontSize: "12px", margin: "2px 0 0" },
  link: { color: "#6366f1", textDecoration: "none" },
  muted: { color: "#6b7280", fontSize: "13px", lineHeight: "20px" },
};

export function DigestEmail(props: DigestEmailProps): ReactElement | null {
  const { recipientName, orgName, entries, inboxUrl } = props;
  const shown = entries.slice(0, DIGEST_MAX_ENTRIES);
  const overflow = entries.length - shown.length;

  return (
    <EmailLayout
      preview={`${entries.length} update${entries.length === 1 ? "" : "s"} in ${orgName}`}
      heading={`Your ${orgName} digest`}
    >
      <Text style={styles.paragraph}>
        {recipientName}, here is what happened since your last digest.
      </Text>

      {shown.map((entry) => (
        <Section key={entry.notificationId} style={styles.entry}>
          <Text style={styles.entryTitle}>
            <Link href={entry.href} style={styles.link}>
              {entry.title}
            </Link>
          </Text>
          <Text style={styles.entryMeta}>
            {entry.kind.replace(/_/g, " ")} · {formatRelative(entry.occurredAt)}
          </Text>
        </Section>
      ))}

      {overflow > 0 ? (
        <Text style={styles.muted}>
          {`…and ${overflow} more update${overflow === 1 ? "" : "s"}.`}
        </Text>
      ) : null}

      <EmailButton href={inboxUrl} label="Open your inbox" />
    </EmailLayout>
  );
}
