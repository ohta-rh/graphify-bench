import type { ManifestEntry } from "../manifest-types";

/** Owner B — feature components and React hooks. These compose `src/components/ui`,
 *  read the frozen types, and are the UI-side consumers of `can()` and the
 *  feature flags. They never touch `src/server/**` directly; data arrives as props
 *  from a Server Component, or through a Server Action passed in. */

type DomainSpec = [
  file: string,
  component: string,
  props: string,
  responsibility: string,
  mustUse?: string[],
  client?: boolean,
];

const DOMAIN: DomainSpec[] = [
  ["issue/issue-card", "IssueCard", "{ issue: Issue; assignee?: User | null; labels?: readonly IssueLabel[]; href: string; compact?: boolean }", "Compact issue summary tile used by lists and the board."],
  ["issue/issue-list", "IssueList", "{ issues: readonly IssueWithRelations[]; actor: Actor; emptyLabel?: string; onArchive?: (issueId: IssueId) => void }", "Virtualised issue list; hides row actions the actor may not perform.", ["can"]],
  ["issue/issue-row", "IssueRow", "{ issue: Issue; actor: Actor; assignee: User | null; onSelect?: (issueId: IssueId) => void }", "One row of `IssueList`; renders the archive control only when permitted.", ["can"]],
  ["issue/issue-detail", "IssueDetail", "{ issue: IssueWithRelations; actor: Actor; author: User; assignee: User | null }", "Issue header, description and metadata rail.", ["can"]],
  ["issue/issue-form", "IssueForm", "{ orgId: OrgId; projectId: ProjectId; defaultValues?: Partial<CreateIssueInput>; members: readonly MemberWithUser[]; labels: readonly IssueLabel[]; onSubmit: (input: CreateIssueInput) => Promise<ActionResult<Issue>> }", "Create/edit form bound to `createIssueSchema` through `zodResolver`.", ["createIssueSchema"], true],
  ["issue/issue-status-select", "IssueStatusSelect", "{ value: IssueStatus; disabled?: boolean; onChange: (status: IssueStatus) => void }", "Status dropdown driven by `ISSUE_STATUSES`.", [], true],
  ["issue/issue-priority-select", "IssuePrioritySelect", "{ value: IssuePriority; disabled?: boolean; onChange: (priority: IssuePriority) => void }", "Priority dropdown driven by `ISSUE_PRIORITIES`.", [], true],
  ["issue/issue-assignee-picker", "IssueAssigneePicker", "{ value: UserId | null; members: readonly MemberWithUser[]; disabled?: boolean; onChange: (userId: UserId | null) => void }", "Assignee combobox restricted to active members.", [], true],
  ["issue/issue-label-picker", "IssueLabelPicker", "{ value: readonly LabelId[]; labels: readonly IssueLabel[]; onChange: (labelIds: readonly LabelId[]) => void }", "Multi-select label chips.", [], true],
  ["issue/issue-due-date-field", "IssueDueDateField", "{ value: IsoTimestamp | null; onChange: (value: IsoTimestamp | null) => void }", "Due-date control that flags overdue values.", [], true],
  ["issue/issue-filter-bar", "IssueFilterBar", "{ filter: IssueFilter; projects: readonly Project[]; members: readonly MemberWithUser[]; onChange: (filter: IssueFilter) => void }", "Filter chips writing back into the URL search params.", [], true],
  ["issue/issue-bulk-actions", "IssueBulkActions", "{ selected: readonly IssueId[]; actor: Actor; onArchive: () => void; onAssign: (userId: UserId) => void }", "Bulk toolbar shown when rows are selected; permission gated.", ["can"], true],
  ["issue/issue-activity-panel", "IssueActivityPanel", "{ events: readonly ActivityEvent[]; actors: Readonly<Record<string, User>> }", "Per-issue slice of the audit trail."],
  ["board/kanban-board", "KanbanBoard", "{ columns: readonly IssueBoardColumn[]; actor: Actor; flags: FeatureFlagSnapshot; onMove: (input: MoveIssueInput) => Promise<ActionResult<Issue>> }", "Drag-and-drop board; renders nothing unless the `kanban_board` flag is on.", ["isEnabled", "can"], true],
  ["board/kanban-column", "KanbanColumn", "{ column: IssueBoardColumn; actor: Actor; onDrop: (issueId: IssueId, toIndex: number) => void }", "One status column with a drop target.", ["can"], true],
  ["board/kanban-card", "KanbanCard", "{ issue: Issue; assignee: User | null; draggable: boolean }", "Draggable card inside a column.", [], true],
  ["comment/comment-thread", "CommentThread", "{ nodes: readonly CommentThreadNode[]; actor: Actor; onDelete: (commentId: CommentId) => void }", "Threaded comment list, hiding delete for non-authors.", ["can"]],
  ["comment/comment-item", "CommentItem", "{ comment: CommentWithAuthor; actor: Actor; depth: number; onEdit?: (commentId: CommentId) => void }", "One comment with author, timestamp and inline actions.", ["can"]],
  ["comment/comment-composer", "CommentComposer", "{ orgId: OrgId; issueId: IssueId; members: readonly MemberWithUser[]; onSubmit: (input: CreateCommentInput) => Promise<ActionResult<Comment>> }", "Comment box bound to `createCommentSchema`.", ["createCommentSchema"], true],
  ["comment/mention-textarea", "MentionTextarea", "{ value: string; members: readonly MemberWithUser[]; onChange: (value: string, mentioned: readonly UserId[]) => void }", "Textarea with an @-mention autocomplete that reports mentioned ids.", [], true],
  ["project/project-card", "ProjectCard", "{ project: Project; stats: ProjectStats; href: string; actor: Actor }", "Project tile with open/closed counts.", ["can"]],
  ["project/project-form", "ProjectForm", "{ orgId: OrgId; members: readonly MemberWithUser[]; defaultValues?: Partial<CreateProjectInput>; onSubmit: (input: CreateProjectInput) => Promise<ActionResult<Project>> }", "Create/edit project form; previews the slug with `slugify`.", ["createProjectSchema", "slugify"], true],
  ["project/project-header", "ProjectHeader", "{ project: Project; actor: Actor; stats: ProjectStats }", "Project title bar with settings/archive entry points.", ["can"]],
  ["project/project-switcher", "ProjectSwitcher", "{ projects: readonly Project[]; currentSlug: string; orgSlug: string }", "Quick project navigation combobox.", [], true],
  ["project/project-archive-dialog", "ProjectArchiveDialog", "{ open: boolean; project: Project; actor: Actor; onConfirm: (input: ArchiveProjectInput) => Promise<ActionResult<Project>>; onClose: () => void }", "Archive confirmation explaining the soft-delete semantics.", ["can"], true],
  ["member/member-table", "MemberTable", "{ members: readonly MemberWithUser[]; actor: Actor; onRoleChange: (memberId: MemberId, role: Role) => void; onRemove: (memberId: MemberId) => void }", "Members settings table; role and remove controls are permission gated.", ["can"], true],
  ["member/invite-member-form", "InviteMemberForm", "{ orgId: OrgId; actor: Actor; seatCheck: LimitCheck; onSubmit: (input: InviteMemberInput) => Promise<ActionResult<Invitation>> }", "Invite form that disables submit once the seat quota is reached.", ["inviteMemberSchema", "can", "getPlanLimits"], true],
  ["member/invitation-list", "InvitationList", "{ invitations: readonly Invitation[]; actor: Actor; onRevoke: (invitationId: InvitationId) => void }", "Pending invitations with resend/revoke.", ["can"]],
  ["member/role-select", "RoleSelect", "{ value: Role; actor: Actor; disabled?: boolean; onChange: (role: Role) => void }", "Role dropdown that never offers a role above the actor's own.", ["hasRoleAtLeast"], true],
  ["member/remove-member-dialog", "RemoveMemberDialog", "{ open: boolean; member: MemberWithUser; onConfirm: () => void; onClose: () => void }", "Removal confirmation.", [], true],
  ["billing/billing-plan-card", "BillingPlanCard", "{ plan: PlanId; limits: PlanLimits; current: boolean; actor: Actor; onSelect: (plan: PlanId) => void }", "One plan tile rendering quotas straight from `PlanLimits`.", ["getPlanLimits", "can"]],
  ["billing/plan-comparison-table", "PlanComparisonTable", "{ currentPlan: PlanId; onSelect: (plan: PlanId) => void }", "Side-by-side quota table for all four plans.", ["getPlanLimits"]],
  ["billing/usage-meter", "UsageMeter", "{ check: LimitCheck; label?: string }", "Progress bar for one `LimitCheck`.", []],
  ["billing/usage-panel", "UsagePanel", "{ summary: BillingSummary }", "All quota meters for the organization.", ["getPlanLimits"]],
  ["billing/seat-limit-banner", "SeatLimitBanner", "{ check: LimitCheck; orgSlug: string; actor: Actor }", "Upgrade prompt shown when seats are exhausted.", ["can"]],
  ["billing/invoice-table", "InvoiceTable", "{ invoices: readonly Invoice[] }", "Invoice history table."],
  ["notification/notification-bell", "NotificationBell", "{ unreadCount: number; orgSlug: string }", "Header bell with an unread badge.", [], true],
  ["notification/notification-list", "NotificationList", "{ notifications: readonly Notification[]; onMarkRead: (id: NotificationId) => void; onMarkAllRead: () => void }", "Inbox list with read/unread affordances.", [], true],
  ["notification/notification-preferences-form", "NotificationPreferencesForm", "{ orgId: OrgId; userId: UserId; preferences: readonly NotificationPreference[]; flags: FeatureFlagSnapshot; onSubmit: (input: UpdateNotificationPreferenceInput) => Promise<ActionResult<NotificationPreference>> }", "Per-kind channel matrix; the digest column is hidden unless `digest_email` is on.", ["isEnabled"], true],
  ["activity/activity-feed", "ActivityFeed", "{ groups: readonly ActivityGroup[]; actors: Readonly<Record<string, User>>; actor: Actor }", "Grouped audit trail; the export button needs `activity:export`.", ["can", "isEnabled"]],
  ["nav/app-sidebar", "AppSidebar", "{ org: Organization; actor: Actor; flags: FeatureFlagSnapshot; projects: readonly Project[]; pathname: string }", "Role-aware sidebar: every item is filtered through `can()` and its flag.", ["can", "isEnabled"], true],
  ["nav/org-switcher", "OrgSwitcher", "{ organizations: readonly Organization[]; currentSlug: string }", "Tenant switcher; navigating changes the whole `[orgSlug]` subtree.", [], true],
  ["nav/top-bar", "TopBar", "{ org: Organization; actor: Actor; unreadCount: number; flags: FeatureFlagSnapshot }", "Header with search trigger, notifications and the user menu.", ["isEnabled"], true],
  ["nav/user-menu", "UserMenu", "{ user: User; orgSlug: string; onSignOut: () => void }", "Avatar dropdown.", [], true],
  ["search/search-dialog", "SearchDialog", "{ open: boolean; orgId: OrgId; flags: FeatureFlagSnapshot; onClose: () => void; onSearch: (input: SearchQueryInput) => Promise<ActionResult<SearchHit[]>> }", "Ctrl+K search overlay; advanced syntax requires `advanced_search`.", ["isEnabled"], true],
  ["search/search-results", "SearchResults", "{ hits: readonly SearchHit[]; query: string; onSelect: (hit: SearchHit) => void }", "Grouped search hits."],
  ["flags/feature-flag-provider", "FeatureFlagProvider", "{ snapshot: FeatureFlagSnapshot; children?: ReactNode }", "Client context carrying the server-evaluated flag snapshot.", ["snapshotFlags"], true],
  ["flags/feature-gate", "FeatureGate", "{ flag: FeatureFlagKey; fallback?: ReactNode; children?: ReactNode }", "Renders children only when the flag is on for the current context.", ["isEnabled"], true],
  ["permission/permission-gate", "PermissionGate", "{ actor: Actor; action: PermissionAction; resource: PermissionResource; fallback?: ReactNode; children?: ReactNode }", "Declarative wrapper around `can()` for conditional UI.", ["can"]],
  ["permission/role-badge", "RoleBadge", "{ role: Role; size?: 'sm' | 'md' }", "Coloured badge for a member's role."],
];

