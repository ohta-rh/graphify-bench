"use client";

/**
 * Issue detail error boundary.
 *
 * Owner D. Scoped tightly to this route so a failure loading one issue does not
 * blank the project shell around it — the tabs stay usable and the reader can
 * navigate away.
 */

import { useEffect } from "react";

export default function ErrorBoundary(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("[taskflow] issue detail failed", error.name, error.digest ?? "");
  }, [error]);

  const conflict = error.name === "AlreadyArchivedError";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-base font-semibold">
        {conflict ? "This issue has been archived" : "This issue could not be loaded"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {conflict
          ? "Somebody archived it while you were reading. It is still in the list with archived issues shown."
          : "The comment thread or the activity rail failed to load."}
      </p>

      {!conflict ? (
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
