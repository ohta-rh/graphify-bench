# Graph Report - taskflow  (2026-09-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2545 nodes · 10202 edges · 120 communities (98 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Shared UI Primitives
- Database Schema and Migrations
- Logging and Background Jobs
- Event Bus and Domain Errors
- Invitation and Preference Repositories
- Project Context Loading
- Billing Pages and Plan Cards
- Project Settings and Domain Types
- Domain Component Prop Types
- Issue Server Actions
- Kanban and Issue Cards
- Soft Delete and Issue Repository
- Plan Change and Seat Limits
- Tenant Context and Routing Config
- Issue List and Label Picker
- Action Input Contracts
- Auth and Organization Actions
- Settings Layout and Resources
- Activity and Comment Repositories
- Form Dialogs and Composers
- Registration and Password Hashing
- Webhook API Routes
- Comment and Issue Services
- Label and Webhook Managers
- Feature Flag Provider and Shell
- Permission Matrix and Test Factories
- Password Reset and Comment Creation
- TypeScript Compiler Configuration
- Board Model and Optimistic Updates
- Contract Stub Generation
- Issue and Export Schemas
- Id Generation and Attachments
- Repository Registry
- Organization Settings Forms
- Issue Filter Controls
- Sidebar and Notification Bell
- Corpus Manifest Domain Spec
- Authorization and Attachment Services
- Common Branded Id Schemas
- Development Dependencies
- Search and Notification Preferences
- Dashboard Route Pages
- Navigation and Feature Flag Types
- Email Layout Components
- Member and Profile Schemas
- Slug Validation
- Service Registry
- Billing Service and Limits
- Date Picker and Calendar
- Runtime Dependencies
- Email Rendering Service
- Org Context React Hooks
- Project Search Webhook Actions
- Notification Service
- Constants and Pagination Helpers
- Toast Store
- Result Type and Validation
- CSV Export Routes
- Issue Filter URL Params
- Keyboard Shortcut Matching
- App Route Manifest Spec
- Seat Update and Billing Schemas
- Mention Autocomplete
- Notification Store
- Email Templates
- Activity and Search Schemas
- Attachment and Pagination Schemas
- Member Management Actions
- Activity Feed and Service
- Session Proxy and Cookies
- Project Schemas
- Webhook Service and Schemas
- Login Flow
- Feature Flag Admin Toggles
- Loading Skeletons
- Environment and Site Config
- Notification Schemas
- Member Repository
- Library Contract Spec
- Activity Labels and Grouping
- Pagination Range Component
- Comment Schemas
- Server Contract Spec
- Invitation Acceptance Page
- Root Layout and Changelog
- Package Scripts
- Notification Read Actions
- Organization Repository
- Feature Flag Schemas
- Label Management Actions
- Marketing Navigation
- Markdown Rendering
- Tenant Scope Guards
- Package Metadata
- pnpm Build Configuration
- Profile Update Action
- Dashboard Error Boundary
- Mention Extraction
- PostCSS Configuration
- Health Check Route
- Marketing Layout
- ESLint Configuration
- Next ESLint Config Package
- Next Environment Types
- Jest DOM Matchers
- tsx Runner Package
- Node Types Package
- React DOM Package
- Vitest Package

## God Nodes (most connected - your core abstractions)
1. `can()` - 171 edges
2. `getDb()` - 152 edges
3. `toIsoTimestamp()` - 129 edges
4. `orgPredicate()` - 95 edges
5. `cn()` - 94 edges
6. `OrgId` - 90 edges
7. `assertOrgScope()` - 84 edges
8. `UserId` - 81 edges
9. `isEnabled()` - 74 edges
10. `assertCan()` - 70 edges

## Surprising Connections (you probably didn't know these)
- `event()` --calls--> `toIsoTimestamp()`  [EXTRACTED]
  tests/components/activity-grouping.test.ts → src/types/common.ts
- `member()` --calls--> `toIsoTimestamp()`  [EXTRACTED]
  tests/components/mention-query.test.ts → src/types/common.ts
- `renderAll()` --calls--> `renderTemplate()`  [EXTRACTED]
  tests/emails/render.test.ts → src/emails/render.ts
- `idsFor()` --calls--> `buildCommandGroups()`  [EXTRACTED]
  tests/components/command-groups.test.ts → src/hooks/command-groups.ts
