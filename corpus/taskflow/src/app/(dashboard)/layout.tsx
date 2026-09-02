/**
 * Authenticated shell: resolves the session and redirects to /login when absent.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getSessionPrincipal
 */

import type { ReactNode } from "react";

type LayoutParams = Record<string, never>;

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;
  return <div data-stub="src/app/(dashboard)/layout.tsx">{props.children}</div>;
}
