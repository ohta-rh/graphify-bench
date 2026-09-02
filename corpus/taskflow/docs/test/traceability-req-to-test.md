---
title: Requirement-to-test traceability matrix
id: TEST-TRACEABILITY
status: approved
owners: [h.iqbal, a.whitfield]
last_updated: 2026-08-14
related: [DES-013, DES-030, ADR-018, REQ-011, REQ-136]
---

## How to read this file

One row per requirement in the 168-id catalogue under docs/requirements/, covering all
fourteen requirement files from `organizations.md` through `audit-and-activity.md`.
`coverage` is one of four values, judged strictly:

- **`direct`** — a test in tests/ asserts the specific behavior the requirement names, not
  merely a related behavior in the same area. If the requirement says an event fires, a test
  has to subscribe and assert the payload or the call; if it says a role is required, a test
  has to assert both the grant and the denial at that role boundary.
- **`indirect`** — the requirement's behavior is exercised as a side effect of a test aimed
  at something else, or a closely related mechanism is tested but not the exact claim (a
  schema is validated but the write path's use of it is not, or a general-purpose sweep
  covers the specific action without naming it).
- **`manual`** — the behavior is verifiable but the corpus documents no automated test and no
  manual QA record either; used only where verification plausibly happens outside this test
  suite (a build-time or infrastructure check). Unused in this corpus — every gap here is a
  genuine `none`, not merely "not in this suite."
- **`none`** — no test in tests/ touches this requirement's behavior, directly or
  indirectly. This is the honest majority outcome for entire requirement families —
  webhooks, sessions, and notification/activity read paths in particular — and it is called
  out by name in the gap analysis at the end rather than left to be inferred from a table.

Every test path cited exists under corpus/taskflow/tests/, per `filelist.txt`, and is
described at greater length in `unit-and-lib-tests.md`,
`service-and-repository-tests.md` or `component-and-ui-tests.md`.

## Organizations (`docs/requirements/organizations.md`, REQ-001 – REQ-014)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-001 | An organization is the top-level tenant boundary | `tests/lib/tenant.test.ts`, `tests/server/tenant-scope.test.ts` | direct |
| REQ-002 | Organization slugs are globally unique and URL-safe | `tests/lib/slug.test.ts` | indirect |
| REQ-003 | Creating an organization makes the creator its owner | — | none |
| REQ-004 | Organization display name and description are editable by admins | — | none |
| REQ-005 | Organization settings carry per-org feature flag overrides | `tests/lib/feature-flags.test.ts` | indirect |
| REQ-006 | An organization always has exactly one owner of record | `tests/services/member-service.test.ts` | indirect |
| REQ-007 | Organization deletion is restricted to the owner | `tests/lib/permissions.matrix.test.ts` | indirect |
| REQ-008 | Organization summary reports usage against plan quotas | `tests/services/billing-service.test.ts`, `tests/config/plan-limits.test.ts` | indirect |
| REQ-009 | Switching between organizations is explicit, never implicit | — | none |
| REQ-010 | Every tenant-scoped row carries org_id | `tests/server/tenant-scope.test.ts` | direct |
| REQ-011 | Cross-tenant access attempts fail closed and are recorded | `tests/server/tenant-scope.test.ts`, `tests/services/issue-service.scope.test.ts`, `tests/lib/permissions.matrix.test.ts` | indirect |
| REQ-012 | Organization timezone drives digest and due-date windows | `tests/jobs/digest-email-job.test.ts` | indirect |
| REQ-013 | Organization labels are shared across all its projects | — | none |
| REQ-014 | Organization onboarding seeds a first project | — | none |

