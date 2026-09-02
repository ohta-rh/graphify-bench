/**
 * Renders a react-email component to the `{ subject, html, text }` triple `EmailService` sends.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { EmailTemplate, RenderedEmail } from "@/server/services/email-service";
export async function renderTemplate(template: EmailTemplate, props: Readonly<Record<string, unknown>>): Promise<RenderedEmail> {
  throw new Error("stub: src/emails/render.ts");
}

export function subjectFor(template: EmailTemplate, props: Readonly<Record<string, unknown>>): string {
  throw new Error("stub: src/emails/render.ts");
}
