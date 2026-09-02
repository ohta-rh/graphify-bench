"use client";

/**
 * Client form bound to `loginSchema` and the login action.
 *
 * Owner D. The same Zod schema runs twice: here, to render field errors without
 * a round trip, and again inside `loginAction` on the server — the client copy
 * is a convenience, never the enforcement.
 *
 * Must call (do not reimplement): loginSchema
 */

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/actions/auth/login";
import { fieldErrorsFromZod } from "@/lib/errors";
import { loginSchema } from "@/schemas/auth";
import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

export type LoginFormProps = {
  /** Where to land after a successful sign-in; defaults to the org chooser. */
  next: string;
};

type LoginState = ActionResult<SessionPrincipal> | null;

export function LoginForm(props: LoginFormProps) {
  const router = useRouter();

  const [state, submit, pending] = useActionState<LoginState, FormData>(
    async (_previous, formData) => {
      const parsed = loginSchema.safeParse({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        rememberMe: formData.get("rememberMe") === "on",
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

      return loginAction(parsed.data);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push(props.next);
    }
  }, [state, router, props.next]);

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      <h1 className="text-lg font-semibold">Sign in</h1>

      {state?.ok === false && state.error.code !== "validation_failed" ? (
        <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error.message}
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
        <FieldError messages={fieldErrors.email} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <FieldError messages={fieldErrors.password} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="rememberMe" />
        Keep me signed in
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/reset-password">Forgot your password?</Link>
      </p>
    </form>
  );
}

function FieldError(props: { messages?: readonly string[] }) {
  if (props.messages === undefined || props.messages.length === 0) return null;
  return <p className="text-xs text-rose-600">{props.messages[0]}</p>;
}
