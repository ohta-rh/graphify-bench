/**
 * Invitation landing page; accepts or explains an expired token.
 *
 * Owner D. Dynamic, because whether the visitor already has a session decides
 * what they are shown: signed in, they get an accept button; signed out, they
 * are sent to the sign-in form with the invite as the destination.
 *
 * The token itself is never resolved here — `InvitationService` is the only
 * thing that may look one up, and only when it is being consumed.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionPrincipal } from "@/lib/session";
import { invitationTokenSchema } from "@/schemas/invitation";
import { InviteAcceptForm } from "./invite-accept-form";

type PageParams = { token: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You have been invited",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { token } = await props.params;
  const search = await props.searchParams;

  const parsed = invitationTokenSchema.safeParse(token);
  if (!parsed.success) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">This invitation is not valid</h1>
        <p className="text-sm text-slate-600">
          The link may have been truncated by an email client, or the invitation
          may have been revoked. Ask whoever invited you to send a new one.
        </p>
        <Link href="/login" className="text-sm text-indigo-600">
          Go to sign in
        </Link>
      </div>
    );
  }

  const principal = await getSessionPrincipal();
  if (principal === null) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const orgSlug = typeof search.org === "string" ? search.org : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">You have been invited</h1>
        <p className="text-sm text-slate-600">
          Accepting adds {principal.email} to the organization and takes up one
          of its seats.
        </p>
      </div>

      <InviteAcceptForm token={parsed.data} orgSlug={orgSlug} />
    </div>
  );
}
