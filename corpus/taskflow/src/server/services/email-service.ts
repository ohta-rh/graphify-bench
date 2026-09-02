/**
 * Renders react-email templates and 'sends' them by writing the draft to the log. No network egress.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  throw new Error("stub: src/server/services/email-service.ts");
}

export async function renderEmail(template: EmailTemplate, props: Readonly<Record<string, unknown>>): Promise<RenderedEmail> {
  throw new Error("stub: src/server/services/email-service.ts");
}

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

export type RenderedEmail = { subject: string; html: string; text: string };

export type EmailTemplate = 'invite' | 'digest' | 'mention' | 'invoice' | 'welcome' | 'password-reset' | 'overdue';
