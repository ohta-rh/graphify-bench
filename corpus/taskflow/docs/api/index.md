---
title: API catalogue
id: API-INDEX
status: approved
owners: [platform-team, d.okafor]
last_updated: 2026-06-01
related: [DES-010, DES-011, DES-020, ADR-003, ADR-009, ADR-013]
---

# API catalogue

This directory documents Taskflow's entire request-mutation surface: 38 Server Actions
under src/actions/, and 12 Route Handlers under src/app/api/. If you are looking for
"what can a client call, and what happens when it does," this is the index; the pages it
links to carry the per-action detail (input fields, permission, plan limits, events, cache
tags, errors) in the standard entry shape used throughout this directory.

Read `actions-overview.md` first if you have not already — it covers the machinery every
action page assumes you already know (`withAction()`, actor resolution, the error-mapping
table, cache tag composition). This page assumes that context and focuses on where things
live and how to add to them correctly.

## Action groups

| group | file | actions | permissions involved | events emitted |
|---|---|---|---|---|
| shared machinery | `actions-overview.md` | 0 (infrastructure only) | n/a | n/a |
| authentication | `actions-auth.md` | 5 (`loginAction`, `logoutAction`, `registerAction`, `requestPasswordResetAction`, `confirmPasswordResetAction`) | none (unauthenticated) | none (`TaskflowEventMap` has no auth keys) |
| organizations | `actions-organizations.md` | 4 (`createOrganizationAction`, `updateOrganizationAction`, `switchOrgAction`, `deleteOrganizationAction`) | `org:update`, `org:delete` | `member.joined` (indirect, via create) |
| members & invitations | `actions-members.md` | 4 (`inviteMemberAction`, `acceptInvitationAction`, `removeMemberAction`, `updateMemberRoleAction`) | `member:invite`, `member:remove`, `member:update_role` | `member.joined`, `member.removed`, `member.role_changed` |
| projects | `actions-projects.md` | 4 (`createProjectAction`, `archiveProjectAction`, `restoreProjectAction`, `updateProjectAction`) | `project:create`, `project:archive`, `project:update` | `project.created`, `project.archived`, `project.restored` |
| issues | `actions-issues.md` | 6 (`createIssueAction`, `updateIssueAction`, `archiveIssueAction`, `assignIssueAction`, `changeIssueStatusAction`, `moveIssueAction`) | `issue:create`, `issue:update`, `issue:archive`, `issue:assign` | `issue.created`, `issue.updated`, `issue.archived`, `issue.assigned`, `issue.status_changed` |
| comments | `actions-comments.md` | 3 (`createCommentAction`, `updateCommentAction`, `deleteCommentAction`) | `comment:create`, `comment:update`, `comment:delete` | `comment.created`, `comment.deleted` |
| labels & profile | `actions-labels.md` | 3 (`createLabelAction`, `deleteLabelAction`, `updateProfileAction`) | `org:update` (labels only — profile has no `can()` check) | none |
| notifications | `actions-notifications.md` | 3 (`markNotificationReadAction`, `markAllNotificationsReadAction`, `updateNotificationPreferenceAction`) | `notification:read`, `notification:manage` | none (all three consume, none produce) |
| billing | `actions-billing.md` | 3 (`changePlanAction`, `updateSeatsAction`, `cancelSubscriptionAction`) | `org:manage_billing` (all three) | `billing.plan_changed` |
| feature flags | `actions-flags.md` | 1 (`toggleFeatureFlagAction`) | `org:manage_flags` | `flag.toggled` |
| webhooks & search | `actions-webhooks-and-search.md` | 3 (`createWebhookAction`, `deleteWebhookAction`, `searchAction`) | `webhook:manage`, `org:read` | none |
| Route Handlers | `route-handlers.md` | 12 routes (not Server Actions) | varies per route | varies per route |

38 Server Actions total across 12 group files (the overview file documents infrastructure,
not an action group of its own), plus 12 Route Handlers, for 50 request-mutation entry
points in the whole corpus.

## How to find an action by what it does

If you know the *domain* (issues, billing, members, ...), go straight to the matching group
file above — this directory follows the file-per-domain layout of src/actions/ itself
(DES-010), so every file under src/actions/issues/ maps onto `actions-issues.md` with no indirection.
If you know the *action name* but not the domain, the table above's "actions" column is
exhaustive; every exported `*Action` function in src/actions/ appears in exactly one row.
If you are trying to find a mutation and cannot locate it in any group file here, check two
things before assuming a gap in this documentation: first, whether it is a Route Handler
rather than a Server Action (`route-handlers.md`); second, whether the schema exists but no
action was ever wired to it — several schema files declare shapes (`resendInvitationSchema`,
`revokeInvitationSchema`, `updateLabelSchema`, `inviteMembersSchema`) with no corresponding
`"use server"` export, called out explicitly in `actions-members.md` and `actions-labels.md`
where they are most likely to be missed.

