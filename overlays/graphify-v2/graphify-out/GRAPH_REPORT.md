# Graph Report - taskflow  (2026-09-02)

## Corpus Check
- Large corpus: 632 files · ~427,692 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3245 nodes · 13014 edges · 139 communities (117 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.85)
- Token cost: 491,521 input · 359,214 output

## Community Hubs (Navigation)
- Event Bus and Activity Fan-out
- Design System Primitives
- Domain Component Barrel
- Domain Service Layer
- Repository Base and Paging
- Tenant Context and Dashboard Shell
- Org, Role and Flag Types
- Database Handle and Row Mappers
- Permission Matrix and Role Rules
- Tenant Isolation and Actor Resolution
- Action Errors and Cache Tags
- Glossary and Domain Vocabulary
- Issue Presentation and Date Formatting
- Branded Id and Shared Types
- Forms and Form Action Hook
- Feature Flag Evaluation
- Server Action Wrapper and Revalidation
- Drizzle Schema and Tenancy Columns
- Soft Delete and Archived Filtering
- Comment and User Repositories
- Org and Member Services
- Search Actions and Notification Reads
- Formatting Helpers and Cards
- Plan Limits and Quota Enforcement
- Domain Errors to Error Codes
- Search and Webhook Repositories
- Route Handlers and Responses
- Authentication and Session Service
- Webhook Endpoint Management
- Slugs and Database Seeding
- Background Job Implementations
- Login and Password Reset Actions
- Activity Feed and CSV Export
- Issue and Project Write Actions
- TypeScript Configuration
- Invitations and Seat Counting
- Issue Filters and Label Picker
- Issue Schemas and Vocabularies
- Corpus Stub Generator
- Attachment Storage
- Comment Thread UI
- Plan Ladder Configuration
- Search Service and Snippets
- Email Rendering Engine
- Scheduler and Job Queue
- Member Management Screens
- Digest Assembly and Email Service
- Engineering Meeting Notes
- Corpus Manifest Builder
- Drizzle Client and Migrations
- Registration and Org Bootstrap
- Notification Fan-out Service
- Navigation Switchers and URLs
- Project Context Loading
- Kanban Board Model
- Email Templates
- Member and Role Schemas
- Service Registry Barrel
- Development Dependencies
- Date Picker and Calendar
- In-process Rate Limiter
- Labels and Project Repository
- Sidebar Navigation Model
- Notification Client Store
- Billing Schemas
- Runtime Dependencies
- Keyset Pagination
- Organization Repository
- Attachment Schemas and Limits
- Notification Repository
- Architecture Overview and Module Map
- Search Reindex Job and Logger
- Invitation Acceptance Flow
- Toast Store
- Label and Common Schemas
- Activity Feed Components
- Mention Autocomplete UI
- Organization Settings Screen
- UI and Test Documentation Index
- App Manifest Entries
- Flag and Session Schemas
- Session Cookie and Logout
- Mention Parsing
- Requirements Documentation Index
- Project Schemas
- Webhook Delivery and Retry Policy
- Project Settings and Archiving
- Usage Rollup
- Feature Flag Settings Screen
- Search Dialog and Query Syntax
- Optimistic Issue Updates
- Keyboard Shortcut Matching
- Search and Activity Schemas
- Architecture Decision Records
- Notification Preferences
- Cron Route Handlers
- Runbooks and Postmortems
- Loading Skeletons
- Comment Schemas
- Notification Schemas
- Library Manifest Entries
- Pagination Component
- Server Manifest Entries
- Package Scripts
- Environment Configuration
- Invoice Repository
- Billing Settings Screen
- Test Factories
- API Catalogue Index
- Comment and Notification Actions Design
- Login Screen
- Marketing Layout
- Retention and Pricing Notes
- Seat and Invitation Notes
- Package Manifest
- Dashboard Error Boundary
- Project Issue List Screen
- PostCSS Configuration
- Auth Route Layout
- ESLint Dependency
- ESLint Configuration
- Next Environment Types
- Tailwind Dependency
- Tailwind PostCSS Plugin
- Jest DOM Matchers
- SQLite Type Definitions
- Node Type Definitions
- TypeScript Dependency

## God Nodes (most connected - your core abstractions)
1. `can()` - 178 edges
2. `getDb()` - 152 edges
3. `toIsoTimestamp()` - 129 edges
4. `orgPredicate()` - 96 edges
5. `cn()` - 94 edges
6. `OrgId` - 91 edges
7. `assertOrgScope()` - 87 edges
8. `isEnabled()` - 85 edges
9. `UserId` - 82 edges
10. `assertCan()` - 72 edges

## Surprising Connections (you probably didn't know these)
- `toggleFeatureFlagAction` --implements--> `toggleFeatureFlagAction()`  [EXTRACTED]
  docs/api/actions-flags.md → src/actions/flags/toggle-flag.ts
- `markNotificationReadAction` --implements--> `markNotificationReadAction()`  [EXTRACTED]
  docs/api/actions-notifications.md → src/actions/notifications/mark-read.ts
- `createOrganizationAction` --implements--> `createOrganizationAction()`  [EXTRACTED]
  docs/api/actions-organizations.md → src/actions/organizations/create-organization.ts
- `switchOrgAction` --implements--> `switchOrgAction()`  [EXTRACTED]
  docs/api/actions-organizations.md → src/actions/organizations/switch-org.ts
- `updateProfileAction` --implements--> `updateProfileAction()`  [EXTRACTED]
  docs/api/actions-labels.md → src/actions/profile/update-profile.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The five layering exceptions as a cross-document pattern** — docs_design_module_map_des_17, docs_design_architecture_overview_des_8, docs_design_data_flow_des_26, docs_design_action_wrapper_and_errors_des_225 [EXTRACTED 0.95]
