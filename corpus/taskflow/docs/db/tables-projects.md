---
title: Projects
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-050, REQ-051, REQ-052, ADR-004, ADR-006, ADR-008, DES-PROJECTS-REPO]
---

## Purpose

This file documents `projects` and `project_members`, declared together in
`src/server/db/schema/projects.ts`. A project is Taskflow's second-level container — every
project belongs to exactly one organization (REQ-040) and every issue belongs to exactly one
project — and `project_members` is the narrower access list that, when populated, restricts
who a private project notifies and who can act on it, distinct from the org-wide membership
in `members`.

## `projects`

**Drizzle export:** `projects` in `src/server/db/schema/projects.ts`
**Soft delete:** yes (`archived_at`)
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `ProjectId` |
| `org_id` | TEXT | no | — | REQ-040's tenant boundary |
| `name` | TEXT | no | — | display name |
| `slug` | TEXT | no | — | unique within the org (not globally), REQ-041 |
| `key` | TEXT | no | — | short prefix for issue identifiers (e.g. `ENG-142`), immutable once set, REQ-042 |
| `description` | TEXT | yes | — | |
| `visibility` | TEXT | no | `'org'` | enum: `private`, `org`, `public`; REQ-050 |
| `status` | TEXT | no | `'active'` | enum: `active`, `paused`, `completed` |
| `lead_id` | TEXT | yes | — | typed `UserId`; nominated project lead, REQ-049 |
| `color` | TEXT | no | `'#6366f1'` | UI accent color |
| `starts_at` | TEXT | yes | — | optional project start date |
| `target_date` | TEXT | yes | — | optional target completion date |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |
| `archived_at` | TEXT | yes | — | non-null when archived; REQ-044/045/046/047 govern the consequences |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `projects_org_slug_idx` | `org_id, slug` | yes | REQ-041's per-org slug uniqueness (not global, unlike `organizations.slug`) |
| `projects_org_key_idx` | `org_id, key` | yes | REQ-042's issue-identifier prefix must be unique within its org |
| `projects_org_archived_idx` | `org_id, archived_at` | no | the leading predicate for every default listing (live-only) and the quota count (all rows), both filtered by these two columns |

**Invariants**

- **Slug and key are both unique per organization, independently of each other** — two
  separate unique indexes rather than one composite, because a caller can look either up
  independently (a slug drives URL routing; a key prefixes issue numbers in the UI and in CSV
  export, REQ-079) and neither is derivable from the other.
- **Key is immutable once set (REQ-042).** There is no schema-level enforcement of
  immutability — nothing prevents an `UPDATE projects SET key = ...` at the SQL layer — the
  guarantee is that `updateProject`'s accepted input type and `ProjectService`'s call sites
  never include `key` as an editable field. This is the same "convention enforced by what code
  actually calls, not by a database constraint" pattern documented throughout this dictionary.
- **Archiving cascades to open issues (REQ-045).** `archiveProject` and
  `archiveIssuesForProject` (on the `issues` table, see `tables-issues.md`) are two separate
  repository calls sequenced by `ProjectService`, not a single cascading operation the
  database performs — recall from `conventions.md` that this schema declares no
  `ON DELETE CASCADE`-style foreign keys at all, and even where SQLite's `foreign_keys`
  pragma is on, no `.references()` exists for it to act on.
- **Archived projects still consume the quota (REQ-044).** `countProjects` counts every row
  for the org regardless of `archived_at`, mirroring the `archived_at` semantics documented in
  `conventions.md`.
- **Restoring a project does not require restoring its issues separately (REQ-047)** — because
  archiving a project's issues via the cascade above only sets those issues' own
  `archived_at`, restoring the project (clearing its own `archived_at`) does not, by itself,
  restore the issues; whether project restore also restores previously-archived issues is a
  `ProjectService`-level decision this dictionary does not resolve, since it is business logic
  rather than a schema fact — the schema only guarantees that no row was destroyed, so a
  restore operation *can* recover everything if the service chooses to.
- **Deletion is a distinct, rarer operation from archiving (REQ-048)**, restricted to the
  owner role and, per ADR-004's framing, presumably a genuine hard delete — though no
  repository function named `deleteProject` or similar appears in
  `project-repository.ts`'s exported surface; REQ-048's "permanent, owner-only" deletion is
  documented as a requirement without a corresponding repository function visible in this
  schema's read/write surface, worth flagging as a gap between the requirements corpus and the
  current implementation rather than papering over it with an invented function name.

**Read and write paths**

