/**
 * Product name, description, support links and the marketing metadata
 * defaults. The marketing pages and the email footer both read from here, so
 * the product never introduces itself two different ways.
 */

export type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  supportEmail: string;
  docsUrl: string;
};

export const SITE_CONFIG: SiteConfig = {
  name: "Taskflow",
  tagline: "Issue tracking that keeps up with the work",
  description:
    "Taskflow is a multi-tenant project and issue tracker for product teams: " +
    "projects, issues, comments and a shared activity trail, with per-plan " +
    "quotas and role-aware access built in.",
  url: "https://taskflow.example.com",
  supportEmail: "support@taskflow.example.com",
  docsUrl: "https://docs.taskflow.example.com",
};
