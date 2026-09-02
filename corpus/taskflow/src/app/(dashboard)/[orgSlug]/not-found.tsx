/**
 * Shown when the org slug does not resolve.
 *
 * Owner D. Also reached when the organization exists but the caller has no
 * membership in it — the tenant layout collapses both cases into `notFound()`
 * so a stranger cannot probe for valid slugs.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-lg font-semibold">Organization not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        Either this organization does not exist, or your membership in it has
        been removed.
      </p>
      <Link href="/orgs" className="mt-6 inline-block text-sm text-indigo-600">
        Choose another organization
      </Link>
    </div>
  );
}
