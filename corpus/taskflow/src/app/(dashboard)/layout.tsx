/**
 * Authenticated shell: resolves the session and redirects to /login when absent.
 *
 * Owner D. This is the only place the signed-in/signed-out decision is made for
 * the whole dashboard tree. `src/proxy.ts` also looks at the session cookie, but
 * only to short-circuit obvious cases — the cookie being present is not proof
 * the session is live, so the real check happens here.
 *
 * Must call (do not reimplement): getSessionPrincipal
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionPrincipal } from "@/lib/session";

type LayoutParams = Record<string, never>;

export const dynamic = "force-dynamic";

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;

  const principal = await getSessionPrincipal();
  if (principal === null) {
    redirect("/login");
  }

  return <div className="min-h-screen bg-slate-50">{props.children}</div>;
}