- **Ownership escalation mechanism instantiated across actions** — docs_design_permission_model_des_41, docs_design_action_comments_and_notifications_des_239, docs_design_action_comments_and_notifications_des_241, docs_design_action_issues_des_226 [EXTRACTED 0.90]
- **withAction()'s four responsibilities described from multiple angles** — docs_design_action_wrapper_and_errors_des_220, docs_design_data_flow_des_21, docs_design_module_map_des_11, docs_design_caching_and_revalidation_des_73 [EXTRACTED 0.90]
- **Plan-quota enforcement fragmented across five write paths** — docs_design_service_billing_and_usage_des_135, docs_design_service_issue_des_101, docs_design_service_project_des_108, docs_design_service_member_and_invitation_des_146, docs_design_service_activity_and_attachment_des_174, docs_design_service_webhook_des_159 [EXTRACTED 1.00]
- **Untyped plain-Error pattern for quota/flag breaches across services** — docs_design_service_issue_des_101, docs_design_service_billing_and_usage_des_135, docs_design_service_billing_and_usage_des_137, docs_design_service_project_des_108, docs_design_service_webhook_des_159, docs_design_service_search_des_154, docs_design_service_comment_des_115 [INFERRED 0.85]
- **register*Listeners/Unsubscribe pattern vs its two documented exceptions** — docs_design_service_notification_des_125, docs_design_service_webhook_des_163, docs_design_service_feature_flag_and_support_des_178 [EXTRACTED 1.00]
- **November 2025 founding ADR cluster** — docs_adr_adr_001_nextjs_16_app_router_adr_001, docs_adr_adr_002_drizzle_over_prisma_adr_002, docs_adr_adr_003_single_permission_entry_point_adr_003, docs_adr_adr_004_soft_delete_adr_004, docs_adr_adr_005_in_process_event_bus_adr_005, docs_adr_adr_006_org_id_on_every_table_adr_006 [EXTRACTED 0.90]
- **ADR-005 event bus narrowed/superseded by scheduled-work and webhook ADRs** — docs_adr_adr_005_in_process_event_bus_adr_005, docs_adr_adr_016_interval_scheduler_adr_016, docs_adr_adr_018_webhook_retry_policy_adr_018 [EXTRACTED 0.90]
- **Authorization, tenancy and service-layering convention** — docs_adr_adr_003_single_permission_entry_point_adr_003, docs_adr_adr_006_org_id_on_every_table_adr_006, docs_adr_adr_013_service_layer_boundary_adr_013 [EXTRACTED 0.85]
- **Archived rows still count against creation quotas** — docs_api_actions_issues_createissueaction, docs_api_actions_projects_createprojectaction, docs_api_actions_members_invitememberaction, docs_db_conventions_archived_at_semantics [INFERRED 0.85]
- **Flag gating: block vs narrow vs never-gate** — docs_api_actions_webhooks_and_search_createwebhookaction, docs_api_actions_webhooks_and_search_deletewebhookaction, docs_api_actions_webhooks_and_search_searchaction, docs_api_actions_issues_moveissueaction [INFERRED 0.80]
- **Soft-delete default versus deliberate hard-delete exceptions** — docs_db_tables_issues_issues, docs_db_tables_issues_labels, docs_db_tables_comments_and_attachments_attachments, docs_db_conventions_archived_at_semantics [INFERRED 0.85]
- **Permission-is-a-wall, flag-is-a-window gating pattern** — docs_ui_screen_activity_scr_014_activity, docs_ui_screen_project_board_scr_006_project_board, docs_ui_screen_settings_billing_flags_webhooks_scr_023_webhooks [INFERRED 0.85]
- **Three-layer test pyramid (unit/lib, service/repository, component/UI)** — docs_test_unit_and_lib_tests_unit_and_lib_tests, docs_test_service_and_repository_tests_service_and_repository_tests, docs_test_component_and_ui_tests_component_and_ui_tests [EXTRACTED 1.00]
- **Quota checks that count archived/pending items to prevent quota evasion** — docs_ui_screen_project_issues_scr_009_new_issue, docs_ui_screen_projects_scr_003_new_project, docs_ui_screen_settings_org_and_members_scr_016_members [INFERRED 0.80]
- **Ops notes that formally revise an earlier decision's framing** — docs_ops_notes_2026_03_04_digest_cadence_review, docs_ops_notes_2026_06_09_seat_counting_rules, docs_ops_notes_2026_07_13_webhook_secret_rotation [INFERRED 0.85]
- **Background job runtime: scheduler, queue, and boot instrumentation** — docs_ops_index, src_server_jobs_scheduler, src_server_jobs_queue, src_instrumentation [EXTRACTED 1.00]
- **Seat quota and invitation lifecycle decisions** — docs_ops_notes_2026_06_09_seat_counting_rules, docs_ops_notes_2026_06_26_invitation_expiry, docs_ops_notes_2026_06_09_seat_counting_rules_invitetimevsaccepttimeenforcement [INFERRED 0.75]
- **Quarterly review synthesizes four incident postmortems into a common-thread analysis** — docs_ops_notes_2026_08_24_quarterly_architecture_review_quarterly_architecture_review, docs_ops_postmortem_2026_01_19_cross_tenant_issue_list_cross_tenant_issue_list_leak, docs_ops_postmortem_2026_03_02_digest_storm_digest_storm_incident, docs_ops_postmortem_2026_04_17_webhook_backlog_webhook_backlog_incident, docs_ops_postmortem_2026_06_08_board_server_component_crash_board_server_component_crash_incident [EXTRACTED 1.00]
- **Layering exception amnesty categorizes three distinct outcomes for five prior exceptions** — docs_ops_notes_2026_07_30_layering_exception_amnesty_layering_exception_amnesty, docs_ops_notes_2026_07_30_layering_exception_amnesty_profile_layering_exception, docs_ops_notes_2026_07_30_layering_exception_amnesty_issue_detail_page_layering_debt, docs_ops_notes_2026_07_30_layering_exception_amnesty_auth_service_event_map_gap [EXTRACTED 1.00]
- **Scheduler, queue, and webhook runbooks share a two-tier max-attempts/backoff retry model** — docs_ops_runbook_scheduler_and_queue_scheduler_and_job_queue_runbook, docs_ops_runbook_webhook_retries_webhook_delivery_and_retry_runbook, docs_ops_runbook_webhook_retries_dual_max_attempts_constants_confusion [INFERRED 0.75]

## Communities (139 total, 11 thin omitted)

### Community 0 - "Event Bus and Activity Fan-out"
Cohesion: 0.06
Nodes (69): ADR-005 — An in-process typed event bus instead of a queue, DES-20: The canonical write path: action -> service -> repository -> db -> event, DES-24: Domain events are the write path's only sanctioned fan-out mechanism, Event bus, DES-50: emit() / subscribe() as the typed in-process bus, DES-51: TaskflowEventMap: 21 keys, one shared envelope, DES-53: subscribeOnce and the Unsubscribe contract, DES-54: emitAndForget for call sites that must not await delivery (+61 more)

### Community 1 - "Design System Primitives"
Cohesion: 0.06
Nodes (81): UserMenuProps, Alert(), AlertProps, ICONS, Checkbox(), CheckboxProps, Combobox(), ComboboxProps (+73 more)

### Community 2 - "Domain Component Barrel"
Cohesion: 0.05
Nodes (72): SCR-008 Cross-project issue list (my issues), dynamic, metadata, OPEN_STATUSES, Page(), PageParams, parseStatuses(), dynamic (+64 more)

