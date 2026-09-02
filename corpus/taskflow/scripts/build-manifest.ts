import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CorpusManifest, ManifestEntry } from "./manifest-types";
import { uiEntries } from "./manifest-parts/ui";
import { domainEntries, hookEntries } from "./manifest-parts/domain";
import { serverEntries } from "./manifest-parts/server";
import { appEntries } from "./manifest-parts/app";
import { libEntries } from "./manifest-parts/lib";

/**
 * Regenerates `corpus-manifest.json` from the per-owner declarations in
 * `scripts/manifest-parts/`. Run with `pnpm exec tsx scripts/build-manifest.ts`.
 *
 * The frozen contract layer is listed too (owner `CONTRACT`) so the manifest is
 * a complete census of the corpus, but those files already exist and no worker
 * may edit them.
 */

const CONTRACT_FILES: [path: string, responsibility: string][] = [
  ["src/types/common.ts", "Branded ids, timestamps, pagination and the tenant/soft-delete marker interfaces."],
  ["src/types/member.ts", "User, Member, Invitation, Role and the request-scoped `Actor`."],
  ["src/types/organization.ts", "Organization, its settings and its usage counters."],
  ["src/types/project.ts", "Project, visibility, status and stats."],
  ["src/types/issue.ts", "Issue, status/priority vocabularies, labels, attachments and the board column."],
  ["src/types/comment.ts", "Comment and the threaded view model."],
  ["src/types/notification.ts", "Notification kinds, channels, preferences and the digest bundle."],
  ["src/types/billing.ts", "Plans, subscriptions, invoices and `LimitCheck`."],
  ["src/types/activity.ts", "Audit-log actions, subjects and filters."],
  ["src/types/feature-flag.ts", "Flag keys, rollout strategies and the evaluation context."],
  ["src/types/permission.ts", "The closed `PermissionAction` vocabulary and `PermissionResource` union."],
  ["src/types/event.ts", "`TaskflowEventMap` — the complete domain event catalogue."],
  ["src/types/api.ts", "`Result` / `ActionResult` envelopes and the error-code vocabulary."],
  ["src/types/index.ts", "Type barrel."],
  ["src/schemas/common.ts", "Branded-id, timestamp and pagination Zod primitives."],
  ["src/schemas/slug.ts", "Slug and project-key validation reusing `@/lib/slug`."],
  ["src/schemas/role.ts", "Role enums with compile-time parity against `Role`."],
  ["src/schemas/auth.ts", "Login, registration and password-reset schemas."],
  ["src/schemas/session.ts", "Session cookie name, token and principal schemas."],
  ["src/schemas/organization.ts", "Organization creation, update and settings schemas."],
  ["src/schemas/member.ts", "Invite, role-change, removal and profile schemas."],
  ["src/schemas/invitation.ts", "Invitation token lifecycle schemas."],
  ["src/schemas/project.ts", "Project create/update/archive/list schemas."],
  ["src/schemas/issue.ts", "Issue create/update/status/assign/filter/move schemas."],
  ["src/schemas/comment.ts", "Comment create/update/delete/list schemas."],
  ["src/schemas/label.ts", "Label schemas."],
  ["src/schemas/attachment.ts", "Attachment schemas and the size cap."],
  ["src/schemas/notification.ts", "Notification kind/channel and preference schemas."],
  ["src/schemas/activity.ts", "Activity filter and export schemas."],
  ["src/schemas/billing.ts", "Plan, interval, seat and cancellation schemas."],
  ["src/schemas/feature-flag.ts", "Flag key and toggle schemas."],
  ["src/schemas/search.ts", "Search query and reindex schemas."],
  ["src/schemas/webhook.ts", "Webhook endpoint and inbound payload schemas."],
  ["src/schemas/export.ts", "CSV export query schemas."],
  ["src/schemas/pagination.ts", "`searchParams` coercions for page/perPage/sort."],
  ["src/schemas/index.ts", "Schema barrel."],
  ["src/server/db/schema/_shared.ts", "Column fragments: id, timestamps, `org_id`, `archived_at`."],
  ["src/server/db/schema/users.ts", "Global user, session and reset-token tables."],
  ["src/server/db/schema/organizations.ts", "Organization and usage tables."],
  ["src/server/db/schema/members.ts", "Membership and invitation tables."],
  ["src/server/db/schema/projects.ts", "Project and project-member tables."],
  ["src/server/db/schema/issues.ts", "Issue, label, issue-label and attachment tables."],
  ["src/server/db/schema/comments.ts", "Comment table."],
  ["src/server/db/schema/notifications.ts", "Notification and preference tables."],
  ["src/server/db/schema/activity.ts", "Append-only activity table."],
  ["src/server/db/schema/billing.ts", "Subscription and invoice tables."],
  ["src/server/db/schema/webhooks.ts", "Webhook, rate-limit bucket and search-index tables."],
  ["src/server/db/schema/index.ts", "Drizzle schema barrel consumed by drizzle-kit and the client."],
  ["src/server/db/client.ts", "The single better-sqlite3 + Drizzle connection."],
  ["src/server/db/index.ts", "Data-layer entry point."],
  ["src/lib/permissions.ts", "`can()` / `explain()` / `assertCan()` and `ROLE_MATRIX`."],
  ["src/lib/tenant.ts", "`assertOrgScope()` and the tenant-scope invariant helpers."],
  ["src/lib/event-bus.ts", "Typed `emit` / `subscribe` in-process bus."],
  ["src/lib/feature-flags.ts", "`isEnabled()` / `snapshotFlags()` shared by server and client."],
  ["src/lib/slug.ts", "`slugify` / `uniqueSlug` / `assertValidSlug` / `projectKeyFromName`."],
  ["src/lib/soft-delete.ts", "`archivePatch` / `restorePatch` / `shouldFilterArchived`."],
  ["src/config/plan-limits.ts", "`PlanLimits`, `PLAN_LIMITS`, `getPlanLimits`, `wouldExceedLimit`."],
  ["src/config/feature-flags.ts", "`FEATURE_FLAG_DEFINITIONS` — the flag registry."],
  ["src/proxy.ts", "Next 16 request proxy (the renamed middleware): session-cookie gate."],
  ["src/instrumentation.ts", "Process-start hook that registers event handlers and the scheduler."],
  ["src/app/globals.css", "Tailwind v4 entry point and design tokens."],
  ["tests/setup.ts", "Vitest setup: jest-dom matchers."],
];

