/**
 * Declarative navigation tree. Each item names the permission and flag that
 * gate it, which is how the sidebar stays role-aware without ad-hoc
 * conditionals: `visibleNav()` is the only place that decides what a given
 * actor sees, and it decides by calling `can()` and consulting the flag
 * snapshot rather than by branching on `actor.role`.
 */
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import type { FeatureFlagKey, FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { PermissionAction, PermissionResource } from "@/types/permission";

export type NavItem = {
  key: string;
  label: string;
  segment: string;
  icon?: string;
  action?: PermissionAction;
  flag?: FeatureFlagKey;
  children?: readonly NavItem[];
};

export const SIDEBAR_NAV: readonly NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    segment: "",
    icon: "home",
    action: "org:read",
  },
  {
    key: "projects",
    label: "Projects",
    segment: "projects",
    icon: "folder",
    action: "project:read",
  },
  {
    key: "issues",
    label: "Issues",
    segment: "issues",
    icon: "circle-dot",
    action: "issue:read",
    children: [
      {
        key: "issues.assigned",
        label: "Assigned to me",
        segment: "issues?assignee=me",
        action: "issue:read",
      },
      {
        key: "issues.board",
        label: "Board",
        segment: "board",
        action: "issue:read",
        flag: "kanban_board",
      },
      {
        key: "issues.search",
        label: "Advanced search",
        segment: "search",
        action: "issue:read",
        flag: "advanced_search",
      },
    ],
  },
  {
    key: "inbox",
    label: "Inbox",
    segment: "inbox",
    icon: "bell",
    action: "notification:read",
  },
  {
    key: "activity",
    label: "Activity",
    segment: "activity",
    icon: "history",
    action: "activity:read",
    flag: "activity_feed",
  },
  {
    key: "members",
    label: "Members",
    segment: "members",
    icon: "users",
    action: "member:read",
  },
];

export const SETTINGS_NAV: readonly NavItem[] = [
  {
    key: "settings.general",
    label: "General",
    segment: "general",
    action: "org:read",
  },
  {
    key: "settings.members",
    label: "Members",
    segment: "members",
    action: "member:read",
  },
  {
    key: "settings.billing",
    label: "Billing",
    segment: "billing",
    action: "org:manage_billing",
  },
  {
    key: "settings.flags",
    label: "Feature flags",
    segment: "flags",
    action: "org:manage_flags",
  },
  {
    key: "settings.webhooks",
    label: "Webhooks",
    segment: "webhooks",
    action: "webhook:manage",
    flag: "webhooks",
  },
  {
    key: "settings.export",
    label: "Export",
    segment: "export",
    action: "activity:export",
    flag: "csv_export",
  },
];

/**
 * The resource a nav-level permission question is asked about. Nav items are
 * asked "could this actor do this at all in this org?", so the resource is
 * always the actor's own org, shaped for the action's resource kind.
 */
function navResource(action: PermissionAction, actor: Actor): PermissionResource {
  const [domain] = action.split(":");
  switch (domain) {
    case "org":
      return action === "org:manage_billing"
        ? { kind: "billing", orgId: actor.orgId }
        : { kind: "organization", orgId: actor.orgId };
    case "activity":
      return { kind: "activity", orgId: actor.orgId };
    case "notification":
      return { kind: "notification", orgId: actor.orgId, recipientId: actor.userId };
    case "webhook":
      return { kind: "webhook", orgId: actor.orgId, webhookId: null };
    default:
      // member / project / issue / comment nav entries are org-wide questions.
      return { kind: "organization", orgId: actor.orgId };
  }
}

/**
 * A snapshot is normally complete, but a client provider may be holding one
 * serialised before a flag existed. Fall back to evaluating the flag directly
 * with the conservative context we can build from the actor alone.
 */
function flagAllows(
  flag: FeatureFlagKey,
  actor: Actor,
  flags: FeatureFlagSnapshot,
): boolean {
  const snapshotted: boolean | undefined = flags[flag];
  if (typeof snapshotted === "boolean") return snapshotted;
  return isEnabled(flag, {
    orgId: actor.orgId,
    userId: actor.userId,
    plan: "free",
    role: actor.role,
  });
}

/**
 * Filters a nav tree down to what `actor` may see, recursing into children.
 * A parent whose every child was filtered away and which has no destination
 * of its own is dropped too, so the sidebar never renders an empty group.
 */
export function visibleNav(
  items: readonly NavItem[],
  actor: Actor,
  flags: FeatureFlagSnapshot,
): readonly NavItem[] {
  const visible: NavItem[] = [];

  for (const item of items) {
    if (item.flag !== undefined && !flagAllows(item.flag, actor, flags)) {
      continue;
    }
    if (item.action !== undefined && !can(actor, item.action, navResource(item.action, actor))) {
      continue;
    }

    if (item.children === undefined) {
      visible.push(item);
      continue;
    }

    const children = visibleNav(item.children, actor, flags);
    if (children.length === 0 && item.segment === "") continue;
    visible.push({ ...item, children });
  }

  return visible;
}
