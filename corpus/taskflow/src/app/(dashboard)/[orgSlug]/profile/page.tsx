/**
 * Personal profile and timezone.
 *
 * Owner D. The one page in the tenant subtree that edits a *user* record rather
 * than tenant data — there is no permission to check, because the only thing
 * you can change here is yourself.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findUserById } from "@/server/repositories/user-repository";
import { loadTenantContext } from "../_lib/tenant-context";
import { ProfileForm } from "./profile-form";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your profile",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const user = await findUserById(actor.userId);
  if (user === null) {
    notFound();
  }

  return (
    <div className="max-w-lg space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          These details are shared across every organization you belong to, not
          just {org.name}.
        </p>
      </header>

      <ProfileForm user={user} />
    </div>
  );
}
