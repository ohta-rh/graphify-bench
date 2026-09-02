"use client";

/**
 * Accept button for an invitation token.
 *
 * Owner D. Private to the invite route — the token is the credential, so the
 * only thing the client does is hand it back and route to the organization it
 * unlocked.
 */

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/actions/members/accept-invitation";
import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

export type InviteAcceptFormProps = {
  token: string;
  orgSlug: string | null;
};

type AcceptState = ActionResult<Member> | null;

export function InviteAcceptForm(props: InviteAcceptFormProps) {
  const router = useRouter();

  const [state, submit, pending] = useActionState<AcceptState, FormData>(
    async (_previous, formData) =>
      acceptInvitationAction({ token: String(formData.get("token") ?? "") }),
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push(props.orgSlug === null ? "/orgs" : `/${props.orgSlug}`);
    }
  }, [state, router, props.orgSlug]);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="token" value={props.token} />

      {state?.ok === false ? (
        <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error.code === "plan_limit_exceeded"
            ? "That organization has run out of seats. Ask an owner to free one or upgrade the plan."
            : state.error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Joining…" : "Accept invitation"}
      </button>
    </form>
  );
}
