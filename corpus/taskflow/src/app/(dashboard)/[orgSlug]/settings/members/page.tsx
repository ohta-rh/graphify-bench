/**
 * Member management with invite and role controls.
 *
 * Owner D. The seat check is computed here and handed to both the invite form
 * (which disables itself when full) and the banner — one `LimitCheck`, two
 * consumers, so they cannot disagree.
 *
 * Must call (do not reimplement): can, getPlanLimits
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { inviteMemberAction } from "@/actions/members/invite-member";
import { removeMemberAction } from "@/actions/members/remove-member";
import { updateMemberRoleAction } from "@/actions/members/update-member-role";
import { PENDING_MEMBER_ID } from "@/actions/_lib/permission-resources";
import { InviteMemberForm } from "@/components/domain/member/invite-member-form";
import { MemberTable } from "@/components/domain/member/member-table";
import { SeatLimitBanner } from "@/components/domain/billing/seat-limit-banner";
import { getPlanLimits } from "@/config/plan-limits";
import { can } from "@/lib/permissions";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import { checkLimit } from "@/server/services/billing-service";
import { listMembers } from "@/server/services/member-service";
import type { LimitCheck } from "@/types/billing";
import type { MemberId } from "@/types/common";
import type { Role } from "@/types/member";
import { loadTenantContext } from "../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Members",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

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

  const mayInvite = can(actor, "member:invite", {
    kind: "member",
    orgId: org.id,
    memberId: PENDING_MEMBER_ID,
    targetUserId: actor.userId,
    targetRole: "member",
  });

  const pagination = searchParamsPaginationSchema.parse(search);

  const [members, seats] = await Promise.all([
    listMembers(actor, {
      orgId: org.id,
      limit: pagination.perPage,
      cursor: pagination.cursor ?? null,
    }),
    checkLimit(org.id, "seats"),
  ]);

  // The plan's ceiling is shown next to the live check so the page explains the
  // number rather than just enforcing it.
  const limits = getPlanLimits(org.plan);

  async function changeRole(memberId: MemberId, role: Role): Promise<void> {
    "use server";
    await updateMemberRoleAction({ orgId: org.id, memberId, role });
  }

  async function remove(memberId: MemberId): Promise<void> {
    "use server";
    await removeMemberAction({ orgId: org.id, memberId });
  }

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-slate-600">
            {members.total} of {limits.seats} seats used on the {org.plan} plan.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/settings/members/invitations`}
          className="text-sm text-indigo-600"
        >
          Pending invitations
        </Link>
      </header>

      <SeatLimitBanner check={seats satisfies LimitCheck} orgSlug={orgSlug} actor={actor} />

      {mayInvite ? (
        <InviteMemberForm
          orgId={org.id}
          actor={actor}
          seatCheck={seats}
          onSubmit={inviteMemberAction}
        />
      ) : null}

      <MemberTable
        members={members.items}
        actor={actor}
        onRoleChange={changeRole}
        onRemove={remove}
      />
    </div>
  );
}
