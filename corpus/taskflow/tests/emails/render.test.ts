/**
 * Every template renders to static markup, carries its key strings and
 * produces a matching subject line.
 */
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/config/site";
import { renderTemplate, subjectFor } from "@/emails/render";
import type {
  EmailTemplate,
  RenderedEmail,
} from "@/server/services/email-service";
import type { IsoTimestamp, NotificationId } from "@/types/common";

const EXPIRES = "2026-03-20T12:00:00.000Z" as IsoTimestamp;

const PROPS: Readonly<Record<EmailTemplate, Readonly<Record<string, unknown>>>> = {
  invite: {
    inviterName: "Alice Alvarez",
    orgName: "Acme",
    role: "admin",
    acceptUrl: "https://taskflow.example.com/invite/abc",
    expiresAt: EXPIRES,
  },
  digest: {
    recipientName: "Alice",
    orgName: "Acme",
    entries: [
      {
        notificationId: "01HZZZNNNNNNNNNNNNNNNNNNNN" as NotificationId,
        kind: "comment_mention",
        title: "Bob mentioned you on WEB-12",
        href: "/acme/projects/website/issues/12",
        occurredAt: "2026-03-15T09:00:00.000Z" as IsoTimestamp,
      },
    ],
    inboxUrl: "https://taskflow.example.com/acme/inbox",
  },
  mention: {
    actorName: "Bob Smith",
    issueTitle: "Fix the sign-up link",
    excerpt: "Could you take a look at this today?",
    issueUrl: "https://taskflow.example.com/acme/projects/website/issues/12",
  },
  invoice: {
    orgName: "Acme",
    invoiceNumber: "INV-2026-03",
    amountCents: 19_900,
    periodEnd: EXPIRES,
    invoiceUrl: "https://taskflow.example.com/acme/settings/billing",
  },
  welcome: {
    userName: "Alice",
    orgName: "Acme",
    dashboardUrl: "https://taskflow.example.com/acme",
  },
  "password-reset": {
    userName: "Alice",
    resetUrl: "https://taskflow.example.com/reset/abc",
    expiresAt: EXPIRES,
  },
  overdue: {
    recipientName: "Alice",
    issues: [
      {
        title: "Ship the pricing page",
        url: "https://taskflow.example.com/acme/projects/website/issues/9",
        dueAt: "2026-03-10T12:00:00.000Z" as IsoTimestamp,
      },
    ],
  },
};

const TEMPLATES = Object.keys(PROPS) as readonly EmailTemplate[];

async function renderAll(): Promise<Map<EmailTemplate, RenderedEmail>> {
  const entries = await Promise.all(
    TEMPLATES.map(async (template) => {
      const rendered = await renderTemplate(template, PROPS[template]);
      return [template, rendered] as const;
    }),
  );
  return new Map(entries);
}

describe("emails/render", () => {
  it("renders every template to HTML and plain text", async () => {
    for (const [template, rendered] of await renderAll()) {
      expect(rendered.html, template).toContain("<html");
      expect(rendered.html, template).toContain(SITE_CONFIG.name);
      expect(rendered.text.length, template).toBeGreaterThan(0);
      expect(rendered.text, template).not.toContain("<html");
      expect(rendered.subject, template).toBe(subjectFor(template, PROPS[template]));
    }
  });

  it("puts the support address in every footer", async () => {
    for (const [template, rendered] of await renderAll()) {
      expect(rendered.html, template).toContain(SITE_CONFIG.supportEmail);
    }
  });

  it("renders the invitation with the role, org and accept link", async () => {
    const rendered = await renderTemplate("invite", PROPS.invite);
    expect(rendered.subject).toBe("Alice Alvarez invited you to Acme");
    expect(rendered.html).toContain("Admin");
    expect(rendered.html).toContain("https://taskflow.example.com/invite/abc");
    expect(rendered.html).toContain("Accept invitation");
    expect(rendered.html).toContain("20 Mar 2026");
  });

  it("lists every digest entry and counts them in the subject", async () => {
    const rendered = await renderTemplate("digest", PROPS.digest);
    expect(rendered.subject).toBe("Your Acme digest — 1 update");
    expect(rendered.html).toContain("Bob mentioned you on WEB-12");
    expect(rendered.html).toContain("/acme/projects/website/issues/12");
  });

  it("caps the digest body and says how many were left out", async () => {
    const entries = Array.from({ length: 60 }, (_unused, index) => ({
      notificationId: `01HZZZ${String(index).padStart(20, "0")}` as NotificationId,
      kind: "issue_assigned",
      title: `Issue number ${index}`,
      href: `/acme/issues/${index}`,
      occurredAt: "2026-03-15T09:00:00.000Z" as IsoTimestamp,
    }));

    const rendered = await renderTemplate("digest", { ...PROPS.digest, entries });
    expect(rendered.subject).toContain("60 updates");
    expect(rendered.html).toContain("Issue number 49");
    expect(rendered.html).not.toContain("Issue number 50");
    expect(rendered.html).toContain("and 10 more updates");
  });

  it("quotes the comment excerpt in a mention email", async () => {
    const rendered = await renderTemplate("mention", PROPS.mention);
    expect(rendered.subject).toBe(
      'Bob Smith mentioned you on "Fix the sign-up link"',
    );
    expect(rendered.html).toContain("Could you take a look at this today?");
  });

  it("formats the invoice amount as currency, not raw cents", async () => {
    const rendered = await renderTemplate("invoice", PROPS.invoice);
    expect(rendered.subject).toBe("Invoice INV-2026-03 for Acme");
    expect(rendered.html).toContain("$199.00");
    expect(rendered.html).not.toContain("19900");
  });

  it("pluralises the overdue subject on the issue count", async () => {
    expect(subjectFor("overdue", PROPS.overdue)).toBe(
      "1 overdue issue in Taskflow",
    );
    expect(
      subjectFor("overdue", { issues: [{}, {}], recipientName: "Alice" }),
    ).toBe("2 overdue issues in Taskflow");
  });

  it("links every overdue issue with its due date", async () => {
    const rendered = await renderTemplate("overdue", PROPS.overdue);
    expect(rendered.html).toContain("Ship the pricing page");
    expect(rendered.html).toContain("10 Mar 2026");
  });

  it("never leaks the reset token into the visible body", async () => {
    const rendered = await renderTemplate("password-reset", PROPS["password-reset"]);
    expect(rendered.subject).toBe("Reset your Taskflow password");
    expect(rendered.html).toContain("https://taskflow.example.com/reset/abc");
    expect(rendered.text).not.toContain("token");
  });

  it("welcomes the user by name and links the dashboard", async () => {
    const rendered = await renderTemplate("welcome", PROPS.welcome);
    expect(rendered.subject).toBe("Welcome to Taskflow");
    expect(rendered.html).toContain("Welcome, Alice");
    expect(rendered.html).toContain("https://taskflow.example.com/acme");
  });

  it("falls back to safe defaults when a prop is missing", () => {
    expect(subjectFor("invite", {})).toBe("Someone invited you to Taskflow");
    expect(subjectFor("digest", {})).toBe("Your Taskflow digest — 0 updates");
  });
});
