/**
 * Builds the Ctrl+K command list for one actor.
 *
 * Every entry names the permission and/or flag that gates it and is then
 * filtered through `can()` and `isEnabled()` — the palette must never offer a
 * command the actor would be refused, and it must never invent its own idea of
 * who may do what. Kept pure so the filtering can be tested directly.
 */
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import {
  activityResource,
  billingResource,
  organizationResource,
} from "@/components/domain/permission/resources";
import type {
  CommandGroup,
  CommandItemSpec,
} from "@/components/ui/command-palette";
import type { FeatureFlagKey, FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { orgFlagContext } from "./flag-context";

/** A palette entry plus the gates it depends on. */
export interface CommandSpec extends CommandItemSpec {
  readonly heading: string;
  readonly action?: PermissionAction;
  readonly flag?: FeatureFlagKey;
  /** Which resource the permission is asked about; defaults to the org. */
  readonly scope?: "organization" | "billing" | "activity";
}

export const COMMAND_SPECS: readonly CommandSpec[] = [
  { heading: "Create", id: "create:issue", label: "New issue", shortcut: "c", action: "issue:create" },
  { heading: "Create", id: "create:project", label: "New project", action: "project:create" },
  { heading: "Create", id: "create:invite", label: "Invite teammate", action: "member:invite" },
  { heading: "Go to", id: "nav:issues", label: "Issues", shortcut: "g i", action: "issue:read" },
  { heading: "Go to", id: "nav:projects", label: "Projects", shortcut: "g p", action: "project:read" },
  { heading: "Go to", id: "nav:board", label: "Board", shortcut: "g b", action: "issue:read", flag: "kanban_board" },
  { heading: "Go to", id: "nav:members", label: "Members", action: "member:read" },
  {
    heading: "Go to",
    id: "nav:activity",
    label: "Activity",
    action: "activity:read",
    flag: "activity_feed",
    scope: "activity",
  },
  {
    heading: "Go to",
    id: "nav:billing",
    label: "Billing",
    action: "org:manage_billing",
    scope: "billing",
  },
  {
    heading: "Export",
    id: "export:issues",
    label: "Export issues as CSV",
    hint: "Downloads the current filter",
    action: "issue:read",
    flag: "csv_export",
  },
  {
    heading: "Export",
    id: "export:activity",
    label: "Export audit log as CSV",
    action: "activity:export",
    flag: "csv_export",
    scope: "activity",
  },
];

function resourceFor(spec: CommandSpec, actor: Actor): PermissionResource {
  switch (spec.scope) {
    case "billing":
      return billingResource(actor.orgId);
    case "activity":
      return activityResource(actor.orgId);
    default:
      // Creation and navigation are not scoped to an existing row, so the
      // organization is the resource the role matrix is asked about.
      return organizationResource(actor.orgId);
  }
}

export function buildCommandGroups(
  org: Organization,
  actor: Actor,
  flags: FeatureFlagSnapshot,
): readonly CommandGroup[] {
  const context = orgFlagContext(org, actor);
  // The snapshot was evaluated when the layout rendered; a flag flipped since
  // then is still honoured by re-evaluating against the live context.
  const flagOn = (flag: FeatureFlagKey): boolean =>
    flags[flag] === true || isEnabled(flag, context);

  const groups = new Map<string, CommandItemSpec[]>();

  for (const spec of COMMAND_SPECS) {
    if (spec.flag !== undefined && !flagOn(spec.flag)) continue;
    if (
      spec.action !== undefined &&
      !can(actor, spec.action, resourceFor(spec, actor))
    ) {
      continue;
    }
    const items = groups.get(spec.heading) ?? [];
    items.push({
      id: spec.id,
      label: spec.label,
      ...(spec.hint !== undefined ? { hint: spec.hint } : {}),
      ...(spec.shortcut !== undefined ? { shortcut: spec.shortcut } : {}),
    });
    groups.set(spec.heading, items);
  }

  return [...groups.entries()].map(([heading, items]) => ({ heading, items }));
}