const contractEntries: ManifestEntry[] = CONTRACT_FILES.map(
  ([path, responsibility]) => ({
    path,
    owner: "CONTRACT",
    responsibility,
    exports: [],
  }),
);

const entries: ManifestEntry[] = [
  ...contractEntries,
  ...uiEntries,
  ...domainEntries,
  ...hookEntries,
  ...serverEntries,
  ...appEntries,
  ...libEntries,
];

const seen = new Set<string>();
for (const entry of entries) {
  if (seen.has(entry.path)) {
    throw new Error(`Duplicate manifest path: ${entry.path}`);
  }
  seen.add(entry.path);
}

entries.sort((a, b) => a.path.localeCompare(b.path));

const manifest: CorpusManifest = {
  domain:
    "Taskflow — a multi-tenant project and issue tracking SaaS (Organization > Project > Issue > Comment) with RBAC, plan quotas, an in-process event bus, feature flags and soft deletes.",
  generatedFrom: "scripts/build-manifest.ts",
  entries,
};

const outPath = resolve(process.cwd(), "corpus-manifest.json");
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const byOwner = new Map<string, number>();
for (const entry of entries) {
  byOwner.set(entry.owner, (byOwner.get(entry.owner) ?? 0) + 1);
}

console.log(`wrote ${outPath}`);
console.log(`total entries: ${entries.length}`);
for (const owner of [...byOwner.keys()].sort()) {
  console.log(`  owner ${owner}: ${byOwner.get(owner)}`);
}
