/**
 * Sent after registration, once the first organization exists.
 */
import { Text } from "@react-email/components";
import type { ReactElement } from "react";
import { SITE_CONFIG } from "@/config/site";
import { EmailButton } from "./_components/email-button";
import { EmailLayout } from "./_components/email-layout";

export type WelcomeEmailProps = {
  userName: string;
  orgName: string;
  dashboardUrl: string;
};

const styles = {
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: "24px" },
  muted: { color: "#6b7280", fontSize: "13px", lineHeight: "20px" },
};

export function WelcomeEmail(props: WelcomeEmailProps): ReactElement | null {
  const { userName, orgName, dashboardUrl } = props;

  return (
    <EmailLayout
      preview={`Welcome to ${SITE_CONFIG.name}, ${userName}`}
      heading={`Welcome, ${userName}`}
    >
      <Text style={styles.paragraph}>
        <strong>{orgName}</strong> is ready. Create your first project, invite
        the people you work with, and start filing issues.
      </Text>
      <EmailButton href={dashboardUrl} label="Open Taskflow" />
      <Text style={styles.muted}>
        New here? The guides at {SITE_CONFIG.docsUrl} cover projects, roles and
        plan limits.
      </Text>
    </EmailLayout>
  );
}