- `capture()` --calls--> `subscribe()`  [EXTRACTED]
  tests/server/domain-events.test.ts → src/lib/event-bus.ts

## Import Cycles
- None detected.

## Communities (120 total, 11 thin omitted)

### Community 0 - "Shared UI Primitives"
Cohesion: 0.05
Nodes (77): OrgSwitcherProps, ProjectSwitcherProps, initialsOf(), ButtonProps, Checkbox(), CheckboxProps, Combobox(), ComboboxOption (+69 more)

### Community 1 - "Database Schema and Migrations"
Cohesion: 0.04
Nodes (74): createClient(), Db, DbSchema, useInMemoryDb(), readMigrationStatements(), runMigrations(), SCHEMA_STATEMENTS, ActivityEventRow (+66 more)

### Community 2 - "Logging and Background Jobs"
Cohesion: 0.06
Nodes (65): register(), createLogger(), Level, LEVEL_RANK, LogFields, Logger, write(), logger (+57 more)

### Community 3 - "Event Bus and Domain Errors"
Cohesion: 0.08
Nodes (41): emitAndForget(), errorSinks, handlers, HandlerSet, onHandlerError(), reportHandlerError(), resetEventBus(), subscribe() (+33 more)

### Community 4 - "Invitation and Preference Repositories"
Cohesion: 0.08
Nodes (58): UpdateNotificationPreferenceInput, getDb(), countPendingInvitations(), findInvitationByTokenHash(), insertInvitation(), listPendingInvitations(), markInvitationAccepted(), revokeInvitation() (+50 more)

### Community 5 - "Project Context Loading"
Cohesion: 0.06
Nodes (51): deleteCommentAction(), PENDING_ISSUE_ID, PATCH(), dynamic, metadata, OPEN_STATUSES, Page(), PageParams (+43 more)

### Community 6 - "Billing Pages and Plan Cards"
Cohesion: 0.07
Nodes (46): dynamic, metadata, Page(), PageParams, dynamic, LayoutParams, BillingPlanCardProps, InvoiceTable() (+38 more)

### Community 7 - "Project Settings and Domain Types"
Cohesion: 0.13
Nodes (44): ArchiveProjectPanelProps, ProjectSettingsFormProps, SettingsState, ResetToken, Invoice, Subscription, SubscriptionStatus, Comment (+36 more)

### Community 8 - "Domain Component Prop Types"
Cohesion: 0.05
Nodes (45): ActivityFeedProps, InvoiceTableProps, PlanComparisonTableProps, KanbanBoardProps, KanbanCardProps, KanbanColumnProps, CommentComposerProps, CommentThreadProps (+37 more)

### Community 9 - "Issue Server Actions"
Cohesion: 0.11
Nodes (46): cancelSubscriptionAction(), run, run, run, updateCommentAction(), run, archiveIssueAction(), run (+38 more)

### Community 10 - "Kanban and Issue Cards"
Cohesion: 0.11
Nodes (37): UsagePanel(), KANBAN_DRAG_TYPE, KanbanCard(), KanbanColumn(), CommentItem(), CommentItemProps, IssueCard(), shouldShowPriority() (+29 more)

### Community 11 - "Soft Delete and Issue Repository"
Cohesion: 0.11
Nodes (42): ProjectSwitcher(), applyArchiveScope(), archivePatch(), isLive(), restorePatch(), shouldFilterArchived(), purgeActivityBefore(), livePredicate() (+34 more)

### Community 12 - "Plan Change and Seat Limits"
Cohesion: 0.10
Nodes (33): assertPlanFitsCurrentUsage(), changePlanAction(), run, PlanLimitError, assertSeatAvailable(), dynamic, metadata, Page() (+25 more)

### Community 13 - "Tenant Context and Routing Config"
Cohesion: 0.07
Nodes (33): nextConfig, .next, loadTenantContext(), dynamic, Page(), PageParams, dynamic, metadata (+25 more)

### Community 14 - "Issue List and Label Picker"
Cohesion: 0.13
Nodes (29): dynamic, metadata, PageParams, ROWS, IssueLabelPicker(), IssueLabelPickerProps, MAX_LABELS_PER_ISSUE, toggleLabel() (+21 more)

