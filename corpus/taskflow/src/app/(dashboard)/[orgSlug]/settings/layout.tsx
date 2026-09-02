/**
 * Settings shell with a permission-filtered sub-nav.
 *
 * Owner D. The sub-nav is filtered here rather than inside the sidebar
 * component so that a member who cannot manage billing never sees the tab at
 * all — a tab that 404s on click is worse than no tab.
 *
 * Must call (do not reimplement): can
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { PENDING_MEMBER_ID } from "@/actions/_lib/permission-resources";
import { can } from "@/lib/permissions";
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { loadTenantContext } from "../_lib/tenant-context";

type LayoutParams = { orgSlug: string };

export const dynamic = "force-dynamic";

type SettingsTab = {
  readonly segment: string;
  readonly label: string;
  readonly action: PermissionAction;
};

const TABS: readonly SettingsTab[] = [
  { segment: "", label: "General", action: "org:read" },
  { segment: "members", label: "Members", action: "member:read" },
  { segment: "labels", label: "Labels", action: "org:read" },
  { segment: "billing", label: "Billing", action: "org:manage_billing" },
  { segment: "flags", label: "Feature flags", action: "org:manage_flags" },
  {
    segment: "notifications",
    label: "Notifications",
    action: "notification:manage",
  },
  { segment: "webhooks", label: "Webhooks", action: "webhook:manage" },
  { segment: "danger", label: "Danger zone", action: "org:delete" },
];

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  const { orgSlug } = await props.params;

  const { org, actor } = await loadTenantContext(orgSlug);

  const visible = TABS.filter((tab) =>
    can(actor, tab.action, resourceFor(tab.action, org.id, actor)),
  );

  return (
    <div className="flex gap-10">
      <nav className="w-48 shrink-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Settings
        </h2>
        <ul className="space-y-1 text-sm">
          {visible.map((tab) => (
            <li key={tab.segment}>
              <Link
                href={`/${orgSlug}/settings${tab.segment === "" ? "" : `/${tab.segment}`}`}
                className="block rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">{props.children}</div>
    </div>
  );
}

/**
 * Each settings action is asked about the resource kind its `ROLE_MATRIX` entry
 * expects. Getting this wrong would make `can()` answer about the wrong object —
 * the reason `PermissionResource` is a discriminated union in the first place.
 */
function resourceFor(
  action: PermissionAction,
  orgId: OrgId,
  actor: Actor,
): PermissionResource {
  switch (action) {
    case "org:manage_billing":
      return { kind: "billing", orgId };
    case "member:read":
      return {
        kind: "member",
        orgId,
        memberId: PENDING_MEMBER_ID,
        targetUserId: actor.userId,
        targetRole: actor.role,
      };
    case "notification:manage":
      return { kind: "notification", orgId, recipientId: actor.userId };
    case "webhook:manage":
      return { kind: "webhook", orgId, webhookId: null };
    default:
      return { kind: "organization", orgId };
  }
}
