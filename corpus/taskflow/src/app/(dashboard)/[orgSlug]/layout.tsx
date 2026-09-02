/**
 * Tenant shell: resolves the `Actor`, builds the flag snapshot and renders the sidebar.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): resolveActorForOrg, snapshotFlags, assertOrgScope
 */

import type { ReactNode } from "react";

type LayoutParams = { orgSlug: string };

export default async function Layout(props: {
  children: ReactNode;
  panel?: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;
  return <div data-stub="src/app/(dashboard)/[orgSlug]/layout.tsx">{props.children}</div>;
}