### Community 3 - "Domain Service Layer"
Cohesion: 0.09
Nodes (64): DES-12: The service layer owns business rules and authorization, Attachment quota rounds up to whole megabytes; delete scans issues, Comment service detailed design, Self-edit window only applies to the author, closes after 15 min, Deletion is soft; event timestamp taken from the archive patch, Editing a comment does not re-run mention resolution or re-emit, Issue service detailed design, Every mutating method runs guards in the same fixed order (+56 more)

### Community 4 - "Repository Base and Paging"
Cohesion: 0.10
Nodes (60): DES-13: The repository layer owns tenancy filtering and persistence, nothing else, Issue, comment and attachment repositories, DES-180: Issue filtering composes one predicate list, not a chain of branches, DES-181: Relation counts are grouped, not looped, to avoid N+1, DES-182: Board columns are grouped in application code from one query, DES-183: Issue number allocation is a read-then-write race, mitigated but not eliminated, DES-184: Status transitions maintain startedAt/completedAt as a side effect, not a separate write, Listing normalizes archive scope before count and rows (+52 more)

### Community 5 - "Tenant Context and Dashboard Shell"
Cohesion: 0.04
Nodes (49): deleteOrganizationAction, SCR-011 Full-page search, SCR-021 Invoices, SCR-023 Webhooks, SCR-019 Danger zone, nextConfig, .next, deleteOrganizationAction() (+41 more)

### Community 6 - "Org, Role and Flag Types"
Cohesion: 0.09
Nodes (43): DashboardShellProps, OrgProvider(), OrgProviderProps, FeatureFlagProvider(), FeatureGate(), TopBar(), activityResource(), buildCommandGroups() (+35 more)

### Community 7 - "Database Handle and Row Mappers"
Cohesion: 0.08
Nodes (54): updateProfileAction, acceptInvitationAction, inviteMemberAction, switchOrgAction, invitations table, members table, password_reset_tokens table, sessions table (+46 more)

### Community 8 - "Permission Matrix and Role Rules"
Cohesion: 0.08
Nodes (51): Permission model, DES-40: can() / explain() / assertCan() / canAll() as the single entry point, DES-41: Ownership escalation is evaluated after the role matrix, DES-42: Decision order and the six reasons, DES-43: ROLE_MATRIX and ROLE_RANK, DES-44: Platform staff bypass, DES-45: PermissionResource: a discriminated union, not a generic bag, DES-46: canAll() for bulk UI checks (+43 more)

### Community 9 - "Tenant Isolation and Actor Resolution"
Cohesion: 0.08
Nodes (47): ADR-006 — Carry org_id on every tenant table, DES-251: Organization actions split cleanly by whether an Actor can exist yet, DES-221: Actor resolution prefers the payload's own org identity over session default, listOrgsForUser filters both sides of the join, Sessions are global rows; activeOrgId moves one cookie between orgs, resolveActorForOrg re-asserts scope on an Actor it just built, getOrganizationSummary and listOrganizationsForUser differ in shape, Tenant isolation (+39 more)

### Community 10 - "Action Errors and Cache Tags"
Cohesion: 0.11
Nodes (39): archiveIssueAction, Action-layer error classes, archiveProjectAction, restoreProjectAction, DES-75: Tag composition: a mutation can invalidate more than one entity's cache, cancelSubscriptionAction(), run, assertPlanFitsCurrentUsage() (+31 more)

### Community 11 - "Glossary and Domain Vocabulary"
Cohesion: 0.04
Nodes (55): ActionResult, Activity row, Actor, Archived vs deleted, Attachment, Cache tag, Cadence, Comment (+47 more)

### Community 12 - "Issue Presentation and Date Formatting"
Cohesion: 0.10
Nodes (42): REQ-069: Issues may carry a due date, REQ-070: Overdue issues are detected by a scheduled sweep, REQ-121: The digest window is bounded by the last successful send, REQ-012: Organization timezone drives digest and due-date windows, KANBAN_DRAG_TYPE, KanbanCard(), KanbanColumn(), IssueCard() (+34 more)

### Community 13 - "Branded Id and Shared Types"
Cohesion: 0.12
Nodes (45): ADR-015 — Branded string ids instead of bare strings, ULID ids as branded strings, ProjectSettingsFormProps, SettingsState, parseJsonObject(), ResetToken, ActivityFilter, BillingInterval (+37 more)

### Community 14 - "Forms and Form Action Hook"
Cohesion: 0.08
Nodes (36): SCR-009 New issue, SCR-003 New project, IssueForm(), IssueFormProps, IssueLabelPicker(), IssueLabelPickerProps, MAX_LABELS_PER_ISSUE, toggleLabel() (+28 more)

### Community 15 - "Feature Flag Evaluation"
Cohesion: 0.12
Nodes (42): ADR-012 — Four feature flag strategies and one evaluator, DES-250: toggle-flag is a no-op whenever override would not change evaluated result, DES-235: update-project judges visibility permission against what project is becoming, DES-200: Notification fan-out always inserts through the batch path, Feature flag, event registry and support helpers detailed design, buildFlagContext accepts two independently nullable inputs, getSnapshot is what the client receives instead of the registry, toggleFlag checks overridability against the registry, not rank (+34 more)

### Community 16 - "Server Action Wrapper and Revalidation"
Cohesion: 0.07
Nodes (41): assignIssueAction, updateIssueAction, GET/PATCH /api/issues/[issueId], Server Action wrapper, errors and permission resources, DES-220: withAction is the single funnel for validate, authenticate, translate, revalidate, DES-223: stamp() attaches submittedAt so useActionState can distinguish two results, DES-225: ANONYMOUS_ORG_ID and the deliberate layering exceptions this action layer accepts, Caching and revalidation (+33 more)

### Community 17 - "Drizzle Schema and Tenancy Columns"
Cohesion: 0.08
Nodes (37): org_id on every tenant table is the tenant boundary, full stop, The repository contract: filter by orgId, never call can(), REQ-060: An issue belongs to exactly one project, REQ-001: An organization is the top-level tenant boundary, REQ-010: Every tenant-scoped row carries org_id, REQ-040: A project belongs to exactly one organization, ActivityEventRow, NewActivityEventRow (+29 more)

### Community 18 - "Soft Delete and Archived Filtering"
Cohesion: 0.09
Nodes (43): ADR-004 — Soft delete with archived_at instead of hard delete, cancelSubscriptionAction, changePlanAction, updateSeatsAction, createIssueAction, Placeholder branded ids (PENDING_*), createProjectAction, createWebhookAction (+35 more)

### Community 19 - "Comment and User Repositories"
Cohesion: 0.08
Nodes (45): createCommentAction, deleteCommentAction, comments table, users table, rate_limit_buckets table, DES-240: delete-comment is a soft delete so reply chains keep their parent, DES-17: The five deliberate layering exceptions, file by file, DES-186: Comment threads keep archived replies so a reply chain never loses its anchor (+37 more)