### Community 15 - "Action Input Contracts"
Cohesion: 0.23
Nodes (13): ArchiveIssueInput, DeleteLabelInput, ANONYMOUS_ORG_ID, PENDING_PROJECT_ID, ActionHandler, ActionOptions, OrgBearingInput, stamp() (+5 more)

### Community 16 - "Auth and Organization Actions"
Cohesion: 0.12
Nodes (29): logoutAction(), UnauthorizedActionError, resolveActorFor(), acceptInvitationAction(), createOrganizationAction(), switchOrgAction(), dynamic, GET() (+21 more)

### Community 17 - "Settings Layout and Resources"
Cohesion: 0.07
Nodes (28): dynamic, Layout(), LayoutParams, resourceFor(), SettingsTab, TABS, CommentThread(), orderThread() (+20 more)

### Community 18 - "Activity and Comment Repositories"
Cohesion: 0.14
Nodes (34): insertActivity(), listActivity(), decodeCursor(), encodeCursor(), archiveComment(), countComments(), findCommentById(), insertComment() (+26 more)

### Community 19 - "Form Dialogs and Composers"
Cohesion: 0.12
Nodes (24): CommentComposer(), IssueForm(), InviteMemberForm(), RemoveMemberDialog(), RemoveMemberDialogProps, ProjectArchiveDialog(), VISIBILITY_OPTIONS, Alert() (+16 more)

### Community 20 - "Registration and Password Hashing"
Cohesion: 0.11
Nodes (25): registerAction(), metadata, PageParams, RegisterForm(), RegisterState, deriveKey(), hashPassword(), hashToken() (+17 more)

### Community 21 - "Webhook API Routes"
Cohesion: 0.11
Nodes (26): dynamic, GET(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+18 more)

### Community 22 - "Comment and Issue Services"
Cohesion: 0.19
Nodes (29): emit(), assertNotArchived(), createComment(), deleteComment(), isPastEditWindow(), resolveMentionedUsers(), updateComment(), toggleFlag() (+21 more)

### Community 23 - "Label and Webhook Managers"
Cohesion: 0.08
Nodes (26): metadata, PageParams, ConfirmState, ResetConfirmForm(), ResetConfirmFormProps, CreateState, LabelManager(), LabelManagerProps (+18 more)

### Community 24 - "Feature Flag Provider and Shell"
Cohesion: 0.12
Nodes (21): DashboardShellProps, FeatureFlagProvider(), FeatureFlagProviderProps, FeatureGate(), FeatureGateProps, FEATURE_FLAG_DEFINITIONS, FEATURE_FLAG_KEYS, getFlagDefinition() (+13 more)

### Community 25 - "Permission Matrix and Test Factories"
Cohesion: 0.11
Nodes (24): PermissionGate(), ROLE_MATRIX, ROLE_RANK, ROLES, seedTwoTenants(), ALICE, BOB, EPOCH (+16 more)

### Community 26 - "Password Reset and Comment Creation"
Cohesion: 0.11
Nodes (24): confirmPasswordResetAction(), requestPasswordResetAction(), createCommentAction(), run, RateLimitedError, PENDING_COMMENT_ID, metadata, PageParams (+16 more)

### Community 27 - "TypeScript Compiler Configuration"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, ES2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+22 more)

### Community 28 - "Board Model and Optimistic Updates"
Cohesion: 0.17
Nodes (23): buildBoardColumns(), compareBoardIssues(), findIssue(), moveIssueInColumns(), orderColumns(), PRIORITY_WEIGHT, isClosedStatus(), OptimisticIssueAction (+15 more)

### Community 29 - "Contract Stub Generation"
Cohesion: 0.17
Nodes (27): actionStub(), buildSymbolTable(), CONTRACT_DIRS, dynamicSegments(), errorStub(), EXTERNAL_SYMBOLS, header(), identifiersIn() (+19 more)

### Community 30 - "Issue and Export Schemas"
Cohesion: 0.10
Nodes (24): archiveScopeSchema, projectIdSchema, DEFAULT_EXPORT_COLUMNS, ExportColumn, exportColumnSchema, ExportIssuesInput, exportIssuesSchema, archiveIssueSchema (+16 more)

### Community 31 - "Id Generation and Attachments"
Cohesion: 0.14
Nodes (21): encodeRandom(), encodeTime(), idFactory(), isUlid(), newId(), deleteAttachment(), insertAttachment(), listAttachments() (+13 more)