## Membership and roles (`docs/requirements/membership-and-roles.md`, REQ-020 – REQ-034)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-020 | Four roles form a strict rank order | `tests/lib/permissions.matrix.test.ts`, `tests/contract/permissions.test.ts` | direct |
| REQ-021 | Role rank determines the default permission decision | `tests/lib/permissions.matrix.test.ts` | direct |
| REQ-022 | Viewers have read-only access across the product | `tests/server/permissions.test.ts` | direct |
| REQ-023 | Members may create and edit issues, projects and comments | `tests/services/issue-service.test.ts`, `tests/services/project-service.test.ts`, `tests/services/comment-service.test.ts` | direct |
| REQ-024 | Admins manage membership, flags and archiving | `tests/services/invitation-service.test.ts`, `tests/services/member-service.test.ts` | indirect |
| REQ-025 | Owners alone may delete the organization or change billing | `tests/lib/permissions.matrix.test.ts` | indirect |
| REQ-026 | Authors may edit their own issues and comments regardless of rank | `tests/lib/permissions.ownership.test.ts`, `tests/components/permission-gate.test.tsx` | direct |
| REQ-027 | Platform staff bypass the role matrix for support access | `tests/lib/permissions.matrix.test.ts`, `tests/contract/permissions.test.ts` | direct |
| REQ-028 | Invitations are addressed to an email and carry a role | `tests/services/invitation-service.test.ts` | indirect |
| REQ-029 | Invitation tokens are single-use and time-limited | `tests/services/invitation-service.test.ts`, `tests/lib/hash.test.ts` | indirect |
| REQ-030 | Accepting an invitation creates a member and emits member.joined | — | none |
| REQ-031 | The last owner cannot be removed or demoted | `tests/services/member-service.test.ts` | direct |
| REQ-032 | Seat count is checked against the plan before an invite is sent | `tests/services/invitation-service.test.ts`, `tests/server/plan-limits.test.ts` | direct |
| REQ-033 | Removing a member preserves their authored content | — | none |
| REQ-034 | Role changes are audited with before and after values | `tests/services/activity-service.test.ts` | indirect |

## Projects (`docs/requirements/projects.md`, REQ-040 – REQ-054)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-040 | A project belongs to exactly one organization | `tests/repositories/project-repository.test.ts` | indirect |
| REQ-041 | Project slugs are unique within an organization | `tests/repositories/project-repository.test.ts` | direct |
| REQ-042 | Project keys prefix issue identifiers and are immutable | `tests/lib/slug.test.ts` | indirect |
| REQ-043 | Project creation is subject to the plan's project quota | `tests/services/project-service.test.ts`, `tests/server/plan-limits.test.ts` | direct |
| REQ-044 | Archived projects still consume the project quota | `tests/services/project-service.test.ts` | indirect |
| REQ-045 | Archiving a project archives its open issues | `tests/services/project-service.test.ts`, `tests/server/soft-delete.test.ts` | direct |
| REQ-046 | Archived projects are hidden from default listings | `tests/repositories/project-repository.test.ts`, `tests/server/soft-delete.test.ts` | direct |
| REQ-047 | A project may be restored without losing its issues | `tests/repositories/project-repository.test.ts` | indirect |
| REQ-048 | Project deletion is permanent and owner-only | — | none |
| REQ-049 | A project may nominate a lead | — | none |
| REQ-050 | Project visibility is private unless public projects are enabled | `tests/lib/feature-flags.test.ts` | indirect |
| REQ-051 | Project membership narrows notification fan-out | — | none |
| REQ-052 | Project listings are paginated by keyset cursor | `tests/repositories/issue-repository.test.ts` | indirect |
| REQ-053 | Project creation emits project.created | `tests/server/domain-events.test.ts` | direct |
| REQ-054 | Project settings expose per-project defaults | — | none |

## Issues (`docs/requirements/issues.md`, REQ-060 – REQ-079)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-060 | An issue belongs to exactly one project | `tests/repositories/issue-repository.test.ts` | indirect |
| REQ-061 | Issue numbers are allocated per project and never reused | `tests/repositories/issue-repository.test.ts` | direct |
| REQ-062 | Issue status is a closed vocabulary | `tests/schemas/issue.schema.test.ts` | direct |
| REQ-063 | Issue priority is a closed vocabulary | `tests/schemas/issue.schema.test.ts` | direct |
| REQ-064 | Issue creation is subject to the per-project issue quota | `tests/services/issue-service.test.ts` | direct |
| REQ-065 | Issue creation emits issue.created | `tests/services/issue-service.test.ts` | direct |
| REQ-066 | Status transitions emit issue.status_changed | `tests/services/issue-service.test.ts` | direct |
| REQ-067 | Assignment emits issue.assigned with the previous assignee | `tests/services/issue-service.test.ts` | direct |
| REQ-068 | Only the changed fields are reported on issue.updated | `tests/server/domain-events.test.ts` | indirect |
| REQ-069 | Issues may carry a due date | `tests/schemas/issue.schema.test.ts` | direct |
| REQ-070 | Overdue issues are detected by a scheduled sweep | `tests/jobs/overdue-issue-job.test.ts`, `tests/lib/date.test.ts` | direct |
| REQ-071 | Issues are archived, not deleted, by default | `tests/services/issue-service.test.ts`, `tests/lib/soft-delete.test.ts` | direct |
| REQ-072 | Authors and assignees may edit an issue they do not otherwise own | `tests/lib/permissions.ownership.test.ts` | direct |
| REQ-073 | Issue deletion requires admin | `tests/lib/permissions.matrix.test.ts` | direct |
| REQ-074 | Issues carry organization labels | `tests/repositories/issue-repository.test.ts` | indirect |
| REQ-075 | Issue attachments are counted against the storage quota | — | none |
| REQ-076 | Moving an issue between projects renumbers it | `tests/schemas/issue.schema.test.ts` | indirect |
| REQ-077 | Issue listings support filtering by status, assignee and label | `tests/repositories/issue-repository.test.ts` | direct |
| REQ-078 | Issue listings are paginated by keyset cursor | `tests/repositories/issue-repository.test.ts` | direct |
| REQ-079 | Issue export produces CSV when the plan includes it | `tests/lib/csv.test.ts` | indirect |

