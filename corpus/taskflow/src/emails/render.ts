/**
 * Renders a react-email component to the `{ subject, html, text }` triple
 * `EmailService` sends.
 *
 * `EmailTemplate` is the closed vocabulary of templates; this module is the
 * only place that maps a name to a component and to a subject line, so
 * adding a template means touching exactly one switch in each direction.
 */
import { render } from "@react-email/components";
import { createElement, type ReactElement } from "react";
import { SITE_CONFIG } from "@/config/site";
import type {
  EmailTemplate,
  RenderedEmail,
} from "@/server/services/email-service";
import { DigestEmail, type DigestEmailProps } from "./digest-email";
import { InviteEmail, type InviteEmailProps } from "./invite-email";
import { InvoiceEmail, type InvoiceEmailProps } from "./invoice-email";
import { MentionEmail, type MentionEmailProps } from "./mention-email";
import { OverdueEmail, type OverdueEmailProps } from "./overdue-email";
import {
  PasswordResetEmail,
  type PasswordResetEmailProps,
} from "./password-reset-email";
import { WelcomeEmail, type WelcomeEmailProps } from "./welcome-email";

type Props = Readonly<Record<string, unknown>>;

/** Reads a string prop defensively — templates are fed loosely typed payloads. */
function str(props: Props, key: string, fallback = ""): string {
  const value = props[key];
  return typeof value === "string" && value !== "" ? value : fallback;
}

function count(props: Props, key: string): number {
  const value = props[key];
  return Array.isArray(value) ? value.length : 0;
}

function elementFor(template: EmailTemplate, props: Props): ReactElement {
  switch (template) {
    case "invite":
      return createElement(InviteEmail, props as unknown as InviteEmailProps);
    case "digest":
      return createElement(DigestEmail, props as unknown as DigestEmailProps);
    case "mention":
      return createElement(MentionEmail, props as unknown as MentionEmailProps);
    case "invoice":
      return createElement(InvoiceEmail, props as unknown as InvoiceEmailProps);
    case "welcome":
      return createElement(WelcomeEmail, props as unknown as WelcomeEmailProps);
    case "password-reset":
      return createElement(
        PasswordResetEmail,
        props as unknown as PasswordResetEmailProps,
      );
    case "overdue":
      return createElement(OverdueEmail, props as unknown as OverdueEmailProps);
  }
}

/** The subject line for a template, derived from the same props as the body. */
export function subjectFor(template: EmailTemplate, props: Props): string {
  switch (template) {
    case "invite":
      return `${str(props, "inviterName", "Someone")} invited you to ${str(
        props,
        "orgName",
        SITE_CONFIG.name,
      )}`;
    case "digest": {
      const total = count(props, "entries");
      return `Your ${str(props, "orgName", SITE_CONFIG.name)} digest — ${total} update${
        total === 1 ? "" : "s"
      }`;
    }
    case "mention":
      return `${str(props, "actorName", "Someone")} mentioned you on "${str(
        props,
        "issueTitle",
        "an issue",
      )}"`;
    case "invoice":
      return `Invoice ${str(props, "invoiceNumber", "")} for ${str(
        props,
        "orgName",
        SITE_CONFIG.name,
      )}`.replace(/\s+/g, " ");
    case "welcome":
      return `Welcome to ${SITE_CONFIG.name}`;
    case "password-reset":
      return `Reset your ${SITE_CONFIG.name} password`;
    case "overdue": {
      const total = count(props, "issues");
      return `${total} overdue issue${total === 1 ? "" : "s"} in ${SITE_CONFIG.name}`;
    }
  }
}

/** Renders both the HTML and the plain-text alternative in one pass. */
export async function renderTemplate(
  template: EmailTemplate,
  props: Props,
): Promise<RenderedEmail> {
  const element = elementFor(template, props);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return { subject: subjectFor(template, props), html, text };
}
