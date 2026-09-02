/**
 * Centred card shell for the unauthenticated flows.
 *
 * Owner D. Shared by login, register, password reset and invitation
 * acceptance. It renders no navigation on purpose: everything in this tree is a
 * single-task page and a nav bar is only somewhere to get lost.
 */

import type { ReactNode } from "react";
import Link from "next/link";

type LayoutParams = Record<string, never>;

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  await props.params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        Taskflow
      </Link>

      <main className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        {props.children}
      </main>

      <p className="mt-8 text-xs text-slate-500">
        Trouble signing in? Ask an owner of your organization to re-invite you.
      </p>
    </div>
  );
}
