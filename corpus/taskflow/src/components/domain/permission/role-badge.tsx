/**
 * Coloured badge for a member's role.
 */
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanizeRole } from "@/lib/format";
import type { Role } from "@/types/member";
import type { ReactElement } from "react";

export type RoleBadgeProps = { role: Role; size?: "sm" | "md" };

/** Owner and admin read as elevated; member is neutral; viewer is muted. */
const TONE_BY_ROLE: Readonly<Record<Role, NonNullable<BadgeProps["tone"]>>> = {
  owner: "brand",
  admin: "success",
  member: "neutral",
  viewer: "neutral",
};

export function RoleBadge(props: RoleBadgeProps): ReactElement | null {
  return (
    <Badge tone={TONE_BY_ROLE[props.role]} size={props.size ?? "sm"}>
      {humanizeRole(props.role)}
    </Badge>
  );
}
