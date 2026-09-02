/**
 * Hides nav items the actor cannot access.
 *
 * Owner B implements `@/components/domain/nav/app-sidebar`. The filtering rule
 * itself is covered by `tests/config/nav.test.ts`; these assert the rendering.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// AppSidebar renders `OrgSwitcher`, a client component that calls
// `useRouter()` from `next/navigation`; jsdom has no app-router context, so
// the hook is stubbed the way the app's own router provider would supply it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { AppSidebar } from "@/components/domain/nav/app-sidebar";
import { SIDEBAR_NAV, visibleNav } from "@/config/nav";
import { orgPath, projectPath } from "@/lib/url";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import { makeActor, makeOrganization, makeProject } from "../helpers/factories";

afterEach(cleanup);

const NO_FLAGS: FeatureFlagSnapshot = {
  kanban_board: false,
  ai_issue_summary: false,
  command_palette: false,
  activity_feed: false,
  public_projects: false,
  webhooks: false,
  csv_export: false,
  digest_email: false,
  issue_templates: false,
  advanced_search: false,
};

const ALL_FLAGS: FeatureFlagSnapshot = {
  ...NO_FLAGS,
  kanban_board: true,
  activity_feed: true,
  advanced_search: true,
};

describe("components/app-sidebar", () => {
  // The sidebar renders exactly the labels visibleNav() returns for the actor.
  it("renders one link per visible nav item", () => {
    const org = makeOrganization();
    const actor = makeActor({ role: "owner", orgId: org.id });

    render(
      <AppSidebar
        org={org}
        actor={actor}
        flags={ALL_FLAGS}
        projects={[]}
        pathname="/acme"
      />,
    );

    const expected = visibleNav(SIDEBAR_NAV, actor, ALL_FLAGS);
    for (const item of expected) {
      expect(screen.getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }
  });

  // A viewer's sidebar has no Activity link, because activity:read is member+.
  it("omits a nav item the actor lacks the permission for", () => {
    const org = makeOrganization();
    const actor = makeActor({ role: "viewer", orgId: org.id });

    render(
      <AppSidebar
        org={org}
        actor={actor}
        flags={ALL_FLAGS}
        projects={[]}
        pathname="/acme"
      />,
    );

    expect(screen.queryByRole("link", { name: "Activity" })).not.toBeInTheDocument();
  });

  // With the kanban_board flag off, the Board child link is absent.
  it("omits a nav item whose flag is off in the snapshot", () => {
    const org = makeOrganization();
    const actor = makeActor({ role: "owner", orgId: org.id });

    render(
      <AppSidebar
        org={org}
        actor={actor}
        flags={NO_FLAGS}
        projects={[]}
        pathname="/acme"
      />,
    );

    expect(screen.queryByRole("link", { name: "Board" })).not.toBeInTheDocument();
  });

  // Child items render nested under their parent.
  it("nests child items under their parent", () => {
    const org = makeOrganization();
    const actor = makeActor({ role: "owner", orgId: org.id });

    render(
      <AppSidebar
        org={org}
        actor={actor}
        flags={ALL_FLAGS}
        projects={[]}
        pathname="/acme"
      />,
    );

    const issuesLink = screen.getByRole("link", { name: "Issues" });
    const parentItem = issuesLink.closest("li");
    expect(parentItem).not.toBeNull();

    const childLink = screen.getByRole("link", { name: "Assigned to me" });
    // The child link lives inside the parent <li>, not as a sibling of it.
    expect(parentItem).toContainElement(childLink);
  });

  // hrefs come from @/lib/url, not from string concatenation in the component.
  it("builds hrefs through the url helpers", () => {
    const org = makeOrganization();
    const actor = makeActor({ role: "owner", orgId: org.id });
    const project = makeProject({ orgId: org.id });

    render(
      <AppSidebar
        org={org}
        actor={actor}
        flags={ALL_FLAGS}
        projects={[project]}
        pathname="/acme"
      />,
    );

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      orgPath(org.slug, ""),
    );
    expect(screen.getByRole("link", { name: project.name })).toHaveAttribute(
      "href",
      projectPath(org.slug, project.slug),
    );
  });
});
