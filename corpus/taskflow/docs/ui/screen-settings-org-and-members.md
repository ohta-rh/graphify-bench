---
title: Settings — organization and members
id: UI-SETTINGS-ORG
status: approved
owners: [d.okafor, r.saito]
last_updated: 2026-08-13
related: [REQ-004, REQ-025, REQ-031, REQ-032, DES-142, DES-144, DES-198, ADR-013]
---

# Settings — organization and members

Five routes share this file: general settings, members, pending invitations, labels, and the
danger zone. All five sit under the settings sub-navigation defined by the local `TABS` constant
in `src/app/(dashboard)/[orgSlug]/settings/layout.tsx`, which is what filters which of these five
a given actor even sees a link to (see `conventions.md`).

## SCR-015 — General settings

- **Route:** `/{orgSlug}/settings`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/page.tsx`, form in
  `src/app/(dashboard)/[orgSlug]/settings/organization-settings-form.tsx`
- **Server or client:** Server Component shell, client form
- **Permission required:** `org:read` to view (everyone reaches this page); `org:update` to
  edit — a viewer or member sees the *same page*, rendered with the form disabled and a footer
  note ("Only admins and owners can change these settings"), rather than being redirected or
  404'd
- **Feature flag:** none
- **Data loaded:** tenant context only — no additional service call beyond `loadTenantContext`
- **Components:** `OrganizationSettingsForm`
- **Actions invoked:** none directly documented on this page (the form's submit handler is
  internal to `OrganizationSettingsForm`, wired to an update action outside this manifest's
  scope for this route)
- **Satisfies:** REQ-004
- **Design:** none directly — this screen implements REQ-004 without a corresponding DES entry
  in the service-layer catalogue, since `updateOrganization` is documented in
  `design/service-organization.md` rather than a UI-specific decision

### Layout and the disabled-not-hidden pattern

A single-column form (name, description, and other `OrganizationSettings` fields) wrapped in a
`max-w-xl` container. The `disabled={!mayEdit}` prop passed straight to
`OrganizationSettingsForm` is the whole mechanism — there is no separate read-only rendering
path, just the same form with every field disabled and the submit button inert. This is a
deliberate contrast with pages like `settings/danger` (below), which 404 outright rather than
render disabled: general settings are considered safe to *see* for anyone in the org (a viewer
should be able to check what the org's display name and defaults are), while the danger zone's
existence itself is hidden from anyone who cannot act on it.

## SCR-016 — Members

- **Route:** `/{orgSlug}/settings/members`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/members/page.tsx`
- **Server or client:** Server Component shell, client forms/table
- **Permission required:** `member:read` (404 otherwise); `member:invite` gates whether
  `InviteMemberForm` renders at all
- **Feature flag:** none
- **Data loaded:** `listMembers(actor, { orgId, limit, cursor })` and `checkLimit(org.id,
  "seats")` (`src/server/services/billing-service.ts`) in parallel; `getPlanLimits(org.plan)`
  for the display ceiling
- **Components:** `InviteMemberForm` (`src/components/domain/member/invite-member-form.tsx`),
  `MemberTable` (`src/components/domain/member/member-table.tsx`), `SeatLimitBanner`
  (`src/components/domain/billing/seat-limit-banner.tsx`)
- **Actions invoked:** `inviteMemberAction` (`src/actions/members/invite-member.ts`),
  `updateMemberRoleAction` (`src/actions/members/update-member-role.ts`), `removeMemberAction`
  (`src/actions/members/remove-member.ts`)
- **Satisfies:** REQ-025, REQ-028, REQ-031, REQ-032, REQ-033, REQ-034
- **Design:** DES-142, DES-143, DES-144, DES-146

### One `LimitCheck`, two consumers, by construction

`checkLimit(org.id, "seats")` is called exactly once per page render, and the resulting
`LimitCheck` value is passed as a prop into *both* `SeatLimitBanner` and `InviteMemberForm` (as
`seatCheck`) — the page's own doc comment explains why: with one shared value, the banner ("you
are at your seat limit") and the form (whose submit disables itself when full) cannot disagree
about whether room exists, which would otherwise be possible if each component independently
re-derived its own view of the same quota on a slightly different tick. `DES-146` documents the
service-side half: invite issuance counts *pending* invitations as provisional seats when
checking the quota for a whole batch, so a page showing "3 of 10 seats used" can still refuse a
5-person batch invite if 8 invitations are already outstanding, even though only 3 members have
actually joined.

