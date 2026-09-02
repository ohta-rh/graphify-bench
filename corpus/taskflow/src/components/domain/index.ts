/**
 * Barrel for the domain component layer.
 *
 * Pages and layouts import feature components from here; the design-system
 * primitives they compose from live in `@/components/ui`. Private helpers
 * (permission resource builders, board arithmetic, mention parsing) are not
 * re-exported — they are implementation detail of these components.
 */
export { ActivityFeed } from "./activity/activity-feed";
export type { ActivityFeedProps } from "./activity/activity-feed";

export { BillingPlanCard } from "./billing/billing-plan-card";
export type { BillingPlanCardProps } from "./billing/billing-plan-card";
export { InvoiceTable } from "./billing/invoice-table";
export type { InvoiceTableProps } from "./billing/invoice-table";
export { PlanComparisonTable } from "./billing/plan-comparison-table";
export type { PlanComparisonTableProps } from "./billing/plan-comparison-table";
export { SeatLimitBanner } from "./billing/seat-limit-banner";
export type { SeatLimitBannerProps } from "./billing/seat-limit-banner";
export { UsageMeter } from "./billing/usage-meter";
export type { UsageMeterProps } from "./billing/usage-meter";
export { UsagePanel } from "./billing/usage-panel";
export type { UsagePanelProps } from "./billing/usage-panel";

export { KanbanBoard } from "./board/kanban-board";
export type { KanbanBoardProps } from "./board/kanban-board";
export { KanbanCard } from "./board/kanban-card";
export type { KanbanCardProps } from "./board/kanban-card";
export { KanbanColumn } from "./board/kanban-column";
export type { KanbanColumnProps } from "./board/kanban-column";

export { CommentComposer } from "./comment/comment-composer";
export type { CommentComposerProps } from "./comment/comment-composer";
export { CommentItem } from "./comment/comment-item";
export type { CommentItemProps } from "./comment/comment-item";
export { CommentThread } from "./comment/comment-thread";
export type { CommentThreadProps } from "./comment/comment-thread";
export { MentionTextarea } from "./comment/mention-textarea";
export type { MentionTextareaProps } from "./comment/mention-textarea";

export { FeatureFlagProvider } from "./flags/feature-flag-provider";
export type { FeatureFlagProviderProps } from "./flags/feature-flag-provider";
export { FeatureGate } from "./flags/feature-gate";
export type { FeatureGateProps } from "./flags/feature-gate";

export { IssueActivityPanel } from "./issue/issue-activity-panel";
export type { IssueActivityPanelProps } from "./issue/issue-activity-panel";
export { IssueAssigneePicker } from "./issue/issue-assignee-picker";
export type { IssueAssigneePickerProps } from "./issue/issue-assignee-picker";
export { IssueBulkActions } from "./issue/issue-bulk-actions";
export type { IssueBulkActionsProps } from "./issue/issue-bulk-actions";
export { IssueCard } from "./issue/issue-card";
export type { IssueCardProps } from "./issue/issue-card";
export { IssueDetail } from "./issue/issue-detail";
export type { IssueDetailProps } from "./issue/issue-detail";
export { IssueDueDateField } from "./issue/issue-due-date-field";
export type { IssueDueDateFieldProps } from "./issue/issue-due-date-field";
export { IssueFilterBar } from "./issue/issue-filter-bar";
export type { IssueFilterBarProps } from "./issue/issue-filter-bar";
export { IssueForm } from "./issue/issue-form";
export type { IssueFormProps } from "./issue/issue-form";
export { IssueLabelPicker } from "./issue/issue-label-picker";
export type { IssueLabelPickerProps } from "./issue/issue-label-picker";
export { IssueList } from "./issue/issue-list";
export type { IssueListProps } from "./issue/issue-list";
export { IssuePrioritySelect } from "./issue/issue-priority-select";
export type { IssuePrioritySelectProps } from "./issue/issue-priority-select";
export { IssueRow } from "./issue/issue-row";
export type { IssueRowProps } from "./issue/issue-row";
export { IssueStatusSelect } from "./issue/issue-status-select";
export type { IssueStatusSelectProps } from "./issue/issue-status-select";

export { InvitationList } from "./member/invitation-list";
export type { InvitationListProps } from "./member/invitation-list";
export { InviteMemberForm } from "./member/invite-member-form";
export type { InviteMemberFormProps } from "./member/invite-member-form";
export { MemberTable } from "./member/member-table";
export type { MemberTableProps } from "./member/member-table";
export { RemoveMemberDialog } from "./member/remove-member-dialog";
export type { RemoveMemberDialogProps } from "./member/remove-member-dialog";
export { RoleSelect } from "./member/role-select";
export type { RoleSelectProps } from "./member/role-select";

export { AppSidebar } from "./nav/app-sidebar";
export type { AppSidebarProps } from "./nav/app-sidebar";
export { OrgSwitcher } from "./nav/org-switcher";
export type { OrgSwitcherProps } from "./nav/org-switcher";
export { TopBar } from "./nav/top-bar";
export type { TopBarProps } from "./nav/top-bar";
export { UserMenu } from "./nav/user-menu";
export type { UserMenuProps } from "./nav/user-menu";

export { NotificationBell } from "./notification/notification-bell";
export type { NotificationBellProps } from "./notification/notification-bell";
export { NotificationList } from "./notification/notification-list";
export type { NotificationListProps } from "./notification/notification-list";
export { NotificationPreferencesForm } from "./notification/notification-preferences-form";
export type { NotificationPreferencesFormProps } from "./notification/notification-preferences-form";

export { PermissionGate } from "./permission/permission-gate";
export type { PermissionGateProps } from "./permission/permission-gate";
export { RoleBadge } from "./permission/role-badge";
export type { RoleBadgeProps } from "./permission/role-badge";

export { ProjectArchiveDialog } from "./project/project-archive-dialog";
export type { ProjectArchiveDialogProps } from "./project/project-archive-dialog";
export { ProjectCard } from "./project/project-card";
export type { ProjectCardProps } from "./project/project-card";
export { ProjectForm } from "./project/project-form";
export type { ProjectFormProps } from "./project/project-form";
export { ProjectHeader } from "./project/project-header";
export type { ProjectHeaderProps } from "./project/project-header";
export { ProjectSwitcher } from "./project/project-switcher";
export type { ProjectSwitcherProps } from "./project/project-switcher";

export { SearchDialog } from "./search/search-dialog";
export type { SearchDialogProps } from "./search/search-dialog";
export { SearchResults } from "./search/search-results";
export type { SearchResultsProps } from "./search/search-results";
