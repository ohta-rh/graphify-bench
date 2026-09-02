/**
 * Marketing shell with the public nav and footer.
 *
 * Owner D. Stays static: no `cookies()`, no session, no service call anywhere
 * beneath it apart from the frozen `PLAN_LIMITS` table.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingNav } from "./_components/marketing-nav";

type LayoutParams = Record<string, never>;

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;
  // Nothing below reads cookies, headers or searchParams, which is what keeps
  // this whole subtree prerenderable.

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNav />
      <div className="flex-1">{props.children}</div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <p>© Taskflow. Project tracking for small teams.</p>
          <nav className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
