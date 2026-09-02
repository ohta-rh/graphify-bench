/**
 * Public top navigation.
 *
 * Owner D. A Server Component with no interactivity so the marketing shell stays
 * fully static. It deliberately does not use `SIDEBAR_NAV` from `@/config/nav` —
 * that tree is permission- and flag-filtered, and there is no `Actor` out here.
 */

import Link from "next/link";

type MarketingLink = { readonly href: string; readonly label: string };

const LINKS: readonly MarketingLink[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
];

export function MarketingNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Taskflow
        </Link>

        <ul className="flex items-center gap-6 text-sm text-slate-600">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li>
            <Link href="/login" className="font-medium text-slate-900">
              Sign in
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white"
            >
              Start free
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