### Community 20 - "Org and Member Services"
Cohesion: 0.11
Nodes (40): updateOrganization records to the audit log directly, not via emit, Endpoint management authorizes the same action regardless of target, REQ-004: Organization display name and description are editable by admins, dynamic, Layout(), LayoutParams, SHELL_LIMIT_RESOURCES, dynamic (+32 more)

### Community 21 - "Search Actions and Notification Reads"
Cohesion: 0.07
Nodes (36): markAllNotificationsReadAction, DES-256: search narrows requested kinds rather than rejecting, REQ-181: Search requires read permission on issues, SCR-012 Notification inbox, SCR-002 Project list, SCR-018 Labels, markAllNotificationsReadAction(), MarkAllReadInput (+28 more)

### Community 22 - "Formatting Helpers and Cards"
Cohesion: 0.09
Nodes (35): REQ-042: Project keys prefix issue identifiers and are immutable, BillingPlanCardProps, SeatLimitBanner(), SeatLimitBannerProps, USAGE_WARNING_RATIO, UsageMeter(), UsageMeterProps, usageRatio() (+27 more)

### Community 23 - "Plan Limits and Quota Enforcement"
Cohesion: 0.13
Nodes (41): DES-248: change-plan checks target plan's limits against current usage before switch, DES-233: create-project's quota check counts archived projects, Subscription, invoice and usage repositories, DES-207: A plan change is an unconditional exit from trialing, never a re-entry, DES-208: Usage counters are lazily materialized, not assumed to exist, DES-209: recomputeUsage recounts from source tables and never trusts the cached row, DES-210: incrementUsage is a cheap delta so a quota check right after a create sees fresh numbers, Billing and usage service detailed design (+33 more)

### Community 24 - "Domain Errors to Error Codes"
Cohesion: 0.12
Nodes (30): ADR-014 — Map domain error classes onto a closed error code union, ActionResult envelope, DES-222: Action-layer error classes mirror service-layer domain errors, REQ-193: A disabled feature fails with FeatureDisabledError, run, updateProfileAction(), metadata, PageParams (+22 more)

### Community 25 - "Search and Webhook Repositories"
Cohesion: 0.09
Nodes (36): ADR-017 — Maintain the search index synchronously from events, searchAction, GET /api/search, search_index table, webhook_deliveries table, webhook_endpoints table, Search, webhook, session and rate-limit repositories, Search matching is a deliberately simple substring scan (+28 more)

### Community 26 - "Route Handlers and Responses"
Cohesion: 0.09
Nodes (33): GET /api/export/issues, GET /api/orgs/[orgId]/usage, Route handler shared response helpers, POST /api/webhooks/inbound, POST /api/webhooks/[endpointId]/test, PENDING_ISSUE_ID, dynamic, GET() (+25 more)

### Community 27 - "Authentication and Session Service"
Cohesion: 0.14
Nodes (35): Auth, profile, search and webhook Server Actions, DES-252: Login and password reset run before any tenant is known, DES-254: logout treats already signed out as success, DES-255: update-profile is the action layer's one documented bypass of the service layer, DES-258: delete-webhook is deliberately not flag-gated, DES-259: AuthService cannot emit domain events, DES-8: The five deliberate layering exceptions, DES-57: Known coupling: auth-service.ts cannot emit auth events (+27 more)

### Community 28 - "Webhook Endpoint Management"
Cohesion: 0.10
Nodes (35): DES-257: create-webhook checks a plan-derived flag and a numeric quota independently, DES-211: listTrialsEndingBefore is cross-tenant by necessity and feeds a scheduled sweep, Claiming pending deliveries is cross-tenant, bumps attempts on claim, Webhook service detailed design, Endpoint creation gated twice; secret minted once, never regenerated, signPayload is a pure HMAC wrapper over the exact serialized string, enqueueForOrg fans an event out to every subscribed endpoint, The delivery bridge has no register* symmetry gap, unlike DES-125 (+27 more)

### Community 29 - "Slugs and Database Seeding"
Cohesion: 0.12
Nodes (31): createLabelAction, labels table, REQ-002: Organization slugs are globally unique and URL-safe, REQ-041: Project slugs are unique within an organization, ProjectForm(), handleSubmit(), assertValidSlug(), InvalidSlugError (+23 more)

### Community 30 - "Background Job Implementations"
Cohesion: 0.10
Nodes (32): Background jobs, DES-60: scheduler.ts: interval and the CADENCE_MINUTES table, DES-61: The seven job kinds and what each one is for, DES-62: queue.ts: enqueue, drain, retry with backoff, DES-63: Idempotence per job kind, DES-64: webhook-delivery-job: claim, sign, retry, abandon, DES-65: digest-email-job: per-org UTC hour window, DES-66: overdue-issue-job: announce, don't act (+24 more)

### Community 31 - "Login and Password Reset Actions"
Cohesion: 0.10
Nodes (24): confirmPasswordResetAction, requestPasswordResetAction, loginAction(), confirmPasswordResetAction(), requestPasswordResetAction(), RateLimitedError, ANONYMOUS_ORG_ID, LoginFormProps (+16 more)

### Community 32 - "Activity Feed and CSV Export"
Cohesion: 0.11
Nodes (27): RFC-4180, ADR-022 — Derive the audit trail from the event bus, GET /api/export/activity, DES-7: Route Handlers exist only where a Server Action structurally cannot reach, DES-27: Route Handler flows that never touch a Server Action, REQ-230: CSV export escapes quotes and separators, REQ-079: Issue export produces CSV when the plan includes it, COLUMNS (+19 more)

### Community 33 - "Issue and Project Write Actions"
Cohesion: 0.13
Nodes (26): changeIssueStatusAction, moveIssueAction, Issue Server Actions, DES-227: assign-issue checks permission with a pending project id, DES-228: change-issue-status deliberately leaves event emission to the service, DES-229: create-issue's quota check counts archived issues, DES-230: move-issue re-validates the kanban_board flag server-side, DES-231: update-issue is a partial patch (+18 more)

### Community 34 - "TypeScript Configuration"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, ES2022, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+22 more)

### Community 35 - "Invitations and Seat Counting"
Cohesion: 0.14
Nodes (27): Member, billing, flag and organization Server Actions, DES-244: accept-invitation runs with no Actor; seat quota re-checked after write, DES-245: invite-member counts pending invitations against seats before invite sent, DES-246: update-member-role enforces two independent guards, DES-247: remove-member preserves authored content by soft-deleting only membership row, DES-249: update-seats is bounded in both directions, findInvitationByTokenHash is the one unscoped read, Member and invitation service detailed design (+19 more)