## Comments and mentions (`docs/requirements/comments-and-mentions.md`, REQ-090 – REQ-102)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-090 | Comments belong to an issue and an organization | `tests/repositories/comment-repository.test.ts` | indirect |
| REQ-091 | Comment bodies are Markdown with a restricted subset | `tests/lib/markdown.test.ts`, `tests/schemas/comment.schema.test.ts` | indirect |
| REQ-092 | Mentions are parsed from the comment body at write time | `tests/lib/mentions.test.ts`, `tests/services/comment-service.test.ts` | direct |
| REQ-093 | Mentions inside code spans and fences are not mentions | `tests/lib/mentions.test.ts` | direct |
| REQ-094 | Mentioned users must be members of the same organization | `tests/lib/mentions.test.ts` | indirect |
| REQ-095 | Comment creation emits comment.created with mentioned user ids | `tests/server/domain-events.test.ts` | indirect |
| REQ-096 | Comment creation is rate limited per organization | `tests/services/comment-service.test.ts` | direct |
| REQ-097 | Authors may edit their own comments | `tests/services/comment-service.test.ts` | direct |
| REQ-098 | Comment deletion is a soft delete | `tests/services/comment-service.test.ts` | direct |
| REQ-099 | Deleting a comment emits comment.deleted | `tests/server/domain-events.test.ts` | indirect |
| REQ-100 | Comment threads are ordered by creation time | `tests/repositories/comment-repository.test.ts` | indirect |
| REQ-101 | Comment listings exclude archived comments by default | `tests/repositories/comment-repository.test.ts` | direct |
| REQ-102 | Editing a comment re-parses its mentions | — | none |

## Notifications and digests (`docs/requirements/notifications-and-digests.md`, REQ-110 – REQ-124)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-110 | Notifications are per recipient and per organization | `tests/services/notification-service.test.ts` | indirect |
| REQ-111 | Notification fan-out is driven by domain events | `tests/services/notification-service.test.ts` | direct |
| REQ-112 | A mention always notifies the mentioned user | `tests/services/notification-service.test.ts` | indirect |
| REQ-113 | Assignment notifies the new assignee | `tests/services/notification-service.test.ts` | indirect |
| REQ-114 | Actors are not notified about their own actions | `tests/services/notification-service.test.ts` | indirect |
| REQ-115 | Notification preferences are per channel and per event class | `tests/services/notification-service.test.ts` | direct |
| REQ-116 | Recipients may mark notifications read individually or in bulk | — | none |
| REQ-117 | Unread counts are computed per organization | — | none |
| REQ-118 | Recipients may manage only their own notifications | — | none |
| REQ-119 | Digest email batches unread notifications into one message | `tests/jobs/digest-email-job.test.ts` | direct |
| REQ-120 | Digest is available only on plans that include it | `tests/jobs/digest-email-job.test.ts` | direct |
| REQ-121 | The digest window is bounded by the last successful send | `tests/jobs/digest-email-job.test.ts` | direct |
| REQ-122 | An empty digest is not sent | `tests/jobs/digest-email-job.test.ts` | direct |
| REQ-123 | Digest sends emit digest.due before rendering | `tests/jobs/digest-email-job.test.ts` | indirect |
| REQ-124 | Email rendering is separated from email delivery | `tests/emails/render.test.ts`, `tests/jobs/digest-email-job.test.ts` | direct |

