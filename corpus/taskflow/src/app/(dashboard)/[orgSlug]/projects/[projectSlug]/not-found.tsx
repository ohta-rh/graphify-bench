/**
 * Unknown project slug.
 *
 * Owner D. Also shown for a private project the caller is not a member of —
 * `loadProjectContext` collapses both into `notFound()` on purpose.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">Project not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        It may have been archived, renamed, or restricted to people who are on
        it.
      </p>
      <Link href="../" className="mt-6 inline-block text-sm text-indigo-600">
        Back to projects
      </Link>
    </div>
  );
}
