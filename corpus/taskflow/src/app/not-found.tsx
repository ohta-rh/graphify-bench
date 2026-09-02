/**
 * Global 404 page.
 *
 * Owner D. Static: it must render for signed-out visitors hitting a bad URL, so
 * it reads neither cookies nor the tenant.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-semibold text-slate-300">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-600">
        The page you asked for does not exist, or you no longer have access to
        the organization it belongs to.
      </p>
      <Link href="/" className="text-sm font-medium text-indigo-600">
        Back to taskflow.app
      </Link>
    </main>
  );
}
