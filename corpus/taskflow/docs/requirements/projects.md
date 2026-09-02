---
title: Project requirements
id: REQ-PROJECTS
status: approved
owners: [product-team, m.lindqvist]
last_updated: 2026-04-20
related: [REQ-040, REQ-134, ADR-004, DES-040]
---

## Scope

This document defines the requirements for projects: creation, slug and key uniqueness, plan
quota enforcement, the archive/restore lifecycle and its cascade onto issues, visibility, and
pagination of project listings. It does not define issue-level behavior (`issues.md`), though
several requirements here describe the boundary between the two — most notably the archive
cascade in `REQ-045`.

## Context

A project belongs to exactly one organization and is represented by
`src/server/db/schema/projects.ts`, read and written through
`src/server/repositories/project-repository.ts`. All business logic sits in
`src/server/services/project-service.ts`, which is the only caller of
`insertProject`/`updateProject`/`archiveProject`/`restoreProject` — the known exception is
the project settings page itself
(`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/page.tsx` is not on the
brief's layering-exception list, so it goes through the service like everything else in this
domain).

Every project has both a `slug`, unique within its organization (unlike an organization slug,
which is unique globally), and a `key`, a short uppercase prefix — think `ENG` or `OPS` —
that is immutable once set and used to build human-readable issue identifiers like `ENG-142`
via `issueKey()` in `src/lib/format.ts`. The key is derived at creation time from the
project name by `projectKeyFromName` in the same slug/key namespace `uniqueSlug` occupies,
and once an issue exists under that key, changing it would silently break every previously
shared issue link, which is why `REQ-042` makes immutability a requirement rather than a
convenience.

Archiving a project is a soft delete (`ADR-004`) with a deliberate cascade: `archiveProject`
in `project-service.ts` calls `issue-repository.ts#archiveIssuesForProject`, so a project
does not sit in an archived-but-still-fully-open state where its issues keep showing up in
cross-project issue lists. Restoring a project (`restoreProject`) does not attempt the
inverse cascade automatically — restored issues are a separate, explicit action — which is
why `REQ-047` is phrased as "without losing its issues" rather than "with automatic issue
restoration": the issues survive the round trip, but their archived state is not implicitly
reversed.

Project quota enforcement is shared with the billing domain: `createProject` calls
`wouldExceedLimit(plan, 'projects', used)`, sourced from `billing-service.ts`'s reading of
`PLAN_LIMITS`, and the same quota counts archived projects (`REQ-044`) because an archived
project's data still occupies storage and still could be restored, so it would be
inconsistent to let it drop out of the count that limits how many projects an org can have.

## Open questions

1. `REQ-049` lets a project nominate a lead, but there is no dedicated permission action for
   "lead" beyond ordinary `member`/`admin` gating — whether a lead should get an ownership
   escalation analogous to issue authors (`REQ-026`) is unresolved.
2. `REQ-050`'s public-projects visibility is gated by the `public_projects` flag
   (`enterprise`-only), but there is no requirement here describing what an unauthenticated
   visitor to a public project can actually see, since Taskflow otherwise assumes every
   viewer is an authenticated member.
3. Whether `REQ-052`'s keyset pagination should expose a stable "jump to page N" affordance
   for very large project lists is a known UX gap, not a defined requirement.

### REQ-040 — A project belongs to exactly one organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-001, REQ-010, DES-001

Like every tenant-scoped entity, `projects` carries `org_id`, and every
`project-repository.ts` function takes `orgId` as its first argument. There is no concept of
a project shared between two organizations, and no project-level ACL beyond the org
membership and the project-membership narrowing described in `REQ-051`.

**Acceptance criteria**

1. `findProjectById` returns `null`, not another org's project, when the id exists but
   belongs to a different `orgId`.
2. `listProjects` never mixes rows from two organizations in one page.
3. A project's `org_id` is immutable after creation; there is no "move project to another
   org" operation.

### REQ-041 — Project slugs are unique within an organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-002, ADR-008, REQ-052

`listTakenProjectSlugs(orgId)` scopes the uniqueness check to one organization, unlike the
organization slug, which is unique globally. Two different organizations can both have a
project slugged `website`; the URL disambiguates by org slug first
(`/[orgSlug]/projects/[projectSlug]/...`).

**Acceptance criteria**

1. `uniqueSlug` for a project only considers slugs already taken within the same `orgId`.
2. Two organizations may each have a project with an identical slug.
3. `assertValidSlug` rejects the same reserved-word and character-set violations it rejects
   for organization slugs.

### REQ-042 — Project keys prefix issue identifiers and are immutable

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-061, REQ-076, DES-041

`projectKeyFromName` derives an uppercase key from the project name at creation. Once set,
no `updateProject` field allows changing `key`, because `issueKey(projectKey, issueNumber)`
in `src/lib/format.ts` is how every issue is displayed and referenced (`ENG-142`), and a key
change would orphan every link, bookmark and cross-reference already using the old prefix.

**Acceptance criteria**

1. `updateProjectSchema` does not accept a `key` field.
2. `projectKeyFromName` produces a key unique within the organization, resolving
   collisions the same way project slugs do.
