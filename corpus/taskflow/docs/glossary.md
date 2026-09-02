---
title: Taskflow glossary
id: GLOSSARY
status: approved
owners: [platform-team, product-team]
last_updated: 2026-08-19
related: [REQ-001, REQ-010, DES-030, DES-040, ADR-003, ADR-006]
---

# Glossary

Taskflow has accumulated the usual layer of in-house vocabulary, and the same word does not
always mean the same thing to product, to the API and to the database. This page is the
tie-breaker. Where a term has a single implementation, that implementation is named; where
a term is deliberately ambiguous in conversation, the entry says so.

Terms are grouped by the part of the system they belong to rather than alphabetically,
because most confusion in review comes from mixing layers, not from mixing letters.

---

## Tenancy and identity

**Organization** — the top-level tenant. Everything except the `users` table hangs off an
organization, and every tenant-scoped table carries an `org_id` column. An organization owns
projects, issues, labels, webhooks, a subscription and a settings blob. Defined by REQ-001;
the invariant that every tenant row carries `org_id` is REQ-010 and ADR-006. In URLs an
organization appears as its slug, e.g. `/northwind/projects`.

**Org slug** — the globally unique, URL-safe short name of an organization (REQ-002).
Produced by `slugify()` and `uniqueSlug()` in `src/lib/slug.ts`. Slugs are unique across the
whole system, unlike project slugs, which are unique only within an organization (REQ-041).

**Tenant boundary** — the line the code must never allow data to cross. Enforced in two
places: `assertOrgScope()` in `src/lib/tenant.ts`, which throws `TenantScopeError` when an
actor's `orgId` does not match the resource's, and the first branch of `explain()` in
`src/lib/permissions.ts`, which returns the `denied_cross_tenant` decision before any role
is considered. See DES-030 and DES-040.

**Actor** — the authenticated principal *as scoped to one organization*. An `Actor` carries
`userId`, `orgId`, `role` and `isPlatformStaff`. It is not the same thing as a user: the
same person acting in two organizations is two actors with potentially different roles
(REQ-210, REQ-213). Built by `src/lib/actor.ts`; services receive it as their first argument
and never resolve it themselves.

**User** — the account, global across organizations, living in the `users` table. A user has
an email, a display name and a password hash. Users are not tenant-scoped; memberships are.

**Member** — the row joining a user to an organization with a role. Membership, not the user
record, is what a permission check reads.

**Platform staff** — an internal support flag on the actor (`isPlatformStaff`). It bypasses
the role matrix but **not** the tenant boundary: staff still cannot read an organization they
are not acting within, because the cross-tenant check runs first. Decision reason
`granted_by_staff` (REQ-027).

**Session principal** — the minimal identity carried in a session: enough to render the app
shell and resolve an actor for a chosen organization, no more. Distinct from `Actor`.

---

## Authorization

**Role** — one of `owner`, `admin`, `member`, `viewer`, in that rank order. Ranks come from
`ROLE_RANK` in `src/types/member.ts`. Roles are compared by rank, never by string equality;
`role === "admin"` in application code is a review defect (ADR-003).

**Permission action** — a member of the closed union `PermissionAction`, written
`resource:verb`, for example `issue:archive` or `org:manage_billing`. The union is the
vocabulary; there is no free-text permission anywhere.

**Role matrix** — `ROLE_MATRIX` in `src/lib/permissions.ts`, mapping each permission action
to the *minimum* role that may perform it before ownership escalations. It is the only table
that encodes "who may do what" (DES-040).

**Ownership escalation** — the rule that authors and assignees may act on their own content
even when their rank falls short. Applies to exactly five actions: `issue:update`,
`issue:archive`, `comment:update`, `comment:delete` and `notification:manage`. Implemented as
`OWNERSHIP_ESCALATIONS` plus `isOwnedByActor()` and evaluated *after* the role matrix, which
is why an escalation can only ever widen a decision, never narrow one (DES-041, REQ-026).

**Permission decision** — the structured result of `explain()`: `{ action, resourceKind,
allowed, reason }`. The reason is one of `denied_cross_tenant`, `granted_by_staff`,
`denied_unknown_action`, `granted_by_role`, `granted_by_ownership`, `denied_by_role`. The
settings UI renders the reason; `can()` throws it away and returns just the boolean.

**Guard clause** — the `assertCan(actor, action, resource)` call at the top of a service
function. Guard clauses live in the service layer only. Repositories never call `can()`
(ADR-013).

