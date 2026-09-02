---
title: Organization actions
id: API-ACTIONS-ORGANIZATIONS
status: approved
owners: [m.lindqvist]
last_updated: 2026-05-26
related: [REQ-001, REQ-003, REQ-007, REQ-009, DES-149, DES-251, ADR-006]
---

# Organization actions

Four files under src/actions/organizations/: creating an organization, updating its
profile and settings, switching the session's active organization, and deleting one. DES-251
splits this group in two by a simple test — does an `Actor` exist yet: `create-organization`
and `switch-org` do not (there is either no org yet, or the target org has not been
confirmed as one the caller belongs to), while `update-organization` and
`delete-organization` do, and go through `withAction()` like any ordinary tenant mutation.

## `createOrganizationAction`

- **File:** `src/actions/organizations/create-organization.ts`
- **Input schema:** `createOrganizationSchema` (`src/schemas/organization.ts`) —
  `CreateOrganizationInput`
- **Returns:** `ActionResult<Organization>`
- **Permission:** none — anyone with a session may create an organization
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none — the new organization starts on whatever plan the input names
  (default `free`); there is no existing usage to check it against
- **Events emitted:** `member.joined` (via `createOrganization()` — see DES-150)
- **Cache tags revalidated:** none via `revalidateTagged`; calls `revalidatePath("/orgs")`
  directly so the org chooser page picks up the new organization immediately
- **Errors:** `validation_failed`, `unauthorized`, `internal_error`
- **Satisfies:** REQ-001, REQ-003
- **Design:** DES-149, DES-150, DES-251

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `name` | string, 2-64 | yes | display name |
| `slug` | string | yes | `slugSchema` — lowercase, hyphenated, checked against `isReservedSlug()`; global uniqueness is enforced by the repository (DES-194), not by this schema |
| `plan` | `"free" \| "starter" \| "growth" \| "enterprise"` | no, default `"free"` | `planIdSchema` |

### Behaviour

There is no `Actor` when this action starts — that is the entire reason it does not go
through `withAction()`. It resolves the session principal directly with
`getSessionPrincipal()` and throws `UnauthorizedActionError` if there is none, then calls
`createOrganization(principal.userId, parsed.data)`. DES-149: `createOrganization` takes no
`Actor` (there is nothing to authorize an org creation *against*), and it seeds a membership
(the creator becomes owner) and a subscription row, but deliberately not a project — REQ-014's
"onboarding seeds a first project" is satisfied elsewhere, not inside this service call.

After the service call returns, the action does something unusual for this codebase: it
calls `getActor(organization.slug)` and discards the result, purely for its side effect of
throwing if the resolution fails. The comment in the source is explicit about why — "the
owner membership is written by the service; resolving the actor here fails loudly if it was
not, rather than leaving an org nobody can open." Without this check, a bug in
`createOrganization()`'s membership write would surface only much later, as a confusing
"you don't have access" error the first time anyone tried to open the org that had just
apparently been created successfully.

DES-150 documents the event side: org creation emits `member.joined`, never an
`organization.created` event, because `TaskflowEventMap` has no such key. Any subscriber
that wants to react to "a new organization exists" has to infer it from the first
`member.joined` for a given org rather than listening for a dedicated event — a gap worth
knowing rather than assuming a listener you can't find was simply never wired up.

## `updateOrganizationAction`

- **File:** `src/actions/organizations/update-organization.ts`
- **Input schema:** `updateOrganizationSchema` (`src/schemas/organization.ts`) —
  `UpdateOrganizationInput`
- **Returns:** `ActionResult<Organization>`
- **Permission:** `org:update` (minimum role admin; see DES-043)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** none directly from this action — `updateOrganization()` writes to the
  audit log directly rather than through `emit()` (DES-151)
- **Cache tags revalidated:** `orgTag(input.orgId)`, `CACHE_PROFILES.minutes`
- **Errors:** `validation_failed`, `forbidden`, `internal_error`
- **Satisfies:** REQ-004, REQ-005
- **Design:** DES-151

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `name` | string, 2-64 | no | |
| `logoUrl` | URL or `null` | no | |
| `settings` | partial `OrganizationSettings` | no | merged over the stored settings by the service, not replaced |

