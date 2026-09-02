/**
 * Password reset link. The token itself never appears in the body — only
 * inside the URL the auth action generated.
 */
import { Text } from "@react-email/components";
import type { ReactElement } from "react";
import { formatRelative } from "@/lib/date";
import type { IsoTimestamp } from "@/types/common";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type PasswordResetEmailProps = {
  userName: string;
  resetUrl: string;
  expiresAt: IsoTimestamp;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  muted: { color: "#6b7280", fontSize: "13px", lineHeight: "20px" },
};

export function PasswordResetEmail(
  props: PasswordResetEmailProps,
): ReactElement | null {
  const { userName, resetUrl, expiresAt } = props;

  return (
    <EmailLayout
      preview="Reset your Taskflow password"
      heading="Reset your password"
    >
      <Text style={styles.paragraph}>
        {userName}, use the link below to choose a new password. It stops
        working {formatRelative(expiresAt)}.
      </Text>
      <EmailButton href={resetUrl} label="Choose a new password" />
      <Text style={styles.muted}>
        Did not request this? Nothing has changed — you can safely ignore this
        email.
      </Text>
    </EmailLayout>
  );
}