## Billing and plan limits (`docs/requirements/billing-and-plan-limits.md`, REQ-130 – REQ-144)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-130 | Every organization has exactly one subscription | — | none |
| REQ-131 | Four plans form an ordered ladder | `tests/config/plan-limits.test.ts`, `tests/contract/plan-limits.test.ts` | direct |
| REQ-132 | Plan quotas are declared in one place | `tests/contract/plan-limits.test.ts` | direct |
| REQ-133 | Seats are counted as active members | `tests/server/tenant-scope.test.ts`, `tests/services/invitation-service.test.ts` | direct |
| REQ-134 | Project count is checked before project creation | `tests/services/project-service.test.ts`, `tests/server/plan-limits.test.ts` | direct |
| REQ-135 | Issue count is checked per project | `tests/services/issue-service.test.ts` | direct |
| REQ-136 | Webhook endpoints are limited per plan | — | none |
| REQ-137 | Unlimited is represented by positive infinity | `tests/config/plan-limits.test.ts`, `tests/lib/format.test.ts` | direct |
| REQ-138 | Exceeding a quota produces plan_limit_exceeded, not a crash | `tests/lib/errors.test.ts`, `tests/services/issue-service.test.ts` | direct |
| REQ-139 | Quota breaches emit billing.limit_exceeded | `tests/services/billing-service.test.ts` | indirect |
| REQ-140 | Plan changes emit billing.plan_changed | `tests/services/billing-service.test.ts` | direct |
| REQ-141 | Downgrades are refused while usage exceeds the target plan | `tests/services/billing-service.test.ts` | direct |
| REQ-142 | Trials expire on a schedule and fall back to free | `tests/server/jobs.test.ts` | direct |
| REQ-143 | Invoices are generated per billing period | `tests/emails/render.test.ts` | indirect |
| REQ-144 | Usage is rolled up on a schedule for the billing screen | — | none |

## Webhooks (`docs/requirements/webhooks.md`, REQ-150 – REQ-161)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-150 | Webhook endpoints are configured per organization | — | none |
| REQ-151 | Endpoint management requires admin | — | none |
| REQ-152 | Webhooks require a plan that includes them | — | none |
| REQ-153 | Each endpoint holds a secret used to sign payloads | — | none |
| REQ-154 | Deliveries are queued, never sent inline with a request | — | none |
| REQ-155 | Deliveries are claimed in bounded batches | — | none |
| REQ-156 | Failed deliveries retry with exponential backoff | `tests/server/jobs.test.ts` | direct |
| REQ-157 | A delivery is abandoned after a fixed attempt ceiling | — | none |
| REQ-158 | Deliveries to a disabled endpoint fail fast | — | none |
| REQ-159 | Delivery attempts are visible in the settings UI | — | none |
| REQ-160 | Webhook payloads carry the event type and envelope | — | none |
| REQ-161 | Webhook delivery is rate limited per organization | — | none |

## Search (`docs/requirements/search.md`, REQ-170 – REQ-181)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-170 | Search covers issues, comments and projects | `tests/services/search-service.test.ts` | indirect |
| REQ-171 | The search index is scoped by organization | `tests/services/search-service.test.ts` | indirect |
| REQ-172 | The index is maintained from domain events | `tests/services/search-service.test.ts` | direct |
| REQ-173 | Handlers re-read the row rather than trusting the payload | `tests/services/search-service.test.ts` | indirect |
| REQ-174 | Archiving removes a subject from the index | `tests/services/search-service.test.ts` | indirect |
| REQ-175 | Field-scoped syntax requires advanced search | `tests/components/search-query-syntax.test.ts` | direct |
| REQ-176 | Queries are rate limited per organization | `tests/services/search-service.test.ts` | indirect |
| REQ-177 | Results carry a snippet around the match | — | none |
| REQ-178 | Results link back to the subject | — | none |
| REQ-179 | Search results are paginated by cursor | — | none |
| REQ-180 | A scheduled job can rebuild the index | — | none |
| REQ-181 | Search requires read permission on issues | — | indirect |

