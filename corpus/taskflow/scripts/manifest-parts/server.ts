import type { ExportSpec, ManifestEntry } from "../manifest-types";

/** Owner C — services, repositories and background jobs.
 *
 *  Repositories own SQL and MUST filter by `orgId` on every query and by
 *  `archived_at` through `@/lib/soft-delete`. Services own business rules and
 *  are the only layer allowed to call `assertCan` and `emit`. Jobs run outside
 *  the request lifecycle and re-derive their own `Actor`. */

const fn = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "function",
  signature,
});

const type = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "type",
  signature,
});

type Spec = [
  path: string,
  responsibility: string,
  exports: ExportSpec[],
  mustUse?: string[],
];

const REPOSITORIES: Spec[] = [
  [
    "src/server/repositories/base-repository.ts",
    "Shared query helpers: cursor encoding, `orgId` predicate construction and the archived-row predicate every other repository composes.",
    [
      fn("encodeCursor", "(id: string, sortValue: string): string"),
      fn("decodeCursor", "(cursor: string): { id: string; sortValue: string } | null"),
      fn("orgPredicate", "(column: SQLiteColumn, orgId: OrgId): SQL"),
      fn("livePredicate", "(column: SQLiteColumn, scope: ArchiveScope): SQL | undefined"),
    ],
    ["shouldFilterArchived"],
  ],
  [
    "src/server/repositories/user-repository.ts",
    "Global user rows. The only repository that is NOT tenant scoped — users exist across organizations.",
    [
      fn("findUserById", "(userId: UserId): Promise<User | null>"),
      fn("findUserByEmail", "(email: string): Promise<User | null>"),
      fn("insertUser", "(input: { email: string; name: string; passwordHash: string }): Promise<User>"),
      fn("updateUser", "(userId: UserId, patch: UpdateProfileInput): Promise<User>"),
      fn("findUsersByIds", "(userIds: readonly UserId[]): Promise<readonly User[]>"),
    ],
  ],
  [
    "src/server/repositories/session-repository.ts",
    "Session rows for the cookie-based auth: create, look up by token hash, revoke.",
    [
      fn("createSession", "(userId: UserId, tokenHash: string, expiresAt: IsoTimestamp): Promise<SessionPrincipal>"),
      fn("findSessionByTokenHash", "(tokenHash: string): Promise<SessionPrincipal | null>"),
      fn("setActiveOrg", "(sessionId: SessionId, orgId: OrgId): Promise<void>"),
      fn("revokeSession", "(sessionId: SessionId): Promise<void>"),
      fn("purgeExpiredSessions", "(now: IsoTimestamp): Promise<number>"),
    ],
  ],
  [
    "src/server/repositories/organization-repository.ts",
    "Organization rows plus slug uniqueness lookups.",
    [
      fn("findOrgById", "(orgId: OrgId): Promise<Organization | null>"),
      fn("findOrgBySlug", "(slug: string): Promise<Organization | null>"),
      fn("listOrgsForUser", "(userId: UserId): Promise<readonly Organization[]>"),
      fn("insertOrg", "(input: CreateOrganizationInput, ownerId: UserId): Promise<Organization>"),
      fn("updateOrg", "(orgId: OrgId, patch: UpdateOrganizationInput): Promise<Organization>"),
      fn("archiveOrg", "(orgId: OrgId): Promise<Organization>"),
      fn("listTakenOrgSlugs", "(prefix: string): Promise<readonly string[]>"),
    ],
    ["archivePatch", "uniqueSlug"],
  ],
  [
    "src/server/repositories/member-repository.ts",
    "Membership rows. Every read is filtered by `orgId`; removal is a soft delete.",
    [
      fn("findMember", "(orgId: OrgId, userId: UserId): Promise<Member | null>"),
      fn("findMemberById", "(orgId: OrgId, memberId: MemberId): Promise<Member | null>"),
      fn("listMembers", "(input: ListMembersInput): Promise<Page<MemberWithUser>>"),
      fn("countActiveMembers", "(orgId: OrgId): Promise<number>"),
      fn("insertMember", "(orgId: OrgId, userId: UserId, role: Role, invitedBy: UserId | null): Promise<Member>"),
      fn("updateMemberRole", "(orgId: OrgId, memberId: MemberId, role: Role): Promise<Member>"),
      fn("archiveMember", "(orgId: OrgId, memberId: MemberId): Promise<Member>"),
      fn("touchLastSeen", "(orgId: OrgId, userId: UserId, at: IsoTimestamp): Promise<void>"),
    ],
    ["archivePatch", "shouldFilterArchived"],
  ],
  [
    "src/server/repositories/invitation-repository.ts",
    "Pending invitations, keyed by token hash for the unauthenticated accept flow.",
    [
      fn("insertInvitation", "(orgId: OrgId, input: CreateInvitationInput, invitedBy: UserId, tokenHash: string): Promise<Invitation>"),
      fn("findInvitationByTokenHash", "(tokenHash: string): Promise<Invitation | null>"),
      fn("listPendingInvitations", "(orgId: OrgId): Promise<readonly Invitation[]>"),
      fn("markInvitationAccepted", "(orgId: OrgId, invitationId: InvitationId, at: IsoTimestamp): Promise<Invitation>"),
      fn("revokeInvitation", "(orgId: OrgId, invitationId: InvitationId): Promise<Invitation>"),
      fn("countPendingInvitations", "(orgId: OrgId): Promise<number>"),
    ],
  ],
  [
    "src/server/repositories/project-repository.ts",
    "Project rows: cursor listing, slug/key uniqueness, soft delete and restore.",
    [
      fn("findProjectById", "(orgId: OrgId, projectId: ProjectId): Promise<Project | null>"),
      fn("findProjectBySlug", "(orgId: OrgId, slug: string): Promise<Project | null>"),
      fn("listProjects", "(input: ListProjectsInput): Promise<Page<Project>>"),
      fn("countProjects", "(orgId: OrgId, scope?: ArchiveScope): Promise<number>"),
      fn("insertProject", "(input: CreateProjectInput): Promise<Project>"),
      fn("updateProject", "(input: UpdateProjectInput): Promise<Project>"),
      fn("archiveProject", "(orgId: OrgId, projectId: ProjectId): Promise<Project>"),
      fn("restoreProject", "(orgId: OrgId, projectId: ProjectId): Promise<Project>"),
      fn("listTakenProjectSlugs", "(orgId: OrgId): Promise<readonly string[]>"),
      fn("getProjectStats", "(orgId: OrgId, projectId: ProjectId): Promise<ProjectStats>"),
    ],
    ["archivePatch", "restorePatch", "shouldFilterArchived", "uniqueSlug"],
  ],
  [
    "src/server/repositories/project-member-repository.ts",
    "Explicit project membership for `private` projects.",
    [
      fn("listProjectMemberIds", "(orgId: OrgId, projectId: ProjectId): Promise<readonly UserId[]>"),
      fn("addProjectMember", "(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<void>"),
      fn("removeProjectMember", "(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<void>"),
      fn("isProjectMember", "(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<boolean>"),
    ],
  ],
  [
    "src/server/repositories/issue-repository.ts",
    "Issue rows: the widest query surface in the app. Every method takes `orgId` first and honours `IssueFilter.includeArchived`.",
    [
      fn("findIssueById", "(orgId: OrgId, issueId: IssueId): Promise<Issue | null>"),
      fn("findIssueByNumber", "(orgId: OrgId, projectId: ProjectId, issueNumber: number): Promise<Issue | null>"),
      fn("listIssues", "(input: IssueFilterInput): Promise<Page<Issue>>"),
      fn("listIssuesWithRelations", "(input: IssueFilterInput): Promise<Page<IssueWithRelations>>"),
      fn("listBoardColumns", "(orgId: OrgId, projectId: ProjectId): Promise<readonly IssueBoardColumn[]>"),
      fn("countIssues", "(orgId: OrgId, projectId: ProjectId, scope?: ArchiveScope): Promise<number>"),
      fn("nextIssueNumber", "(orgId: OrgId, projectId: ProjectId): Promise<number>"),
      fn("insertIssue", "(input: CreateIssueInput, authorId: UserId, issueNumber: number): Promise<Issue>"),
      fn("updateIssue", "(input: UpdateIssueInput): Promise<Issue>"),
      fn("setIssueStatus", "(orgId: OrgId, issueId: IssueId, status: IssueStatus): Promise<Issue>"),
      fn("setIssueAssignee", "(orgId: OrgId, issueId: IssueId, assigneeId: UserId | null): Promise<Issue>"),
      fn("archiveIssue", "(orgId: OrgId, issueId: IssueId): Promise<Issue>"),
      fn("restoreIssue", "(orgId: OrgId, issueId: IssueId): Promise<Issue>"),
      fn("archiveIssuesForProject", "(orgId: OrgId, projectId: ProjectId): Promise<number>"),
      fn("listOverdueIssues", "(orgId: OrgId, now: IsoTimestamp): Promise<readonly Issue[]>"),
    ],
    ["archivePatch", "restorePatch", "shouldFilterArchived"],
  ],
  [
    "src/server/repositories/label-repository.ts",
    "Label rows and the issue↔label join table.",
    [
      fn("listLabels", "(orgId: OrgId): Promise<readonly IssueLabel[]>"),
      fn("insertLabel", "(input: CreateLabelInput): Promise<IssueLabel>"),
      fn("updateLabel", "(input: UpdateLabelInput): Promise<IssueLabel>"),
      fn("deleteLabel", "(orgId: OrgId, labelId: LabelId): Promise<void>"),
      fn("setIssueLabels", "(orgId: OrgId, issueId: IssueId, labelIds: readonly LabelId[]): Promise<void>"),
      fn("listLabelsForIssues", "(orgId: OrgId, issueIds: readonly IssueId[]): Promise<Readonly<Record<string, readonly IssueLabel[]>>>"),
    ],
  ],
  [
    "src/server/repositories/attachment-repository.ts",
    "Attachment metadata; the byte total feeds the `storageMb` quota check.",
    [
      fn("listAttachments", "(orgId: OrgId, issueId: IssueId): Promise<readonly IssueAttachment[]>"),
      fn("insertAttachment", "(input: CreateAttachmentInput, uploadedBy: UserId): Promise<IssueAttachment>"),
      fn("deleteAttachment", "(orgId: OrgId, attachmentId: AttachmentId): Promise<void>"),
      fn("sumStorageBytes", "(orgId: OrgId): Promise<number>"),
    ],
  ],
  [
    "src/server/repositories/comment-repository.ts",
    "Comment rows, soft deleted so a deleted comment keeps its place in the thread.",
    [
      fn("findCommentById", "(orgId: OrgId, commentId: CommentId): Promise<Comment | null>"),
      fn("listComments", "(input: ListCommentsInput): Promise<Page<CommentWithAuthor>>"),
      fn("listThread", "(orgId: OrgId, issueId: IssueId): Promise<readonly CommentThreadNode[]>"),
      fn("countComments", "(orgId: OrgId, issueId: IssueId): Promise<number>"),
      fn("insertComment", "(input: CreateCommentInput, authorId: UserId): Promise<Comment>"),
      fn("updateComment", "(input: UpdateCommentInput): Promise<Comment>"),
      fn("archiveComment", "(orgId: OrgId, commentId: CommentId): Promise<Comment>"),
    ],
    ["archivePatch", "shouldFilterArchived"],
  ],
  [
    "src/server/repositories/notification-repository.ts",
    "In-app notification rows and unread counters.",
    [
      fn("listNotifications", "(input: ListNotificationsInput): Promise<Page<Notification>>"),
      fn("countUnread", "(orgId: OrgId, recipientId: UserId): Promise<number>"),
      fn("insertNotification", "(orgId: OrgId, input: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>): Promise<Notification>"),
      fn("insertNotifications", "(orgId: OrgId, inputs: readonly Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>[]): Promise<readonly Notification[]>"),
      fn("markRead", "(orgId: OrgId, notificationId: NotificationId, at: IsoTimestamp): Promise<Notification>"),
      fn("markAllRead", "(orgId: OrgId, recipientId: UserId, at: IsoTimestamp): Promise<number>"),
      fn("listUnreadSince", "(orgId: OrgId, recipientId: UserId, since: IsoTimestamp): Promise<readonly Notification[]>"),
    ],
  ],
  [
    "src/server/repositories/notification-preference-repository.ts",
    "Per-user, per-kind delivery matrix consulted before every fan-out.",
    [
      fn("listPreferences", "(orgId: OrgId, userId: UserId): Promise<readonly NotificationPreference[]>"),
      fn("getPreference", "(orgId: OrgId, userId: UserId, kind: NotificationKind): Promise<NotificationPreference | null>"),
      fn("upsertPreference", "(input: UpdateNotificationPreferenceInput): Promise<NotificationPreference>"),
      fn("listDigestSubscribers", "(orgId: OrgId): Promise<readonly UserId[]>"),
    ],
  ],
  [
    "src/server/repositories/activity-repository.ts",
    "Append-only audit log. Never updated, never deleted before the plan's retention window.",
    [
      fn("insertActivity", "(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent>"),
      fn("listActivity", "(input: ActivityFilterInput): Promise<Page<ActivityEvent>>"),
      fn("listActivityForSubject", "(orgId: OrgId, subjectKind: ActivitySubjectKind, subjectId: string): Promise<readonly ActivityEvent[]>"),
      fn("purgeActivityBefore", "(orgId: OrgId, before: IsoTimestamp): Promise<number>"),
    ],
  ],
  [
    "src/server/repositories/subscription-repository.ts",
    "Subscription rows; one active row per organization.",
    [
      fn("findSubscription", "(orgId: OrgId): Promise<Subscription | null>"),
      fn("insertSubscription", "(orgId: OrgId, plan: PlanId, interval: BillingInterval): Promise<Subscription>"),
      fn("updateSubscriptionPlan", "(orgId: OrgId, plan: PlanId, interval: BillingInterval): Promise<Subscription>"),
      fn("updateSeatCount", "(orgId: OrgId, seats: number): Promise<Subscription>"),
      fn("cancelSubscription", "(orgId: OrgId, cancelAt: IsoTimestamp | null): Promise<Subscription>"),
      fn("listTrialsEndingBefore", "(before: IsoTimestamp): Promise<readonly Subscription[]>"),
    ],
  ],
  [
    "src/server/repositories/invoice-repository.ts",
    "Invoice history for the billing page.",
    [
      fn("listInvoices", "(orgId: OrgId): Promise<readonly Invoice[]>"),
      fn("insertInvoice", "(orgId: OrgId, invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>"),
      fn("findInvoice", "(orgId: OrgId, invoiceId: string): Promise<Invoice | null>"),
    ],
  ],
  [
    "src/server/repositories/webhook-repository.ts",
    "Webhook endpoints and their delivery attempts.",
    [
      fn("listEndpoints", "(orgId: OrgId): Promise<readonly WebhookEndpointRow[]>"),
      fn("insertEndpoint", "(input: CreateWebhookInput, secret: string): Promise<WebhookEndpointRow>"),
      fn("updateEndpoint", "(input: UpdateWebhookInput): Promise<WebhookEndpointRow>"),
      fn("deleteEndpoint", "(orgId: OrgId, webhookId: WebhookId): Promise<void>"),
      fn("countEndpoints", "(orgId: OrgId): Promise<number>"),
      fn("enqueueDelivery", "(orgId: OrgId, endpointId: string, eventType: string, payload: string): Promise<WebhookDeliveryRow>"),
      fn("claimPendingDeliveries", "(limit: number): Promise<readonly WebhookDeliveryRow[]>"),
      fn("markDelivered", "(orgId: OrgId, deliveryId: string, at: IsoTimestamp): Promise<void>"),
      fn("markDeliveryFailed", "(orgId: OrgId, deliveryId: string, error: string): Promise<void>"),
    ],
  ],
  [
    "src/server/repositories/search-repository.ts",
    "Denormalised search index kept in step by `SearchService`.",
    [
      fn("upsertSearchDocument", "(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string, content: string, projectId: ProjectId | null): Promise<void>"),
      fn("deleteSearchDocument", "(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string): Promise<void>"),
      fn("searchDocuments", "(input: SearchQueryInput): Promise<Page<SearchIndexRow>>"),
      fn("countIndexed", "(orgId: OrgId): Promise<number>"),
      type("SearchSubjectKind", "'issue' | 'comment' | 'project'"),
    ],
  ],
  [
    "src/server/repositories/usage-repository.ts",
    "The `organization_usage` counters read by every plan-limit check.",
    [
      fn("getUsage", "(orgId: OrgId): Promise<OrganizationUsage>"),
      fn("recomputeUsage", "(orgId: OrgId): Promise<OrganizationUsage>"),
      fn("incrementUsage", "(orgId: OrgId, patch: Partial<Pick<OrganizationUsage, 'seatsUsed' | 'projectsUsed' | 'issuesUsed' | 'storageMbUsed'>>): Promise<OrganizationUsage>"),
      fn("listOrgIdsForRollup", "(limit: number): Promise<readonly OrgId[]>"),
    ],
  ],
];

