/**
 * Unknown issue number.
 *
 * Owner D. Issue numbers are per-project, so the same number usually exists in
 * a sibling project — the copy says as much, because "not found" on a number
 * you can plainly see in another tab is otherwise baffling.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">Issue not found</h1>
      <p className="mt-3 text-sm text-slate-600">
        Issue numbers count from one within each project, so this number may
        belong to a different project — or the issue may have been archived.
      </p>
      <Link href="../" className="mt-6 inline-block text-sm text-indigo-600">
        Back to the issue list
      </Link>
    </div>
  );
}
