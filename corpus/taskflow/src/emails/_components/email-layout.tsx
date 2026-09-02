/**
 * Shared react-email shell: header, body container and footer.
 *
 * Every Taskflow template renders inside this so the product name, the
 * support address and the visual frame come from one place — see
 * `@/config/site` for the strings themselves.
 */
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactElement, ReactNode } from "react";
import { SITE_CONFIG } from "@/config/site";

export type EmailLayoutProps = {
  preview: string;
  heading: string;
  children?: ReactNode;
};

const styles = {
  body: {
    backgroundColor: "#f6f7f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px",
  },
  brand: {
    color: "#6366f1",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase" as const,
  },
  heading: {
    color: "#111827",
    fontSize: "22px",
    lineHeight: "30px",
    margin: "8px 0 20px",
  },
  divider: { borderColor: "#e5e7eb", margin: "28px 0 16px" },
  footer: { color: "#6b7280", fontSize: "12px", lineHeight: "18px", margin: 0 },
  link: { color: "#6366f1" },
};

export function EmailLayout(props: EmailLayoutProps): ReactElement | null {
  const { preview, heading, children } = props;

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{SITE_CONFIG.name}</Text>
          <Heading style={styles.heading}>{heading}</Heading>
          <Section>{children}</Section>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            {SITE_CONFIG.tagline} — need a hand?{" "}
            <Link href={`mailto:${SITE_CONFIG.supportEmail}`} style={styles.link}>
              {SITE_CONFIG.supportEmail}
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
