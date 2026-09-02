import type { ExportSpec, ManifestEntry } from "../manifest-types";

/** Owner D — the App Router tree and the Server Actions.
 *
 *  Next.js 16 rules that apply to every file here:
 *   - `params` and `searchParams` are Promises: `await` them.
 *   - `cookies()`, `headers()` and `draftMode()` are async: `await` them.
 *   - a parallel route slot needs a `default.tsx` or the build fails.
 *   - the request-level auth shim is `src/proxy.ts`, never `middleware.ts`.
 *   - `revalidateTag(tag, profile)` takes the cache-life profile as its
 *     second argument. */

type RouteSpec = [path: string, responsibility: string, mustUse?: string[]];

const APP: RouteSpec[] = [
  ["src/app/layout.tsx", "Root layout: html/body, font variables and `globals.css`. Exports `metadata`."],
  ["src/app/not-found.tsx", "Global 404 page."],
  ["src/app/error.tsx", "Global error boundary (client component)."],
  ["src/app/global-error.tsx", "Root error boundary that replaces the whole document."],

  ["src/app/(marketing)/layout.tsx", "Marketing shell with the public nav and footer."],
  ["src/app/(marketing)/page.tsx", "Landing page."],
  ["src/app/(marketing)/pricing/page.tsx", "Public pricing page rendered from `PLAN_LIMITS`.", ["getPlanLimits"]],
  ["src/app/(marketing)/changelog/page.tsx", "Static changelog."],
  ["src/app/(marketing)/_components/marketing-nav.tsx", "Public top navigation."],
  ["src/app/(marketing)/_components/pricing-grid.tsx", "Public plan grid built from `PLAN_LIMITS`.", ["getPlanLimits"]],

  ["src/app/(auth)/layout.tsx", "Centred card shell for the unauthenticated flows."],
  ["src/app/(auth)/login/page.tsx", "Login page; reads the `next` search param.", ["getSessionPrincipal"]],
  ["src/app/(auth)/login/login-form.tsx", "Client form bound to `loginSchema` and the login action.", ["loginSchema"]],
  ["src/app/(auth)/register/page.tsx", "Registration page."],
  ["src/app/(auth)/register/register-form.tsx", "Client form bound to `registerSchema`.", ["registerSchema"]],
  ["src/app/(auth)/reset-password/page.tsx", "Password reset request page."],
  ["src/app/(auth)/reset-password/reset-request-form.tsx", "Client form bound to `passwordResetRequestSchema`.", ["passwordResetRequestSchema"]],
  ["src/app/(auth)/reset-password/[token]/page.tsx", "Password reset confirmation page; awaits `params`."],
  ["src/app/(auth)/reset-password/[token]/reset-confirm-form.tsx", "Client form bound to `passwordResetConfirmSchema`.", ["passwordResetConfirmSchema"]],
  ["src/app/(auth)/invite/[token]/page.tsx", "Invitation landing page; accepts or explains an expired token."],

  ["src/app/(dashboard)/layout.tsx", "Authenticated shell: resolves the session and redirects to /login when absent.", ["getSessionPrincipal"]],
  ["src/app/(dashboard)/orgs/page.tsx", "Org chooser: lists the organizations the signed-in user belongs to and redirects when there is exactly one."],
  ["src/app/(dashboard)/[orgSlug]/layout.tsx", "Tenant shell: resolves the `Actor`, builds the flag snapshot and renders the sidebar.", ["resolveActorForOrg", "snapshotFlags", "assertOrgScope"]],
  ["src/app/(dashboard)/[orgSlug]/loading.tsx", "Skeleton for the tenant shell."],
  ["src/app/(dashboard)/[orgSlug]/error.tsx", "Tenant-level error boundary that renders permission and tenant-scope failures."],
  ["src/app/(dashboard)/[orgSlug]/not-found.tsx", "Shown when the org slug does not resolve."],
  ["src/app/(dashboard)/[orgSlug]/page.tsx", "Organization overview: recent issues, project stats and usage.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/@panel/default.tsx", "REQUIRED default for the `@panel` parallel slot — without it Next 16 fails the build."],
  ["src/app/(dashboard)/[orgSlug]/@panel/page.tsx", "Default content of the side panel slot."],
  ["src/app/(dashboard)/[orgSlug]/@panel/notifications/page.tsx", "Notification panel rendered into the `@panel` slot."],

  ["src/app/(dashboard)/[orgSlug]/projects/page.tsx", "Project list with archive filter.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/projects/new/page.tsx", "New project page; blocked when the project quota is reached.", ["can", "getPlanLimits"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/layout.tsx", "Project shell with the project header and sub-navigation.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/page.tsx", "Project overview."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/loading.tsx", "Project overview skeleton."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/not-found.tsx", "Unknown project slug."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/board/page.tsx", "Kanban board; falls back to the list view when `kanban_board` is off.", ["isEnabled", "can"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/page.tsx", "Project issue list; parses filters from `await searchParams`.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/loading.tsx", "Issue list skeleton."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/new/page.tsx", "New issue page; blocked at the per-project issue quota.", ["can", "getPlanLimits"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx", "Issue detail with the comment thread and activity panel.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/loading.tsx", "Issue detail skeleton."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/error.tsx", "Issue detail error boundary."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/not-found.tsx", "Unknown issue number."],
  ["src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/page.tsx", "Project settings including archive.", ["can"]],

  ["src/app/(dashboard)/[orgSlug]/issues/page.tsx", "Cross-project 'my issues' view.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/inbox/page.tsx", "Notification inbox.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/activity/page.tsx", "Organization activity feed; requires `activity:read` and the `activity_feed` flag.", ["can", "isEnabled"]],
  ["src/app/(dashboard)/[orgSlug]/search/page.tsx", "Full-page search results.", ["isEnabled"]],

  ["src/app/(dashboard)/[orgSlug]/settings/layout.tsx", "Settings shell with a permission-filtered sub-nav.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/settings/page.tsx", "General organization settings.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/settings/members/page.tsx", "Member management with invite and role controls.", ["can", "getPlanLimits"]],
  ["src/app/(dashboard)/[orgSlug]/settings/members/invitations/page.tsx", "Pending invitations.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/settings/billing/page.tsx", "Plan, seats and usage meters.", ["can", "getPlanLimits"]],
  ["src/app/(dashboard)/[orgSlug]/settings/billing/invoices/page.tsx", "Invoice history.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/settings/notifications/page.tsx", "Notification preference matrix.", ["isEnabled"]],
  ["src/app/(dashboard)/[orgSlug]/settings/labels/page.tsx", "Label management.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/settings/flags/page.tsx", "Per-org feature flag overrides.", ["can", "isEnabled"]],
  ["src/app/(dashboard)/[orgSlug]/settings/webhooks/page.tsx", "Webhook endpoints; gated on plan and the `webhooks` flag.", ["can", "isEnabled", "getPlanLimits"]],
  ["src/app/(dashboard)/[orgSlug]/settings/danger/page.tsx", "Destructive actions: transfer ownership, delete organization.", ["can"]],
  ["src/app/(dashboard)/[orgSlug]/profile/page.tsx", "Personal profile and timezone."],
  ["src/app/(dashboard)/[orgSlug]/_components/dashboard-shell.tsx", "Sidebar + top bar composition for the tenant subtree.", ["can", "isEnabled"]],
  ["src/app/(dashboard)/[orgSlug]/_components/org-provider.tsx", "Client context provider seeded with the org, actor and flag snapshot."],
];

const API: RouteSpec[] = [
  ["src/app/api/health/route.ts", "Liveness probe; the only unauthenticated JSON route."],
  ["src/app/api/auth/session/route.ts", "Returns the current `SessionPrincipal`, or 401.", ["getSessionPrincipal"]],
  ["src/app/api/webhooks/inbound/route.ts", "Receives third-party callbacks validated with `inboundWebhookSchema`.", ["inboundWebhookSchema", "consumeRateLimit"]],
  ["src/app/api/webhooks/[endpointId]/test/route.ts", "Sends a signed test payload to one endpoint.", ["can", "signPayload"]],
  ["src/app/api/export/issues/route.ts", "Streams the issue CSV; requires the `csv_export` flag.", ["can", "isEnabled", "toCsv"]],
  ["src/app/api/export/activity/route.ts", "Streams the audit-log CSV; requires `activity:export`.", ["can", "isEnabled", "toCsv"]],
  ["src/app/api/cron/digest/route.ts", "Cron-style trigger for the digest job.", ["runDigestEmailJob"]],
  ["src/app/api/cron/overdue/route.ts", "Cron-style trigger for the overdue scan.", ["runOverdueIssueJob"]],
  ["src/app/api/cron/usage-rollup/route.ts", "Cron-style trigger for the usage rollup.", ["runUsageRollupJob"]],
  ["src/app/api/cron/webhook-delivery/route.ts", "Cron-style trigger that drains the webhook queue.", ["runWebhookDeliveryJob"]],
  ["src/app/api/search/route.ts", "JSON search endpoint used by the command palette.", ["can", "isEnabled"]],
  ["src/app/api/orgs/[orgId]/usage/route.ts", "Current usage and limit checks for one organization.", ["can", "assertOrgScope", "getPlanLimits"]],
  ["src/app/api/issues/[issueId]/route.ts", "Fetch/patch one issue over JSON.", ["can", "assertOrgScope"]],
];

type ActionSpec = [
  path: string,
  responsibility: string,
  exports: ExportSpec[],
  mustUse: string[],
];

const act = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "action",
  signature,
});

const COMMON_ACTION_MUST = ["getActor", "toActionResult"];

const ACTIONS: ActionSpec[] = [
  ["src/actions/_lib/with-action.ts", "Wrapper shared by every Server Action: parses with a Zod schema, resolves the `Actor`, maps thrown domain errors to an `AppErrorShape` and revalidates the affected tags.",
    [
      { name: "withAction", kind: "function", signature: "<TSchema extends ZodType, TData>(schema: TSchema, handler: ActionHandler, options?: ActionOptions): (raw: unknown) => Promise<ActionResult<TData>>" },
      { name: "ActionHandler", kind: "type", signature: "(input: unknown, actor: Actor) => Promise<unknown>" },
      { name: "ActionOptions", kind: "type", signature: "{ requireOrg?: boolean; revalidate?: readonly string[]; cacheProfile?: string }" },
    ],
    ["getActor", "toActionResult", "revalidateTagged"]],
  ["src/actions/auth/login.ts", "Signs a user in and sets the session cookie.", [act("loginAction", "(raw: unknown): Promise<ActionResult<SessionPrincipal>>")], ["loginSchema", "setSessionCookie", "consumeRateLimit"]],
  ["src/actions/auth/register.ts", "Creates a user, their first organization and the owner membership.", [act("registerAction", "(raw: unknown): Promise<ActionResult<SessionPrincipal>>")], ["registerSchema", "setSessionCookie"]],
  ["src/actions/auth/logout.ts", "Destroys the session and clears the cookie.", [act("logoutAction", "(): Promise<ActionResult<null>>")], ["clearSessionCookie"]],
  ["src/actions/auth/reset-password.ts", "Requests and confirms a password reset.", [act("requestPasswordResetAction", "(raw: unknown): Promise<ActionResult<null>>"), act("confirmPasswordResetAction", "(raw: unknown): Promise<ActionResult<null>>")], ["passwordResetRequestSchema", "passwordResetConfirmSchema", "consumeRateLimit"]],
  ["src/actions/organizations/create-organization.ts", "Creates an organization with the caller as owner.", [act("createOrganizationAction", "(raw: unknown): Promise<ActionResult<Organization>>")], ["createOrganizationSchema", ...COMMON_ACTION_MUST]],
  ["src/actions/organizations/update-organization.ts", "Updates org profile and settings.", [act("updateOrganizationAction", "(raw: unknown): Promise<ActionResult<Organization>>")], ["updateOrganizationSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/organizations/delete-organization.ts", "Soft-deletes an organization after slug confirmation.", [act("deleteOrganizationAction", "(raw: unknown): Promise<ActionResult<Organization>>")], ["deleteOrganizationSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/organizations/switch-org.ts", "Switches the session's active organization.", [act("switchOrgAction", "(raw: unknown): Promise<ActionResult<null>>")], ["switchOrgSchema", "assertOrgScope"]],
  ["src/actions/projects/create-project.ts", "Creates a project after the plan's project quota is checked.", [act("createProjectAction", "(raw: unknown): Promise<ActionResult<Project>>")], ["createProjectSchema", "can", "getPlanLimits", ...COMMON_ACTION_MUST]],
  ["src/actions/projects/update-project.ts", "Updates project metadata.", [act("updateProjectAction", "(raw: unknown): Promise<ActionResult<Project>>")], ["updateProjectSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/projects/archive-project.ts", "Archives a project and, optionally, its issues.", [act("archiveProjectAction", "(raw: unknown): Promise<ActionResult<Project>>")], ["archiveProjectSchema", "can", "assertNotArchived", ...COMMON_ACTION_MUST]],
  ["src/actions/projects/restore-project.ts", "Restores an archived project.", [act("restoreProjectAction", "(raw: unknown): Promise<ActionResult<Project>>")], ["can", "restorePatch", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/create-issue.ts", "Creates an issue after the per-project quota check.", [act("createIssueAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["createIssueSchema", "can", "getPlanLimits", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/update-issue.ts", "Updates issue fields.", [act("updateIssueAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["updateIssueSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/change-issue-status.ts", "Moves an issue between statuses and emits `issue.status_changed`.", [act("changeIssueStatusAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["changeIssueStatusSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/assign-issue.ts", "Assigns or unassigns an issue.", [act("assignIssueAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["assignIssueSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/archive-issue.ts", "Archives an issue (soft delete).", [act("archiveIssueAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["archiveIssueSchema", "can", "assertNotArchived", ...COMMON_ACTION_MUST]],
  ["src/actions/issues/move-issue.ts", "Board drag-and-drop target; reconciles the optimistic update.", [act("moveIssueAction", "(raw: unknown): Promise<ActionResult<Issue>>")], ["moveIssueSchema", "can", "isEnabled", ...COMMON_ACTION_MUST]],
  ["src/actions/comments/create-comment.ts", "Posts a comment and fans out mention notifications; rate limited.", [act("createCommentAction", "(raw: unknown): Promise<ActionResult<Comment>>")], ["createCommentSchema", "can", "consumeRateLimit", ...COMMON_ACTION_MUST]],
  ["src/actions/comments/update-comment.ts", "Edits a comment the actor authored.", [act("updateCommentAction", "(raw: unknown): Promise<ActionResult<Comment>>")], ["updateCommentSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/comments/delete-comment.ts", "Soft-deletes a comment.", [act("deleteCommentAction", "(raw: unknown): Promise<ActionResult<Comment>>")], ["deleteCommentSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/members/invite-member.ts", "Invites one member; enforces the seat quota and the invite rate limit.", [act("inviteMemberAction", "(raw: unknown): Promise<ActionResult<Invitation>>")], ["inviteMemberSchema", "can", "getPlanLimits", "consumeRateLimit", ...COMMON_ACTION_MUST]],
  ["src/actions/members/update-member-role.ts", "Changes a member's role, keeping at least one owner.", [act("updateMemberRoleAction", "(raw: unknown): Promise<ActionResult<Member>>")], ["updateMemberRoleSchema", "can", "hasRoleAtLeast", ...COMMON_ACTION_MUST]],
  ["src/actions/members/remove-member.ts", "Removes a member (soft delete) and frees the seat.", [act("removeMemberAction", "(raw: unknown): Promise<ActionResult<Member>>")], ["removeMemberSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/members/accept-invitation.ts", "Accepts an invitation token and creates the membership.", [act("acceptInvitationAction", "(raw: unknown): Promise<ActionResult<Member>>")], ["acceptInvitationTokenSchema", "getPlanLimits"]],
  ["src/actions/billing/change-plan.ts", "Changes plan; refuses a downgrade that would breach a current quota.", [act("changePlanAction", "(raw: unknown): Promise<ActionResult<Subscription>>")], ["changePlanSchema", "can", "getPlanLimits", "wouldExceedLimit", ...COMMON_ACTION_MUST]],
  ["src/actions/billing/update-seats.ts", "Adjusts the seat count within the plan's maximum.", [act("updateSeatsAction", "(raw: unknown): Promise<ActionResult<Subscription>>")], ["updateSeatsSchema", "can", "getPlanLimits", ...COMMON_ACTION_MUST]],
  ["src/actions/billing/cancel-subscription.ts", "Cancels at period end or immediately.", [act("cancelSubscriptionAction", "(raw: unknown): Promise<ActionResult<Subscription>>")], ["cancelSubscriptionSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/notifications/mark-read.ts", "Marks one notification read.", [act("markNotificationReadAction", "(raw: unknown): Promise<ActionResult<Notification>>")], ["markNotificationReadSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/notifications/mark-all-read.ts", "Marks the whole inbox read.", [act("markAllNotificationsReadAction", "(raw: unknown): Promise<ActionResult<number>>")], ["markAllNotificationsReadSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/notifications/update-preferences.ts", "Updates one notification preference row.", [act("updateNotificationPreferenceAction", "(raw: unknown): Promise<ActionResult<NotificationPreference>>")], ["updateNotificationPreferenceSchema", "isEnabled", ...COMMON_ACTION_MUST]],
  ["src/actions/flags/toggle-flag.ts", "Toggles an org-level feature flag override.", [act("toggleFeatureFlagAction", "(raw: unknown): Promise<ActionResult<Organization>>")], ["toggleFeatureFlagSchema", "can", "isEnabled", ...COMMON_ACTION_MUST]],
  ["src/actions/labels/create-label.ts", "Creates a label.", [act("createLabelAction", "(raw: unknown): Promise<ActionResult<IssueLabel>>")], ["createLabelSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/labels/delete-label.ts", "Deletes a label and detaches it from every issue.", [act("deleteLabelAction", "(raw: unknown): Promise<ActionResult<null>>")], ["deleteLabelSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/webhooks/create-webhook.ts", "Registers a webhook endpoint; plan and flag gated.", [act("createWebhookAction", "(raw: unknown): Promise<ActionResult<WebhookEndpointRow>>")], ["createWebhookSchema", "can", "isEnabled", "getPlanLimits", ...COMMON_ACTION_MUST]],
  ["src/actions/webhooks/delete-webhook.ts", "Removes an endpoint.", [act("deleteWebhookAction", "(raw: unknown): Promise<ActionResult<null>>")], ["deleteWebhookSchema", "can", ...COMMON_ACTION_MUST]],
  ["src/actions/search/search.ts", "Search Server Action used by the command palette and the search page.", [act("searchAction", "(raw: unknown): Promise<ActionResult<SearchHit[]>>")], ["searchQuerySchema", "can", "isEnabled", ...COMMON_ACTION_MUST]],
  ["src/actions/profile/update-profile.ts", "Updates the signed-in user's own profile.", [act("updateProfileAction", "(raw: unknown): Promise<ActionResult<User>>")], ["updateProfileSchema", ...COMMON_ACTION_MUST]],
];

function routeEntries(specs: RouteSpec[]): ManifestEntry[] {
  return specs.map(([path, responsibility, mustUse]) => ({
    path,
    owner: "D" as const,
    responsibility,
    mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
    exports: [],
  }));
}

export const appEntries: ManifestEntry[] = [
  ...routeEntries(APP),
  ...routeEntries(API),
  ...ACTIONS.map(([path, responsibility, exports, mustUse]) => ({
    path,
    owner: "D" as const,
    responsibility,
    exports,
    mustUse,
  })),
];
