/**
 * Org chooser: lists the organizations the signed-in user belongs to and
 * redirects when there is exactly one.
 *
 * Owner D. This is the only route in the dashboard tree without an `[orgSlug]`,
 * so it is also the only one that works with a `SessionPrincipal` instead of an
 * `Actor` — there is no tenant to scope to until the choice is made.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { UnauthorizedActionError } from "@/actions/_lib/action-errors";
import { getSessionPrincipal } from "@/lib/session";
import { listOrganizationsForUser } from "@/server/services/organization-service";

type PageParams = Record<string, never>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose an organization",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  await props.searchParams;

  const principal = await getSessionPrincipal();
  if (principal === null) {
    throw new UnauthorizedActionError();
  }

  const organizations = await listOrganizationsForUser(principal.userId);

  // One organization is the overwhelmingly common case; do not make people
  // click through a list of one.
  if (organizations.length === 1) {
    redirect(`/${organizations[0].slug}`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-xl font-semibold">Choose an organization</h1>
      <p className="mt-2 text-sm text-slate-600">
        Signed in as {principal.email}.
      </p>

      {organizations.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          You are not a member of any organization yet. Ask a colleague to invite
          you, or create one of your own.
        </p>
      ) : (
        <ul className="mt-8 space-y-2">
          {organizations.map((org) => (
            <li key={org.id}>
              <Link
                href={`/${org.slug}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium">{org.name}</span>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {org.plan}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