### Community 32 - "Repository Registry"
Cohesion: 0.08
Nodes (24): activityRepository, attachmentRepository, commentRepository, invitationRepository, invoiceRepository, issueRepository, labelRepository, memberRepository (+16 more)

### Community 33 - "Organization Settings Forms"
Cohesion: 0.13
Nodes (19): deleteOrganizationAction(), updateOrganizationAction(), DeleteOrganizationForm(), DeleteOrganizationFormProps, DeleteState, OrganizationSettingsForm(), OrganizationSettingsFormProps, SettingsState (+11 more)

### Community 34 - "Issue Filter Controls"
Cohesion: 0.14
Nodes (20): IssueFilterBar(), IssueFilterBarProps, stripProject(), stripQuery(), toggleStatus(), withAssignee(), IssuePrioritySelect(), IssuePrioritySelectProps (+12 more)

### Community 35 - "Sidebar and Notification Bell"
Cohesion: 0.15
Nodes (20): AppSidebar(), renderItem(), isActiveSegment(), OrgSwitcher(), UserMenu(), UserMenuProps, formatUnreadBadge(), NotificationBell() (+12 more)

### Community 36 - "Corpus Manifest Domain Spec"
Cohesion: 0.10
Nodes (21): byOwner, CONTRACT_FILES, contractEntries, entries, manifest, outPath, seen, DOMAIN (+13 more)

### Community 37 - "Authorization and Attachment Services"
Cohesion: 0.24
Nodes (21): assertCan(), assertOrgScope(), addAttachment(), findAttachment(), listAttachments(), removeAttachment(), inviteMember(), inviteMembers() (+13 more)

### Community 38 - "Common Branded Id Schemas"
Cohesion: 0.10
Nodes (20): activityIdSchema, ArchiveScopeInput, emailSchema, hexColorSchema, invitationIdSchema, labelIdSchema, memberIdSchema, PageRequestInput (+12 more)

### Community 39 - "Development Dependencies"
Cohesion: 0.09
Nodes (23): drizzle-kit, eslint, @eslint/eslintrc, jsdom, devDependencies, drizzle-kit, eslint, @eslint/eslintrc (+15 more)

### Community 40 - "Search and Notification Preferences"
Cohesion: 0.13
Nodes (18): dynamic, GET(), dynamic, metadata, Page(), PageParams, TopBar(), NotificationPreferencesForm() (+10 more)

### Community 41 - "Dashboard Route Pages"
Cohesion: 0.13
Nodes (20): dynamic, metadata, Page(), PageParams, DashboardShell(), dynamic, Page(), PageParams (+12 more)

### Community 42 - "Navigation and Feature Flag Types"
Cohesion: 0.17
Nodes (15): flagAllows(), NavItem, navResource(), SETTINGS_NAV, SIDEBAR_NAV, visibleNav(), PlanId, FlagContext (+7 more)

### Community 43 - "Email Layout Components"
Cohesion: 0.14
Nodes (16): EmailButton(), EmailButtonProps, styles, EmailLayout(), EmailLayoutProps, styles, DigestEmailProps, styles (+8 more)

### Community 44 - "Member and Profile Schemas"
Cohesion: 0.14
Nodes (20): acceptInvitationSchema, InviteMemberInput, inviteMemberSchema, InviteMembersInput, inviteMembersSchema, ListMembersInput, listMembersSchema, RemoveMemberInput (+12 more)

### Community 45 - "Slug Validation"
Cohesion: 0.23
Nodes (17): ProjectForm(), handleSubmit(), assertValidSlug(), InvalidSlugError, isReservedSlug(), isValidSlug(), projectKeyFromName(), RESERVED_SLUGS (+9 more)

### Community 46 - "Service Registry"
Cohesion: 0.09
Nodes (21): ActivityRecordInput, unregisterEventHandlers(), activityService, attachmentService, authService, billingService, commentService, digestService (+13 more)

### Community 47 - "Billing Service and Limits"
Cohesion: 0.20
Nodes (19): dynamic, metadata, Page(), PageParams, getLimit(), wouldExceedLimit(), assertWithinLimit(), cancelSubscription() (+11 more)

