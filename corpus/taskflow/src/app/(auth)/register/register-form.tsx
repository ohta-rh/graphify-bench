"use client";

/**
 * Client form bound to `registerSchema`.
 *
 * Owner D. `registerSchema` carries the password policy *and* the
 * confirm-password refinement, so running it here means the "passwords do not
 * match" message is produced by the same rule the server applies.
 *
 * Must call (do not reimplement): registerSchema
 */

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerAction } from "@/actions/auth/register";
import { fieldErrorsFromZod } from "@/lib/errors";
import { registerSchema } from "@/schemas/auth";
import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

type RegisterState = ActionResult<SessionPrincipal> | null;

export function RegisterForm() {
  const router = useRouter();

  const [state, submit, pending] = useActionState<RegisterState, FormData>(
    async (_previous, formData) => {
      const parsed = registerSchema.safeParse({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        acceptTerms: formData.get("acceptTerms") === "on",
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

      return registerAction(parsed.data);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push("/orgs");
    }
  }, [state, router]);

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      <h1 className="text-lg font-semibold">Create your organization</h1>

      {state?.ok === false && state.error.code !== "validation_failed" ? (
        <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error.message}
        </p>
      ) : null}

      <Field id="name" label="Your name" errors={fieldErrors.name}>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field id="email" label="Work email" errors={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field
        id="password"
        label="Password"
        hint="At least 12 characters, with an upper case letter and a digit."
        errors={fieldErrors.password}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field
        id="confirmPassword"
        label="Confirm password"
        errors={fieldErrors.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="acceptTerms" className="mt-1" />
        I accept the terms of service.
      </label>
      {fieldErrors.acceptTerms !== undefined ? (
        <p className="text-xs text-rose-600">{fieldErrors.acceptTerms[0]}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function Field(props: {
  id: string;
  label: string;
  hint?: string;
  errors?: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={props.id} className="text-sm font-medium">
        {props.label}
      </label>
      {props.children}
      {props.hint !== undefined ? (
        <p className="text-xs text-slate-500">{props.hint}</p>
      ) : null}
      {props.errors !== undefined && props.errors.length > 0 ? (
        <p className="text-xs text-rose-600">{props.errors[0]}</p>
      ) : null}
    </div>
  );
}