### Community 36 - "Issue Filters and Label Picker"
Cohesion: 0.16
Nodes (21): CreateState, LabelManagerProps, IssueFilterBar(), stripProject(), stripQuery(), toggleStatus(), withAssignee(), activeFilterCount() (+13 more)

### Community 37 - "Issue Schemas and Vocabularies"
Cohesion: 0.10
Nodes (24): REQ-062: Issue status is a closed vocabulary, REQ-063: Issue priority is a closed vocabulary, DEFAULT_EXPORT_COLUMNS, ExportColumn, exportColumnSchema, ExportIssuesInput, exportIssuesSchema, archiveIssueSchema (+16 more)

### Community 38 - "Corpus Stub Generator"
Cohesion: 0.17
Nodes (27): actionStub(), buildSymbolTable(), CONTRACT_DIRS, dynamicSegments(), errorStub(), EXTERNAL_SYMBOLS, header(), identifiersIn() (+19 more)

### Community 39 - "Attachment Storage"
Cohesion: 0.08
Nodes (25): DES-187: Attachment storage totals feed the plan's storageMb quota, deleteAttachment(), insertAttachment(), listAttachments(), sumStorageBytes(), activityRepository, attachmentRepository, commentRepository (+17 more)

### Community 40 - "Comment Thread UI"
Cohesion: 0.15
Nodes (20): SCR-010 Issue detail, dynamic, metadata, PageParams, CommentComposer(), CommentItem(), CommentThread(), orderThread() (+12 more)

### Community 41 - "Plan Ladder Configuration"
Cohesion: 0.17
Nodes (19): ADR-010 — Declare every plan quota in one table, REQ-131: Four plans form an ordered ladder, PLAN_BLURBS, priceLabel(), PricingGrid(), quotaLabel(), metadata, Page() (+11 more)

### Community 42 - "Search Service and Snippets"
Cohesion: 0.17
Nodes (23): Search documents upserted by subject identity, not row id, getIssue composes three repositories into one read model, Search service detailed design, search() authorizes at issue:read regardless of subject kind, Rate limiting runs before the flag check, Result composition derives title and snippet from stored content, Every write-time listener re-reads the row, never trusts the payload, REQ-091: Comment bodies are Markdown with a restricted subset (+15 more)

### Community 43 - "Email Rendering Engine"
Cohesion: 0.14
Nodes (21): SITE_CONFIG, SiteConfig, DigestEmail(), InviteEmail(), InvoiceEmail(), MentionEmail(), OverdueEmailProps, PasswordResetEmail() (+13 more)

### Community 44 - "Scheduler and Job Queue"
Cohesion: 0.20
Nodes (21): ADR-016 — An interval scheduler with per-kind cadence, backoffMs(), drain(), enqueue(), JobKind, logger, pending, pendingCount() (+13 more)

### Community 45 - "Member Management Screens"
Cohesion: 0.11
Nodes (21): removeMemberAction, updateMemberRoleAction, SCR-016 Members, PENDING_MEMBER_ID, removeMemberAction(), run, run, updateMemberRoleAction() (+13 more)

### Community 46 - "Digest Assembly and Email Service"
Cohesion: 0.18
Nodes (23): Digest and email service detailed design, buildDigest returns null rather than an empty bundle, The digest window is bounded on both ends, listDigestRecipients and notification digestOnly are the same data, renderDigest degrades gracefully, headline is the only entry shown, sendEmail performs no network egress; a structured log write, renderEmail derives plain text from HTML so the two can't drift, renderBody escapes every value, closing the one XSS surface (+15 more)

### Community 47 - "Engineering Meeting Notes"
Cohesion: 0.09
Nodes (24): Operations index, Ops directory precise terminology (Cadence/Eligible/Claimed/Drained/Abandoned/Reported), Single-process, no-external-broker architecture, Notes — event bus vs external queue, In-process typed event bus chosen over external broker, Provisional inline webhook delivery decision (later reversed), Notes — pagination cutover, Keyset pagination replaces offset pagination (first wave) (+16 more)

### Community 48 - "Corpus Manifest Builder"
Cohesion: 0.10
Nodes (21): byOwner, CONTRACT_FILES, contractEntries, entries, manifest, outPath, seen, DOMAIN (+13 more)

### Community 49 - "Drizzle Client and Migrations"
Cohesion: 0.15
Nodes (19): ADR-002 — Use Drizzle ORM over SQLite rather than Prisma, Migration policy (offline fallback statements), pnpm, onlyBuiltDependencies, better-sqlite3, esbuild, sharp, unrs-resolver (+11 more)

### Community 50 - "Registration and Org Bootstrap"
Cohesion: 0.17
Nodes (18): registerAction, DES-253: register performs three writes as one service call, Registration creates user, workspace and owner membership in one call, Organization service detailed design, createOrganization takes no Actor, seeds membership and subscription, Org creation emits member.joined, never organization.created, Deletion requires retyping the org's own slug, and is a soft delete, REQ-209: Registration creates a user and an organization (+10 more)

### Community 51 - "Notification Fan-out Service"
Cohesion: 0.21
Nodes (22): event-registry is idempotent by a single module-level flag, Notification service detailed design, notify() takes no Actor, never called by a Server Action directly, notify() filters self-notification and channel preference in one loop, An empty recipient list short-circuits cheaply, resolveChannels is pure; email requires two independent conditions, The fan-out is wired at module import time, not event-registry, Watcher derivation for comments re-reads the issue rather than trusts payload (+14 more)

### Community 52 - "Navigation Switchers and URLs"
Cohesion: 0.17
Nodes (18): REQ-178: Results link back to the subject, OrgSwitcher(), OrgSwitcherProps, UserMenu(), formatUnreadBadge(), NotificationBell(), NotificationBellProps, UNREAD_BADGE_CAP (+10 more)

### Community 53 - "Project Context Loading"
Cohesion: 0.11
Nodes (18): SCR-004 Project overview, findProject(), loadProjectContext(), ProjectContext, TenantContext, dynamic, metadata, Page() (+10 more)

### Community 54 - "Kanban Board Model"
Cohesion: 0.16
Nodes (16): buildBoardColumns(), compareBoardIssues(), findIssue(), moveIssueInColumns(), orderColumns(), PRIORITY_WEIGHT, KanbanBoard(), handleDrop() (+8 more)

### Community 55 - "Email Templates"
Cohesion: 0.14
Nodes (16): EmailButton(), EmailButtonProps, styles, EmailLayout(), EmailLayoutProps, styles, DigestEmailProps, styles (+8 more)

### Community 56 - "Member and Role Schemas"
Cohesion: 0.14
Nodes (19): acceptInvitationSchema, InviteMemberInput, inviteMemberSchema, InviteMembersInput, inviteMembersSchema, ListMembersInput, listMembersSchema, RemoveMemberInput (+11 more)