### Community 48 - "Date Picker and Calendar"
Cohesion: 0.23
Nodes (17): fromDateInputValue(), IssueDueDateField(), IssueDueDateFieldProps, toDateInputValue(), DatePicker(), DatePickerProps, buildMonthGrid(), CalendarCell (+9 more)

### Community 49 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): better-sqlite3, drizzle-orm, @hookform/resolvers, next, dependencies, better-sqlite3, drizzle-orm, @hookform/resolvers (+11 more)

### Community 50 - "Email Rendering Service"
Cohesion: 0.15
Nodes (17): count(), renderTemplate(), subjectFor(), EmailTemplate, escapeHtml(), logger, OutgoingEmail, renderBody() (+9 more)

### Community 51 - "Org Context React Hooks"
Cohesion: 0.26
Nodes (12): OrgProvider(), OrgProviderProps, OrgContext, OrgContextValue, OrgProvider(), OrgProviderProps, FormActionOptions, useOrg() (+4 more)

### Community 52 - "Project Search Webhook Actions"
Cohesion: 0.17
Nodes (13): FeatureUnavailableError, run, updateNotificationPreferenceAction(), createProjectAction(), run, searchAction(), createWebhookAction(), run (+5 more)

### Community 53 - "Notification Service"
Cohesion: 0.18
Nodes (15): dynamic, Layout(), LayoutParams, SHELL_LIMIT_RESOURCES, DEFAULT_CHANNELS, listNotifications(), markAllRead(), markRead() (+7 more)

### Community 54 - "Constants and Pagination Helpers"
Cohesion: 0.24
Nodes (13): COMMENT_EDIT_WINDOW_MINUTES, DEFAULT_PAGE_SIZE, DIGEST_MAX_ENTRIES, MAX_PAGE_SIZE, OVERDUE_LOOKAHEAD_HOURS, WEBHOOK_MAX_ATTEMPTS, usePagination(), clampPageSize() (+5 more)

### Community 55 - "Toast Store"
Cohesion: 0.22
Nodes (15): dismissToast(), EMPTY_TOASTS, getServerToasts(), getToasts(), Listener, listeners, publish(), pushToast() (+7 more)

### Community 56 - "Result Type and Validation"
Cohesion: 0.26
Nodes (13): collectResults(), fromPromise(), mapResult(), unwrapOr(), parseSearchParams(), safeParse(), searchParamsPaginationSchema, AppErrorShape (+5 more)

### Community 57 - "CSV Export Routes"
Cohesion: 0.24
Nodes (12): RFC-4180, COLUMNS, dynamic, GET(), toRow(), COLUMNS, dynamic, GET() (+4 more)

### Community 58 - "Issue Filter URL Params"
Cohesion: 0.27
Nodes (11): activeFilterCount(), issueFilterQueryString(), issueFilterToParams(), parseIssueFilterParams(), ReadableParams, splitList(), UNASSIGNED_TOKEN, useIssueFilters() (+3 more)

### Community 59 - "Keyboard Shortcut Matching"
Cohesion: 0.22
Nodes (12): formatShortcut(), matchesShortcut(), MODIFIERS, ParsedShortcut, parseShortcut(), prefersMetaKey(), ShortcutEventLike, ShortcutModifier (+4 more)

### Community 60 - "App Route Manifest Spec"
Cohesion: 0.14
Nodes (11): ACTIONS, ActionSpec, API, APP, appEntries, COMMON_ACTION_MUST, RouteSpec, CorpusManifest (+3 more)

### Community 61 - "Seat Update and Billing Schemas"
Cohesion: 0.23
Nodes (12): run, updateSeatsAction(), billingIntervalSchema, CancelSubscriptionInput, cancelSubscriptionSchema, changePlanSchema, limitedResourceSchema, planIdSchema (+4 more)

### Community 62 - "Mention Autocomplete"
Cohesion: 0.30
Nodes (12): applyMention(), findMentionQuery(), matchMembers(), mentionHandle(), MentionQuery, MentionTextarea(), choose(), emit() (+4 more)

### Community 63 - "Notification Store"
Cohesion: 0.30
Nodes (13): byOrg, countUnread(), EMPTY_NOTIFICATIONS, getNotifications(), hydrateNotifications(), Listener, listeners, markAllNotificationsRead() (+5 more)

