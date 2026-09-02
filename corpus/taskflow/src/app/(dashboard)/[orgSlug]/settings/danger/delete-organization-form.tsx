"use client";

/**
 * "Type the slug to confirm" deletion form.
 *
 * Owner D. Private to the danger route. The confirmation is compared here for
 * immediate feedback and again on the server against the *stored* slug, so a
 * stale tab cannot delete a renamed organization.
 */

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganizationAction } from "@/actions/organizations/delete-organization";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";
import type { Organization } from "@/types/organization";

export type DeleteOrganizationFormProps = {
  orgId: OrgId;
  slug: string;
};

type DeleteState = ActionResult<Organization> | null;

export function DeleteOrganizationForm(props: DeleteOrganizationFormProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");

  const [state, submit, pending] = useActionState<DeleteState, FormData>(
    async (_previous, formData) =>
      deleteOrganizationAction({
        orgId: props.orgId,
        confirmSlug: String(formData.get("confirmSlug") ?? ""),
      }),
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push("/orgs");
    }
  }, [state, router]);

  const matches = confirmation === props.slug;

  return (
    <form action={submit} className="space-y-3">
      <label htmlFor="confirmSlug" className="block text-sm text-rose-900">
        Type <code className="font-mono">{props.slug}</code> to confirm
      </label>
      <input
        id="confirmSlug"
        name="confirmSlug"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        className="w-full rounded-md border border-rose-300 px-3 py-2 text-sm"
      />

      {state?.ok === false ? (
        <p role="alert" className="text-sm text-rose-700">
          {state.error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!matches || pending}
        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete organization"}
      </button>
    </form>
  );
}
