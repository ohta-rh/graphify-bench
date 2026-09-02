/**
 * Tenant shell: resolves the `Actor`, builds the flag snapshot and renders the
 * sidebar.
 *
 * Owner D. Everything below this layout can assume three invariants: an actor
 * exists, it belongs to this organization, and the flag snapshot was evaluated
 * against that organization's plan. `assertOrgScope()` is what turns the third
 * assumption into a guarantee.
 *
 * Must call (do not reimplement): resolveActorForOrg, snapshotFlags,
 * assertOrgScope
 */

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { LimitedResource } from "@/types/billing";
import { snapshotFlags } from "@/lib/feature-flags";
import { getSessionPrincipal } from "@/lib/session";
import { assertOrgScope } from "@/lib/tenant";
import { checkLimit } from "@/server/services/billing-service";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { listNotifications } from "@/server/services/notification-service";
import { resolveOrgBySlug } from "@/server/services/organization-service";
import { listProjects } from "@/server/services/project-service";
import { resolveActorForOrg } from "@/server/services/session-service";
import { DashboardShell } from "./_components/dashboard-shell";
import { OrgProvider } from "./_components/org-provider";
import { UnauthorizedActionError } from "@/actions/_lib/action-errors";

type LayoutParams = { orgSlug: string };

export const dynamic = "force-dynamic";

const SIDEBAR_PROJECT_LIMIT = 12;

/** The quota dimensions the shell's usage meters read. */
const SHELL_LIMIT_RESOURCES: readonly LimitedResource[] = [
  "seats",
  "projects",
];

export default async function Layout(props: {
  children: ReactNode;
  panel?: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  const { orgSlug } = await props.params;

  const principal = await getSessionPrincipal();
  if (principal === null) {
    throw new UnauthorizedActionError();
  }

  const org = await resolveOrgBySlug(orgSlug);
  if (org === null) {
    notFound();
  }

  // A membership the caller does not have resolves to null, which is the same
  // 404 as an org that does not exist — see `_lib/tenant-context.ts`.
  const actor = await resolveActorForOrg(principal, orgSlug);
  if (actor === null) {
    notFound();
  }
  assertOrgScope(actor, org.id);

  const flags = snapshotFlags(buildFlagContext(actor, org));

  const [projects, notifications, limitChecks] = await Promise.all([
    listProjects(actor, { orgId: org.id, limit: SIDEBAR_PROJECT_LIMIT }),
    listNotifications(actor, {
      orgId: org.id,
      recipientId: actor.userId,
      unreadOnly: true,
      limit: 1,
    }),
    // Evaluated once per navigation so `usePlanLimits()` in the client tree
    // reads a real measurement instead of falling back to "no data".
    Promise.all(
      SHELL_LIMIT_RESOURCES.map((resource) => checkLimit(org.id, resource, 0)),
    ),
  ]);

  return (
    <OrgProvider
      org={org}
      actor={actor}
      flags={flags}
      limitChecks={limitChecks}
    >
      <DashboardShell
        org={org}
        actor={actor}
        flags={flags}
        projects={projects.items.map((row) => row.project)}
        unreadCount={notifications.total}
        pathname={`/${orgSlug}`}
        panel={props.panel}
      >
        {props.children}
      </DashboardShell>
    </OrgProvider>
  );
}
