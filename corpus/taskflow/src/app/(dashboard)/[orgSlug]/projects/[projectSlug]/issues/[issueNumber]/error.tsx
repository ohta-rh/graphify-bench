"use client";

/**
 * Issue detail error boundary.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

export default function ErrorBoundary(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div data-stub="src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/error.tsx">
      <h2>Something went wrong</h2>
      <button onClick={props.reset}>Try again</button>
    </div>
  );
}
