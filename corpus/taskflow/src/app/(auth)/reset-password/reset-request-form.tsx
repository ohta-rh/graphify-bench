"use client";

/**
 * Client form bound to `passwordResetRequestSchema`.
 *
 * Owner D. Success is reported for any well-formed address, including ones with
 * no account — the server behaves the same way, so the form cannot be used to
 * enumerate users.
 *
 * Must call (do not reimplement): passwordResetRequestSchema
 */

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/auth/reset-password";
import { fieldErrorsFromZod } from "@/lib/errors";
import { passwordResetRequestSchema } from "@/schemas/auth";
import type { ActionResult } from "@/types/api";

type RequestState = ActionResult<null> | null;

export function ResetRequestForm() {
  const [state, submit, pending] = useActionState<RequestState, FormData>(
    async (_previous, formData) => {
      const parsed = passwordResetRequestSchema.safeParse({
        email: String(formData.get("email") ?? ""),
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message: "Enter a valid email address.",
            fieldErrors: fieldErrorsFromZod(parsed.error),
          },
        };
      }

      return requestPasswordResetAction(parsed.data);
    },
    null,
  );

  if (state?.ok === true) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Check your inbox</h1>
        <p className="text-sm text-slate-600">
          If that address belongs to a Taskflow account, a reset link is on its
          way. The link is valid for one hour.
        </p>
      </div>
    );
  }

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <p className="text-sm text-slate-600">
        We will email you a link to choose a new one.
      </p>

      {state?.ok === false && state.error.code === "rate_limited" ? (
        <p role="alert" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Too many attempts. Wait a few minutes and try again.
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.email !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