### Community 57 - "Service Registry Barrel"
Cohesion: 0.09
Nodes (22): ActivityRecordInput, unregisterEventHandlers(), activityService, attachmentService, authService, billingService, commentService, digestService (+14 more)

### Community 58 - "Development Dependencies"
Cohesion: 0.10
Nodes (21): drizzle-kit, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, drizzle-kit, eslint-config-next, @eslint/eslintrc (+13 more)

### Community 59 - "Date Picker and Calendar"
Cohesion: 0.23
Nodes (17): fromDateInputValue(), IssueDueDateField(), IssueDueDateFieldProps, toDateInputValue(), DatePicker(), DatePickerProps, buildMonthGrid(), CalendarCell (+9 more)

### Community 60 - "In-process Rate Limiter"
Cohesion: 0.28
Nodes (18): ADR-011 — An in-process token-bucket rate limiter, Rate limiting is in-process token-bucket state, not a repository, REQ-208: Password reset is rate limited, REQ-096: Comment creation is rate limited per organization, REQ-176: Queries are rate limited per organization, REQ-161: Webhook delivery is rate limited per organization, buckets, BucketState (+10 more)

### Community 61 - "Labels and Project Repository"
Cohesion: 0.18
Nodes (19): deleteLabelAction, issue_labels table, Project and label Server Actions, DES-237: delete-label is a hard delete that must prune the join table, Project and label repositories, getProjectStats shares one predicate across four counters, Label deletion cascades into the join table, listLabelsForIssues is the batched read every list view relies on (+11 more)

### Community 62 - "Sidebar Navigation Model"
Cohesion: 0.18
Nodes (15): DES-76: The client-side flag snapshot is a cache-adjacent, not cache-tagged, concern, DES-14: config/ is the single source of every numeric and declarative truth, AppSidebar(), renderItem(), isActiveSegment(), flagAllows(), NavItem, navResource() (+7 more)

### Community 63 - "Notification Client Store"
Cohesion: 0.23
Nodes (17): byOrg, countUnread(), EMPTY_NOTIFICATIONS, getNotifications(), hydrateNotifications(), Listener, listeners, markAllNotificationsRead() (+9 more)

### Community 64 - "Billing Schemas"
Cohesion: 0.14
Nodes (17): billingIntervalSchema, CancelSubscriptionInput, cancelSubscriptionSchema, ChangePlanInput, changePlanSchema, limitedResourceSchema, planIdSchema, _planParity (+9 more)

### Community 65 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): better-sqlite3, drizzle-orm, @hookform/resolvers, next, dependencies, better-sqlite3, drizzle-orm, @hookform/resolvers (+11 more)

### Community 66 - "Keyset Pagination"
Cohesion: 0.24
Nodes (15): ADR-008 — Keyset pagination over offset pagination, COMMENT_EDIT_WINDOW_MINUTES, DEFAULT_PAGE_SIZE, DIGEST_MAX_ENTRIES, MAX_PAGE_SIZE, OVERDUE_LOOKAHEAD_HOURS, WEBHOOK_MAX_ATTEMPTS, usePagination() (+7 more)

### Community 67 - "Organization Repository"
Cohesion: 0.17
Nodes (17): createOrganizationAction, org_id tenant-scoping rule, Database data dictionary index, organizations table, insertOrg dedup wins the race window, CreateOrganizationInput, UpdateOrganizationInput, organizations (+9 more)

### Community 68 - "Attachment Schemas and Limits"
Cohesion: 0.12
Nodes (13): CreateAttachmentInput, createAttachmentSchema, DeleteAttachmentInput, deleteAttachmentSchema, MAX_ATTACHMENT_BYTES, attachmentIdSchema, issueIdSchema, orgIdSchema (+5 more)

### Community 69 - "Notification Repository"
Cohesion: 0.18
Nodes (16): markNotificationReadAction, activity_events table, notifications table, DES-201: countUnread is a single indexed count, not a length of a fetched list, REQ-110: Notifications are per recipient and per organization, REQ-117: Unread counts are computed per organization, activityEvents, notifications (+8 more)

### Community 70 - "Architecture Overview and Module Map"
Cohesion: 0.12
Nodes (15): Architecture overview, DES-1: Taskflow ships as one Next.js 16 process, not a service mesh, DES-2: Four architectural layers front-to-back, DES-3: src/server/ holds everything that must never reach the client bundle, DES-4: Build and deploy: one artifact, one file-backed database, DES-5: Next.js 16 facts that ripple through the whole codebase, DES-6: src/instrumentation.ts is the one process-start hook, DES-69: JobResult is the uniform shape every job reports (+7 more)

### Community 71 - "Search Reindex Job and Logger"
Cohesion: 0.19
Nodes (13): Indexing functions encode different subjectId-to-projectId conventions, createLogger(), Level, LEVEL_RANK, LogFields, Logger, write(), logger (+5 more)

### Community 72 - "Invitation Acceptance Flow"
Cohesion: 0.13
Nodes (14): AcceptState, InviteAcceptForm(), InviteAcceptFormProps, dynamic, metadata, Page(), PageParams, invitationIdSchema (+6 more)

### Community 73 - "Toast Store"
Cohesion: 0.22
Nodes (15): dismissToast(), EMPTY_TOASTS, getServerToasts(), getToasts(), Listener, listeners, publish(), pushToast() (+7 more)

### Community 74 - "Label and Common Schemas"
Cohesion: 0.13
Nodes (14): activityIdSchema, ArchiveScopeInput, archiveScopeSchema, hexColorSchema, labelIdSchema, memberIdSchema, PageRequestInput, sortDirectionSchema (+6 more)

### Community 75 - "Activity Feed Components"
Cohesion: 0.29
Nodes (10): ACTIVITY_LABELS, activityDay(), activityLabel(), groupEventsByDay(), IssueActivityPanel(), ActivityAction, ActivityEvent, ActivityGroup (+2 more)

### Community 76 - "Mention Autocomplete UI"
Cohesion: 0.28
Nodes (13): applyMention(), findMentionQuery(), matchMembers(), mentionHandle(), MentionQuery, MentionTextarea(), choose(), emit() (+5 more)

### Community 77 - "Organization Settings Screen"
Cohesion: 0.18
Nodes (12): updateOrganizationAction, SCR-015 General settings, run, updateOrganizationAction(), OrganizationSettingsForm(), OrganizationSettingsFormProps, SettingsState, dynamic (+4 more)

### Community 78 - "UI and Test Documentation Index"
Cohesion: 0.23
Nodes (15): Component and UI tests, Test documentation index, Service and repository tests, Test strategy, Requirement-to-test traceability matrix, Unit and library tests, UI conventions, UI screen index (+7 more)

