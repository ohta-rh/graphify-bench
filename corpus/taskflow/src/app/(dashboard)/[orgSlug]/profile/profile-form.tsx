"use client";

/**
 * Profile editor bound to `updateProfileSchema`.
 *
 * Owner D. Private to the profile route. Only the fields the user actually
 * touched are submitted — the schema makes every field optional, so an omitted
 * key means "leave it alone" rather than "clear it".
 */

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/profile/update-profile";
import { fieldErrorsFromZod } from "@/lib/errors";
import { updateProfileSchema } from "@/schemas/member";
import type { ActionResult } from "@/types/api";
import type { User } from "@/types/member";

export type ProfileFormProps = {
  user: User;
};

type ProfileState = ActionResult<User> | null;

export function ProfileForm(props: ProfileFormProps) {
  const { user } = props;

  const [state, submit, pending] = useActionState<ProfileState, FormData>(
    async (_previous, formData) => {
      const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

      const parsed = updateProfileSchema.safeParse({
        userId: user.id,
        name: String(formData.get("name") ?? ""),
        timezone: String(formData.get("timezone") ?? ""),
        avatarUrl: avatarUrl.length === 0 ? null : avatarUrl,
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

      return updateProfileAction(parsed.data);
    },
    null,
  );

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      {state?.ok === true ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={user.name}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.name !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={user.timezone}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-slate-500">
          Used to decide when your daily digest is sent.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="avatarUrl" className="text-sm font-medium">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={user.avatarUrl ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.avatarUrl !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.avatarUrl[0]}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
