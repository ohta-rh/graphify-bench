"use client";

/**
 * Role-aware sidebar: every item is filtered through `can()` and its flag.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import Link from "next/link";
import { SETTINGS_NAV, SIDEBAR_NAV, visibleNav, type NavItem } from "@/config/nav";
import { cn } from "@/lib/cn";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { orgPath, projectPath } from "@/lib/url";
import { orgFlagContext } from "@/hooks/flag-context";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { OrgSwitcher } from "./org-switcher";

export type AppSidebarProps = {
  org: Organization;
  actor: Actor;
  flags: FeatureFlagSnapshot;
  projects: readonly Project[];
  pathname: string;
  /** Orgs offered by the switcher; defaults to just the current one. */
  organizations?: readonly Organization[];
};

/** True when `pathname` is the item's route or lives beneath it. */
export function isActiveSegment(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar(props: AppSidebarProps): ReactElement | null {
  const { org, actor, flags, projects, pathname, organizations } = props;

  // The nav tree declares the permission and flag each item needs; `visibleNav`
  // applies both. Nothing here branches on `actor.role`.
  const context = orgFlagContext(org, actor);
  const primary = visibleNav(SIDEBAR_NAV, actor, flags);
  const settings = visibleNav(SETTINGS_NAV, actor, flags);

  // The project shortcut list is its own gate: reading projects at all, and
  // the public-projects flag for the "shared" affordance.
  const mayReadProjects = can(
    actor,
    "project:read",
    organizationResource(org.id),
  );
  const publicProjectsOn =
    flags.public_projects === true || isEnabled("public_projects", context);

  function renderItem(item: NavItem): ReactElement {
    const href = orgPath(org.slug, item.segment);
    return (
      <li key={item.key}>
        <Link
          href={href}
          className={cn(
            "block rounded px-2 py-1 text-sm",
            isActiveSegment(pathname, href)
              ? "bg-neutral-200 font-medium"
              : "hover:bg-neutral-100",
          )}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <nav className="app-sidebar flex w-56 shrink-0 flex-col gap-4 border-r p-3">
      <OrgSwitcher
        organizations={organizations ?? [org]}
        currentSlug={org.slug}
      />

      <ul className="space-y-0.5">{primary.map(renderItem)}</ul>

      {mayReadProjects && projects.length > 0 ? (
        <section>
          <h2 className="px-2 text-xs font-medium uppercase text-neutral-500">
            Projects
          </h2>
          <ul className="mt-1 space-y-0.5">
            {projects.map((project) => {
              const href = projectPath(org.slug, project.slug);
              return (
                <li key={project.id}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center justify-between rounded px-2 py-1 text-sm",
                      isActiveSegment(pathname, href)
                        ? "bg-neutral-200 font-medium"
                        : "hover:bg-neutral-100",
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                    {publicProjectsOn && project.visibility === "public" ? (
                      <span className="text-xs text-neutral-500">public</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {settings.length > 0 ? (
        <section className="mt-auto">
          <h2 className="px-2 text-xs font-medium uppercase text-neutral-500">
            Settings
          </h2>
          <ul className="mt-1 space-y-0.5">{settings.map(renderItem)}</ul>
        </section>
      ) : null}
    </nav>
  );
}