3. `issueKey` output is stable for the lifetime of the issue's project.

### REQ-043 — Project creation is subject to the plan's project quota

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-134, REQ-138, ADR-010

`createProject` calls `wouldExceedLimit(plan, 'projects', used, 1)` before
`project-repository.ts#insertProject` runs. `free` allows 2 projects, `starter` 10, `growth`
100, `enterprise` unlimited (`Number.POSITIVE_INFINITY`). A request that would exceed the
quota fails with `plan_limit_exceeded` before any row is written.

**Acceptance criteria**

1. Creating a project past the plan's `projects` limit returns `plan_limit_exceeded`, not a
   generic validation error.
2. The check happens before `insertProject`, so a rejected creation leaves no orphaned row.
3. `enterprise` orgs never hit this check because `wouldExceedLimit` short-circuits on the
   `Number.POSITIVE_INFINITY` sentinel.

### REQ-044 — Archived projects still consume the project quota

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-043, REQ-046, DES-040

`countProjects(orgId, scope?)` defaults to counting archived and live projects together for
the quota check specifically — the quota-relevant call site does not pass
`ArchiveScope: 'live'`. This is a deliberate choice: an archived project can be restored at
any time, and its stored data (issues, comments, attachments) does not disappear on archive,
so letting archived projects fall out of the quota would let an org accumulate unbounded
archived-but-restorable state on a plan sized for a much smaller working set.

**Acceptance criteria**

1. The project-quota check in `billing-service.ts#checkLimit` counts archived projects.
2. An org at its project limit with several archived projects cannot create a new one
   without first permanently deleting (`REQ-048`) one of them.
3. Restoring an archived project does not double-count against the quota, since it was
   already counted while archived.

### REQ-045 — Archiving a project archives its open issues

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-071, REQ-046, DES-040

`archiveProject` in `project-service.ts` calls
`issue-repository.ts#archiveIssuesForProject(orgId, projectId)` in the same operation, so an
archived project never leaves open issues visible in cross-project issue lists or on other
members' boards. The cascade only touches issues that are not already archived; it is
idempotent with respect to already-archived issues.

**Acceptance criteria**

1. After `archiveProject` returns, `countIssues(orgId, projectId, 'live')` is 0.
2. `archiveIssuesForProject` returns the count of issues it archived, used for the
   `project.archived` event's summary.
3. Archiving a project with zero open issues succeeds without error.

**Implemented by:** `src/server/services/project-service.ts`, `src/server/repositories/issue-repository.ts`
**Verified by:** `tests/services/project-service.test.ts`

### REQ-046 — Archived projects are hidden from default listings

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-071, REQ-101, DES-001

`shouldFilterArchived(scope)` in `src/lib/soft-delete.ts` defaults `listProjects` to
`ArchiveScope: 'live'` unless the caller explicitly asks for archived rows, matching the same
pattern used for issues (`REQ-071`) and comments (`REQ-101`). This keeps every default view
— the project switcher, the dashboard, the settings project list — free of clutter from
projects nobody is actively using, while still leaving an explicit "show archived" toggle
available where it matters (project settings, the archive-restore flow).

**Acceptance criteria**

1. `listProjects` without an explicit scope excludes archived rows.
2. An explicit `ArchiveScope: 'archived'` or `'all'` request still returns archived
   projects, for the restore UI.
3. `getProject` by slug for an archived project still resolves by direct navigation, since
   hiding from listings is not the same as hiding from direct access.

### REQ-047 — A project may be restored without losing its issues

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-045, ADR-004

`restoreProject` clears the project's `archived_at` via `restorePatch()`. It does not touch
any issue row — the issues archived by `REQ-045`'s cascade remain archived until someone
restores each one individually, but their data (title, description, comments, labels,
attachments) was never deleted, only marked. "Losing its issues" here means data loss, which
soft delete structurally prevents; it does not mean the issues automatically reopen.

**Acceptance criteria**

1. `restoreProject` never issues a delete or a recreate; it only updates `archived_at`.
2. Every issue that existed before archiving still exists, with its full history, after
   restore.
3. `restoreProjectAction` requires `project:archive`'s permission scope in `can()` (the
   restore action reuses the archive-adjacent permission surface, not a separate one).

### REQ-048 — Project deletion is permanent and owner-only

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-007, REQ-025, ADR-004

Unlike `archiveProject`, there is no `deleteProject` in `project-service.ts` — permanent
project deletion in Taskflow happens only through the retention cleanup job
(`REQ-231`, `cleanup-archived-job.ts`), which purges rows archived past the plan's
`retentionDays`. There is no interactive "permanently delete this project right now" action
in the product; `project:delete`'s `owner`-minimum `ROLE_MATRIX` entry gates a capability
that exists for the retention pipeline's authorization model but is not exposed as an
Server Action today. This is flagged as a requirement because the permission entry exists
and is deliberately the strictest gate short of `org:delete`, even though the only caller of
that authority level is the scheduled job, not a person.

**Acceptance criteria**