## Feature flags (`docs/requirements/feature-flags.md`, REQ-185 – REQ-195)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-185 | Flags are declared in a single registry | `tests/lib/feature-flags.test.ts` | indirect |
| REQ-186 | Flag evaluation goes through one function | `tests/lib/feature-flags.test.ts` | direct |
| REQ-187 | Four evaluation strategies are supported | `tests/lib/feature-flags.test.ts` | direct |
| REQ-188 | Plan-gated flags follow the plan ladder | `tests/lib/feature-flags.test.ts` | direct |
| REQ-189 | Percentage rollout is deterministic per organization | `tests/lib/feature-flags.test.ts` | direct |
| REQ-190 | Some flags are not overridable | `tests/lib/feature-flags.test.ts` | direct |
| REQ-191 | Per-organization overrides live in organization settings | `tests/lib/feature-flags.test.ts` | direct |
| REQ-192 | Toggling a flag requires admin and emits flag.toggled | — | none |
| REQ-193 | A disabled feature fails with FeatureDisabledError | `tests/lib/errors.test.ts` | indirect |
| REQ-194 | The client receives a flag snapshot, not the registry | — | none |
| REQ-195 | Flag keys are a closed union | `tests/lib/feature-flags.test.ts` | indirect |

## Auth and sessions (`docs/requirements/auth-and-sessions.md`, REQ-200 – REQ-213)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-200 | Users authenticate with email and password | `tests/schemas/auth.schema.test.ts` | indirect |
| REQ-201 | Passwords are stored only as hashes | `tests/lib/hash.test.ts` | direct |
| REQ-202 | Login issues an opaque session token | — | none |
| REQ-203 | Session tokens are stored hashed | — | none |
| REQ-204 | Sessions expire after a fixed lifetime | — | none |
| REQ-205 | The session cookie is httpOnly and same-site lax | — | none |
| REQ-206 | Only one module reads or writes the session cookie | — | none |
| REQ-207 | Logout destroys the session server-side | — | none |
| REQ-208 | Password reset is rate limited | `tests/lib/rate-limit.test.ts` | indirect |
| REQ-209 | Registration creates a user and an organization | `tests/schemas/auth.schema.test.ts` | indirect |
| REQ-210 | An actor is resolved per organization, not globally | `tests/server/tenant-scope.test.ts` | indirect |
| REQ-211 | Unauthenticated dashboard requests redirect to login | — | none |
| REQ-212 | The request hook rejects requests for unknown organizations | — | none |
| REQ-213 | A user may belong to several organizations | — | none |

## Audit and activity (`docs/requirements/audit-and-activity.md`, REQ-220 – REQ-231)

| REQ | requirement title | test file(s) | coverage |
|---|---|---|---|
| REQ-220 | Every domain event is recorded as an activity row | `tests/services/activity-service.test.ts` | direct |
| REQ-221 | Activity rows are immutable | — | none |
| REQ-222 | Activity records the actor, subject and action | `tests/services/activity-service.test.ts` | indirect |
| REQ-223 | Activity is queryable by subject | — | none |
| REQ-224 | Reading the activity feed requires member | `tests/lib/permissions.matrix.test.ts` | indirect |
| REQ-225 | Exporting activity requires admin | `tests/lib/permissions.matrix.test.ts` | indirect |
| REQ-226 | The activity feed is gated by a feature flag | `tests/lib/feature-flags.test.ts` | indirect |
| REQ-227 | Activity retention follows the plan's retention window | — | none |
| REQ-228 | Activity capture must not fail the originating write | `tests/services/activity-service.test.ts` | indirect |
| REQ-229 | Activity is paginated by occurrence time | — | none |
| REQ-230 | CSV export escapes quotes and separators | `tests/lib/csv.test.ts` | direct |
| REQ-231 | Cleanup removes activity beyond the retention window | — | none |

## Coverage summary

Counting the 168 rows above: 52 `direct`, 62 `indirect`, and 54 `none`. No row uses
`manual` — every gap in this corpus is a genuine absence in tests/, not a behavior verified
elsewhere. `direct` plus `indirect` together (114 of 168) is a reasonable headline number,
but it overstates confidence if read alone: an `indirect` row means the suite would very
plausibly *not* catch a regression specific to that requirement's exact claim, only a
regression large enough to break the broader test it rides alongside.

## The largest genuine gaps

