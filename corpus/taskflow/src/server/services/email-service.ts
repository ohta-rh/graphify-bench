/**
 * Renders react-email templates and 'sends' them by writing the draft to the log. No network egress.
 */
import { createLogger } from "@/lib/logger";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export type EmailTemplate =
  | "invite"
  | "digest"
  | "mention"
  | "invoice"
  | "welcome"
  | "password-reset"
  | "overdue";

const logger = createLogger("email-service");

/** Subject lines per template; the props fill in the bracketed parts. */
const SUBJECTS: Readonly<Record<EmailTemplate, string>> = {
  invite: "You have been invited to a Taskflow workspace",
  digest: "Your Taskflow digest",
  mention: "You were mentioned in Taskflow",
  invoice: "Your Taskflow invoice",
  welcome: "Welcome to Taskflow",
  "password-reset": "Reset your Taskflow password",
  overdue: "You have overdue issues",
};

/**
 * "Sends" a message. Taskflow has no outbound mail transport by design — the
 * corpus must build and run offline — so delivery means writing the draft to
 * the structured log, where the dev tools tab surfaces it.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  logger.info("email.sent", {
    to: message.to,
    subject: message.subject,
    bytes: message.html.length,
  });
}

/**
 * Renders a template to both an HTML and a plain-text body. The text half is
 * derived from the HTML rather than written twice, so the two can never drift.
 */
export async function renderEmail(
  template: EmailTemplate,
  props: Readonly<Record<string, unknown>>,
): Promise<RenderedEmail> {
  const subject = subjectFor(template, props);
  const html = renderBody(template, props);

  return { subject, html, text: toPlainText(html) };
}

function subjectFor(
  template: EmailTemplate,
  props: Readonly<Record<string, unknown>>,
): string {
  const base = SUBJECTS[template];
  const orgName = props.orgName;
  return typeof orgName === "string" ? `${base} — ${orgName}` : base;
}

function renderBody(
  template: EmailTemplate,
  props: Readonly<Record<string, unknown>>,
): string {
  const rows = Object.entries(props)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`,
    )
    .join("");

  return [
    `<html><body><h1>${escapeHtml(SUBJECTS[template])}</h1>`,
    `<table>${rows}</table>`,
    "</body></html>",
  ].join("");
}

function toPlainText(html: string): string {
  return html
    .replace(/<\/(?:tr|h1|p|div)>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
