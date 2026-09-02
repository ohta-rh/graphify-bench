"use client";

/**
 * Quick project navigation combobox.
 */
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { isLive } from "@/lib/soft-delete";
import { projectPath } from "@/lib/url";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";

export type ProjectSwitcherProps = {
  projects: readonly Project[];
  currentSlug: string;
  orgSlug: string;
};

export function ProjectSwitcher(
  props: ProjectSwitcherProps,
): ReactElement | null {
  const { projects, currentSlug, orgSlug } = props;
  const router = useRouter();

  // Archived projects stay reachable by URL but are not offered here.
  const options: readonly ComboboxOption[] = projects
    .filter(isLive)
    .map((project) => ({
      value: project.slug,
      label: project.name,
      description: project.key,
    }));

  return (
    <Combobox
      value={currentSlug}
      options={options}
      placeholder="Jump to project"
      emptyLabel="No active projects"
      onChange={(slug) => {
        if (slug === null || slug === currentSlug) return;
        router.push(projectPath(orgSlug, slug));
      }}
    />
  );
}