### Role changes: two guards that are easy to get wrong

`MemberTable`'s `onRoleChange` calls a local `"use server"` closure wrapping
`updateMemberRoleAction`. `DES-142` documents that role changes are checked twice: once through
the ordinary `can()` matrix call, and a second time via a rank comparison the matrix cannot
express on its own — specifically, whether the change would demote the organization's last
remaining owner. `REQ-031` is the requirement this second check exists to satisfy: the last owner
can never be removed or demoted. `DES-144` names the mechanism, `assertLastOwnerRetained`, which
scans up to one hundred owner rows and treats a demotion and an outright removal as the identical
case for this purpose — from this page's perspective, both `changeRole` to a lower rank and
`remove` on the organization's sole owner fail with the same class of action error, and
`MemberTable`/`RemoveMemberDialog` render whatever generic error `useFormAction` surfaces rather
than a bespoke "you are the last owner" message baked into the component.

`RoleSelect` (used inside `MemberTable`) never offers a role above the *acting* actor's own —
`hasRoleAtLeast` is what it consults, which prevents an admin from even attempting to promote
someone to owner through this control, independent of whatever the server would ultimately
enforce.

## SCR-017 — Pending invitations

- **Route:** `/{orgSlug}/settings/members/invitations`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/members/invitations/page.tsx`
- **Server or client:** Server Component shell, client list
- **Permission required:** `member:read`
- **Feature flag:** none
- **Data loaded:** `listPendingInvitations(org.id)` — called **directly against
  `src/server/repositories/invitation-repository.ts`**, not through a service function
- **Components:** `InvitationList` (`src/components/domain/member/invitation-list.tsx`),
  `EmptyState`
- **Actions invoked:** `revokeInvitation` — this one is called as a *service* function
  (`src/server/services/invitation-service.ts`), not wrapped in
  a dedicated file under src/actions/members/ the way the other member mutations are
- **Satisfies:** REQ-028, REQ-029, REQ-032
- **Design:** DES-146, DES-147, DES-198

### The one screen in this file with a repository call in the page

This page's own doc comment explains the choice plainly: `InvitationService` exposes the
lifecycle verbs (issue, resend, revoke, accept) but deliberately no *listing* function, and since
the underlying repository query (`listPendingInvitations`) is already org-scoped with nothing a
service layer would meaningfully add on top, the page reads it directly rather than adding a
pass-through service method whose only job would be forwarding one argument. This is a smaller,
narrower version of the same layering-exception pattern `conventions.md` describes for the
profile and notification-preferences pages — the difference here is that only the *read* bypasses
the service, while the mutation (`revoke`) still goes through `revokeInvitation` in the service
layer, so the exception is scoped to listing only, not to the whole page's data access.

`DES-198` is the repository-layer fact that makes this safe: `findInvitationByTokenHash` is
documented as the *one* deliberately unscoped repository read in the codebase (used when a
recipient clicks an emailed invite link and has no org context yet); `listPendingInvitations`,
by contrast, is scoped by `org.id` like every other repository query, so bypassing the service
layer here does not also bypass tenant scoping — it only skips a layer that would have added no
authorization value.

Each row in `InvitationList` shows the invited email, the role it carries, and a revoke button
gated per-row on the acting actor's own permission. `REQ-032` — seat count checked against the
plan before an invite is sent — means an outstanding invitation still counts toward the seat
quota shown on the members page, which is the reason this page's header copy states explicitly
that "each one still counts against the seat quota."

## SCR-018 — Labels

- **Route:** `/{orgSlug}/settings/labels`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/labels/page.tsx`, manager in
  `src/app/(dashboard)/[orgSlug]/settings/labels/label-manager.tsx`
- **Server or client:** Server Component shell, client manager
- **Permission required:** `org:read` to view (everyone); `org:update` to create or delete —
  labels are checked against the general organization-update permission, not a dedicated
  label-specific action, per `DES-236`
- **Feature flag:** none
- **Data loaded:** `listLabels(actor, org.id)` (`src/server/services/label-service.ts`)
- **Components:** `LabelManager`, `EmptyState`
- **Actions invoked:** `createLabelAction` (`src/actions/labels/create-label.ts`),
  `deleteLabelAction` (`src/actions/labels/delete-label.ts`)