### Community 64 - "Email Templates"
Cohesion: 0.23
Nodes (11): DigestEmail(), InviteEmail(), InvoiceEmail(), MentionEmail(), OverdueEmailProps, PasswordResetEmail(), elementFor(), Props (+3 more)

### Community 65 - "Activity and Search Schemas"
Cohesion: 0.15
Nodes (12): activityActionSchema, ActivityFilterInput, activityFilterSchema, activitySubjectKindSchema, ExportActivityInput, exportActivitySchema, orgIdSchema, pageRequestSchema (+4 more)

### Community 66 - "Attachment and Pagination Schemas"
Cohesion: 0.14
Nodes (10): CreateAttachmentInput, createAttachmentSchema, DeleteAttachmentInput, deleteAttachmentSchema, MAX_ATTACHMENT_BYTES, attachmentIdSchema, issueIdSchema, SearchParamsPagination (+2 more)

### Community 67 - "Member Management Actions"
Cohesion: 0.22
Nodes (11): PENDING_MEMBER_ID, inviteMemberAction(), run, removeMemberAction(), updateMemberRoleAction(), dynamic, metadata, Page() (+3 more)

### Community 68 - "Activity Feed and Service"
Cohesion: 0.28
Nodes (10): EXPORT_COLUMNS, record(), registerActivityListeners(), ActivityAction, ActivityEvent, ActivityFilter, ActivityGroup, ActivitySubjectKind (+2 more)

### Community 69 - "Session Proxy and Cookies"
Cohesion: 0.18
Nodes (11): config, isPublicPath(), proxy(), PUBLIC_PREFIXES, isoTimestampSchema, SESSION_COOKIE_NAME, SessionPrincipalInput, sessionPrincipalSchema (+3 more)

### Community 70 - "Project Schemas"
Cohesion: 0.23
Nodes (10): ArchiveProjectInput, archiveProjectSchema, CreateProjectInput, createProjectSchema, ListProjectsInput, listProjectsSchema, projectStatusSchema, projectVisibilitySchema (+2 more)

### Community 71 - "Webhook Service and Schemas"
Cohesion: 0.22
Nodes (11): CreateWebhookInput, DeleteWebhookInput, deleteWebhookSchema, InboundWebhookInput, inboundWebhookSchema, UpdateWebhookInput, updateWebhookSchema, createWebhook() (+3 more)

### Community 72 - "Login Flow"
Cohesion: 0.21
Nodes (9): loginAction(), LoginForm(), LoginFormProps, LoginState, dynamic, metadata, Page(), PageParams (+1 more)

### Community 73 - "Feature Flag Admin Toggles"
Cohesion: 0.23
Nodes (10): toggleFeatureFlagAction(), FlagRow, FlagToggleList(), FlagToggleListProps, describeStrategy(), dynamic, metadata, Page() (+2 more)

### Community 74 - "Loading Skeletons"
Cohesion: 0.23
Nodes (3): Skeleton(), SkeletonLines(), SkeletonProps

### Community 75 - "Environment and Site Config"
Cohesion: 0.23
Nodes (10): AppEnv, env, loadEnv(), NODE_ENVS, NodeEnvValue, readBoolean(), readNodeEnv(), readUrl() (+2 more)

### Community 76 - "Notification Schemas"
Cohesion: 0.17
Nodes (11): notificationIdSchema, _kindParity, ListNotificationsInput, listNotificationsSchema, markAllNotificationsReadSchema, MarkNotificationReadInput, markNotificationReadSchema, notificationChannelSchema (+3 more)

### Community 77 - "Member Repository"
Cohesion: 0.27
Nodes (11): brandStampOrNull(), toMember(), archiveMember(), countActiveMembers(), findMember(), findMemberById(), insertMember(), LIVE_MEMBERS (+3 more)

### Community 78 - "Library Contract Spec"
Cohesion: 0.18
Nodes (7): CONFIG, EMAILS, EmailSpec, LIB, libEntries, Spec, TESTS

### Community 79 - "Activity Labels and Grouping"
Cohesion: 0.33
Nodes (7): ACTIVITY_LABELS, activityDay(), activityLabel(), groupEventsByDay(), IssueActivityPanel(), IssueActivityPanelProps, event()

