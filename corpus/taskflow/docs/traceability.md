---
title: Traceability matrix
id: TRACE
status: approved
owners: [platform-team, product-team]
last_updated: 2026-08-28
related: [REQ-001, DES-001, ADR-003, ADR-013]
---

# Traceability matrix

Generated from the documents themselves, not maintained by hand: every row below is read out
of the `Implemented by` / `Verified by` fields of a requirement and the `Satisfies` / `Code`
fields of the design elements. When a requirement gains a design element or a test, this
matrix picks it up the next time it is regenerated; when a link is missing here, the link is
genuinely missing in the documents.

The point of the matrix is not to look complete. It is to make the holes visible — which
requirements have no design element pinned to them, and which have no automated test. Those
two lists are at the bottom and they are the part worth reading.

## How to read a row

| column | meaning |
|---|---|
| REQ | the requirement id, defined in `docs/requirements/` |
| Requirement | its title |
| Pri | priority: must / should / could |
| Design | the DES elements that declare they satisfy it |
| Code | the primary implementation path(s) the requirement names |
| Tests | the spec file(s) the requirement names, when one exists |

Where a requirement names more than two implementation paths, the first two are shown; the
requirement itself carries the full list.

## REQ to DES to code to test

| REQ | Requirement | Pri | Design | Code | Tests |
|---|---|---|---|---|---|
| REQ-001 | An organization is the top-level tenant boundary | must | DES-251, DES-001, DES-003, DES-004, DES-149, DES-030 | `src/server/db/schema/_shared.ts`, `src/server/repositories/organization-repository.ts` | — |
| REQ-002 | Organization slugs are globally unique and URL-safe | must | DES-194 | `src/lib/slug.ts` | `tests/lib/slug.test.ts` |
| REQ-003 | Creating an organization makes the creator its owner | must | DES-253, DES-251, DES-149, DES-150 | `src/server/services/organization-service.ts` | — |
| REQ-004 | Organization display name and description are editable by admins | must | DES-151 | `src/server/services/organization-service.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-005 | Organization settings carry per-org feature flag overrides | must | — | `src/server/services/feature-flag-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-006 | An organization always has exactly one owner of record | must | DES-246, DES-144, DES-150 | `src/server/services/member-service.ts` | — |
| REQ-007 | Organization deletion is restricted to the owner | must | DES-251, DES-152 | `src/server/services/organization-service.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-008 | Organization summary reports usage against plan quotas | should | DES-153 | `src/server/services/organization-service.ts` | — |
| REQ-009 | Switching between organizations is explicit, never implicit | must | DES-251, DES-195, DES-153 | `src/server/services/session-service.ts`, `src/actions/organizations/switch-org.ts` | — |
| REQ-010 | Every tenant-scoped row carries org_id | must | DES-001, DES-002, DES-008, DES-010, DES-011, DES-013, DES-015, DES-016, DES-017, DES-218, DES-030, DES-033 | `src/server/db/schema/_shared.ts` | `tests/server/tenant-scope.test.ts` |
| REQ-011 | Cross-tenant access attempts fail closed and are recorded | must | DES-013, DES-218, DES-100, DES-031, DES-033, DES-034, DES-037 | `src/lib/tenant.ts`, `src/lib/permissions.ts` | `tests/lib/tenant.test.ts` |
| REQ-012 | Organization timezone drives digest and due-date windows | should | — | `src/lib/date.ts` | `tests/lib/date.test.ts` |
| REQ-013 | Organization labels are shared across all its projects | must | DES-236, DES-237 | `src/server/services/label-service.ts`, `src/server/repositories/label-repository.ts` | — |
| REQ-014 | Organization onboarding seeds a first project | should | DES-253, DES-149 | `src/server/services/organization-service.ts`, `src/actions/auth/register.ts` | — |
| REQ-020 | Four roles form a strict rank order | must | DES-002, DES-012, DES-015, DES-040, DES-042, DES-043, DES-045, DES-046, DES-047, DES-048, DES-142 | `src/types/member.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-021 | Role rank determines the default permission decision | must | DES-012, DES-040, DES-043, DES-100, DES-142 | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-022 | Viewers have read-only access across the product | must | DES-043 | `src/lib/permissions.ts`, `src/components/domain/permission/permission-gate.tsx` | `tests/lib/permissions.matrix.test.ts` |
| REQ-023 | Members may create and edit issues, projects and comments | must | DES-224, DES-043 | `src/lib/permissions.ts`, `src/actions/issues/create-issue.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-024 | Admins manage membership, flags and archiving | must | DES-043 | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-025 | Owners alone may delete the organization or change billing | must | DES-246, DES-043 | `src/lib/permissions.ts`, `src/actions/billing/change-plan.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-026 | Authors may edit their own issues and comments regardless of rank | must | DES-041 | `src/lib/permissions.ts` | `tests/lib/permissions.ownership.test.ts` |
| REQ-027 | Platform staff bypass the role matrix for support access | should | DES-042, DES-044 | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-028 | Invitations are addressed to an email and carry a role | must | DES-245, DES-198, DES-146, DES-148 | `src/server/services/invitation-service.ts` | `tests/services/invitation-service.test.ts` |
| REQ-029 | Invitation tokens are single-use and time-limited | must | DES-198, DES-147, DES-148 | `src/server/repositories/invitation-repository.ts`, `src/lib/hash.ts` | `tests/services/invitation-service.test.ts` |
| REQ-030 | Accepting an invitation creates a member and emits member.joined | must | DES-244 | `src/server/services/invitation-service.ts`, `src/actions/members/accept-invitation.ts` | `tests/services/invitation-service.test.ts` |
| REQ-031 | The last owner cannot be removed or demoted | must | DES-246, DES-196, DES-143, DES-144 | `src/server/services/member-service.ts` | `tests/services/member-service.test.ts` |
| REQ-032 | Seat count is checked against the plan before an invite is sent | must | DES-244, DES-245, DES-146 | `src/server/services/invitation-service.ts`, `src/config/plan-limits.ts` | `tests/services/invitation-service.test.ts` |
| REQ-033 | Removing a member preserves their authored content | must | DES-247, DES-196, DES-197, DES-143 | `src/server/services/member-service.ts`, `src/server/repositories/user-repository.ts` | `tests/services/member-service.test.ts` |
| REQ-034 | Role changes are audited with before and after values | should | DES-142 | `src/server/services/member-service.ts`, `src/server/services/activity-service.ts` | `tests/services/member-service.test.ts` |
| REQ-040 | A project belongs to exactly one organization | must | — | `src/server/repositories/project-repository.ts` | `tests/repositories/project-repository.test.ts` |
| REQ-041 | Project slugs are unique within an organization | must | DES-190, DES-108, DES-114 | `src/server/repositories/project-repository.ts`, `src/lib/slug.ts` | `tests/repositories/project-repository.test.ts` |
| REQ-042 | Project keys prefix issue identifiers and are immutable | must | DES-108 | `src/server/services/project-service.ts`, `src/lib/format.ts` | `tests/lib/format.test.ts` |
| REQ-043 | Project creation is subject to the plan's project quota | must | DES-233, DES-108 | `src/server/services/project-service.ts`, `src/config/plan-limits.ts` | `tests/services/project-service.test.ts` |
| REQ-044 | Archived projects still consume the project quota | must | DES-233 | `src/server/repositories/project-repository.ts`, `src/server/services/billing-service.ts` | `tests/repositories/project-repository.test.ts` |
| REQ-045 | Archiving a project archives its open issues | must | DES-232, DES-185, DES-111 | `src/server/services/project-service.ts`, `src/server/repositories/issue-repository.ts` | `tests/services/project-service.test.ts` |
| REQ-046 | Archived projects are hidden from default listings | must | DES-232, DES-188, DES-111 | `src/lib/soft-delete.ts`, `src/server/repositories/project-repository.ts` | `tests/lib/soft-delete.test.ts` |
| REQ-047 | A project may be restored without losing its issues | must | DES-234, DES-190, DES-110 | `src/server/services/project-service.ts`, `src/lib/soft-delete.ts` | `tests/services/project-service.test.ts` |
| REQ-048 | Project deletion is permanent and owner-only | should | — | `src/lib/permissions.ts`, `src/server/jobs/cleanup-archived-job.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-049 | A project may nominate a lead | could | — | `src/server/services/project-service.ts` | — |
| REQ-050 | Project visibility is private unless public projects are enabled | should | DES-235, DES-193, DES-107, DES-113 | `src/lib/feature-flags.ts`, `src/server/services/project-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-051 | Project membership narrows notification fan-out | should | — | `src/server/repositories/project-member-repository.ts` | — |
| REQ-052 | Project listings are paginated by keyset cursor | must | DES-070, DES-071, DES-072, DES-073, DES-074, DES-075, DES-077, DES-023, DES-188 | `src/server/repositories/base-repository.ts`, `src/server/repositories/project-repository.ts` | `tests/repositories/project-repository.test.ts` |
| REQ-053 | Project creation emits project.created | must | DES-073, DES-077, DES-020, DES-021, DES-024, DES-050, DES-051, DES-053, DES-054, DES-055, DES-058, DES-011, DES-012, DES-111 | `src/server/services/project-service.ts`, `src/lib/event-bus.ts` | `tests/services/project-service.test.ts` |
| REQ-054 | Project settings expose per-project defaults | could | DES-189, DES-109, DES-112 | `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/project-settings-form.tsx`, `src/server/services/project-service.ts` | — |
| REQ-060 | An issue belongs to exactly one project | must | DES-101 | `src/server/repositories/issue-repository.ts` | `tests/repositories/issue-repository.test.ts` |
| REQ-061 | Issue numbers are allocated per project and never reused | must | DES-183, DES-101 | `src/server/repositories/issue-repository.ts` | `tests/repositories/issue-repository.test.ts` |
| REQ-062 | Issue status is a closed vocabulary | must | DES-230, DES-182, DES-184, DES-103 | `src/types/issue.ts`, `src/schemas/issue.ts` | `tests/schemas/issue.schema.test.ts` |
| REQ-063 | Issue priority is a closed vocabulary | must | — | `src/types/issue.ts`, `src/schemas/issue.ts` | `tests/schemas/issue.schema.test.ts` |
| REQ-064 | Issue creation is subject to the per-project issue quota | must | DES-229, DES-101 | `src/server/services/issue-service.ts`, `src/config/plan-limits.ts` | `tests/services/issue-service.test.ts` |
| REQ-065 | Issue creation emits issue.created | must | DES-020, DES-024, DES-050, DES-051, DES-101 | `src/server/services/issue-service.ts` | `tests/services/issue-service.test.ts` |
| REQ-066 | Status transitions emit issue.status_changed | must | DES-228, DES-020, DES-050, DES-184, DES-103, DES-104 | `src/server/services/issue-service.ts` | `tests/services/issue-service.test.ts` |
| REQ-067 | Assignment emits issue.assigned with the previous assignee | must | DES-227, DES-020, DES-050, DES-105 | `src/server/services/issue-service.ts` | `tests/services/issue-service.test.ts` |
| REQ-068 | Only the changed fields are reported on issue.updated | should | DES-231, DES-102 | `src/server/services/issue-service.ts` | `tests/services/issue-service.test.ts` |
| REQ-069 | Issues may carry a due date | should | — | `src/schemas/issue.ts`, `src/lib/date.ts` | `tests/schemas/issue.schema.test.ts` |
| REQ-070 | Overdue issues are detected by a scheduled sweep | should | DES-006, DES-060, DES-061, DES-066, DES-069 | `src/server/jobs/overdue-issue-job.ts` | `tests/jobs/overdue-issue-job.test.ts` |
| REQ-071 | Issues are archived, not deleted, by default | must | DES-226, DES-100 | `src/server/services/issue-service.ts`, `src/lib/soft-delete.ts` | `tests/services/issue-service.test.ts` |
| REQ-072 | Authors and assignees may edit an issue they do not otherwise own | must | DES-226, DES-008, DES-026, DES-017, DES-041 | `src/lib/permissions.ts` | `tests/lib/permissions.ownership.test.ts` |
| REQ-073 | Issue deletion requires admin | should | — | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-074 | Issues carry organization labels | should | DES-237, DES-191, DES-192, DES-106 | `src/server/repositories/label-repository.ts` | — |
| REQ-075 | Issue attachments are counted against the storage quota | should | DES-187, DES-174, DES-106 | `src/server/services/attachment-service.ts`, `src/server/repositories/attachment-repository.ts` | — |
| REQ-076 | Moving an issue between projects renumbers it | should | — | `src/server/services/issue-service.ts` | `tests/services/issue-service.test.ts` |
| REQ-077 | Issue listings support filtering by status, assignee and label | must | DES-022, DES-023, DES-180, DES-104, DES-106, DES-107 | `src/server/repositories/issue-repository.ts` | `tests/repositories/issue-repository.test.ts` |
| REQ-078 | Issue listings are paginated by keyset cursor | must | DES-022, DES-180, DES-181, DES-192, DES-107 | `src/server/repositories/issue-repository.ts`, `src/server/repositories/base-repository.ts` | `tests/repositories/issue-repository.test.ts` |
| REQ-079 | Issue export produces CSV when the plan includes it | could | DES-007, DES-027 | `src/lib/csv.ts`, `src/app/api/export/issues/route.ts` | `tests/lib/csv.test.ts` |
| REQ-090 | Comments belong to an issue and an organization | must | DES-115 | `src/server/repositories/comment-repository.ts` | `tests/repositories/comment-repository.test.ts` |
| REQ-091 | Comment bodies are Markdown with a restricted subset | must | — | `src/lib/markdown.ts` | `tests/lib/markdown.test.ts` |
| REQ-092 | Mentions are parsed from the comment body at write time | must | DES-116 | `src/lib/mentions.ts`, `src/server/services/comment-service.ts` | `tests/lib/mentions.test.ts` |
| REQ-093 | Mentions inside code spans and fences are not mentions | must | DES-116 | `src/lib/mentions.ts` | `tests/lib/mentions.test.ts` |
| REQ-094 | Mentioned users must be members of the same organization | must | DES-116 | `src/lib/mentions.ts` | `tests/lib/mentions.test.ts` |
| REQ-095 | Comment creation emits comment.created with mentioned user ids | must | DES-116 | `src/server/services/comment-service.ts` | `tests/services/comment-service.test.ts` |
| REQ-096 | Comment creation is rate limited per organization | must | DES-238, DES-219, DES-115 | `src/lib/rate-limit.ts` | `tests/lib/rate-limit.test.ts` |
| REQ-097 | Authors may edit their own comments | must | DES-239, DES-041, DES-117 | `src/server/services/comment-service.ts`, `src/lib/permissions.ts` | `tests/services/comment-service.test.ts` |
| REQ-098 | Comment deletion is a soft delete | must | DES-240, DES-186, DES-118 | `src/server/services/comment-service.ts`, `src/server/repositories/comment-repository.ts` | `tests/services/comment-service.test.ts` |
| REQ-099 | Deleting a comment emits comment.deleted | must | DES-240, DES-118 | `src/server/services/comment-service.ts` | `tests/services/comment-service.test.ts` |
| REQ-100 | Comment threads are ordered by creation time | must | DES-186, DES-119 | `src/server/repositories/comment-repository.ts` | `tests/repositories/comment-repository.test.ts` |
| REQ-101 | Comment listings exclude archived comments by default | must | DES-186, DES-119 | `src/server/repositories/comment-repository.ts`, `src/lib/soft-delete.ts` | `tests/repositories/comment-repository.test.ts` |
| REQ-102 | Editing a comment re-parses its mentions | must | DES-120 | `src/server/services/comment-service.ts`, `src/lib/mentions.ts` | `tests/services/comment-service.test.ts` |
| REQ-110 | Notifications are per recipient and per organization | must | DES-121, DES-123 | `src/server/repositories/notification-repository.ts` | `tests/services/notification-service.test.ts` |
| REQ-111 | Notification fan-out is driven by domain events | must | DES-006, DES-024, DES-051, DES-055, DES-200, DES-178, DES-121, DES-125 | `src/server/services/notification-service.ts`, `src/server/services/event-registry.ts` | `tests/services/notification-service.test.ts` |
| REQ-112 | A mention always notifies the mentioned user | must | DES-122, DES-126 | `src/server/services/notification-service.ts`, `src/server/services/event-registry.ts` | `tests/services/notification-service.test.ts` |
| REQ-113 | Assignment notifies the new assignee | must | DES-200, DES-122, DES-126 | `src/server/services/notification-service.ts`, `src/server/services/event-registry.ts` | `tests/services/notification-service.test.ts` |
| REQ-114 | Actors are not notified about their own actions | must | DES-122 | `src/server/services/notification-service.ts` | `tests/services/notification-service.test.ts` |
| REQ-115 | Notification preferences are per channel and per event class | should | DES-243, DES-202, DES-203, DES-122, DES-124 | `src/server/repositories/notification-preference-repository.ts`, `src/server/services/notification-service.ts` | `tests/services/notification-service.test.ts` |
| REQ-116 | Recipients may mark notifications read individually or in bulk | must | DES-241, DES-242, DES-127 | `src/server/services/notification-service.ts` | `tests/services/notification-service.test.ts` |
| REQ-117 | Unread counts are computed per organization | must | DES-242, DES-201, DES-127 | `src/server/repositories/notification-repository.ts` | `tests/services/notification-service.test.ts` |
| REQ-118 | Recipients may manage only their own notifications | must | DES-241, DES-127 | `src/lib/permissions.ts`, `src/server/services/notification-service.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-119 | Digest email batches unread notifications into one message | should | DES-060, DES-061, DES-063, DES-065, DES-056, DES-128, DES-129, DES-130, DES-131, DES-124 | `src/server/services/digest-service.ts` | `tests/jobs/digest-email-job.test.ts` |
| REQ-120 | Digest is available only on plans that include it | must | DES-243, DES-065, DES-128, DES-124 | `src/server/jobs/digest-email-job.ts`, `src/lib/feature-flags.ts` | `tests/jobs/digest-email-job.test.ts` |
| REQ-121 | The digest window is bounded by the last successful send | should | DES-065, DES-129 | `src/lib/date.ts` | `tests/lib/date.test.ts` |
| REQ-122 | An empty digest is not sent | should | DES-063, DES-065, DES-128 | `src/server/services/digest-service.ts`, `src/server/jobs/digest-email-job.ts` | `tests/jobs/digest-email-job.test.ts` |
| REQ-123 | Digest sends emit digest.due before rendering | could | DES-056, DES-179 | `src/server/jobs/digest-email-job.ts` | `tests/jobs/digest-email-job.test.ts` |
| REQ-124 | Email rendering is separated from email delivery | should | DES-065, DES-131, DES-132, DES-133, DES-134 | `src/server/services/email-service.ts` | `tests/emails/render.test.ts` |
| REQ-130 | Every organization has exactly one subscription | must | DES-206 | `src/server/repositories/subscription-repository.ts` | `tests/services/billing-service.test.ts` |
| REQ-131 | Four plans form an ordered ladder | must | — | `src/config/plan-limits.ts` | `tests/config/plan-limits.test.ts` |
| REQ-132 | Plan quotas are declared in one place | must | DES-014, DES-208, DES-135, DES-139 | `src/config/plan-limits.ts` | `tests/config/plan-limits.test.ts` |
| REQ-133 | Seats are counted as active members | must | DES-249, DES-139, DES-140 | `src/server/repositories/member-repository.ts`, `src/server/services/billing-service.ts` | `tests/services/billing-service.test.ts` |
| REQ-134 | Project count is checked before project creation | must | DES-210, DES-140 | `src/server/services/billing-service.ts` | `tests/services/billing-service.test.ts` |
| REQ-135 | Issue count is checked per project | must | DES-210, DES-140 | `src/server/services/billing-service.ts`, `src/server/repositories/issue-repository.ts` | `tests/services/billing-service.test.ts` |
| REQ-136 | Webhook endpoints are limited per plan | must | DES-141 | `src/server/services/webhook-service.ts`, `src/config/plan-limits.ts` | `tests/contract/plan-limits.test.ts` |
| REQ-137 | Unlimited is represented by positive infinity | must | DES-141 | `src/config/plan-limits.ts`, `src/lib/format.ts` | `tests/config/plan-limits.test.ts` |
| REQ-138 | Exceeding a quota produces plan_limit_exceeded, not a crash | must | DES-248, DES-222, DES-025, DES-135, DES-137 | `src/lib/errors.ts`, `src/server/services/billing-service.ts` | `tests/lib/errors.test.ts` |
| REQ-139 | Quota breaches emit billing.limit_exceeded | should | DES-137, DES-138 | `src/server/services/billing-service.ts`, `src/server/services/activity-service.ts` | `tests/services/billing-service.test.ts` |
| REQ-140 | Plan changes emit billing.plan_changed | must | DES-207 | `src/server/services/billing-service.ts` | `tests/services/billing-service.test.ts` |
| REQ-141 | Downgrades are refused while usage exceeds the target plan | must | DES-248, DES-136 | `src/server/services/billing-service.ts` | `tests/services/billing-service.test.ts` |
| REQ-142 | Trials expire on a schedule and fall back to free | should | DES-060, DES-061, DES-068, DES-206, DES-207, DES-211 | `src/server/jobs/trial-expiry-job.ts` | — |
| REQ-143 | Invoices are generated per billing period | could | — | `src/server/repositories/invoice-repository.ts` | — |
| REQ-144 | Usage is rolled up on a schedule for the billing screen | should | DES-208, DES-209, DES-138 | `src/server/jobs/usage-rollup-job.ts`, `src/server/repositories/usage-repository.ts` | — |
| REQ-150 | Webhook endpoints are configured per organization | must | DES-257, DES-258, DES-214, DES-159 | `src/server/repositories/webhook-repository.ts`, `src/server/services/webhook-service.ts` | — |
| REQ-151 | Endpoint management requires admin | must | DES-161 | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-152 | Webhooks require a plan that includes them | must | DES-257, DES-159 | `src/lib/feature-flags.ts`, `src/server/services/webhook-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-153 | Each endpoint holds a secret used to sign payloads | must | DES-159, DES-160 | `src/server/repositories/webhook-repository.ts`, `src/server/services/webhook-service.ts` | — |
| REQ-154 | Deliveries are queued, never sent inline with a request | must | DES-064, DES-215, DES-163 | `src/server/services/webhook-service.ts`, `src/server/repositories/webhook-repository.ts` | `tests/server/jobs.test.ts` |
| REQ-155 | Deliveries are claimed in bounded batches | must | DES-064, DES-215, DES-162, DES-163 | `src/server/repositories/webhook-repository.ts` | `tests/server/jobs.test.ts` |
| REQ-156 | Failed deliveries retry with exponential backoff | must | DES-061, DES-062, DES-064 | `src/server/jobs/webhook-delivery-job.ts` | `tests/server/jobs.test.ts` |
| REQ-157 | A delivery is abandoned after a fixed attempt ceiling | must | DES-062, DES-064, DES-215 | `src/server/jobs/webhook-delivery-job.ts`, `src/config/constants.ts` | `tests/server/jobs.test.ts` |
| REQ-158 | Deliveries to a disabled endpoint fail fast | should | DES-064, DES-162 | `src/server/jobs/webhook-delivery-job.ts` | `tests/server/jobs.test.ts` |
| REQ-159 | Delivery attempts are visible in the settings UI | should | DES-214 | `src/app/(dashboard)/[orgSlug]/settings/webhooks/webhook-manager.tsx`, `src/server/repositories/webhook-repository.ts` | — |
| REQ-160 | Webhook payloads carry the event type and envelope | must | DES-007, DES-027, DES-160, DES-162 | `src/server/repositories/webhook-repository.ts` | `tests/server/jobs.test.ts` |
| REQ-161 | Webhook delivery is rate limited per organization | should | DES-257, DES-219, DES-162 | `src/lib/rate-limit.ts` | `tests/lib/rate-limit.test.ts` |
| REQ-170 | Search covers issues, comments and projects | must | DES-256, DES-213, DES-154, DES-157 | `src/server/repositories/search-repository.ts` | `tests/services/search-service.test.ts` |
| REQ-171 | The search index is scoped by organization | must | — | `src/server/repositories/search-repository.ts` | `tests/services/search-service.test.ts` |
| REQ-172 | The index is maintained from domain events | must | DES-212, DES-157, DES-158 | `src/server/services/search-service.ts` | `tests/services/search-service.test.ts` |
| REQ-173 | Handlers re-read the row rather than trusting the payload | must | DES-212, DES-158 | `src/server/services/search-service.ts` | `tests/services/search-service.test.ts` |
| REQ-174 | Archiving removes a subject from the index | must | DES-158 | `src/server/services/search-service.ts` | `tests/services/search-service.test.ts` |
| REQ-175 | Field-scoped syntax requires advanced search | should | DES-256, DES-154 | `src/lib/feature-flags.ts`, `src/schemas/search.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-176 | Queries are rate limited per organization | must | DES-219, DES-155 | `src/lib/rate-limit.ts` | `tests/lib/rate-limit.test.ts` |
| REQ-177 | Results carry a snippet around the match | should | DES-213, DES-156 | `src/server/services/search-service.ts`, `src/lib/markdown.ts` | `tests/services/search-service.test.ts` |
| REQ-178 | Results link back to the subject | should | DES-156 | `src/lib/url.ts`, `src/server/services/search-service.ts` | `tests/lib/url.test.ts` |
| REQ-179 | Search results are paginated by cursor | should | DES-156 | `src/server/services/search-service.ts`, `src/server/repositories/base-repository.ts` | `tests/services/search-service.test.ts` |
| REQ-180 | A scheduled job can rebuild the index | could | DES-060, DES-061, DES-063, DES-158 | `src/server/jobs/search-reindex-job.ts` | — |
| REQ-181 | Search requires read permission on issues | must | DES-256, DES-154 | `src/actions/search/search.ts`, `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-185 | Flags are declared in a single registry | must | DES-014, DES-175 | `src/config/feature-flags.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-186 | Flag evaluation goes through one function | must | DES-175 | `src/lib/feature-flags.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-187 | Four evaluation strategies are supported | must | — | `src/lib/feature-flags.ts`, `src/config/feature-flags.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-188 | Plan-gated flags follow the plan ladder | must | DES-175 | `src/lib/feature-flags.ts`, `src/config/plan-limits.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-189 | Percentage rollout is deterministic per organization | should | — | `src/lib/feature-flags.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-190 | Some flags are not overridable | must | DES-250, DES-177 | `src/lib/feature-flags.ts`, `src/server/services/feature-flag-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-191 | Per-organization overrides live in organization settings | must | DES-177 | `src/lib/feature-flags.ts`, `src/server/services/feature-flag-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-192 | Toggling a flag requires admin and emits flag.toggled | must | DES-250, DES-177 | `src/server/services/feature-flag-service.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-193 | A disabled feature fails with FeatureDisabledError | must | DES-222, DES-048, DES-177 | `src/lib/errors.ts` | `tests/lib/errors.test.ts` |
| REQ-194 | The client receives a flag snapshot, not the registry | must | DES-076, DES-175, DES-176 | `src/lib/feature-flags.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-195 | Flag keys are a closed union | must | — | `src/types/feature-flag.ts`, `src/schemas/feature-flag.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-200 | Users authenticate with email and password | must | DES-252, DES-255, DES-259, DES-220, DES-223, DES-199, DES-164, DES-165, DES-167 | `src/server/services/auth-service.ts`, `src/server/repositories/user-repository.ts` | `tests/schemas/auth.schema.test.ts` |
| REQ-201 | Passwords are stored only as hashes | must | DES-003, DES-199, DES-167 | `src/lib/hash.ts` | `tests/lib/hash.test.ts` |
| REQ-202 | Login issues an opaque session token | must | DES-252, DES-216, DES-168 | `src/server/services/session-service.ts`, `src/server/services/auth-service.ts` | — |
| REQ-203 | Session tokens are stored hashed | must | DES-168 | `src/server/repositories/session-repository.ts`, `src/lib/hash.ts` | `tests/lib/hash.test.ts` |
| REQ-204 | Sessions expire after a fixed lifetime | must | DES-217, DES-168 | `src/server/services/session-service.ts`, `src/server/repositories/session-repository.ts` | — |
| REQ-205 | The session cookie is httpOnly and same-site lax | must | — | `src/lib/session.ts`, `src/config/env.ts` | — |
| REQ-206 | Only one module reads or writes the session cookie | must | — | `src/lib/session.ts` | — |
| REQ-207 | Logout destroys the session server-side | must | DES-254 | `src/server/services/auth-service.ts`, `src/server/services/session-service.ts` | — |
| REQ-208 | Password reset is rate limited | must | DES-252, DES-225, DES-007, DES-219, DES-165, DES-167 | `src/lib/rate-limit.ts`, `src/server/services/auth-service.ts` | `tests/lib/rate-limit.test.ts` |
| REQ-209 | Registration creates a user and an organization | must | DES-253, DES-164, DES-166 | `src/server/services/auth-service.ts`, `src/server/services/organization-service.ts` | `tests/schemas/auth.schema.test.ts` |
| REQ-210 | An actor is resolved per organization, not globally | must | DES-259, DES-221, DES-216, DES-169, DES-145, DES-032 | `src/lib/actor.ts` | — |
| REQ-211 | Unauthenticated dashboard requests redirect to login | must | DES-220, DES-221, DES-225, DES-005, DES-169, DES-032, DES-036 | `src/proxy.ts` | — |
| REQ-212 | The request hook rejects requests for unknown organizations | should | DES-005, DES-169, DES-036 | `src/proxy.ts`, `src/lib/actor.ts` | `tests/lib/tenant.test.ts` |
| REQ-213 | A user may belong to several organizations | must | DES-195, DES-199, DES-216, DES-169, DES-145, DES-032, DES-035 | `src/server/repositories/organization-repository.ts`, `src/server/services/organization-service.ts` | — |
| REQ-220 | Every domain event is recorded as an activity row | must | DES-024, DES-051, DES-057, DES-204, DES-170, DES-173 | `src/server/services/activity-service.ts` | `tests/services/activity-service.test.ts` |
| REQ-221 | Activity rows are immutable | must | DES-204, DES-173 | `src/server/repositories/activity-repository.ts` | `tests/services/activity-service.test.ts` |
| REQ-222 | Activity records the actor, subject and action | must | DES-170, DES-173 | `src/server/services/activity-service.ts` | `tests/services/activity-service.test.ts` |
| REQ-223 | Activity is queryable by subject | must | DES-171 | `src/server/repositories/activity-repository.ts` | `tests/services/activity-service.test.ts` |
| REQ-224 | Reading the activity feed requires member | must | DES-171 | `src/lib/permissions.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-225 | Exporting activity requires admin | must | DES-171 | `src/lib/permissions.ts`, `src/server/services/activity-service.ts` | `tests/lib/permissions.matrix.test.ts` |
| REQ-226 | The activity feed is gated by a feature flag | should | — | `src/lib/feature-flags.ts`, `src/config/nav.ts` | `tests/lib/feature-flags.test.ts` |
| REQ-227 | Activity retention follows the plan's retention window | should | DES-067, DES-205 | `src/config/plan-limits.ts`, `src/server/jobs/cleanup-archived-job.ts` | `tests/config/plan-limits.test.ts` |
| REQ-228 | Activity capture must not fail the originating write | must | DES-052, DES-170 | `src/server/services/activity-service.ts`, `src/lib/event-bus.ts` | `tests/lib/event-bus.test.ts` |
| REQ-229 | Activity is paginated by occurrence time | should | DES-172 | `src/server/services/activity-service.ts` | `tests/services/activity-service.test.ts` |
| REQ-230 | CSV export escapes quotes and separators | must | DES-171 | `src/lib/csv.ts` | `tests/lib/csv.test.ts` |
| REQ-231 | Cleanup removes activity beyond the retention window | should | DES-067, DES-205 | `src/server/repositories/activity-repository.ts`, `src/server/jobs/cleanup-archived-job.ts` | — |

## DES to code

The reverse direction: each design element and the code that embodies it. A design element
with no code path is a description of a policy rather than of a module, which is legitimate
for the elements in the basic design but suspicious anywhere under a `service-`, `repository-`
or `action-` document.

| DES | Design element | Defined in | Code |
|---|---|---|---|
| DES-001 | Taskflow ships as one Next.js 16 process, not a service mesh | `design/architecture-overview.md` | `src/server/db/client.ts`, `src/instrumentation.ts` |
| DES-002 | Four architectural layers front-to-back | `design/architecture-overview.md` | — |
| DES-003 | src/server/ holds everything that must never reach the client bundle | `design/architecture-overview.md` | — |
| DES-004 | Build and deploy: one artifact, one file-backed database | `design/architecture-overview.md` | `src/server/db/migrate.ts`, `src/server/db/seed.ts` |
| DES-005 | Next.js 16 facts that ripple through the whole codebase | `design/architecture-overview.md` | — |
| DES-006 | `src/instrumentation.ts` is the one process-start hook | `design/architecture-overview.md` | `src/instrumentation.ts` |
| DES-007 | Route Handlers exist only where a Server Action structurally cannot reach | `design/architecture-overview.md` | — |
| DES-008 | The five deliberate layering exceptions | `design/architecture-overview.md` | — |
| DES-010 | Top-level src/ directories and their responsibility | `design/module-map.md` | — |
| DES-011 | The action layer is a thin validation-and-dispatch shim, on purpose | `design/module-map.md` | `src/actions/_lib/with-action.ts` |
| DES-012 | The service layer owns business rules and authorization | `design/module-map.md` | `src/server/services/issue-service.ts`, `src/server/services/_support.ts` |
| DES-013 | The repository layer owns tenancy filtering and persistence, nothing else | `design/module-map.md` | `src/server/repositories/base-repository.ts`, `src/server/repositories/issue-repository.ts` |
| DES-014 | `config/` is the single source of every numeric and declarative truth | `design/module-map.md` | `src/config/plan-limits.ts`, `src/config/feature-flags.ts` |
| DES-015 | `lib/` holds cross-cutting primitives that know nothing about the domain | `design/module-map.md` | `src/lib/permissions.ts`, `src/lib/tenant.ts` |
| DES-016 | Import direction is enforced by convention and review, not tooling | `design/module-map.md` | — |
| DES-017 | The five deliberate layering exceptions, file by file | `design/module-map.md` | — |
| DES-020 | The canonical write path: action → service → repository → db → event | `design/data-flow.md` | `src/server/services/issue-service.ts`, `src/server/repositories/issue-repository.ts` |
| DES-021 | `withAction()`'s four responsibilities, in the order it performs them | `design/data-flow.md` | `src/actions/_lib/with-action.ts` |
| DES-022 | The canonical read path in a Server Component | `design/data-flow.md` | `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/page.tsx`, `src/server/services/issue-service.ts` |
| DES-023 | Cache tags and revalidation sit at the seam between write and read paths | `design/data-flow.md` | `src/lib/cache.ts` |
| DES-024 | Domain events are the write path's only sanctioned fan-out mechanism | `design/data-flow.md` | `src/lib/event-bus.ts`, `src/server/services/event-registry.ts` |
| DES-025 | Error translation: one thrown class, one `ErrorCode`, one HTTP status | `design/data-flow.md` | `src/lib/errors.ts` |
| DES-026 | The layering exceptions inside the data flow specifically | `design/data-flow.md` | — |
| DES-027 | Route Handler flows that never touch a Server Action | `design/data-flow.md` | — |
| DES-030 | `org_id` on every tenant table is the tenant boundary, full stop | `design/tenant-isolation.md` | `src/server/db/schema/_shared.ts`, `src/server/db/schema/issues.ts` |
| DES-031 | `assertOrgScope()` and `TenantScopeError` | `design/tenant-isolation.md` | `src/lib/tenant.ts` |
| DES-032 | Actor resolution: `getActor`, `requireActorFor`, `tryGetActor` | `design/tenant-isolation.md` | `src/lib/actor.ts` |
| DES-033 | The repository contract: filter by `orgId`, never call `can()` | `design/tenant-isolation.md` | `src/server/repositories/base-repository.ts` |
| DES-034 | Filtering helpers for the non-repository call sites | `design/tenant-isolation.md` | `src/lib/tenant.ts` |
| DES-035 | `user-repository.ts` is the one deliberately non-tenant-scoped repository | `design/tenant-isolation.md` | `src/server/repositories/user-repository.ts` |
| DES-036 | `proxy.ts`'s limited role: presence, not validity | `design/tenant-isolation.md` | `src/proxy.ts` |
| DES-037 | Failure modes: what happens when a scoping step is skipped | `design/tenant-isolation.md` | — |
| DES-040 | `can()` / `explain()` / `assertCan()` / `canAll()` as the single entry point | `design/permission-model.md` | `src/lib/permissions.ts` |
| DES-041 | Ownership escalation is evaluated after the role matrix | `design/permission-model.md` | `src/lib/permissions.ts` |
| DES-042 | Decision order and the six reasons | `design/permission-model.md` | `src/lib/permissions.ts`, `src/types/permission.ts` |
| DES-043 | `ROLE_MATRIX` and `ROLE_RANK` | `design/permission-model.md` | `src/lib/permissions.ts`, `src/types/member.ts` |
| DES-044 | Platform staff bypass | `design/permission-model.md` | `src/lib/permissions.ts`, `src/types/member.ts` |
| DES-045 | `PermissionResource`: a discriminated union, not a generic bag | `design/permission-model.md` | `src/types/permission.ts`, `src/server/services/_support.ts` |
| DES-046 | `canAll()` for bulk UI checks | `design/permission-model.md` | `src/lib/permissions.ts` |
| DES-047 | `PermissionDeniedError` and its translation | `design/permission-model.md` | `src/lib/permissions.ts`, `src/lib/errors.ts` |
| DES-048 | Permissions and feature flags are separate gates, deliberately | `design/permission-model.md` | `src/lib/permissions.ts`, `src/lib/feature-flags.ts` |
| DES-050 | `emit()` / `subscribe()` as the typed in-process bus | `design/event-bus.md` | `src/lib/event-bus.ts` |
| DES-051 | `TaskflowEventMap`: 21 keys, one shared envelope | `design/event-bus.md` | `src/types/event.ts` |
| DES-052 | Handler isolation via `Promise.allSettled` | `design/event-bus.md` | `src/lib/event-bus.ts` |
| DES-053 | `subscribeOnce` and the `Unsubscribe` contract | `design/event-bus.md` | `src/lib/event-bus.ts` |
| DES-054 | `emitAndForget` for call sites that must not await delivery | `design/event-bus.md` | `src/lib/event-bus.ts` |
| DES-055 | `event-registry.ts`: the one module that knows the full listener set | `design/event-bus.md` | `src/server/services/event-registry.ts` |
| DES-056 | The digest bridge: turning `digest.due` into a queued job | `design/event-bus.md` | `src/server/services/event-registry.ts` |
| DES-057 | Known coupling: `auth-service.ts` cannot emit auth events | `design/event-bus.md` | `src/server/services/auth-service.ts` |
| DES-058 | Delivery guarantees: at-most-once, in-memory, no ordering across types | `design/event-bus.md` | — |
| DES-060 | `scheduler.ts`: interval and the `CADENCE_MINUTES` table | `design/background-jobs.md` | `src/server/jobs/scheduler.ts` |
| DES-061 | The seven job kinds and what each one is for | `design/background-jobs.md` | `src/server/jobs/*.ts` |
| DES-062 | `queue.ts`: enqueue, drain, retry with backoff | `design/background-jobs.md` | `src/server/jobs/queue.ts` |
| DES-063 | Idempotence per job kind | `design/background-jobs.md` | — |
| DES-064 | `webhook-delivery-job`: claim, sign, retry, abandon | `design/background-jobs.md` | `src/server/jobs/webhook-delivery-job.ts` |
| DES-065 | `digest-email-job`: per-org UTC hour window | `design/background-jobs.md` | `src/server/jobs/digest-email-job.ts` |
| DES-066 | `overdue-issue-job`: announce, don't act | `design/background-jobs.md` | `src/server/jobs/overdue-issue-job.ts` |
| DES-067 | `cleanup-archived-job`: retention is plan-scoped, and asymmetric | `design/background-jobs.md` | `src/server/jobs/cleanup-archived-job.ts` |
| DES-068 | `trial-expiry-job`: downgrade, or log and leave alone | `design/background-jobs.md` | `src/server/jobs/trial-expiry-job.ts` |
| DES-069 | `JobResult` is the uniform shape every job reports, win or lose | `design/background-jobs.md` | `src/server/jobs/types.ts` |
| DES-070 | The cache tag vocabulary: `orgTag`, `projectTag`, `issueTag` | `design/caching-and-revalidation.md` | `src/lib/cache.ts` |
| DES-071 | `revalidateTagged()` and the required `cacheLife` profile | `design/caching-and-revalidation.md` | `src/lib/cache.ts` |
| DES-072 | `CACHE_PROFILES`: three named staleness budgets | `design/caching-and-revalidation.md` | `src/lib/cache.ts` |
| DES-073 | `withAction()`'s `revalidate` and `cacheProfile` options | `design/caching-and-revalidation.md` | `src/actions/_lib/with-action.ts` |
| DES-074 | Staleness budget per profile, by example | `design/caching-and-revalidation.md` | — |
| DES-075 | Tag composition: a mutation can invalidate more than one entity's cache | `design/caching-and-revalidation.md` | `src/actions/projects/archive-project.ts`, `src/actions/projects/restore-project.ts` |
| DES-076 | The client-side flag snapshot is a cache-adjacent, not cache-tagged, concern | `design/caching-and-revalidation.md` | `src/lib/feature-flags.ts`, `src/config/nav.ts` |
| DES-077 | `withAction()`'s revalidation is best-effort, not transactional | `design/caching-and-revalidation.md` | `src/actions/_lib/with-action.ts` |
| DES-100 | Every mutating method runs guards in the same fixed order | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-101 | Issue creation gates on four things before a number is allocated | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-102 | updateIssue reports exactly the fields the caller changed | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-103 | Status transitions are validated against the closed status union and are idempotent no-ops when unchanged | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-104 | Board drag-and-drop is a status change plus a touch, not a persisted order | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-105 | Assignment is a separate permission from update, and un-assigning degrades to issue.updated | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-106 | getIssue composes three repositories into one read model, and never authorizes the composed pieces separately | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-107 | listIssues authorizes at the organization, not per project, because visibility narrows later | `design/service-issue.md` | `src/server/services/issue-service.ts` |
| DES-108 | Project creation derives its key from the name unless one is supplied, and the key is never touched again | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-109 | updateProject performs no diffing and emits no event | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-110 | Restoring a project does not restore its issues | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-111 | Archiving a project optionally cascades to its open issues, and the cascade count travels in the event | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-112 | getProject composes stats from a second repository call, both scoped by the same permission check | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-113 | Project visibility does not gate listProjects, only what a viewer can conclude from it | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-114 | suggestProjectSlug takes no Actor and performs no authorization | `design/service-project.md` | `src/server/services/project-service.ts` |
| DES-115 | Comment creation is rate limited before mentions are resolved, so a burst never reaches the member scan | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-116 | Mentions are resolved server-side and the server's list wins on disagreement with the client | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-117 | The self-edit window only applies to the author, and closes fifteen minutes after posting | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-118 | Deletion is soft, and the emitted event's timestamp is taken from the archive patch, not from a fresh clock read | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-119 | getThread re-checks comment:read even though the caller already proved they can read the issue | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-120 | Editing a comment does not re-run mention resolution or re-emit an event | `design/service-comment.md` | `src/server/services/comment-service.ts` |
| DES-121 | notify() takes no Actor and is never called by a Server Action directly | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-122 | notify() filters self-notification and per-recipient channel preference in the same loop, before any row is written | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-123 | An empty recipient list or a recipient set that resolves to zero eligible rows both short-circuit cheaply | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-124 | resolveChannels is a pure function, and email requires two independent conditions to hold | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-125 | The fan-out is wired at module import time, not through event-registry, and importing this module is what turns it on | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-126 | Watcher derivation for comment notifications re-reads the issue rather than trusting the event | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-127 | updatePreference and markAllRead both authorize against the caller's own userId, never an arbitrary target | `design/service-notification.md` | `src/server/services/notification-service.ts` |
| DES-128 | buildDigest returns null rather than an empty bundle, and null means two different things | `design/service-digest-and-email.md` | `src/server/services/digest-service.ts` |
| DES-129 | The digest window is bounded on both ends, and only notifications created inside it are included | `design/service-digest-and-email.md` | `src/server/services/digest-service.ts` |
| DES-130 | listDigestRecipients and notification preference digestOnly are the same underlying data, viewed twice | `design/service-digest-and-email.md` | `src/server/services/digest-service.ts` |
| DES-131 | renderDigest degrades gracefully when a bundle's first entry has no title, and never handles more than the headline itself | `design/service-digest-and-email.md` | `src/server/services/digest-service.ts` |
| DES-132 | sendEmail performs no network egress; delivery is a structured log write | `design/service-digest-and-email.md` | `src/server/services/email-service.ts` |
| DES-133 | renderEmail derives plain text from HTML rather than writing both by hand, so the two can never drift | `design/service-digest-and-email.md` | `src/server/services/email-service.ts` |
| DES-134 | renderBody escapes every value, closing the one XSS surface this renderer has | `design/service-digest-and-email.md` | `src/server/services/email-service.ts` |
| DES-135 | billing-service is the canonical quota reader, but most write paths bypass it and call wouldExceedLimit directly | `design/service-billing-and-usage.md` | `src/server/services/billing-service.ts` |
| DES-136 | Downgrades are checked against every summary resource before the plan row changes, using the target plan's limits | `design/service-billing-and-usage.md` | `src/server/services/billing-service.ts` |
| DES-137 | assertWithinLimit is the only quota function that emits an event, and it emits before throwing | `design/service-billing-and-usage.md` | `src/server/services/billing-service.ts` |
| DES-138 | recomputeUsage fires a warning event at ninety percent of quota, independent of any single write | `design/service-billing-and-usage.md` | `src/server/services/usage-service.ts` |
| DES-139 | getUsage is a cache read with no authorization beyond tenant scope, and it is what checkLimit ultimately reads | `design/service-billing-and-usage.md` | `src/server/services/usage-service.ts` |
| DES-140 | Usage listeners apply signed deltas per event, keeping the counter incremental rather than always recomputing | `design/service-billing-and-usage.md` | `src/server/services/usage-service.ts` |
| DES-141 | Storage and API-request dimensions are asymmetric: one is tracked, the other is a stub | `design/service-billing-and-usage.md` | `src/server/services/billing-service.ts` |
| DES-142 | Role changes are checked twice: once by can(), once by a rank comparison the matrix cannot express | `design/service-member-and-invitation.md` | `src/server/services/member-service.ts` |
| DES-143 | Member removal is a soft delete subject to the same ownership invariant as a demotion | `design/service-member-and-invitation.md` | `src/server/services/member-service.ts` |
| DES-144 | assertLastOwnerRetained scans up to one hundred owners and treats a demotion and a removal identically | `design/service-member-and-invitation.md` | `src/server/services/member-service.ts` |
| DES-145 | resolveActor is the sole place an Actor is minted from stored membership state, and it treats non-active status as absence | `design/service-member-and-invitation.md` | `src/server/services/member-service.ts` |
| DES-146 | Invite issuance checks the seat quota once for the whole batch, using pending invitations as provisional seats | `design/service-member-and-invitation.md` | `src/server/services/invitation-service.ts` |
| DES-147 | The invite rate limit is charged by batch size, and acceptance is the one function in the corpus with no Actor at all | `design/service-member-and-invitation.md` | `src/server/services/invitation-service.ts` |
| DES-148 | resendInvitation revokes and reissues rather than mutating the existing row, and silently downgrades an owner-role resend | `design/service-member-and-invitation.md` | `src/server/services/invitation-service.ts` |
| DES-149 | createOrganization takes no Actor and seeds a membership and subscription, but not a project | `design/service-organization.md` | `src/server/services/organization-service.ts` |
| DES-150 | Org creation emits member.joined, never an organization.created event, because the event map has no such key | `design/service-organization.md` | `src/server/services/organization-service.ts` |
| DES-151 | updateOrganization records to the audit log directly rather than through emit, because there is no matching event key either | `design/service-organization.md` | `src/server/services/organization-service.ts` |
| DES-152 | Deletion requires the caller to retype the org's own slug as a typed confirmation, and it is a soft delete | `design/service-organization.md` | `src/server/services/organization-service.ts` |
| DES-153 | getOrganizationSummary and listOrganizationsForUser have deliberately different authorization shapes | `design/service-organization.md` | `src/server/services/organization-service.ts` |
| DES-154 | search() authorizes at issue:read regardless of what subject kind matched, and gates field-scoped syntax on a plan flag | `design/service-search.md` | `src/server/services/search-service.ts` |
| DES-155 | Rate limiting runs before the flag check, so a throttled caller never learns whether their plan includes advanced search | `design/service-search.md` | `src/server/services/search-service.ts` |
| DES-156 | Result composition happens after the repository call, deriving title and snippet from stored content rather than the original row | `design/service-search.md` | `src/server/services/search-service.ts` |
| DES-157 | Indexing functions are content-shape adapters, and they encode different subjectId-to-projectId conventions per kind | `design/service-search.md` | `src/server/services/search-service.ts` |
| DES-158 | Every write-time listener re-reads the row rather than trusting the event payload | `design/service-search.md` | `src/server/services/search-service.ts` |
| DES-159 | Endpoint creation is gated twice, and the secret is minted once and never regenerated | `design/service-webhook.md` | `src/server/services/webhook-service.ts` |
| DES-160 | signPayload is a pure HMAC wrapper, and the exact byte sequence signed is the serialized JSON string, not the object | `design/service-webhook.md` | `src/server/services/webhook-service.ts` |
| DES-161 | Endpoint management authorizes the same webhook:manage action whether or not a specific endpoint id is targeted | `design/service-webhook.md` | `src/server/services/webhook-service.ts` |
| DES-162 | enqueueForOrg fans one event out to every endpoint subscribed to that event type, filtering disabled endpoints first | `design/service-webhook.md` | `src/server/services/webhook-service.ts` |
| DES-163 | The delivery bridge has no register* symmetry with notification-service, and this is the opposite asymmetry from DES-125 | `design/service-webhook.md` | `src/server/services/webhook-service.ts` |
| DES-164 | auth-service declares it must call emit but cannot, because TaskflowEventMap has no authentication events | `design/service-auth-and-session.md` | `src/server/services/auth-service.ts` |
| DES-165 | Login charges the rate-limit bucket before checking the password, so both failure modes are throttled identically | `design/service-auth-and-session.md` | `src/server/services/auth-service.ts` |
| DES-166 | Registration is one call that creates a user, a workspace, and its owner membership, with no intermediate state | `design/service-auth-and-session.md` | `src/server/services/auth-service.ts` |
| DES-167 | Password reset resolves identically whether or not the email is known, and stores only the token's hash | `design/service-auth-and-session.md` | `src/server/services/auth-service.ts` |
| DES-168 | Session tokens are hashed at rest, and resolveSession never distinguishes an expired session from a nonexistent one | `design/service-auth-and-session.md` | `src/server/services/session-service.ts` |
| DES-169 | resolveActorForOrg re-asserts scope on an Actor it just built from the same org, and this redundancy is intentional | `design/service-auth-and-session.md` | `src/server/services/session-service.ts` |
| DES-170 | record() takes no Actor because the writer is usually an event handler, not a request | `design/service-activity-and-attachment.md` | `src/server/services/activity-service.ts` |
| DES-171 | listActivity and exportActivity both filter by a time range and a fixed page size, but only exportActivity is plan-gated | `design/service-activity-and-attachment.md` | `src/server/services/activity-service.ts` |
| DES-172 | groupByDay is a pure, in-memory reshape with no query behind it, and it sorts newest day first | `design/service-activity-and-attachment.md` | `src/server/services/activity-service.ts` |
| DES-173 | Nine event types feed the audit log, each with its own hand-written summary string, and none of them retry on failure | `design/service-activity-and-attachment.md` | `src/server/services/activity-service.ts` |
| DES-174 | Attachment quota accounting rounds up to whole megabytes, and the delete path has to search for the attachment it wants to remove | `design/service-activity-and-attachment.md` | `src/server/services/attachment-service.ts` |
| DES-175 | buildFlagContext accepts two independently nullable inputs so an unauthenticated caller can still ask about a flag | `design/service-feature-flag-and-support.md` | `src/server/services/feature-flag-service.ts` |
| DES-176 | getSnapshot is what the client receives instead of the registry, closing off a class of flag-tampering the client could otherwise attempt | `design/service-feature-flag-and-support.md` | `src/server/services/feature-flag-service.ts` |
| DES-177 | toggleFlag checks overridability against the registry, not against role rank, and the emitted event re-evaluates rather than trusting the input | `design/service-feature-flag-and-support.md` | `src/server/services/feature-flag-service.ts` |
| DES-178 | event-registry is idempotent by a single module-level flag, and its own doc comment states exactly why that matters | `design/service-feature-flag-and-support.md` | `src/server/services/event-registry.ts` |
| DES-179 | The digest-to-job bridge is the one piece of wiring that belongs to no single service, kept here specifically to avoid a layering violation | `design/service-feature-flag-and-support.md` | `src/server/services/event-registry.ts` |
| DES-180 | Issue filtering composes one predicate list, not a chain of branches | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-181 | Relation counts are grouped, not looped, to avoid N+1 | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-182 | Board columns are grouped in application code from one query | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-183 | Issue number allocation is a read-then-write race, mitigated but not eliminated | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-184 | Status transitions maintain `startedAt`/`completedAt` as a side effect, not a separate write | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-185 | Project archival cascades into issues through a bulk soft delete | `design/repository-issue-and-comment.md` | `src/server/repositories/issue-repository.ts` |
| DES-186 | Comment threads keep archived replies so a reply chain never loses its anchor | `design/repository-issue-and-comment.md` | `src/server/repositories/comment-repository.ts` |
| DES-187 | Attachment storage totals feed the plan's `storageMb` quota | `design/repository-issue-and-comment.md` | `src/server/repositories/attachment-repository.ts` |
| DES-188 | Listing normalizes the archive scope before both the count and the rows query | `design/repository-project-and-label.md` | `src/server/repositories/project-repository.ts` |
| DES-189 | `getProjectStats` shares one predicate across four counters | `design/repository-project-and-label.md` | `src/server/repositories/project-repository.ts` |
| DES-190 | Slug uniqueness scans include archived rows so a restore never collides | `design/repository-project-and-label.md` | `src/server/repositories/project-repository.ts` |
| DES-191 | Label deletion cascades into the join table inside the same repository call | `design/repository-project-and-label.md` | `src/server/repositories/label-repository.ts` |
| DES-192 | `listLabelsForIssues` is the batched read every list view relies on | `design/repository-project-and-label.md` | `src/server/repositories/label-repository.ts` |
| DES-193 | Project membership writes are idempotent, not upserts with a conflict target | `design/repository-project-and-label.md` | `src/server/repositories/project-member-repository.ts` |
| DES-194 | Slug de-duplication for organizations lives in the repository to win the race, not just for symmetry with projects | `design/repository-organization-and-member.md` | `src/server/repositories/organization-repository.ts` |
| DES-195 | `listOrgsForUser` filters both sides of the join independently | `design/repository-organization-and-member.md` | `src/server/repositories/organization-repository.ts` |
| DES-196 | Live-member scope is fixed once, not threaded per call site | `design/repository-organization-and-member.md` | `src/server/repositories/member-repository.ts` |
| DES-197 | Removing a member is a soft delete that also demotes `status` | `design/repository-organization-and-member.md` | `src/server/repositories/member-repository.ts` |
| DES-198 | `findInvitationByTokenHash` is the one deliberately unscoped repository read | `design/repository-organization-and-member.md` | `src/server/repositories/invitation-repository.ts` |
| DES-199 | The user repository is not tenant-scoped, and the password hash is narrowly gated | `design/repository-organization-and-member.md` | `src/server/repositories/user-repository.ts` |
| DES-200 | Notification fan-out always inserts through the batch path | `design/repository-notification-and-activity.md` | `src/server/repositories/notification-repository.ts` |
| DES-201 | `countUnread` is a single indexed count, not a length of a fetched list | `design/repository-notification-and-activity.md` | `src/server/repositories/notification-repository.ts` |
| DES-202 | Preference absence means "use the default channel set," not "everything off" | `design/repository-notification-and-activity.md` | `src/server/repositories/notification-preference-repository.ts` |
| DES-203 | Preference writes use a composite-key upsert, not read-then-branch | `design/repository-notification-and-activity.md` | `src/server/repositories/notification-preference-repository.ts` |
| DES-204 | Activity rows are insert-only; the repository exposes no update function | `design/repository-notification-and-activity.md` | `src/server/repositories/activity-repository.ts` |
| DES-205 | `purgeActivityBefore` is the only sanctioned deletion, driven by the plan's `retentionDays` | `design/repository-notification-and-activity.md` | `src/server/repositories/activity-repository.ts` |
| DES-206 | New organizations start on a trial subscription, never directly on an active plan | `design/repository-billing-and-usage.md` | `src/server/repositories/subscription-repository.ts` |
| DES-207 | A plan change is an unconditional exit from trialing, never a re-entry | `design/repository-billing-and-usage.md` | `src/server/repositories/subscription-repository.ts` |
| DES-208 | Usage counters are lazily materialized, not assumed to exist | `design/repository-billing-and-usage.md` | `src/server/repositories/usage-repository.ts` |
| DES-209 | `recomputeUsage` recounts from source tables and never trusts the cached row | `design/repository-billing-and-usage.md` | `src/server/repositories/usage-repository.ts` |
| DES-210 | `incrementUsage` is a cheap delta so a quota check right after a create sees fresh numbers | `design/repository-billing-and-usage.md` | `src/server/repositories/usage-repository.ts` |
| DES-211 | `listTrialsEndingBefore` is cross-tenant by necessity and feeds a scheduled sweep | `design/repository-billing-and-usage.md` | `src/server/repositories/subscription-repository.ts` |
| DES-212 | Search documents are upserted by subject identity, not by row id | `design/repository-search-webhook-session.md` | `src/server/repositories/search-repository.ts` |
| DES-213 | Search matching is a deliberately simple substring scan | `design/repository-search-webhook-session.md` | `src/server/repositories/search-repository.ts` |
| DES-214 | Webhook endpoint deletion cascades its own delivery history in the same call | `design/repository-search-webhook-session.md` | `src/server/repositories/webhook-repository.ts` |
| DES-215 | Claiming pending deliveries is cross-tenant and bumps the attempt counter on claim, not on completion | `design/repository-search-webhook-session.md` | `src/server/repositories/webhook-repository.ts` |
| DES-216 | Sessions are global rows; `activeOrgId` is what lets one cookie move between organizations | `design/repository-search-webhook-session.md` | `src/server/repositories/session-repository.ts` |
| DES-217 | An expired session resolves to absent, not to a re-checked row | `design/repository-search-webhook-session.md` | `src/server/repositories/session-repository.ts` |
| DES-218 | `base-repository.ts` is the only sanctioned way to express tenancy and archive scope | `design/repository-search-webhook-session.md` | `src/server/repositories/base-repository.ts` |
| DES-219 | Rate limiting is in-process token-bucket state, not a persisted repository | `design/repository-search-webhook-session.md` | `src/lib/rate-limit.ts` |
| DES-220 | `withAction` is the single funnel for validate, authenticate, translate, revalidate | `design/action-wrapper-and-errors.md` | `src/actions/_lib/with-action.ts` |
| DES-221 | Actor resolution prefers the payload's own org identity over the session default | `design/action-wrapper-and-errors.md` | `src/actions/_lib/with-action.ts` |
| DES-222 | Action-layer error classes mirror service-layer domain errors under one closed `ErrorCode` union | `design/action-wrapper-and-errors.md` | `src/actions/_lib/action-errors.ts` |
| DES-223 | `stamp()` attaches `submittedAt` so `useActionState` can distinguish two results | `design/action-wrapper-and-errors.md` | `src/actions/_lib/with-action.ts` |
| DES-224 | Placeholder branded ids let create-time permission checks reuse the same `PermissionResource` shape | `design/action-wrapper-and-errors.md` | `src/actions/_lib/permission-resources.ts` |
| DES-225 | `ANONYMOUS_ORG_ID` and the deliberate layering exceptions this action layer accepts | `design/action-wrapper-and-errors.md` | `src/actions/_lib/permission-resources.ts`, `src/actions/profile/update-profile.ts` |
| DES-226 | `archive-issue` re-fetches the current row before deciding anything | `design/action-issues.md` | `src/actions/issues/archive-issue.ts` |
| DES-227 | `assign-issue` checks permission with a pending project id, then delegates the real assignment logic to the service | `design/action-issues.md` | `src/actions/issues/assign-issue.ts` |
| DES-228 | `change-issue-status` deliberately leaves event emission to the service | `design/action-issues.md` | `src/actions/issues/change-issue-status.ts` |
| DES-229 | `create-issue`'s quota check counts archived issues, matching the project quota's own convention | `design/action-issues.md` | `src/actions/issues/create-issue.ts` |
| DES-230 | `move-issue` re-validates the `kanban_board` flag server-side against a client that only has a snapshot | `design/action-issues.md` | `src/actions/issues/move-issue.ts` |
| DES-231 | `update-issue` is a partial patch; only fields present in the parsed input reach the repository | `design/action-issues.md` | `src/actions/issues/update-issue.ts` |
| DES-232 | `archive-project` defaults `archiveIssues` to true because leaving live issues under an archived project is the state that corrupts every count | `design/action-projects-and-labels.md` | `src/actions/projects/archive-project.ts` |
| DES-233 | `create-project`'s quota check counts archived projects, deliberately, so a restore is never blocked by the same limit it would breach | `design/action-projects-and-labels.md` | `src/actions/projects/create-project.ts` |
| DES-234 | `restore-project` has no dedicated schema and verifies its own postcondition against `restorePatch()` | `design/action-projects-and-labels.md` | `src/actions/projects/restore-project.ts` |
| DES-235 | `update-project` judges the `visibility` permission against what the project is becoming, not what it was | `design/action-projects-and-labels.md` | `src/actions/projects/update-project.ts` |
| DES-236 | Labels are checked against `org:update`, not a label-specific permission action | `design/action-projects-and-labels.md` | `src/actions/labels/create-label.ts` |
| DES-237 | `delete-label` is a hard delete that must prune the join table, unlike every issue-adjacent soft delete | `design/action-projects-and-labels.md` | `src/actions/labels/delete-label.ts` |
| DES-238 | `create-comment` charges the rate-limit bucket only after the permission check succeeds | `design/action-comments-and-notifications.md` | `src/actions/comments/create-comment.ts` |
| DES-239 | `update-comment`'s action-layer check is optimistic; the service repeats it against the persisted `authorId` | `design/action-comments-and-notifications.md` | `src/actions/comments/update-comment.ts` |
| DES-240 | `delete-comment` is a soft delete so reply chains keep their parent | `design/action-comments-and-notifications.md` | `src/actions/comments/delete-comment.ts` |
| DES-241 | `mark-read` relies on the ownership escalation inside `can()`, not on an explicit ownership check in this file | `design/action-comments-and-notifications.md` | `src/actions/notifications/mark-read.ts` |
| DES-242 | `mark-all-read` returns a count so the bell badge updates without a second round trip | `design/action-comments-and-notifications.md` | `src/actions/notifications/mark-all-read.ts` |
| DES-243 | `update-preferences` gates `digestOnly` on `digest_email` so a preference can never point at a channel that never fires | `design/action-comments-and-notifications.md` | `src/actions/notifications/update-preferences.ts` |
| DES-244 | `accept-invitation` runs with no `Actor`; the seat quota is re-checked only after the membership write | `design/action-members-billing-and-flags.md` | `src/actions/members/accept-invitation.ts` |
| DES-245 | `invite-member` counts pending invitations against seats before the invite is even sent | `design/action-members-billing-and-flags.md` | `src/actions/members/invite-member.ts` |
| DES-246 | `update-member-role` enforces two independent guards that are easy to get wrong | `design/action-members-billing-and-flags.md` | `src/actions/members/update-member-role.ts` |
| DES-247 | `remove-member` preserves authored content by soft-deleting only the membership row | `design/action-members-billing-and-flags.md` | `src/actions/members/remove-member.ts` |
| DES-248 | `change-plan` checks the target plan's limits against current usage before the switch, not after | `design/action-members-billing-and-flags.md` | `src/actions/billing/change-plan.ts` |
| DES-249 | `update-seats` is bounded in both directions, unlike a quota check that only guards against exceeding a ceiling | `design/action-members-billing-and-flags.md` | `src/actions/billing/update-seats.ts` |
| DES-250 | `toggle-flag` is a no-op whenever the override would not change the evaluated result | `design/action-members-billing-and-flags.md` | `src/actions/flags/toggle-flag.ts` |
| DES-251 | Organization actions split cleanly by whether an `Actor` can exist yet | `design/action-members-billing-and-flags.md` | `src/actions/organizations/create-organization.ts` |
| DES-252 | Login and password reset run before any tenant is known, and both charge the anonymous bucket | `design/action-auth-profile-search-webhooks.md` | `src/actions/auth/login.ts` |
| DES-253 | `register` performs three writes as one service call; the action only turns the result into a session | `design/action-auth-profile-search-webhooks.md` | `src/actions/auth/register.ts` |
| DES-254 | `logout` treats "already signed out" as success, not as an error condition | `design/action-auth-profile-search-webhooks.md` | `src/actions/auth/logout.ts` |
| DES-255 | `update-profile` is the action layer's one documented bypass of the service layer entirely | `design/action-auth-profile-search-webhooks.md` | `src/actions/profile/update-profile.ts` |
| DES-256 | `search` narrows requested kinds rather than rejecting the whole query when `advanced_search` is off | `design/action-auth-profile-search-webhooks.md` | `src/actions/search/search.ts` |
| DES-257 | `create-webhook` checks a plan-derived flag and a numeric quota independently, because an override can force one without the other | `design/action-auth-profile-search-webhooks.md` | `src/actions/webhooks/create-webhook.ts` |
| DES-258 | `delete-webhook` is deliberately not flag-gated, so a downgraded org can still clean up | `design/action-auth-profile-search-webhooks.md` | `src/actions/webhooks/delete-webhook.ts` |
| DES-259 | `AuthService` cannot emit domain events, because `TaskflowEventMap` defines none for auth | `design/action-auth-profile-search-webhooks.md` | `src/server/services/auth-service.ts`, `src/types/event.ts` |

## Gaps

### Requirements with no design element

These requirements are stated but no design element declares that it satisfies them. In most
cases the behaviour is real and implemented — the gap is documentary, and closing it means
adding a `Satisfies` line to an existing design element rather than writing new code. They
are listed so that the omission is a known quantity rather than a surprise during a review.

| REQ | Requirement | Owning document |
|---|---|---|
| REQ-005 | Organization settings carry per-org feature flag overrides | `requirements/organizations.md` |
| REQ-012 | Organization timezone drives digest and due-date windows | `requirements/organizations.md` |
| REQ-040 | A project belongs to exactly one organization | `requirements/projects.md` |
| REQ-048 | Project deletion is permanent and owner-only | `requirements/projects.md` |
| REQ-049 | A project may nominate a lead | `requirements/projects.md` |
| REQ-051 | Project membership narrows notification fan-out | `requirements/projects.md` |
| REQ-063 | Issue priority is a closed vocabulary | `requirements/issues.md` |
| REQ-069 | Issues may carry a due date | `requirements/issues.md` |
| REQ-073 | Issue deletion requires admin | `requirements/issues.md` |
| REQ-076 | Moving an issue between projects renumbers it | `requirements/issues.md` |
| REQ-091 | Comment bodies are Markdown with a restricted subset | `requirements/comments-and-mentions.md` |
| REQ-131 | Four plans form an ordered ladder | `requirements/billing-and-plan-limits.md` |
| REQ-143 | Invoices are generated per billing period | `requirements/billing-and-plan-limits.md` |
| REQ-171 | The search index is scoped by organization | `requirements/search.md` |
| REQ-187 | Four evaluation strategies are supported | `requirements/feature-flags.md` |
| REQ-189 | Percentage rollout is deterministic per organization | `requirements/feature-flags.md` |
| REQ-195 | Flag keys are a closed union | `requirements/feature-flags.md` |
| REQ-205 | The session cookie is httpOnly and same-site lax | `requirements/auth-and-sessions.md` |
| REQ-206 | Only one module reads or writes the session cookie | `requirements/auth-and-sessions.md` |
| REQ-226 | The activity feed is gated by a feature flag | `requirements/audit-and-activity.md` |

### Requirements with no automated test

The suite is deliberately heavier on the library and service layers than on the routes, so
several requirements — particularly the navigational and presentational ones — are covered
only by the smoke run. The test plan proposes what to add and in what order; this list is the
raw input to that discussion.

| REQ | Requirement | Owning document |
|---|---|---|
| REQ-001 | An organization is the top-level tenant boundary | `requirements/organizations.md` |
| REQ-003 | Creating an organization makes the creator its owner | `requirements/organizations.md` |
| REQ-006 | An organization always has exactly one owner of record | `requirements/organizations.md` |
| REQ-008 | Organization summary reports usage against plan quotas | `requirements/organizations.md` |
| REQ-009 | Switching between organizations is explicit, never implicit | `requirements/organizations.md` |
| REQ-013 | Organization labels are shared across all its projects | `requirements/organizations.md` |
| REQ-014 | Organization onboarding seeds a first project | `requirements/organizations.md` |
| REQ-049 | A project may nominate a lead | `requirements/projects.md` |
| REQ-051 | Project membership narrows notification fan-out | `requirements/projects.md` |
| REQ-054 | Project settings expose per-project defaults | `requirements/projects.md` |
| REQ-074 | Issues carry organization labels | `requirements/issues.md` |
| REQ-075 | Issue attachments are counted against the storage quota | `requirements/issues.md` |
| REQ-142 | Trials expire on a schedule and fall back to free | `requirements/billing-and-plan-limits.md` |
| REQ-143 | Invoices are generated per billing period | `requirements/billing-and-plan-limits.md` |
| REQ-144 | Usage is rolled up on a schedule for the billing screen | `requirements/billing-and-plan-limits.md` |
| REQ-150 | Webhook endpoints are configured per organization | `requirements/webhooks.md` |
| REQ-153 | Each endpoint holds a secret used to sign payloads | `requirements/webhooks.md` |
| REQ-159 | Delivery attempts are visible in the settings UI | `requirements/webhooks.md` |
| REQ-180 | A scheduled job can rebuild the index | `requirements/search.md` |
| REQ-202 | Login issues an opaque session token | `requirements/auth-and-sessions.md` |
| REQ-204 | Sessions expire after a fixed lifetime | `requirements/auth-and-sessions.md` |
| REQ-205 | The session cookie is httpOnly and same-site lax | `requirements/auth-and-sessions.md` |
| REQ-206 | Only one module reads or writes the session cookie | `requirements/auth-and-sessions.md` |
| REQ-207 | Logout destroys the session server-side | `requirements/auth-and-sessions.md` |
| REQ-210 | An actor is resolved per organization, not globally | `requirements/auth-and-sessions.md` |
| REQ-211 | Unauthenticated dashboard requests redirect to login | `requirements/auth-and-sessions.md` |
| REQ-213 | A user may belong to several organizations | `requirements/auth-and-sessions.md` |
| REQ-231 | Cleanup removes activity beyond the retention window | `requirements/audit-and-activity.md` |

## Counts

| measure | value |
|---|---|
| requirements defined | 168 |
| design elements defined | 228 |
| requirements with at least one design element | 148 |
| requirements with at least one named test file | 140 |
| design elements with at least one code path | 214 |

Regenerate the id and path integrity check with `pnpm docs:check` from the repository root.