- **Satisfies:** REQ-013, REQ-074
- **Design:** DES-236, DES-237

`REQ-013` establishes that organization labels are shared across all its projects, which is why
this settings-level page — not any per-project screen — is the only place a label can be created
or deleted; no project settings screen offers a "create label" affordance of its own. `DES-236`
is the permission-modeling fact behind that: labels are checked against `org:update`, the same
action general settings uses, rather than a `label:*` action of their own — there was no need for
a finer-grained permission because label management has always tracked the same admin-and-above
boundary as the rest of organization configuration. `DES-237` flags the one place this screen's
delete path differs sharply from almost everything else documented in this directory: deleting a
label is a **hard** delete, not a soft one, and it must prune the label's rows out of the
issue-label join table inside the same repository call — unlike the soft-delete convention every
issue-adjacent entity in Taskflow otherwise follows (`ADR-004`). `LabelManager`'s delete
confirmation copy reflects this by naming the consequence directly ("Deleting one detaches it
from the issues that carry it") rather than describing it as reversible.

## SCR-019 — Danger zone

- **Route:** `/{orgSlug}/settings/danger`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/danger/page.tsx`, form in
  `src/app/(dashboard)/[orgSlug]/settings/danger/delete-organization-form.tsx`
- **Server or client:** Server Component shell, client form
- **Permission required:** `org:delete` — owner-only in `ROLE_MATRIX`; a 404 for anyone else,
  including admins
- **Feature flag:** none
- **Data loaded:** tenant context only
- **Components:** `DeleteOrganizationForm`
- **Actions invoked:** the organization-deletion action (outside this manifest's per-file
  digest, but referenced by `DeleteOrganizationForm`'s `onSubmit`)
- **Satisfies:** REQ-006, REQ-007, REQ-025
- **Design:** DES-152

### The only page in Taskflow whose existence itself is owner-gated

Every other permission-denied case documented in this directory concerns a specific *action* on
a page a broader audience can still reach in some form (view-but-not-edit, for instance). The
danger zone is different: `org:delete` sits at the very top of `ROLE_MATRIX`, above even
`org:manage_billing`, and this page's own doc comment states the consequence directly — "even an
admin never sees this page," because the settings sub-nav filters the "Danger zone" tab out
entirely for anyone who is not the owner, and a direct hit on the URL still 404s. `DES-152`
documents the deletion mechanics this page's form triggers: the caller must retype the
organization's own slug as a typed confirmation (rendered inline by
`DeleteOrganizationForm`, matched against `org.slug`), and the resulting deletion is itself a
soft delete — the page's copy states plainly that the organization is archived rather than
erased, that access is cut off for everyone immediately, and that the eventual purge is left to
the scheduled cleanup job once the retention window lapses, not to this page. A second section
below the delete panel explains ownership transfer *without* offering a one-click control for
it: `REQ-006` (an organization always has exactly one owner of record) is why promoting a new
owner has to happen from Settings → Members first, followed by the outgoing owner demoting
themselves — a two-step, two-actor sequence that cannot be collapsed into a single button without
momentarily violating the always-exactly-one-owner invariant.

### States

| state | screen | trigger | what the user sees |
|---|---|---|---|
| empty | invitations | zero pending invitations | `EmptyState`: "No invitations outstanding" |
| empty | labels | zero labels and `!mayEdit` | `EmptyState`: "No labels yet", "An admin can create the first one." (When `mayEdit` is true and labels are empty, `LabelManager` renders its own empty create-first-one affordance instead of the page-level `EmptyState`.) |
| loading | all five | client navigation | `[orgSlug]/loading.tsx` — none of these five routes define their own `loading.tsx` |
| error | all five | thrown error resolving tenant context | `[orgSlug]/error.tsx` |
| permission denied | general | `org:read` fails | not reachable in practice — every actor resolved for the org has at least `org:read`; the theoretical case renders `[orgSlug]/error.tsx`'s `PermissionDeniedError` branch |
| permission denied | members, invitations, labels (edit), danger | `member:read` / `org:update` / `org:delete` fails | `notFound()` (general and labels render read-only instead when the failing permission is only the *write* half; members and danger and the invitations list 404 outright since their base action is `member:read`/`org:delete`) |
| flag off | none of these five | — | — |
| plan limit reached | members | seat quota reached | `SeatLimitBanner` renders; `InviteMemberForm`'s submit disables |