---

## Domain objects

**Project** — a container for issues inside one organization. Carries a slug (unique per
organization), an immutable key used as the prefix of issue identifiers (REQ-042), an
optional lead, and a visibility setting.

**Issue** — the unit of work. Belongs to exactly one project, carries a per-project number
that is allocated once and never reused (REQ-061), a status and a priority drawn from closed
unions, an optional assignee, an optional due date, and labels.

**Issue number vs issue id** — the *number* is the human-facing per-project counter shown as
`PLAT-42`; the *id* is the branded opaque `IssueId` used everywhere in code (ADR-015). URLs
use the number, foreign keys use the id. Confusing the two is the single most common review
comment on issue-related PRs.

**Comment** — Markdown prose attached to an issue. Mentions are parsed out of the body at
write time and travel on the `comment.created` event (REQ-092, REQ-095).

**Mention** — an `@handle` reference inside a comment body that resolves to a member of the
same organization. Parsed by `src/lib/mentions.ts`. A token inside a code span or a fenced
block is deliberately **not** a mention (REQ-093) — this was a bug once and is now a test.

**Label** — a named tag owned by the organization, not by a project, so the same label can be
applied across projects (REQ-013).

**Attachment** — a file associated with an issue, counted against the organization's
`storageMb` quota (REQ-075).

**Activity row** — the immutable audit record written for a domain event. The activity trail
is derived from the event bus rather than written by hand at each call site (ADR-022).

---

## Plans and quotas

**Plan** — one of `free`, `starter`, `growth`, `enterprise`, ordered by `PLAN_ORDER`. A plan
is a property of the subscription, which is a property of the organization.

**Plan limits** — the `PlanLimits` record for a plan: `seats`, `projects`,
`issuesPerProject`, `storageMb`, `apiRequestsPerHour`, `webhooks`, `retentionDays`,
`includedFlags`, `priceCentsPerSeatMonthly`. Declared once, in
`src/config/plan-limits.ts` (ADR-010, REQ-132).

**Limited resource** — the union of `PlanLimits` field names that are numeric quotas, used as
the second argument to `getLimit()` and `wouldExceedLimit()`. Adding a quota field means
widening this union, which is exactly the ripple ADR-010 accepts on purpose.

**UNLIMITED** — `Number.POSITIVE_INFINITY`, the sanctioned representation of "no limit"
(REQ-137). Arithmetic on it works; formatting it does not, so the UI has a dedicated branch.

**Seat** — one active member. Seats are counted from membership, not from invitations, but
an invitation is refused when accepting it *would* breach the seat quota (REQ-032, REQ-133).

**Quota breach** — the condition `used + requested > limit`, evaluated by
`wouldExceedLimit()`. It produces the `plan_limit_exceeded` error code (HTTP 402) and emits
`billing.limit_exceeded`; it never throws an unhandled error (REQ-138, REQ-139).

---

## Feature flags

**Feature flag** — a named capability that can be on or off for an organization. Keys are a
closed union (REQ-195); definitions live in `src/config/feature-flags.ts` and are read only
through `isEnabled()` in `src/lib/feature-flags.ts` (REQ-186).

**Strategy** — how a flag decides: `on` (always), `plan` (at least a given plan), `role` (at
least a given role) or `percentage` (a deterministic hash bucket). Four strategies, one
evaluator (ADR-012, REQ-187).

**Override** — a per-organization forced value stored in the organization's settings blob.
Only flags declared `overridable` accept one; `command_palette` and `webhooks` do not
(REQ-190).

**Flag snapshot** — the plain object of evaluated booleans handed to the client by
`snapshotFlags()`. The client never sees the registry or the strategies (REQ-194).

**Feature disabled** — the `FeatureDisabledError` thrown when server code reaches a gated
path with the flag off. It maps to `forbidden` at the boundary (REQ-193).

---

## Events and jobs

**Event bus** — the in-process publish/subscribe hub in `src/lib/event-bus.ts`. `emit()`
stamps the envelope and calls subscribers; `subscribe()` registers a typed handler and
returns an `Unsubscribe`. Handler failures are isolated: one bad subscriber does not fail
the emitting write (ADR-005, REQ-228).

**Event envelope** — the three fields on every payload: `orgId`, `actorId`, `occurredAt`.
The bus stamps them, so a handler can always answer "whose org, whose action, when".