## Permission floors, at a glance

Every action documented in this directory states its minimum role in its entry, but seeing
them side by side is useful for spotting the shape of the access-control model:

| minimum role | actions gated at this floor |
|---|---|
| none (unauthenticated or identity-only) | all 5 auth actions, `acceptInvitationAction`, `updateProfileAction`, `switchOrgAction` |
| viewer | `searchAction` (`org:read`), `markNotificationReadAction`, `markAllNotificationsReadAction` |
| member | `issue:create`/`update`/`assign`, `comment:create`/`update`, `project:create`/`update`, `createCommentAction` |
| admin | `org:update`, `org:manage_flags`, `member:invite`/`remove`/`update_role`, `project:archive`, `comment:delete`, `webhook:manage`, `issue:delete` (no action wired for this last one — see below) |
| owner | `org:delete`, `org:manage_billing` (all three billing actions) |

Two floors are worth a second look. First, `issue:delete` appears in `ROLE_MATRIX` at
admin rank (REQ-073: issue deletion requires admin) but has no corresponding Server Action —
issues are only ever archived (`archiveIssueAction`, member-minimum with author/assignee
escalation) through the action layer; a genuine hard delete of an issue row, if it exists at
all, is not reachable from this API surface. Second, notice that `member` and `admin` are
the two floors carrying the most action volume by a wide margin — most day-to-day product
usage (creating and editing issues, comments, and projects) sits at member rank, while
organizational and billing structure sits at admin or owner.

## How to add a new action

When you add action number 39 (or beyond), the checklist below reflects what every existing
action in this corpus already does, cross-referenced against the design docs that describe
the pattern in full:

1. **One file, one action (or a tightly related pair).** Follow the existing
   src/actions/ naming convention — one directory per domain, one file per verb-noun pair —
   matching an existing directory when the domain already has one. See
   `design/module-map.md` (DES-010) for why the corpus does not group multiple unrelated
   mutations into one file.
2. **Define or extend a schema in src/schemas/, never inline** — unless the payload is
   genuinely a one-off two-field shape with no reuse value, the way
   `restoreProjectAction`'s inline schema is (DES-234). Prefer extending an existing
   schema file over adding a new one; check `src/schemas/index.ts`'s barrel to see the full
   set before creating a new file.
3. **Wrap the handler in `withAction()`** unless your action runs before an `Actor` can
   exist — see `actions-overview.md`, "Actions with no `Actor` yet," for the narrow set of
   cases (five actions total in this corpus) where hand-rolling the parse/authenticate/catch/stamp
   sequence is correct instead.
4. **Check permission with `can()`** using the real `PermissionResource` shape for your
   resource kind, from `design/permission-model.md` (DES-045). If the row does not exist yet
   (a create action), use the matching placeholder from
   `src/actions/_lib/permission-resources.ts` — add a new one there only if none of the
   existing four fits your resource kind.
5. **Check plan limits, if any, with `wouldExceedLimit()` or a direct comparison against
   `getPlanLimits()`** — read `design/service-billing-and-usage.md` for the canonical
   pattern, and decide deliberately whether archived/soft-deleted rows count toward your
   quota (most quotas in this corpus do, per DES-229/DES-233, specifically so a restore is
   never the operation that breaches a limit).
6. **Check feature flags, if any, with `isEnabled()`**, having built a fresh `FlagContext`
   via `buildFlagContext()` — never trust a client-supplied flag state, per DES-230's
   explicit re-check pattern for `moveIssueAction`. Decide whether an unavailable flag should
   block outright (`FeatureUnavailableError`, the `createWebhookAction` pattern) or narrow
   gracefully (the `searchAction` pattern) — see `actions-webhooks-and-search.md` for the
   comparison table.
7. **Charge a rate-limit bucket only if the action is genuinely abuse-prone or
   enumeration-sensitive**, and decide the check's ordering relative to permission
   deliberately — `actions-auth.md` and `actions-comments.md` document why login and
   password reset charge the bucket *before* authenticating (timing-attack resistance) while
   comment creation charges it *after* the permission check (no enumeration concern for an
   already-authenticated member).
8. **Emit a domain event only if a key exists in `TaskflowEventMap`** (`src/types/event.ts`).
   Do not add a new event key without a corresponding subscriber, and if your mutation has no
   natural event to hang off — some do not, `updateProjectAction` and the label actions among
   them — do not force one; document the gap the way `design/service-organization.md` and
   `actions-organizations.md` do for organization renames.
9. **Revalidate the cache tags your mutation actually touches** — a static group tag through
   `ActionOptions.revalidate`, and, inside the handler, the specific dynamic tags
   (`orgTag`, `projectTag`, `issueTag`, ...) for the exact rows changed. See
   `actions-overview.md`'s cache-tags section for why both are usually needed together, and
   pick a `cacheProfile` (`seconds`, `minutes`, or `hours`) matched to how time-sensitive the
   mutation's visible effect is — `actions-notifications.md` shows the same domain spanning
   two different profiles for exactly this reason.
