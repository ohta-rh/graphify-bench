/**
 * Call-to-action button used by every template. One implementation so the
 * primary action looks and behaves the same in every Taskflow email.
 */
import { Button, Section } from "@react-email/components";
import type { ReactElement } from "react";

export type EmailButtonProps = { href: string; label: string };

const styles = {
  wrapper: { margin: "24px 0" },
  button: {
    backgroundColor: "#6366f1",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 22px",
    textDecoration: "none",
  },
};

export function EmailButton(props: EmailButtonProps): ReactElement | null {
  return (
    <Section style={styles.wrapper}>
      <Button href={props.href} style={styles.button}>
        {props.label}
      </Button>
    </Section>
  );
}
