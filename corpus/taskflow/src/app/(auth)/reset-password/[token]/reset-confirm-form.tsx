"use client";

/**
 * Client form bound to `passwordResetConfirmSchema`.
 *
 * Owner D. The token arrives as a route param and is submitted as a hidden
 * field, so the same schema validates the whole payload — token included —
 * on both sides of the wire.
 *
 * Must call (do not reimplement): passwordResetConfirmSchema
 */

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmPasswordResetAction } from "@/actions/auth/reset-password";
import { fieldErrorsFromZod } from "@/lib/errors";
import { passwordResetConfirmSchema } from "@/schemas/auth";
import type { ActionResult } from "@/types/api";

export type ResetConfirmFormProps = {
  token: string;
};

type ConfirmState = ActionResult<null> | null;

export function ResetConfirmForm(props: ResetConfirmFormProps) {
  const router = useRouter();

  const [state, submit, pending] = useActionState<ConfirmState, FormData>(
    async (_previous, formData) => {
      const parsed = passwordResetConfirmSchema.safeParse({
        token: String(formData.get("token") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message: "Check the fields below.",
            fieldErrors: fieldErrorsFromZod(parsed.error),
          },
        };
      }

      return confirmPasswordResetAction(parsed.data);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push("/login");
    }
  }, [state, router]);

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      <h1 className="text-lg font-semibold">Choose a new password</h1>

      <input type="hidden" name="token" value={props.token} />

      {state?.ok === false && state.error.code !== "validation_failed" ? (
        <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error.message}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.password !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.confirmPassword !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.confirmPassword[0]}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