### Community 80 - "Pagination Range Component"
Cohesion: 0.40
Nodes (8): buildPageRange(), DEFAULT_SIBLINGS, pageCount(), PageToken, rangeEnd(), rangeStart(), Pagination(), PaginationProps

### Community 81 - "Comment Schemas"
Cohesion: 0.25
Nodes (8): CreateCommentInput, createCommentSchema, DeleteCommentInput, deleteCommentSchema, ListCommentsInput, listCommentsSchema, UpdateCommentInput, updateCommentSchema

### Community 82 - "Server Contract Spec"
Cohesion: 0.20
Nodes (6): DB_SCRIPTS, JOBS, REPOSITORIES, serverEntries, SERVICES, Spec

### Community 83 - "Invitation Acceptance Page"
Cohesion: 0.22
Nodes (8): AcceptState, InviteAcceptForm(), InviteAcceptFormProps, dynamic, metadata, Page(), PageParams, invitationTokenSchema

### Community 84 - "Root Layout and Changelog"
Cohesion: 0.18
Nodes (6): metadata, viewport, ChangelogEntry, ENTRIES, metadata, PageParams

### Community 85 - "Package Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:migrate, db:seed, dev, lint, start, test (+1 more)

### Community 86 - "Notification Read Actions"
Cohesion: 0.28
Nodes (8): markAllNotificationsReadAction(), markNotificationReadAction(), dynamic, metadata, Page(), markAllRead(), markRead(), PageParams

### Community 87 - "Organization Repository"
Cohesion: 0.44
Nodes (8): toOrganization(), archiveOrg(), findOrgById(), findOrgBySlug(), insertOrg(), listOrgsForUser(), listTakenOrgSlugs(), updateOrg()

### Community 88 - "Feature Flag Schemas"
Cohesion: 0.25
Nodes (7): userIdSchema, featureFlagKeySchema, FlagContextInput, flagContextSchema, _flagParity, ToggleFeatureFlagInput, toggleFeatureFlagSchema

### Community 89 - "Label Management Actions"
Cohesion: 0.29
Nodes (6): createLabelAction(), deleteLabelAction(), dynamic, metadata, Page(), PageParams

### Community 90 - "Marketing Navigation"
Cohesion: 0.33
Nodes (4): LINKS, MarketingLink, MarketingNav(), LayoutParams

### Community 91 - "Markdown Rendering"
Cohesion: 0.62
Nodes (5): escapeHtml(), excerpt(), renderInline(), renderMarkdown(), stripMarkdown()

### Community 92 - "Tenant Scope Guards"
Cohesion: 0.48
Nodes (5): assertRowsInScope(), isInOrgScope(), scopedOrNull(), withOrgScope(), actor

### Community 93 - "Package Metadata"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 94 - "pnpm Build Configuration"
Cohesion: 0.33
Nodes (6): pnpm, onlyBuiltDependencies, better-sqlite3, esbuild, sharp, unrs-resolver

### Community 95 - "Profile Update Action"
Cohesion: 0.40
Nodes (5): run, updateProfileAction(), ProfileForm(), ProfileFormProps, ProfileState

### Community 96 - "Dashboard Error Boundary"
Cohesion: 0.33
Nodes (4): BoundaryError, Explanation, EXPLANATIONS, FALLBACK

### Community 97 - "Mention Extraction"
Cohesion: 0.70
Nodes (4): extractMentions(), handleOf(), resolveMentions(), withoutCode()

## Knowledge Gaps
- **575 isolated node(s):** `FlatRow`, `PartProps`, `NavKey`, `Tone`, `DismissableLayerOptions` (+570 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 672 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `better-sqlite3` connect `pnpm Build Configuration` to `Database Schema and Migrations`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `pnpm` connect `pnpm Build Configuration` to `Package Metadata`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `FlatRow`, `PartProps`, `NavKey` to the rest of the system?**
  _575 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.05115758028379388 - nodes in this community are weakly interconnected._
- **Should `Database Schema and Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.03711843711843712 - nodes in this community are weakly interconnected._
- **Should `Logging and Background Jobs` be split into smaller, more focused modules?**
  _Cohesion score 0.06347340581839553 - nodes in this community are weakly interconnected._
- **Should `Event Bus and Domain Errors` be split into smaller, more focused modules?**
  _Cohesion score 0.08354430379746836 - nodes in this community are weakly interconnected._