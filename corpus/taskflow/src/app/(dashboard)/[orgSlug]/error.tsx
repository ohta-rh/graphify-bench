"use client";

/**
 * Tenant-level error boundary that renders permission and tenant-scope failures.
 *
 * Owner D. The two failures worth distinguishing here are "you are not allowed"
 * (`PermissionDeniedError`) and "that row belongs to another organization"
 * (`TenantScopeError`). Both arrive as a plain `Error` on the client — the
 * class is gone by then — so the boundary matches on `name`, which survives
 * serialisation.
 */

import { useEffect } from "react";

type BoundaryError = Error & { digest?: string };

type Explanation = {
  readonly title: string;
  readonly body: string;
  readonly retryable: boolean;
};

const EXPLANATIONS: Readonly<Record<string, Explanation>> = {
  PermissionDeniedError: {
    title: "You do not have access to this",
    body: "Your role in this organization does not include this action. An owner or admin can change that in Settings → Members.",
    retryable: false,
  },
  ForbiddenActionError: {
    title: "You do not have access to this",
    body: "Your role in this organization does not include this action.",
    retryable: false,
  },
  TenantScopeError: {
    title: "Wrong organization",
    body: "That record belongs to a different organization. Switch organizations and try again.",
    retryable: false,
  },
  PlanLimitError: {
    title: "Plan limit reached",
    body: "This organization has used everything its plan allows. Upgrading in Settings → Billing lifts the limit.",
    retryable: false,
  },
};

const FALLBACK: Explanation = {
  title: "Something went wrong",
  body: "This page could not be loaded. Trying again usually helps.",
  retryable: true,
};

export default function ErrorBoundary(props: {
  error: BoundaryError;
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("[taskflow] tenant error", error.name, error.digest ?? "");
  }, [error]);

  const explanation = EXPLANATIONS[error.name] ?? FALLBACK;

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-lg font-semibold">{explanation.title}</h1>
      <p className="mt-3 text-sm text-slate-600">{explanation.body}</p>

      {explanation.retryable ? (
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      ) : null}

      {error.digest !== undefined ? (
        <p className="mt-6 text-xs text-slate-400">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}