### Community 79 - "App Manifest Entries"
Cohesion: 0.14
Nodes (11): ACTIONS, ActionSpec, API, APP, appEntries, COMMON_ACTION_MUST, RouteSpec, CorpusManifest (+3 more)

### Community 80 - "Flag and Session Schemas"
Cohesion: 0.13
Nodes (13): isoTimestampSchema, userIdSchema, featureFlagKeySchema, FlagContextInput, flagContextSchema, _flagParity, ToggleFeatureFlagInput, toggleFeatureFlagSchema (+5 more)

### Community 81 - "Session Cookie and Logout"
Cohesion: 0.32
Nodes (12): ADR-007 — Use src/proxy.ts as the request hook, ADR-020 — Opaque hashed session tokens instead of JWTs, logoutAction, REQ-205: The session cookie is httpOnly and same-site lax, REQ-206: Only one module reads or writes the session cookie, logoutAction(), clearSessionCookie(), getSessionToken() (+4 more)

### Community 82 - "Mention Parsing"
Cohesion: 0.36
Nodes (12): Mentions resolved server-side, server's list wins on disagreement, REQ-092: Mentions are parsed from the comment body at write time, REQ-093: Mentions inside code spans and fences are not mentions, REQ-094: Mentioned users must be members of the same organization, REQ-095: Comment creation emits comment.created with mentioned user ids, REQ-102: Editing a comment re-parses its mentions, extractMentions(), handleOf() (+4 more)

### Community 83 - "Requirements Documentation Index"
Cohesion: 0.27
Nodes (14): Taskflow engineering documentation index, Audit And Activity requirements, Auth And Sessions requirements, Billing And Plan Limits requirements, Comments And Mentions requirements, Feature Flags requirements, Requirements index, Issues requirements (+6 more)

### Community 84 - "Project Schemas"
Cohesion: 0.21
Nodes (11): ArchiveProjectInput, archiveProjectSchema, CreateProjectInput, createProjectSchema, ListProjectsInput, listProjectsSchema, projectStatusSchema, projectVisibilitySchema (+3 more)

### Community 85 - "Webhook Delivery and Retry Policy"
Cohesion: 0.31
Nodes (11): ADR-018 — Queue webhook deliveries with capped exponential backoff, POST /api/cron/webhook-delivery, REQ-156: Failed deliveries retry with exponential backoff, REQ-157: A delivery is abandoned after a fixed attempt ceiling, dynamic, POST(), backoffMs(), logger (+3 more)

### Community 86 - "Project Settings and Archiving"
Cohesion: 0.19
Nodes (10): updateProjectAction, SCR-005 Project settings, run, updateProjectAction(), ArchiveProjectPanel(), ArchiveProjectPanelProps, dynamic, metadata (+2 more)

### Community 87 - "Usage Rollup"
Cohesion: 0.24
Nodes (10): POST /api/cron/usage-rollup, organization_usage table, REQ-144: Usage is rolled up on a schedule for the billing screen, dynamic, POST(), organizationUsage, logger, runUsageRollupJob() (+2 more)

### Community 88 - "Feature Flag Settings Screen"
Cohesion: 0.21
Nodes (11): SCR-022 Feature flags, toggleFeatureFlagAction(), FlagRow, FlagToggleList(), FlagToggleListProps, describeStrategy(), dynamic, metadata (+3 more)

### Community 89 - "Search Dialog and Query Syntax"
Cohesion: 0.26
Nodes (9): DEFAULT_SEARCH_KINDS, describeQuery(), KINDS, ParsedSearchQuery, parseSearchQuery(), SearchSubjectKind, SearchDialog(), DEFAULT_DEBOUNCE_MS (+1 more)

### Community 90 - "Optimistic Issue Updates"
Cohesion: 0.29
Nodes (10): isClosedStatus(), OptimisticIssueAction, optimisticIssuesReducer(), withAssignee(), withStatus(), useOptimisticIssues(), CLOSED_ISSUE_STATUSES, Issue (+2 more)

### Community 91 - "Keyboard Shortcut Matching"
Cohesion: 0.26
Nodes (10): formatShortcut(), matchesShortcut(), MODIFIERS, ParsedShortcut, parseShortcut(), prefersMetaKey(), ShortcutEventLike, ShortcutModifier (+2 more)

### Community 92 - "Search and Activity Schemas"
Cohesion: 0.17
Nodes (11): activityActionSchema, ActivityFilterInput, activityFilterSchema, activitySubjectKindSchema, ExportActivityInput, pageRequestSchema, projectIdSchema, ReindexRequestInput (+3 more)

### Community 93 - "Architecture Decision Records"
Cohesion: 0.30
Nodes (10): ADR-001 — Build on Next.js 16 App Router with Server Actions, ADR-003 — One authorization entry point: can() and ROLE_MATRIX, ADR-009 — Share Zod schemas between client forms and Server Actions, ADR-013 — Services own authorization, repositories own tenancy, ADR-019 — Cache tags plus named cacheLife profiles, ADR-021 — Optimistic UI for issue mutations, Architecture decision records index, GET /api/health (+2 more)

### Community 94 - "Notification Preferences"
Cohesion: 0.29
Nodes (11): updateNotificationPreferenceAction, notification_preferences table, Notification, notification-preference and activity repositories, DES-202: Preference absence means use the default channel set, not everything off, DES-203: Preference writes use a composite-key upsert, not read-then-branch, REQ-115: Notification preferences are per channel and per event class, notificationPreferences, toPreference() (+3 more)

### Community 95 - "Cron Route Handlers"
Cohesion: 0.21
Nodes (9): POST /api/cron/digest, POST /api/cron/overdue, dynamic, POST(), dynamic, POST(), assertCronSecret(), CronAuthError (+1 more)

### Community 96 - "Runbooks and Postmortems"
Cohesion: 0.26
Nodes (12): auth-service.ts Event Map Gap, Issue Detail Page Layering Debt, Layering Exception Amnesty Review, Profile Layering Exception (Permanent), Build/Typecheck Blind Spot Pattern, Quarterly Architecture Review (2026-08-24), Cross-Tenant Issue List Leak Incident, Digest Storm Incident (+4 more)

### Community 97 - "Loading Skeletons"
Cohesion: 0.23
Nodes (3): Skeleton(), SkeletonLines(), SkeletonProps

### Community 98 - "Comment Schemas"
Cohesion: 0.23
Nodes (9): CreateCommentInput, createCommentSchema, DeleteCommentInput, deleteCommentSchema, ListCommentsInput, listCommentsSchema, UpdateCommentInput, updateCommentSchema (+1 more)