const EXTRA_TYPES: Record<string, [string, string][]> = {};

export const domainEntries: ManifestEntry[] = DOMAIN.map(
  ([file, component, props, responsibility, mustUse, client]) => {
    const propsType = `${component}Props`;
    return {
      path: `src/components/domain/${file}.tsx`,
      owner: "B",
      responsibility,
      mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
      client: client === true,
      exports: [
        ...(EXTRA_TYPES[file] ?? []).map(([name, rhs]) => ({
          name,
          kind: "type" as const,
          signature: rhs,
        })),
        { name: propsType, kind: "type" as const, signature: props },
        {
          name: component,
          kind: "component" as const,
          signature: `(props: ${propsType}): ReactElement | null`,
        },
      ],
    };
  },
);

type HookSpec = [
  file: string,
  name: string,
  signature: string,
  responsibility: string,
  mustUse?: string[],
];

const HOOKS: HookSpec[] = [
  ["use-org", "useOrg", "(): { org: Organization; actor: Actor; flags: FeatureFlagSnapshot }", "Reads the org/actor/flag context installed by the dashboard layout."],
  ["use-permission", "usePermission", "(action: PermissionAction, resource: PermissionResource): boolean", "Client-side `can()` for the current actor. Never re-implements the matrix.", ["can"]],
  ["use-feature-flag", "useFeatureFlag", "(flag: FeatureFlagKey): boolean", "Reads one flag from the `FeatureFlagProvider` snapshot.", ["isEnabled"]],
  ["use-plan-limits", "usePlanLimits", "(): { limits: PlanLimits; checks: readonly LimitCheck[]; isExceeded: (resource: LimitedResource) => boolean }", "Exposes the org's quotas to the UI.", ["getPlanLimits"]],
  ["use-optimistic-issues", "useOptimisticIssues", "(issues: readonly Issue[]): { issues: readonly Issue[]; applyStatus: (issueId: IssueId, status: IssueStatus) => void; applyAssignee: (issueId: IssueId, assigneeId: UserId | null) => void }", "`useOptimistic` wrapper reconciled by the issue Server Actions."],
  ["use-notifications", "useNotifications", "(orgId: OrgId): { notifications: readonly Notification[]; unreadCount: number; markRead: (id: NotificationId) => void; markAllRead: () => void }", "Client-side notification list state for the bell and inbox."],
  ["use-toast", "useToast", "(): { toasts: readonly ToastSpec[]; push: (toast: Omit<ToastSpec, 'id'>) => string; dismiss: (id: string) => void }", "Toast queue backing `Toaster`."],
  ["use-form-action", "useFormAction", "<TInput, TData>(action: (input: TInput) => Promise<ActionResult<TData>>, options?: FormActionOptions): { submit: (input: TInput) => Promise<void>; pending: boolean; error: AppErrorShape | null }", "Bridges react-hook-form submission to a Server Action's `ActionResult`."],
  ["use-issue-filters", "useIssueFilters", "(): { filter: IssueFilter; setFilter: (filter: IssueFilter) => void; reset: () => void }", "Reads and writes the issue filter through the URL search params."],
  ["use-pagination", "usePagination", "(total: number, perPage?: number): { page: number; perPage: number; pageCount: number; setPage: (page: number) => void }", "Page-number state synced to the query string."],
  ["use-command-palette", "useCommandPalette", "(): { open: boolean; setOpen: (open: boolean) => void; groups: readonly CommandGroup[] }", "Builds the Ctrl+K command groups from the actor's permissions and flags.", ["can", "isEnabled"]],
  ["use-keyboard-shortcut", "useKeyboardShortcut", "(keys: readonly string[], handler: () => void, enabled?: boolean): void", "Global keydown binding with modifier matching."],
  ["use-debounced-value", "useDebouncedValue", "(value: string, delayMs?: number): string", "Debounces search and filter inputs."],
];

const HOOK_EXTRA_TYPES: Record<string, [string, string][]> = {
  "use-form-action": [
    [
      "FormActionOptions",
      "{ onSuccess?: () => void; onError?: (error: AppErrorShape) => void; resetOnSuccess?: boolean }",
    ],
  ],
};

export const hookEntries: ManifestEntry[] = HOOKS.map(
  ([file, name, signature, responsibility, mustUse]) => ({
    path: `src/hooks/${file}.ts`,
    owner: "B",
    responsibility,
    mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
    client: true,
    exports: [
      ...(HOOK_EXTRA_TYPES[file] ?? []).map(([tName, rhs]) => ({
        name: tName,
        kind: "type" as const,
        signature: rhs,
      })),
      { name, kind: "hook" as const, signature },
    ],
  }),
);

hookEntries.push({
  path: "src/hooks/index.ts",
  owner: "B",
  responsibility: "Barrel for the hook layer.",
  exports: [],
});

domainEntries.push({
  path: "src/components/domain/index.ts",
  owner: "B",
  responsibility: "Barrel for the domain component layer.",
  exports: [],
});