**Event key** — one of the 21 keys of `TaskflowEventMap`. Adding an event means adding a key
to that map; there is no way to emit an unlisted event, which is what makes "who subscribes
to this?" answerable by reading one file.

**Subscriber registration** — the wiring that attaches service listeners to the bus at
startup, gathered in `src/server/services/event-registry.ts` rather than scattered across
module top-levels.

**Job kind** — one of `digest-email`, `overdue-issues`, `webhook-delivery`, `usage-rollup`,
`search-reindex`, `cleanup-archived`, `trial-expiry`.

**Cadence** — the minimum gap between two runs of the same job kind, in minutes, declared in
`CADENCE_MINUTES` in `src/server/jobs/scheduler.ts`. The scheduler ticks every 60 seconds and
enqueues whatever cadence says is due (ADR-016).

**Tick** — one scheduler pass: enqueue due kinds, then drain the queue. Exposed as `tick(now)`
so tests drive it with an explicit clock instead of waiting a minute.

**Delivery** — one queued attempt to send one webhook payload to one endpoint. Deliveries are
claimed in batches, retried with capped exponential backoff, and abandoned once the attempt
ceiling is passed (ADR-018, REQ-156, REQ-157).

---

## Data access

**Repository** — a module under `src/server/repositories/` that owns SQL for one table group.
Repositories filter by `orgId` and apply the archived filter; they do not check permissions
and do not emit events (ADR-013).

**Service** — a module under `src/server/services/` that owns a use case. Services take an
`Actor` first, assert permissions, enforce quotas and flags, call repositories, and emit
events. Services do not read cookies.

**Server Action** — an exported async function in a `"use server"` file under
`src/actions/`. Actions parse input with a Zod schema, resolve the actor, call a service, map
thrown domain errors to an `ActionResult`, and revalidate cache tags. The shared wrapper is
`withAction` in `src/actions/_lib/with-action.ts`.

**Soft delete** — marking a row with `archived_at` instead of removing it. Helpers:
`archivePatch()` and `shouldFilterArchived()` in `src/lib/soft-delete.ts`; re-archiving
throws `AlreadyArchivedError` (ADR-004, REQ-071).

**Archived vs deleted** — archived rows still exist, still count against quotas (REQ-044),
and can be restored. Deleted means gone, and only two things are truly deletable: an
organization (owner only) and a project (owner only).

**Keyset pagination** — cursor pagination on a sort key rather than `OFFSET`. Helpers in
`src/lib/pagination.ts`; every list endpoint returns `{ items, nextCursor, total }`
(ADR-008).

**Cache tag** — a string naming a cacheable slice, produced by helpers such as `orgTag()` and
`projectTag()` in `src/lib/cache.ts`. Revalidation goes through `revalidateTagged(tags,
profile)`, never through a bare `revalidateTag` — Next.js 16 requires a cacheLife profile
(ADR-019).

---

## Errors

**Error code** — one of the closed union used by `ActionResult` and by Route Handlers:
`unauthorized` (401), `forbidden` (403), `not_found` (404), `validation_failed` (422),
`conflict` (409), `rate_limited` (429), `plan_limit_exceeded` (402),
`tenant_scope_violation` (403), `internal_error` (500). The mapping lives in
`HTTP_STATUS_BY_CODE` in `src/lib/errors.ts`.

**Domain error** — one of the thrown classes the boundary knows how to translate faithfully:
`PermissionDeniedError`, `TenantScopeError`, `FeatureDisabledError`, `AlreadyArchivedError`,
`InvalidSlugError`, plus Zod's `ZodError`. Anything else becomes `internal_error` (ADR-014).

**ActionResult** — the discriminated union every Server Action returns: success with data, or
failure with an `AppErrorShape`. Actions never throw across the RPC boundary.

**Field errors** — the `field -> messages` map produced from a `ZodError`, consumed directly
by form components so validation messages land next to their input.

---

## Process vocabulary

**REQ / DES / ADR** — the three id namespaces. A REQ states what the product must do, a DES
states how the code does it, an ADR records why a structural choice was made and what it
cost. Each id is defined exactly once, in the document that owns it, and referenced from
everywhere else. The traceability matrix links them to code and tests.

**Rough edge** — a section heading used across the design docs for behaviour the team knows
is untidy but has decided to keep, usually with a reason. Distinct from a bug: a rough edge
is documented and deliberate.

**Layering exception** — a place where a route or an action calls a repository directly
instead of going through a service. Five such places exist and are listed in the module map;
they are tolerated, not endorsed, and each has a stated reason.