### Community 99 - "Notification Schemas"
Cohesion: 0.17
Nodes (11): notificationIdSchema, _kindParity, ListNotificationsInput, listNotificationsSchema, markAllNotificationsReadSchema, MarkNotificationReadInput, markNotificationReadSchema, notificationChannelSchema (+3 more)

### Community 100 - "Library Manifest Entries"
Cohesion: 0.18
Nodes (7): CONFIG, EMAILS, EmailSpec, LIB, libEntries, Spec, TESTS

### Community 101 - "Pagination Component"
Cohesion: 0.40
Nodes (8): buildPageRange(), DEFAULT_SIBLINGS, pageCount(), PageToken, rangeEnd(), rangeStart(), Pagination(), PaginationProps

### Community 102 - "Server Manifest Entries"
Cohesion: 0.20
Nodes (6): DB_SCRIPTS, JOBS, REPOSITORIES, serverEntries, SERVICES, Spec

### Community 103 - "Package Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:migrate, db:seed, dev, lint, start, test (+1 more)

### Community 104 - "Environment Configuration"
Cohesion: 0.31
Nodes (8): AppEnv, env, loadEnv(), NODE_ENVS, NodeEnvValue, readBoolean(), readNodeEnv(), readUrl()

### Community 105 - "Invoice Repository"
Cohesion: 0.46
Nodes (7): invoices table, REQ-143: Invoices are generated per billing period, invoices, findInvoice(), insertInvoice(), listInvoices(), toInvoice()

### Community 106 - "Billing Settings Screen"
Cohesion: 0.29
Nodes (7): changePlanAction(), dynamic, metadata, Page(), selectPlan(), PageParams, UsagePanel()

### Community 107 - "Test Factories"
Cohesion: 0.43
Nodes (7): EPOCH, makeComment(), makeIssue(), makeMember(), makeProject(), makeUser(), nextId

### Community 108 - "API Catalogue Index"
Cohesion: 0.29
Nodes (7): loginAction, updateCommentAction, toggleFeatureFlagAction, withAction() wrapper, deleteWebhookAction, API catalogue index, GET /api/auth/session

### Community 109 - "Comment and Notification Actions Design"
Cohesion: 0.33
Nodes (7): Comment and notification Server Actions, DES-238: create-comment charges the rate-limit bucket only after permission check succeeds, DES-239: update-comment's action-layer check is optimistic, DES-241: mark-read relies on the ownership escalation inside can(), DES-242: mark-all-read returns a count so the bell badge updates, DES-243: update-preferences gates digestOnly on digest_email flag, DES-236: Labels are checked against org:update, not a label-specific permission

### Community 110 - "Login Screen"
Cohesion: 0.33
Nodes (6): LoginForm(), dynamic, metadata, Page(), PageParams, safeDestination()

### Community 111 - "Marketing Layout"
Cohesion: 0.33
Nodes (4): LINKS, MarketingLink, MarketingNav(), LayoutParams

### Community 112 - "Retention and Pricing Notes"
Cohesion: 0.33
Nodes (6): Notes — plan ladder pricing, Four-plan numeric ladder finalized, enterprise webhooks kept unlimited, UNLIMITED safe for counts, unsafe for durations, Notes — retention policy, No true hard-delete / data-erasure capability exists, cleanup-archived-job purges search/activity but never the issue row

### Community 113 - "Seat and Invitation Notes"
Cohesion: 0.33
Nodes (6): Notes — seat counting rules, Invite-time enforcement vs accept-time reconciliation, Pending invitations count as provisional seats at invite time, Notes — invitation expiry, Invitation token expiry set to 14 days, resendInvitation revokes and reissues rather than extending

### Community 114 - "Package Manifest"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 115 - "Dashboard Error Boundary"
Cohesion: 0.33
Nodes (4): BoundaryError, Explanation, EXPLANATIONS, FALLBACK

### Community 116 - "Project Issue List Screen"
Cohesion: 0.40
Nodes (5): dynamic, metadata, Page(), PageParams, parseStatuses()

## Ambiguous Edges - Review These
- `Taskflow engineering documentation index` → `Architecture overview`  [AMBIGUOUS]
  docs/index.md · relation: references
- `Taskflow engineering documentation index` → `Module map and import rules`  [AMBIGUOUS]
  docs/index.md · relation: references
- `Taskflow engineering documentation index` → `Operations index`  [AMBIGUOUS]
  docs/index.md · relation: references

## Knowledge Gaps
- **641 isolated node(s):** `config`, `nextConfig`, `name`, `version`, `private` (+636 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 761 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Taskflow engineering documentation index` and `Architecture overview`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Taskflow engineering documentation index` and `Module map and import rules`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Taskflow engineering documentation index` and `Operations index`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `can()` connect `Search Actions and Notification Reads` to `Design System Primitives`, `Domain Component Barrel`, `Tenant Context and Dashboard Shell`, `Org, Role and Flag Types`, `Permission Matrix and Role Rules`, `Action Errors and Cache Tags`, `Issue Presentation and Date Formatting`, `Forms and Form Action Hook`, `Feature Flag Evaluation`, `Server Action Wrapper and Revalidation`, `Comment and User Repositories`, `Org and Member Services`, `Formatting Helpers and Cards`, `Route Handlers and Responses`, `Activity Feed and CSV Export`, `Issue and Project Write Actions`, `Comment Thread UI`, `Member Management Screens`, `Project Context Loading`, `Kanban Board Model`, `Sidebar Navigation Model`, `Attachment Schemas and Limits`, `Activity Feed Components`, `Organization Settings Screen`, `UI and Test Documentation Index`, `Project Settings and Archiving`, `Feature Flag Settings Screen`, `Architecture Decision Records`, `Billing Settings Screen`, `Project Issue List Screen`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `.next` connect `Tenant Context and Dashboard Shell` to `Domain Component Barrel`, `Tenant Isolation and Actor Resolution`, `Feature Flag Evaluation`, `Org and Member Services`, `Search Actions and Notification Reads`, `Domain Errors to Error Codes`, `Login and Password Reset Actions`, `Activity Feed and CSV Export`, `Issue and Project Write Actions`, `TypeScript Configuration`, `Comment Thread UI`, `Plan Ladder Configuration`, `Member Management Screens`, `Registration and Org Bootstrap`, `Project Context Loading`, `Invitation Acceptance Flow`, `Organization Settings Screen`, `Project Settings and Archiving`, `Feature Flag Settings Screen`, `Billing Settings Screen`, `Login Screen`, `Project Issue List Screen`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `name` to the rest of the system?**
  _641 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Event Bus and Activity Fan-out` be split into smaller, more focused modules?**
  _Cohesion score 0.0581039755351682 - nodes in this community are weakly interconnected._