`src/server/repositories/project-repository.ts`: `findProjectById`, `findProjectBySlug`,
`listProjects` (keyset-paginated, REQ-052), `countProjects`, `insertProject`, `updateProject`,
`archiveProject`, `restoreProject`, `listTakenProjectSlugs` (collision checking for
`uniqueSlug()`, same pattern as `listTakenOrgSlugs`), `getProjectStats` (aggregate counts for
a project's dashboard card — issue counts by status, most likely, though the exact aggregation
is internal to that function's implementation rather than expressed in the schema).
`ProjectService` is the sole caller.

**Notes**

`projects.key`'s relationship to `issues.number` is the schema's one cross-table naming
scheme worth calling out here even though `issues` is documented in a different file: a
project's `key` (e.g. `ENG`) combined with an issue's `number` (e.g. `142`) is what a user
sees as `ENG-142`, but that composed identifier does not exist as a stored column anywhere —
it is assembled at the presentation layer from two separately-stored values, one on `projects`
and one on `issues`.

## `project_members`

**Drizzle export:** `projectMembers` in `src/server/db/schema/projects.ts`
**Soft delete:** no — membership in a project is added or removed outright, not archived
**Tenant column:** `org_id` (denormalized alongside `project_id`, per ADR-006)

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `org_id` | TEXT | no | — | denormalized tenant column, per ADR-006 |
| `project_id` | TEXT | no | — | typed `ProjectId` |
| `user_id` | TEXT | no | — | typed `UserId` |
| `added_at` | TEXT | no | — | when this user was granted project-level access |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `project_members_pk` | `project_id, user_id` | yes | the table's effective primary key — a user is either on a project's member list or not, never twice |
| `project_members_org_idx` | `org_id` | no | supports tenant-scoped scans, e.g. cleanup when an org is deleted |

**Invariants**

- **This is a pure join table** — it carries no `id` column of its own and no timestamps
  columns beyond `added_at`; the composite unique index on `(project_id, user_id)` is what
  Drizzle calls a "pk" here despite SQLite's actual `PRIMARY KEY` semantics not being invoked
  (there is no `.primaryKey()` call on either column — `project_members_pk` is a
  `uniqueIndex`, not a table-level primary key constraint, a naming choice this dictionary
  reproduces exactly as the code names it rather than correcting it to "unique index").
- **`project_members` narrows notification fan-out (REQ-051), it does not gate read access on
  its own.** `visibility` on `projects` is the primary access-control signal (REQ-050); a
  private project's notification recipients are limited to its `project_members` list, but
  whether a non-member can *see* a private project at all is a `permission-model.md`-level
  question this table's presence alone doesn't answer.
- Rows in this table are meaningful only for projects where narrowed membership actually
  matters — a `public` or `org`-visibility project may have an empty `project_members` list
  and still be readable by every org member; `project_members` is opt-in narrowing, not an
  always-populated access-control list.

**Read and write paths**

`src/server/repositories/project-member-repository.ts`: `listProjectMemberIds`,
`addProjectMember`, `removeProjectMember`, `isProjectMember`. Called by `ProjectService` when
project membership is edited, and by `NotificationService` when resolving REQ-051's narrowed
fan-out for a private project's events.

**Notes**

`project_members` is structurally identical in shape to `issue_labels` (`tables-issues.md`) —
both are `tenantColumns`-plus-two-foreign-key join tables with a composite unique index and no
own `id` — but they serve different purposes: `issue_labels` is a many-to-many tagging
relationship with no access-control meaning, while `project_members` is specifically an access
and notification scoping mechanism layered on top of, not instead of, the org-wide `members`
table. A user must already be an active `members` row in the organization before their
presence in `project_members` means anything; `project_members` never grants access to someone
who is not already an org member.

## Slugs, keys, and the two identifiers a project carries

`projects` is the one table in this dictionary with two independently-unique human-facing
identifiers rather than one, and the distinction between them is easy to blur without reading
both columns' actual purposes side by side. `slug` is a URL-routing identifier — it exists so
`/orgs/acme/projects/mobile-app` is a stable, readable address for the project, and it is
editable, since REQ-041 only requires per-org uniqueness, not immutability, and nothing in
`updateProject`'s surface excludes `slug` from being patched. `key` is a display-and-identity
prefix baked into every one of the project's issues' visible numbers (`ENG-142`), and REQ-042
makes it immutable specifically because changing it after issues have been created and shared
(in commit messages, in conversation, in bookmarked URLs elsewhere in the product) would
silently invalidate every previously-issued `ENG-142`-style reference without any way for the
schema to signal that the reference had gone stale. The two columns being independently unique
within an org — rather than one derived from the other — is what lets a project's URL slug
evolve as a team renames or reorganizes without touching the issue-numbering scheme its
history already depends on.

## Visibility versus membership, restated with a concrete case

`projects.visibility` and the `project_members` join table are easy to conflate, so it is
worth walking through one concrete case end to end. Consider a `private`-visibility project
with three rows in `project_members`. A fourth person who is an active `members` row in the
same organization, but absent from `project_members`, is not automatically granted access by
their org membership alone — REQ-050's "private unless public projects are enabled" framing,
combined with `permission-model.md`'s design, means visibility gates read access at the
project level independently of the org-wide role check `can()` performs. That same fourth
person, if the project were `org`-visibility instead, would see it without needing a
`project_members` row at all — visibility, not project membership, is what decides *whether*
a project is visible; `project_members` only decides *who specifically* gets notified about it
(REQ-051) and, for some actions, who is treated as directly involved with it. Getting this
distinction right matters for reading `isProjectMember` correctly: a `false` result from that
function does not, by itself, mean the calling user cannot see the project — it means they are
not on its narrowed notification and involvement list, a materially different fact from access
being denied outright. Reading `isProjectMember`'s call sites in `NotificationService` versus
any read-path authorization check in `IssueService`/`ProjectService` is the fastest way to
confirm, for any specific code path, which of the two questions it is actually asking.