### Behaviour

A standard `withAction()` mutation: `can(actor, "org:update", ...)` gates it, and
`updateOrganization()` merges the partial `settings` object over the stored
`OrganizationSettings` rather than overwriting it wholesale — the action's own doc comment
calls this out explicitly, because a form that only exposes `digestHourUtc` must not be able
to silently clear `enabledFlagOverrides` by omitting it from the payload. DES-151 is the
event gap here too: there is no `organization.updated` key in `TaskflowEventMap`, so the
audit trail for this action is written by the service calling the activity repository
directly rather than by a subscriber reacting to an emitted event — the one place in this
whole action group where the audit log's usual event-driven path (DES-024) does not apply.

## `switchOrgAction`

- **File:** `src/actions/organizations/switch-org.ts`
- **Input schema:** `switchOrgSchema` (`src/schemas/session.ts`) — `SwitchOrgInput`
- **Returns:** `ActionResult<null>`
- **Permission:** none as a named `can()` check — membership itself is the gate, enforced by
  `assertOrgScope()`
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** none
- **Cache tags revalidated:** none via tags; calls `revalidatePath("/", "layout")` to force
  every server-rendered surface under the root layout to re-render against the new active org
- **Errors:** `validation_failed`, `unauthorized`, `tenant_scope_violation`, `internal_error`
- **Satisfies:** REQ-009, REQ-213
- **Design:** DES-031

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | the organization to switch into |

### Behaviour

