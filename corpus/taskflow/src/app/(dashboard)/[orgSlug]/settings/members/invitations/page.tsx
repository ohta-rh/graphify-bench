/**
 * Pending invitations.
 *
 * Owner D. Read-only listing plus revoke. `InvitationService` exposes the
 * lifecycle verbs but no listing, so the page reads
 * `listPendingInvitations()` from the repository directly — the query is
 * already org-scoped and there is no rule for a service to add on top of it.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PENDING_MEMBER_ID } from "@/actions/_lib/permission-resources";
import { InvitationList } from "@/components/domain/member/invitation-list";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { listPendingInvitations } from "@/server/repositories/invitation-repository";
import { revokeInvitation } from "@/server/services/invitation-service";
import type { InvitationId } from "@/types/common";
import { loadTenantContext } from "../../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pending invitations",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const mayRead = can(actor, "member:read", {
    kind: "member",
    orgId: org.id,
    memberId: PENDING_MEMBER_ID,
    targetUserId: actor.userId,
    targetRole: actor.role,
  });
  if (!mayRead) {
    notFound();
  }

  const invitations = await listPendingInvitations(org.id);

  async function revoke(invitationId: InvitationId): Promise<void> {
    "use server";
    await revokeInvitation(actor, invitationId);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Pending invitations
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Invitations that have been sent but not yet accepted. Each one still
          counts against the seat quota.
        </p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState
          title="No invitations outstanding"
          description="Everybody who was invited has either joined or been revoked."
        />
      ) : (
        <InvitationList
          invitations={invitations}
          actor={actor}
          onRevoke={revoke}
        />
      )}
    </div>
  );
}