10. **Document it.** Add an entry to the appropriate group file in this directory (or a new
    one, if you are adding a whole new domain), following the entry shape every other action
    in this directory uses, and add a row to the tables in this index. Cite only
    src/ / tests/ paths that exist and REQ/DES/ADR ids that are already defined elsewhere
    in the corpus — never invent one.

## What this directory deliberately does not cover

Server Component data-reading paths (the ordinary `await someService.list(...)` calls inside
`page.tsx` files under src/app/(dashboard)/) are not documented here — this directory is
scoped to the request-mutation surface: Server Actions and Route Handlers, both of which a
client explicitly invokes. `design/data-flow.md` (DES-020, DES-022) covers the canonical read
path through a Server Component separately from the canonical write path this directory
documents in depth. If you are looking for how a page fetches the data it renders rather
than how a client triggers a change, that design document — not this one — is where to look.

## Cross-cutting patterns this directory keeps repeating

Reading all thirteen files back to back surfaces a handful of decisions the team made once
and then applied consistently everywhere they recur. Knowing them up front makes each
individual group file faster to read, since you will recognize the pattern rather than
re-deriving it:

- **Archived rows still count against a creation quota.** `createIssueAction`,
  `createProjectAction`, and the invitation seat count in `inviteMemberAction` all include
  soft-deleted rows in their usage count, specifically so that restoring something never
  becomes the operation that breaches a limit it was already counted against. See
  `actions-issues.md` (DES-229) and `actions-projects.md` (DES-233).
- **A flag that gates creation does not gate cleanup.** `deleteWebhookAction` is not
  flag-gated even though `createWebhookAction` is (DES-258); the same asymmetry recurs in
  spirit wherever a downgrade could otherwise strand an organization unable to remove what it
  built while it had a capability.
- **Placeholder branded ids stand in for rows that do not exist yet.** `PENDING_ISSUE_ID`,
  `PENDING_PROJECT_ID`, `PENDING_COMMENT_ID`, `PENDING_MEMBER_ID`, and the webhook
  resource's plain `null` all solve the same problem — a closed `PermissionResource` union
  that requires an id even when checking "may I create one" — in two textually different but
  functionally equivalent ways. See `actions-overview.md`.
- **Ownership escalation is expressed by passing the actor's own id, not the resource's.**
  Several actions that have not fetched the target row yet (`updateIssueAction`,
  `changeIssueStatusAction`, `moveIssueAction`) pass `actor.userId` as both `authorId` and
  `assigneeId` in their `can()` call — a shortcut that produces the correct permission
  answer without a database read, at the cost of not being able to distinguish "the actor is
  the real author" from "the actor is relying on base role rank" at that specific call site.
  See `actions-issues.md`.
- **A two-layer optimistic-then-authoritative permission check** appears wherever the action
  layer cannot cheaply know a row's real ownership before the service does: `updateCommentAction`
  checks optimistically against the caller's presumed authorship, and `CommentService`
  repeats the check against the persisted `authorId` (DES-239, `actions-comments.md`).
- **Confirmation-by-retyping is reserved for operations with no restore path.**
  `deleteOrganizationAction`'s `confirmSlug` field is the only place in the whole action
  surface that asks a user to retype anything, because it is the only mutation with no
  corresponding restore action anywhere in the corpus (`actions-organizations.md`).

## Owners and where to ask

The `owners:` front matter on each group file names who to ask when something in this
directory looks wrong or out of date, following the team roster in the corpus-wide brief:
Deji Okafor for authentication, feature flags, and shared/cross-cutting machinery (the
overview and route-handlers files); Mira Lindqvist for organizations, members, projects,
issues, comments, and labels; Rin Saito for billing; Tomas Abara for notifications; Kaya
Ferreira for webhooks and search. If a page's content looks stale relative to the actual
source under src/actions/ or src/app/api/, check `last_updated` against the file's git
history before assuming the documentation, rather than the code, is the thing that moved.

## Keeping this index in sync

This index is generated by hand from the group files, not the other way around — when a
group file gains or loses an action, update the corresponding row in the "Action groups"
table above in the same change, including the action count and the events-emitted column.
The permission-floor table is the one place in this index most likely to silently drift: a
new action added at, say, member rank does not require touching that table's structure, but
it does mean the table's implicit claim ("here is every action at this floor") is no longer
exhaustive until the new action's name is added to the matching row. Treat an incomplete
permission-floor table as worse than an absent one — a reader trusts the table's
completeness, and a stale one produces a wrong conclusion rather than an obviously missing
one.

Related: DES-012, DES-013, DES-014, DES-016, ADR-001, ADR-004, ADR-015.
