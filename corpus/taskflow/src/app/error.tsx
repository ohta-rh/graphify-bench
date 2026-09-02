"use client";

/**
 * Global error boundary (client component).
 *
 * Owner D. Catches anything thrown outside the tenant subtree — the marketing
 * pages and the auth flows. The tenant tree has its own boundary that can say
 * something more useful about permission and scope failures.
 */

import { useEffect } from "react";

export default function ErrorBoundary(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    // The digest is the only handle on the server-side stack, so surface it.
    console.error("[taskflow] unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600">
        The page could not be rendered. Trying again is usually enough; if it
        keeps happening, quote the reference below.
      </p>
      {error.digest !== undefined ? (
        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
          {error.digest}
        </code>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
