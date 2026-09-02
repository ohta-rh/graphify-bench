"use client";

/**
 * Avatar dropdown.
 */
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, type DropdownItem } from "@/components/ui/dropdown-menu";
import { settingsPath } from "@/lib/url";
import type { User } from "@/types/member";
import type { ReactElement } from "react";

export type UserMenuProps = {
  user: User;
  orgSlug: string;
  onSignOut: () => void;
};

export function UserMenu(props: UserMenuProps): ReactElement | null {
  const { user, orgSlug, onSignOut } = props;
  const router = useRouter();

  const items: readonly DropdownItem[] = [
    {
      id: "profile",
      label: "Profile",
      onSelect: () => router.push(settingsPath(orgSlug, "profile")),
    },
    {
      id: "notifications",
      label: "Notification preferences",
      onSelect: () => router.push(settingsPath(orgSlug, "notifications")),
    },
    {
      id: "sign-out",
      label: "Sign out",
      destructive: true,
      onSelect: onSignOut,
    },
  ];

  return (
    <DropdownMenu
      align="end"
      trigger={<Avatar name={user.name} src={user.avatarUrl} size="sm" />}
      items={items}
    />
  );
}