`switchOrgAction` does not use `withAction()` because it needs a specific two-step check
that the wrapper's generic actor resolution does not express: first resolve the session
principal, then call `requireActorFor(parsed.data.orgId)` for the *target* org specifically
(not the session's current active org), then call `assertOrgScope(actor, parsed.data.orgId)`.
That last call is close to a tautology on its face — `requireActorFor` just resolved an
actor scoped to that exact org id — but it is the guard that matters, per the file's own
comment: an actor can only be resolved for an org the caller already has a membership row
in, so if `requireActorFor` did not throw, membership already held, and `assertOrgScope`
turns "the actor we just built" into an explicit, named assertion that satisfies REQ-009's
requirement that switching organizations is explicit, never implicit — the org identity
changes only when the caller both names a target org and holds a live membership in it,
never as a side effect of any other action.

`switchActiveOrg()` in `session-service.ts` then updates the session row's `activeOrgId`.
This is the only per-organization thing about a session, per DES-216: sessions are global
rows, and `activeOrgId` is what lets one cookie move between organizations without minting a
new session or a new cookie each time.

## `deleteOrganizationAction`

- **File:** `src/actions/organizations/delete-organization.ts`
- **Input schema:** `deleteOrganizationSchema` (`src/schemas/organization.ts`) —
  `DeleteOrganizationInput`
- **Returns:** `ActionResult<Organization>`
- **Permission:** `org:delete` (minimum role owner; see DES-043)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** none directly (see `updateOrganizationAction` above — same gap)
- **Cache tags revalidated:** `orgTag(input.orgId)`, `CACHE_PROFILES.minutes`; also calls
  `revalidatePath("/orgs")` so the org chooser drops the deleted organization immediately
- **Errors:** `validation_failed`, `forbidden`, `internal_error`
- **Satisfies:** REQ-007
- **Design:** DES-152

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `confirmSlug` | string | yes | `slugSchema` — must equal the organization's own stored slug |

### Behaviour

`org:delete` sits at owner rank in `ROLE_MATRIX`, so the `can()` check is most of the guard,
but DES-152 adds a second one on top: the caller must retype the organization's own slug as
`confirmSlug`, and the service compares it against the *stored* slug rather than trusting
whatever the client last rendered — a stale form (opened before a rename, submitted after)
cannot delete a renamed organization by matching an old slug that is no longer current.
Deletion is a soft delete, consistent with every other archivable entity in the corpus
(REQ-071's pattern generalized to organizations): `deleteOrganization()` stamps
`archived_at` rather than removing rows, which is why the action's return type is
`Organization`, not `null` — the caller gets back the now-archived row, not confirmation of
its absence.

## Organization creation sequence

```mermaid
sequenceDiagram
    participant Form as create-org form
    participant Action as createOrganizationAction
    participant Session as getSessionPrincipal()
    participant OrgSvc as OrganizationService.createOrganization()
    participant Actor as getActor()
    participant Router as revalidatePath("/orgs")

    Form->>Action: createOrganizationAction({ name, slug, plan })
    Action->>Action: createOrganizationSchema.safeParse(raw)
    Action->>Session: getSessionPrincipal()
    alt no session
        Session-->>Action: null
        Action-->>Form: { ok: false, error: { code: "unauthorized" } }
    else session present
        Session-->>Action: SessionPrincipal
        Action->>OrgSvc: createOrganization(userId, parsed.data)
        OrgSvc-->>Action: Organization (membership + subscription seeded)
        Action->>Actor: getActor(organization.slug)
        alt membership missing (bug)
            Actor-->>Action: throws
            Action-->>Form: { ok: false, error: { code: "internal_error" } }
        else membership confirmed
            Actor-->>Action: Actor (discarded)
            Action->>Router: revalidatePath("/orgs")
            Action-->>Form: { ok: true, data: organization }
        end
    end
```

## Why four files instead of one CRUD module

It would be tempting to fold `create-organization.ts`, `update-organization.ts`,
`switch-org.ts` and `delete-organization.ts` into a single `organization-actions.ts` file
exporting four functions, the way some Next.js codebases organize a resource's mutations.
Taskflow deliberately keeps one file per action across the whole src/actions/ tree instead
(see `design/module-map.md`, DES-010), and this group is a good illustration of why: the four
organization actions do not actually share a control-flow shape the way, say, the four issue
mutations mostly do. Two of them (`create`, `switch`) run before or around actor resolution
in ways `withAction()` cannot express and hand-roll their own `try/catch`; two of them
(`update`, `delete`) are ordinary `withAction()` calls that differ only in which permission
they check and what confirmation they require. Collapsing them into one file would not save
meaningful code, and it would make the deliberately-different shapes of `create`/`switch`
harder to notice at a glance than they are when each gets its own file and its own
`"use server"` directive.

## The confirmation-typing pattern

`confirmSlug` on `deleteOrganizationSchema` is the only place in the organization actions
that asks a user to retype something rather than just click a button, and it sets the
pattern the rest of the corpus follows for irreducibly destructive operations — compare it
to how `archive-project.ts` and `archive-issue.ts` (in `actions-projects.md` and
`actions-issues.md`) get away with a plain boolean confirmation instead: those are soft
deletes with a `restore` path, while an organization has no restore action at all once
`deleteOrganizationAction` succeeds, even though the underlying row is technically only
archived. The UI never exposes a way back in, so the confirmation typing does the job a
restore button would otherwise do for a less catastrophic mistake.

## Interaction with billing and members

Deleting an organization does not, by itself, cancel the subscription or remove memberships
— `deleteOrganization()` stamps `archived_at` on the organization row and leaves the
subscription and membership rows alone. This is a deliberate consequence of soft delete
being the corpus-wide pattern (ADR-004): a support engineer investigating a billing dispute
after the fact can still resolve who the members were and what plan the org was on, because
nothing downstream of the organization row was touched by this action. `getActor()` and
`assertOrgScope()` both treat an archived organization as inaccessible for ordinary traffic
(the tenant-scoping layer checks `archived_at` the same way it checks it for any other soft
deleted row), so in practice a deleted org becomes unreachable to its former members
immediately even though the rows survive.

Related: REQ-002, REQ-006, REQ-008, REQ-010, REQ-011, REQ-012, REQ-013, DES-032, DES-153,
DES-194, ADR-004, ADR-006.