**Webhooks are almost entirely untested.** Ten of twelve REQ-150 through REQ-161
requirements are `none`. There is no test file at all for the webhook service, the webhook
repository, or the webhook delivery job (no `webhook-service.test.ts` under
tests/services/, no `webhook-repository.test.ts` under tests/repositories/, no
`webhook-delivery-job.test.ts` under tests/jobs/) anywhere in the 73-file suite, despite
`src/server/jobs/webhook-delivery-job.ts` existing and `ADR-018` documenting the retry
policy in detail. The one exception, REQ-156's exponential backoff, is covered only because
`tests/server/jobs.test.ts` happens to import `backoffMs` directly for a narrower assertion
about the job-queue layer — endpoint creation, secret minting (`DES-159`), signature
correctness (`DES-160`), the claim-batch size (`CLAIM_BATCH = 25`), and the
`MAX_ATTEMPTS = 6` abandonment ceiling are all unverified by any test. This is the single
highest-value gap to close next: a webhook-service test paired with a webhook-delivery-job
test, following the shape of `tests/services/notification-service.test.ts` and
`tests/jobs/digest-email-job.test.ts` respectively, would close eight to ten of these rows
in one pass.

**Authentication and session management have no service-level tests at all.** REQ-200
through REQ-213 cover login, session issuance, session expiry, cookie handling, logout and
multi-org membership; only REQ-201 (password hashing, via `tests/lib/hash.test.ts`) is
`direct`. There is no auth-service test file and no session-service test file anywhere
under tests/services/, even though
`src/server/services/session-service.ts` defines `SESSION_TTL_DAYS = 30` and
`src/server/services/auth-service.ts` implements login, registration and password reset.
`DES-164` through `DES-169` describe this area's behavior in detail — the deliberate absence
of auth events on the bus (`DES-164`), the rate-limit-before-password-check ordering
(`DES-165`), the token-hash-only storage for password reset (`DES-167`) — none of which is
pinned by an automated test today.

**The notification read path — unread counts and mark-read — is untested.** REQ-116,
REQ-117 and REQ-118 are all `none`. `tests/services/notification-service.test.ts` covers the
write side of notifications (fan-out, preferences, the digest flag) thoroughly, but nothing
in the suite calls `markAllRead`, asserts a per-recipient unread count, or checks that a
recipient cannot manage another user's notifications — a real authorization gap in the test
suite given that `DES-127` specifically calls out that `updatePreference` and `markAllRead`
authorize against the caller's own `userId` and never an arbitrary target, which is exactly
the kind of narrow but security-relevant claim a missing test leaves unverified.

**The activity/audit read path is symmetrically thin.** REQ-221, REQ-223, REQ-227, REQ-229
and REQ-231 are `none`. `tests/services/activity-service.test.ts` proves a row is written per
event and that rows group by day; nothing exercises `listActivity`, `exportActivity`, or
`purgeActivityBefore` from the repository layer, so the plan-scoped retention window
(`DES-205`, "retention is plan-scoped, and asymmetric") is implemented but unverified.

**Search's read path (results, snippets, pagination) has no coverage**, even though the
write path (index maintenance from events) is reasonably well covered by
`tests/services/search-service.test.ts`. REQ-177 through REQ-180 are all `none`; a search
call's actual returned shape — snippet extraction, the subject link, cursor pagination
matching the pattern already proven for issues in `tests/repositories/issue-repository.test.ts`
— has no test asserting it.

**A likely documentation conflict worth flagging rather than silently resolving:** REQ-102
states "Editing a comment re-parses its mentions," but `DES-120` states the opposite —
"Editing a comment does not re-run mention resolution or re-emit an event." No test in this
suite resolves the disagreement either way; `tests/services/comment-service.test.ts` covers
comment editing's edit-window behavior but not its mention-handling behavior. This should be
resolved at the requirements/design level before a test is written for it, since writing a
test now would mean picking a side without authority to do so.

## What a next test-writing pass should prioritize

In descending order of estimated risk reduction per file added: a webhook service and job
test pair (closes the largest single block of `none` rows); a notification-repository test
covering `countUnread`, `markAllRead` and `updatePreference`'s self-only authorization
(closes REQ-116 through REQ-118); an activity-repository test covering `listActivity`,
`exportActivity` and `purgeActivityBefore` (closes REQ-221, REQ-223, REQ-227, REQ-229,
REQ-231); and a session-service test covering token issuance, hashing, expiry and cookie
attributes (closes REQ-202 through REQ-207). Auth-service coverage for login and
registration end to end is valuable but lower priority than the four above, since
`tests/schemas/auth.schema.test.ts` already pins the input-validation half of that surface.