1. `project:delete`'s `ROLE_MATRIX` minimum is `owner`.
2. No Server Action under `src/actions/projects/archive-project.ts`,
   `src/actions/projects/create-project.ts`, `src/actions/projects/restore-project.ts` or
   `src/actions/projects/update-project.ts` performs a hard delete.
3. The retention cleanup job is the only code path that permanently removes a project row.

### REQ-049 — A project may nominate a lead

- **Priority:** could
- **Status:** implemented
- **Related:** REQ-054, REQ-023

`Project` carries an optional lead reference, set through `updateProject`. The lead is
informational within the current permission model — it drives display (whose name shows as
"Lead" on the project header) and is available to `project-settings-form.tsx` — without its
own dedicated `ROLE_MATRIX` action; lead-setting is gated by the same `project:update`
minimum (`member`) as any other project metadata edit.

**Acceptance criteria**

1. `updateProject` accepts a nullable lead field; clearing the lead is a valid update.
2. The lead must be a member of the same organization (though not necessarily of the
   project, since project membership is only enforced for private projects — `REQ-051`).
3. Removing a member does not force-clear projects where they were lead; the reference
   persists for historical display, consistent with `REQ-033`.

### REQ-050 — Project visibility is private unless public projects are enabled

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-188, ADR-012

`Project` has a `visibility` field, and the `public_projects` feature flag (`enterprise`
plan minimum, overridable) is what unlocks the ability to mark a project public rather than
`private`. On plans below `enterprise`, every project is effectively private regardless of
what the field says, because `isEnabled('public_projects', ...)` is checked before the
visibility value is allowed to matter anywhere it is read.

**Acceptance criteria**

1. A `growth`-plan org cannot set a project's visibility to public.
2. `isEnabled('public_projects', ...)` gates the visibility check, not merely the settings
   UI's ability to select the option.
3. Downgrading a plan below `enterprise` does not retroactively delete public projects, but
   does stop treating them as public for access purposes (see the note under `REQ-141`).

### REQ-051 — Project membership narrows notification fan-out

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-111, DES-050

`src/server/repositories/project-member-repository.ts` holds explicit project membership
used for `private`-visibility projects. Notification fan-out (`REQ-111`) for a private
project's events is narrowed to its explicit project members rather than the whole
organization, so an admin invited into the org but not onto a sensitive private project does
not get flooded with notifications for work they cannot even open.

**Acceptance criteria**

1. `isProjectMember` gates fan-out narrowing only for `private` projects; public and
   organization-default projects fan out to the broader recipient set unaffected.
2. Adding a project member does not retroactively notify them of past events.
3. `listProjectMemberIds` is consulted before, not after, the notification payload is
   built, so a non-member never receives even a suppressed-content notification stub.

### REQ-052 — Project listings are paginated by keyset cursor

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-008, REQ-078, REQ-179

`listProjects` returns a `Page<Project>` built from a keyset cursor
(`base-repository.ts#encodeCursor`/`decodeCursor`), not an offset. `ADR-008` documents why:
offset pagination degrades on SQLite as the offset grows, and a keyset cursor stays stable
even while projects are being archived or created concurrently with someone paging through
the list.

**Acceptance criteria**

1. A project list page's `nextCursor` decodes to a valid `(id, sortValue)` pair via
   `decodeCursor`.
2. Requesting a page with an invalid or tampered cursor fails validation rather than
   silently returning page one.
3. Concurrent creation of a new project does not shift already-fetched pages' contents (no
   duplicate or skipped rows from an offset-drift bug).

### REQ-053 — Project creation emits project.created

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-014, REQ-172, DES-060

`createProject` calls `emit('project.created', ...)` after `insertProject` succeeds. This is
what the search indexer (`REQ-172`) and the activity service (`REQ-220`) both react to
without `project-service.ts` needing to know either of those concerns exists — the
event-bus pattern (`ADR-005`) is what keeps project creation's responsibility narrow.

**Acceptance criteria**

1. `project.created`'s payload extends `EventEnvelope` (`orgId`, `actorId`, `occurredAt`)
   plus the created project's id.
2. The event fires only after the database write succeeds, never before or on failure.
3. A handler error in one subscriber (for example, search indexing) does not roll back the
   project creation or prevent other subscribers (activity) from running, per the event
   bus's isolation guarantee.

### REQ-054 — Project settings expose per-project defaults

- **Priority:** could
- **Status:** implemented
- **Related:** REQ-049, REQ-062

`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/project-settings-form.tsx`
exposes the fields
`updateProject` accepts: name, description, lead, visibility (where the flag allows it) and
the archive action. These are project-level defaults distinct from organization-wide
settings (`REQ-005`) — a project cannot override which feature flags are on, only its own
metadata.

**Acceptance criteria**

1. Every field editable through `project-settings-form.tsx` round-trips through
   `updateProjectSchema` validation identically to a direct Server Action call.
2. The settings page renders the archive control only when `can(actor, 'project:archive')`
   is true.
3. Settings changes revalidate the project's cache tag (`projectTag(projectId)`) so the
   updated values appear immediately across the dashboard.
