/**
 * Centred card shell for the unauthenticated flows.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

import type { ReactNode } from "react";

type LayoutParams = Record<string, never>;

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;
  return <div data-stub="src/app/(auth)/layout.tsx">{props.children}</div>;
}