const SERVICES: Spec[] = [
  [
    "src/server/services/issue-service.ts",
    "Issue business rules: authorization, per-project issue quota, numbering, status transitions and the events every other concern reacts to.",
    [
      fn("createIssue", "(actor: Actor, input: CreateIssueInput): Promise<Issue>"),
      fn("updateIssue", "(actor: Actor, input: UpdateIssueInput): Promise<Issue>"),
      fn("changeIssueStatus", "(actor: Actor, input: ChangeIssueStatusInput): Promise<Issue>"),
      fn("assignIssue", "(actor: Actor, input: AssignIssueInput): Promise<Issue>"),
      fn("archiveIssue", "(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<Issue>"),
      fn("moveIssue", "(actor: Actor, input: MoveIssueInput): Promise<Issue>"),
      fn("getIssue", "(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<IssueWithRelations>"),
      fn("listIssues", "(actor: Actor, input: IssueFilterInput): Promise<Page<Issue>>"),
      fn("getBoard", "(actor: Actor, orgId: OrgId, projectId: ProjectId): Promise<readonly IssueBoardColumn[]>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "wouldExceedLimit", "assertNotArchived"],
  ],
  [
    "src/server/services/project-service.ts",
    "Project lifecycle including the project-count quota and the cascade that archives a project's issues.",
    [
      fn("createProject", "(actor: Actor, input: CreateProjectInput): Promise<Project>"),
      fn("updateProject", "(actor: Actor, input: UpdateProjectInput): Promise<Project>"),
      fn("archiveProject", "(actor: Actor, input: ArchiveProjectInput): Promise<Project>"),
      fn("restoreProject", "(actor: Actor, orgId: OrgId, projectId: ProjectId): Promise<Project>"),
      fn("getProject", "(actor: Actor, orgId: OrgId, slug: string): Promise<ProjectWithStats>"),
      fn("listProjects", "(actor: Actor, input: ListProjectsInput): Promise<Page<ProjectWithStats>>"),
      fn("suggestProjectSlug", "(orgId: OrgId, name: string): Promise<string>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "wouldExceedLimit", "uniqueSlug", "projectKeyFromName"],
  ],
  [
    "src/server/services/comment-service.ts",
    "Comment creation, edit window enforcement, mention extraction and soft delete.",
    [
      fn("createComment", "(actor: Actor, input: CreateCommentInput): Promise<Comment>"),
      fn("updateComment", "(actor: Actor, input: UpdateCommentInput): Promise<Comment>"),
      fn("deleteComment", "(actor: Actor, input: DeleteCommentInput): Promise<Comment>"),
      fn("getThread", "(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<readonly CommentThreadNode[]>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "archivePatch"],
  ],
  [
    "src/server/services/member-service.ts",
    "Membership and role changes, including the invariant that an organization always keeps one owner.",
    [
      fn("listMembers", "(actor: Actor, input: ListMembersInput): Promise<Page<MemberWithUser>>"),
      fn("updateMemberRole", "(actor: Actor, input: UpdateMemberRoleInput): Promise<Member>"),
      fn("removeMember", "(actor: Actor, input: RemoveMemberInput): Promise<Member>"),
      fn("resolveActor", "(userId: UserId, orgId: OrgId): Promise<Actor | null>"),
      fn("assertLastOwnerRetained", "(orgId: OrgId, memberId: MemberId, nextRole: Role): Promise<void>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "hasRoleAtLeast"],
  ],
  [
    "src/server/services/invitation-service.ts",
    "Invite issuing and acceptance. Enforces the seat quota and the invite rate limit before a token is minted.",
    [
      fn("inviteMember", "(actor: Actor, input: InviteMemberInput): Promise<Invitation>"),
      fn("inviteMembers", "(actor: Actor, input: InviteMembersInput): Promise<readonly Invitation[]>"),
      fn("acceptInvitation", "(userId: UserId, input: AcceptInvitationTokenInput): Promise<Member>"),
      fn("revokeInvitation", "(actor: Actor, invitationId: InvitationId): Promise<Invitation>"),
      fn("resendInvitation", "(actor: Actor, invitationId: InvitationId): Promise<Invitation>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "wouldExceedLimit", "getPlanLimits", "consumeRateLimit"],
  ],
  [
    "src/server/services/organization-service.ts",
    "Organization creation, settings updates and deletion; seeds the owner membership and the free subscription.",
    [
      fn("createOrganization", "(ownerId: UserId, input: CreateOrganizationInput): Promise<Organization>"),
      fn("updateOrganization", "(actor: Actor, input: UpdateOrganizationInput): Promise<Organization>"),
      fn("deleteOrganization", "(actor: Actor, input: DeleteOrganizationInput): Promise<Organization>"),
      fn("getOrganizationSummary", "(actor: Actor, orgId: OrgId): Promise<OrganizationSummary>"),
      fn("listOrganizationsForUser", "(userId: UserId): Promise<readonly Organization[]>"),
      fn("resolveOrgBySlug", "(slug: string): Promise<Organization | null>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "uniqueSlug", "assertValidSlug"],
  ],
  [
    "src/server/services/billing-service.ts",
    "Plan changes and quota arithmetic. The single reader of `PLAN_LIMITS` on the server; every other layer asks this service.",
    [
      fn("getBillingSummary", "(actor: Actor, orgId: OrgId): Promise<BillingSummary>"),
      fn("checkLimit", "(orgId: OrgId, resource: LimitedResource, requested?: number): Promise<LimitCheck>"),
      fn("assertWithinLimit", "(orgId: OrgId, resource: LimitedResource, requested?: number): Promise<void>"),
      fn("changePlan", "(actor: Actor, input: ChangePlanInput): Promise<Subscription>"),
      fn("updateSeats", "(actor: Actor, input: UpdateSeatsInput): Promise<Subscription>"),
      fn("cancelSubscription", "(actor: Actor, input: CancelSubscriptionInput): Promise<Subscription>"),
      fn("listInvoices", "(actor: Actor, orgId: OrgId): Promise<readonly Invoice[]>"),
    ],
    ["assertCan", "assertOrgScope", "emit", "getPlanLimits", "wouldExceedLimit", "getLimit"],
  ],
  [
    "src/server/services/notification-service.ts",
    "The fan-out hub: one domain event becomes in-app rows, an email draft and/or a digest entry, filtered by each recipient's preferences.",
    [
      fn("notify", "(orgId: OrgId, kind: NotificationKind, recipients: readonly UserId[], payload: NotificationPayload): Promise<readonly Notification[]>"),
      fn("listNotifications", "(actor: Actor, input: ListNotificationsInput): Promise<Page<Notification>>"),
      fn("markRead", "(actor: Actor, input: MarkNotificationReadInput): Promise<Notification>"),
      fn("markAllRead", "(actor: Actor, orgId: OrgId): Promise<number>"),
      fn("updatePreference", "(actor: Actor, input: UpdateNotificationPreferenceInput): Promise<NotificationPreference>"),
      fn("resolveChannels", "(preference: NotificationPreference | null, flags: FlagContext): readonly NotificationChannel[]"),
      type("NotificationPayload", "{ title: string; body: string; href: string; actorId: UserId | null }"),
    ],
    ["assertCan", "assertOrgScope", "isEnabled", "subscribe"],
  ],
  [
    "src/server/services/activity-service.ts",
    "Audit-log writer and reader. Subscribes to the whole event bus and records one row per domain event.",
    [
      fn("record", "(orgId: OrgId, action: ActivityAction, input: ActivityRecordInput): Promise<ActivityEvent>"),
      fn("listActivity", "(actor: Actor, input: ActivityFilterInput): Promise<Page<ActivityEvent>>"),
      fn("groupByDay", "(events: readonly ActivityEvent[]): readonly ActivityGroup[]"),
      fn("exportActivity", "(actor: Actor, input: ExportActivityInput): Promise<string>"),
      fn("registerActivityListeners", "(): Unsubscribe"),
      type("ActivityRecordInput", "{ actorId: UserId | null; subjectKind: ActivitySubjectKind; subjectId: string; projectId: ProjectId | null; summary: string; metadata?: Readonly<Record<string, string | number | boolean | null>> }"),
    ],
    ["assertCan", "assertOrgScope", "subscribe", "isEnabled", "toCsv"],
  ],
  [
    "src/server/services/search-service.ts",
    "Query-time search plus the write-time index maintenance driven by `search.reindex_requested`.",
    [
      fn("search", "(actor: Actor, input: SearchQueryInput): Promise<Page<SearchHit>>"),
      type("SearchHit", "{ kind: SearchSubjectKind; id: string; title: string; snippet: string; href: string }"),
      fn("indexIssue", "(orgId: OrgId, issue: Issue): Promise<void>"),
      fn("indexComment", "(orgId: OrgId, comment: Comment): Promise<void>"),
      fn("indexProject", "(orgId: OrgId, project: Project): Promise<void>"),
      fn("removeFromIndex", "(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string): Promise<void>"),
      fn("registerSearchListeners", "(): Unsubscribe"),
    ],
    ["assertCan", "assertOrgScope", "subscribe", "isEnabled"],
  ],
  [
    "src/server/services/auth-service.ts",
    "Credential login, registration and password reset. No third-party provider.",
    [
      fn("register", "(input: RegisterInput): Promise<{ user: User; org: Organization }>"),
      fn("login", "(input: LoginInput): Promise<{ user: User; token: string }>"),
      fn("logout", "(sessionId: SessionId): Promise<void>"),
      fn("requestPasswordReset", "(input: PasswordResetRequestInput): Promise<void>"),
      fn("confirmPasswordReset", "(input: PasswordResetConfirmInput): Promise<User>"),
    ],
    ["hashPassword", "verifyPassword", "consumeRateLimit", "emit"],
  ],
  [
    "src/server/services/session-service.ts",
    "Turns the session cookie into an `Actor`. Everything server-side that needs authorization starts here.",
    [
      fn("createSessionToken", "(userId: UserId): Promise<{ token: string; expiresAt: IsoTimestamp }>"),
      fn("resolveSession", "(token: string): Promise<SessionPrincipal | null>"),
      fn("resolveActorForOrg", "(principal: SessionPrincipal, orgSlug: string): Promise<Actor | null>"),
      fn("switchActiveOrg", "(principal: SessionPrincipal, input: SwitchOrgInput): Promise<void>"),
      fn("destroySession", "(token: string): Promise<void>"),
    ],
    ["assertOrgScope"],
  ],
  [
    "src/server/services/label-service.ts",
    "Label CRUD and the issue↔label assignment used by the picker.",
    [
      fn("listLabels", "(actor: Actor, orgId: OrgId): Promise<readonly IssueLabel[]>"),
      fn("createLabel", "(actor: Actor, input: CreateLabelInput): Promise<IssueLabel>"),
      fn("updateLabel", "(actor: Actor, input: UpdateLabelInput): Promise<IssueLabel>"),
      fn("deleteLabel", "(actor: Actor, orgId: OrgId, labelId: LabelId): Promise<void>"),
    ],
    ["assertCan", "assertOrgScope"],
  ],
  [
    "src/server/services/attachment-service.ts",
    "Attachment metadata plus the storage quota guard.",
    [
      fn("listAttachments", "(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<readonly IssueAttachment[]>"),
      fn("addAttachment", "(actor: Actor, input: CreateAttachmentInput): Promise<IssueAttachment>"),
      fn("removeAttachment", "(actor: Actor, input: DeleteAttachmentInput): Promise<void>"),
    ],
    ["assertCan", "assertOrgScope", "wouldExceedLimit"],
  ],
  [
    "src/server/services/webhook-service.ts",
    "Webhook endpoint management and the bridge from `webhook.delivery_requested` to the delivery queue.",
    [
      fn("listWebhooks", "(actor: Actor, orgId: OrgId): Promise<readonly WebhookEndpointRow[]>"),
      fn("createWebhook", "(actor: Actor, input: CreateWebhookInput): Promise<WebhookEndpointRow>"),
      fn("updateWebhook", "(actor: Actor, input: UpdateWebhookInput): Promise<WebhookEndpointRow>"),
      fn("deleteWebhook", "(actor: Actor, input: DeleteWebhookInput): Promise<void>"),
      fn("signPayload", "(secret: string, payload: string): string"),
      fn("registerWebhookListeners", "(): Unsubscribe"),
    ],
    ["assertCan", "assertOrgScope", "subscribe", "isEnabled", "wouldExceedLimit"],
  ],
  [
    "src/server/services/digest-service.ts",
    "Builds the daily digest bundle per recipient from unread notifications inside the org's digest window.",
    [
      fn("buildDigest", "(orgId: OrgId, recipientId: UserId, windowStart: IsoTimestamp, windowEnd: IsoTimestamp): Promise<DigestBundle | null>"),
      fn("listDigestRecipients", "(orgId: OrgId): Promise<readonly UserId[]>"),
      fn("renderDigest", "(bundle: DigestBundle, recipient: User): Promise<RenderedEmail>"),
    ],
    ["isEnabled", "renderEmail"],
  ],
  [
    "src/server/services/feature-flag-service.ts",
    "Server-side flag context construction and the org-level override toggle.",
    [
      fn("buildFlagContext", "(actor: Actor | null, org: Organization | null): FlagContext"),
      fn("getSnapshot", "(actor: Actor, org: Organization): FeatureFlagSnapshot"),
      fn("toggleFlag", "(actor: Actor, input: ToggleFeatureFlagInput): Promise<Organization>"),
    ],
    ["assertCan", "isEnabled", "snapshotFlags", "emit"],
  ],
  [
    "src/server/services/usage-service.ts",
    "Recomputes the usage counters that every `LimitCheck` compares against.",
    [
      fn("getUsage", "(actor: Actor, orgId: OrgId): Promise<OrganizationUsage>"),
      fn("recomputeUsage", "(orgId: OrgId): Promise<OrganizationUsage>"),
      fn("registerUsageListeners", "(): Unsubscribe"),
    ],
    ["assertOrgScope", "subscribe", "getPlanLimits"],
  ],
  [
    "src/server/services/email-service.ts",
    "Renders react-email templates and 'sends' them by writing the draft to the log. No network egress.",
    [
      fn("sendEmail", "(message: OutgoingEmail): Promise<void>"),
      fn("renderEmail", "(template: EmailTemplate, props: Readonly<Record<string, unknown>>): Promise<RenderedEmail>"),
      type("OutgoingEmail", "{ to: string; subject: string; html: string; text: string }"),
      type("RenderedEmail", "{ subject: string; html: string; text: string }"),
      type("EmailTemplate", "'invite' | 'digest' | 'mention' | 'invoice' | 'welcome' | 'password-reset' | 'overdue'"),
    ],
  ],
  [
    "src/server/services/event-registry.ts",
    "Wires every subscriber at process start. Called once from `src/instrumentation.ts`; the only module that knows the full listener set.",
    [
      fn("registerEventHandlers", "(): void"),
      fn("unregisterEventHandlers", "(): void"),
    ],
    ["subscribe", "registerActivityListeners", "registerSearchListeners", "registerUsageListeners", "registerWebhookListeners"],
  ],
];

const JOBS: Spec[] = [
  [
    "src/server/jobs/queue.ts",
    "Minimal in-process job queue: enqueue, drain, retry with backoff. Jobs never run inside a request.",
    [
      fn("enqueue", "(job: QueuedJob): void"),
      fn("drain", "(limit?: number): Promise<number>"),
      fn("pendingCount", "(): number"),
      fn("resetQueue", "(): void"),
      type("QueuedJob", "{ id: string; kind: JobKind; runAt: IsoTimestamp; attempts: number; payload: Readonly<Record<string, unknown>> }"),
      type("JobKind", "'digest-email' | 'overdue-issues' | 'webhook-delivery' | 'usage-rollup' | 'search-reindex' | 'cleanup-archived' | 'trial-expiry'"),
    ],
  ],
  [
    "src/server/jobs/scheduler.ts",
    "Interval-based scheduler started from `src/instrumentation.ts`; decides which job kind is due.",
    [
      fn("startScheduler", "(): void"),
      fn("stopScheduler", "(): void"),
      fn("tick", "(now: Date): Promise<void>"),
      fn("isSchedulerRunning", "(): boolean"),
    ],
  ],
  [
    "src/server/jobs/digest-email-job.ts",
    "Builds and 'sends' the daily digest for every subscriber of every org whose digest hour has arrived.",
    [
      fn("runDigestEmailJob", "(now: Date): Promise<JobResult>"),
      fn("shouldRunForOrg", "(org: Organization, now: Date): boolean"),
    ],
    ["isEnabled", "buildDigest", "sendEmail"],
  ],
  [
    "src/server/jobs/overdue-issue-job.ts",
    "Scans for issues past `dueAt` and emits `issue.overdue`, which the notification fan-out turns into alerts.",
    [fn("runOverdueIssueJob", "(now: Date): Promise<JobResult>")],
    ["emit", "shouldFilterArchived"],
  ],
  [
    "src/server/jobs/webhook-delivery-job.ts",
    "Drains pending webhook deliveries with exponential backoff; disabled unless the org's plan includes webhooks.",
    [
      fn("runWebhookDeliveryJob", "(now: Date): Promise<JobResult>"),
      fn("backoffMs", "(attempts: number): number"),
    ],
    ["isEnabled", "getPlanLimits", "signPayload"],
  ],
  [
    "src/server/jobs/usage-rollup-job.ts",
    "Recomputes `organization_usage` so plan-limit checks stay accurate after bulk changes.",
    [fn("runUsageRollupJob", "(now: Date): Promise<JobResult>")],
    ["recomputeUsage"],
  ],
  [
    "src/server/jobs/search-reindex-job.ts",
    "Rebuilds the search index for one organization; used after a bulk import or an index drift alarm.",
    [fn("runSearchReindexJob", "(orgId: OrgId): Promise<JobResult>")],
    ["indexIssue", "indexComment", "indexProject"],
  ],
  [
    "src/server/jobs/cleanup-archived-job.ts",
    "Permanently removes rows archived longer ago than the plan's `retentionDays`.",
    [fn("runCleanupArchivedJob", "(now: Date): Promise<JobResult>")],
    ["getPlanLimits", "isArchived"],
  ],
  [
    "src/server/jobs/trial-expiry-job.ts",
    "Downgrades organizations whose trial ended and emits `billing.plan_changed`.",
    [fn("runTrialExpiryJob", "(now: Date): Promise<JobResult>")],
    ["emit", "getPlanLimits"],
  ],
  [
    "src/server/jobs/types.ts",
    "Result envelope every job returns to the scheduler.",
    [
      type("JobResult", "{ kind: string; processed: number; failed: number; durationMs: number; startedAt: IsoTimestamp }"),
      fn("emptyJobResult", "(kind: string, startedAt: IsoTimestamp): JobResult"),
    ],
  ],
];

const DB_SCRIPTS: Spec[] = [
  [
    "src/server/db/migrate.ts",
    "Applies the drizzle-kit migrations in ./drizzle to the SQLite file. Run via `pnpm db:migrate`.",
    [fn("runMigrations", "(databasePath?: string): Promise<void>")],
  ],
  [
    "src/server/db/seed.ts",
    "Deterministic development seed: two organizations on different plans, members in all four roles, projects, issues (including archived and overdue) and comments.",
    [
      fn("seedDatabase", "(databasePath?: string): Promise<SeedSummary>"),
      type("SeedSummary", "{ organizations: number; users: number; projects: number; issues: number; comments: number }"),
    ],
    ["uniqueSlug", "getPlanLimits"],
  ],
];

function toEntries(specs: Spec[]): ManifestEntry[] {
  return specs.map(([path, responsibility, exports, mustUse]) => ({
    path,
    owner: "C" as const,
    responsibility,
    exports,
    mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
  }));
}

export const serverEntries: ManifestEntry[] = [
  ...toEntries(REPOSITORIES),
  ...toEntries(SERVICES),
  ...toEntries(JOBS),
  ...toEntries(DB_SCRIPTS),
  {
    path: "src/server/repositories/index.ts",
    owner: "C",
    responsibility: "Barrel for the data-access layer.",
    exports: [],
  },
  {
    path: "src/server/services/index.ts",
    owner: "C",
    responsibility: "Barrel for the service layer; Server Actions import from here.",
    exports: [],
  },
  {
    path: "src/server/jobs/index.ts",
    owner: "C",
    responsibility: "Barrel for the job layer.",
    exports: [],
  },
];
