/**
 * Organization invitation with the accept link. Sent by `InvitationService`
 * once the seat quota check has passed.
 */
import { Text } from "@react-email/components";
import type { ReactElement } from "react";
import { formatDate } from "@/lib/date";
import { humanizeRole } from "@/lib/format";
import type { IsoTimestamp } from "@/types/common";
import type { Role } from "@/types/member";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type InviteEmailProps = {
  inviterName: string;
  orgName: string;
  role: Role;
  acceptUrl: string;
  expiresAt: IsoTimestamp;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  muted: { color: "#6b7280", fontSize: "13px", lineHeight: "20px" },
};

export function InviteEmail(props: InviteEmailProps): ReactElement | null {
  const { inviterName, orgName, role, acceptUrl, expiresAt } = props;

  return (
    <EmailLayout
      preview={`${inviterName} invited you to ${orgName} on Taskflow`}
      heading={`Join ${orgName}`}
    >
      <Text style={styles.paragraph}>
        {inviterName} invited you to work in <strong>{orgName}</strong> as a{" "}
        <strong>{humanizeRole(role)}</strong>.
      </Text>
      <EmailButton href={acceptUrl} label="Accept invitation" />
      <Text style={styles.muted}>
        This invitation expires on {formatDate(expiresAt)}. If you were not
        expecting it, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}
