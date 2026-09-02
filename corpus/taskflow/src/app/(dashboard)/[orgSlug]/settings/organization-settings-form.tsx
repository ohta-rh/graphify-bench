"use client";

/**
 * Organization profile and settings editor.
 *
 * Owner D. Private to the settings route. `updateOrganizationSchema` accepts a
 * *partial* settings block, so the form only sends the keys it renders — the
 * service merges them over what is stored.
 */

import { useActionState } from "react";
import { updateOrganizationAction } from "@/actions/organizations/update-organization";
import { fieldErrorsFromZod } from "@/lib/errors";
import { updateOrganizationSchema } from "@/schemas/organization";
import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

export type OrganizationSettingsFormProps = {
  org: Organization;
  disabled: boolean;
};

type SettingsState = ActionResult<Organization> | null;

export function OrganizationSettingsForm(props: OrganizationSettingsFormProps) {
  const { org, disabled } = props;

  const [state, submit, pending] = useActionState<SettingsState, FormData>(
    async (_previous, formData) => {
      const logoUrl = String(formData.get("logoUrl") ?? "").trim();

      const parsed = updateOrganizationSchema.safeParse({
        orgId: org.id,
        name: String(formData.get("name") ?? ""),
        logoUrl: logoUrl.length === 0 ? null : logoUrl,
        settings: {
          allowPublicProjects: formData.get("allowPublicProjects") === "on",
          requireTwoFactor: formData.get("requireTwoFactor") === "on",
          digestHourUtc: Number(formData.get("digestHourUtc") ?? 7),
        },
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

      return updateOrganizationAction(parsed.data);
    },
    null,
  );

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-6">
      {state?.ok === true ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Settings saved.
        </p>
      ) : null}
      {state?.ok === false && state.error.code === "forbidden" ? (
        <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Your role does not allow changing organization settings.
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={org.name}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        {fieldErrors.name !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="logoUrl" className="text-sm font-medium">
          Logo URL
        </label>
        <input
          id="logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={org.logoUrl ?? ""}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="digestHourUtc" className="text-sm font-medium">
          Digest hour (UTC)
        </label>
        <input
          id="digestHourUtc"
          name="digestHourUtc"
          type="number"
          min={0}
          max={23}
          defaultValue={org.settings.digestHourUtc}
          disabled={disabled}
          className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        <p className="text-xs text-slate-500">
          The daily digest job runs once an hour and picks up organizations whose
          hour has come round.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allowPublicProjects"
          defaultChecked={org.settings.allowPublicProjects}
          disabled={disabled}
        />
        Allow projects to be made public
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requireTwoFactor"
          defaultChecked={org.settings.requireTwoFactor}
          disabled={disabled}
        />
        Require two-factor authentication
      </label>

      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
