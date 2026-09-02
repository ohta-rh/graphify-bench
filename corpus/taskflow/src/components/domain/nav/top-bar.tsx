"use client";

/**
 * Header with search trigger, notifications and the user menu.
 *
 * Must call (do not reimplement): isEnabled
 */
import { Button } from "@/components/ui/button";
import { isEnabled } from "@/lib/feature-flags";
import { orgFlagContext } from "@/hooks/flag-context";
import { formatShortcut } from "@/hooks/shortcut-match";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor, User } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { ReactElement } from "react";
import { NotificationBell } from "../notification/notification-bell";
import { UserMenu } from "./user-menu";

export type TopBarProps = {
  org: Organization;
  actor: Actor;
  unreadCount: number;
  flags: FeatureFlagSnapshot;
  /** The signed-in user record, for the avatar menu. */
  user?: User;
  onOpenSearch?: () => void;
  onSignOut?: () => void;
};

export function TopBar(props: TopBarProps): ReactElement | null {
  const { org, actor, unreadCount, flags, user, onOpenSearch, onSignOut } =
    props;

  const context = orgFlagContext(org, actor);
  const paletteOn =
    flags.command_palette === true || isEnabled("command_palette", context);
  const advancedSearchOn =
    flags.advanced_search === true || isEnabled("advanced_search", context);

  return (
    <header className="top-bar flex items-center justify-between gap-3 border-b px-4 py-2">
      <span className="font-semibold">{org.name}</span>

      <div className="flex flex-1 justify-center">
        {paletteOn ? (
          <Button variant="secondary" size="sm" onClick={onOpenSearch}>
            {advancedSearchOn ? "Search issues, comments, projects" : "Search"}
            <span className="ml-2 text-xs text-neutral-500">
              {formatShortcut(["mod", "k"])}
            </span>
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell unreadCount={unreadCount} orgSlug={org.slug} />
        {user !== undefined ? (
          <UserMenu
            user={user}
            orgSlug={org.slug}
            onSignOut={onSignOut ?? (() => undefined)}
          />
        ) : null}
      </div>
    </header>
  );
}
