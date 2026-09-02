"use client";

/**
 * Tenant switcher; navigating changes the whole `[orgSlug]` subtree.
 */
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { orgPath } from "@/lib/url";
import type { Organization } from "@/types/organization";
import type { ReactElement } from "react";

export type OrgSwitcherProps = {
  organizations: readonly Organization[];
  currentSlug: string;
};

export function OrgSwitcher(props: OrgSwitcherProps): ReactElement | null {
  const { organizations, currentSlug } = props;
  const router = useRouter();

  const options: readonly ComboboxOption[] = organizations.map((org) => ({
    value: org.slug,
    label: org.name,
    description: org.plan,
  }));

  return (
    <Combobox
      value={currentSlug}
      options={options}
      placeholder="Switch organization"
      emptyLabel="No other organizations"
      onChange={(slug) => {
        if (slug === null || slug === currentSlug) return;
        // A hard navigation, not a client patch: every server component below
        // `[orgSlug]` resolves a different tenant and must re-render.
        router.push(orgPath(slug));
      }}
    />
  );
}
