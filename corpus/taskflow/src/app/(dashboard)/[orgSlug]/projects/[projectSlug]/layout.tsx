/**
 * Project shell with the project header and sub-navigation.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */

import type { ReactNode } from "react";

type LayoutParams = { orgSlug: string; projectSlug: string };

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;
  return <div data-stub="src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/layout.tsx">{props.children}</div>;
}
