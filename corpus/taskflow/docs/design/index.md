---
title: Design section index
id: DES-INDEX
status: approved
owners: [platform-team]
last_updated: 2026-05-20
related: [REQ-001, ADR-001, ADR-013]
---

## Purpose

This is the entry point to the "basic design" layer of the Taskflow documentation
corpus: the layer between *requirements* (what the product must do, in
`docs/requirements/`) and *code* (how it is actually written). Each file here answers
"how does the system achieve this requirement, structurally" for one architectural
concern. If you are new to the codebase, read `architecture-overview.md` first, then
`module-map.md`, then whichever concern-specific file matches the area you are
touching.

## How to read this section

Every design element carries an id of the shape `DES-###`, defined exactly once as a
heading, e.g. `### DES-041 — Ownership escalation is evaluated after the role
matrix`. An element names the requirements it satisfies (`REQ-###`), the architecture
decision record that settled it (`ADR-###`), and the real source files and exported
symbols that implement it. Treat the `Code:` line as a pointer, not a summary — read
the cited file if you need the exact signature or the current edge cases; this
document describes the shape and the reasoning, the source is the truth.

Cross-references are inline in prose, not just link lists — the ownership escalation
described in `permission-model.md` is why `REQ-072` and `REQ-097` stop short of a full
role requirement, and that same escalation reappears in `tenant-isolation.md` as the
reason a repository must never be trusted to make the final call. Follow the
references; they are how the nine files here form one coherent model rather than nine
unrelated essays.

## File map

| file | covers | primary requirements | primary ADRs |
|---|---|---|---|
| `architecture-overview.md` | process shape, layering, Next.js 16 constraints, build/deploy | REQ-001, REQ-010, REQ-211, REQ-212 | ADR-001, ADR-002, ADR-007, ADR-013 |
| `module-map.md` | what lives where under src/, import direction, the five layering exceptions | REQ-010, REQ-060 | ADR-013 |
| `data-flow.md` | request → action → service → repository → db, and the reverse cache path | REQ-053, REQ-065, REQ-068 | ADR-001, ADR-009, ADR-019 |
| `tenant-isolation.md` | `org_id` everywhere, `assertOrgScope`, actor resolution, failure modes | REQ-001, REQ-010, REQ-011, REQ-210 | ADR-006, ADR-013 |
| `permission-model.md` | `can`/`explain`/`assertCan`, `ROLE_MATRIX`, ownership escalation, staff bypass | REQ-020 .. REQ-027, REQ-072, REQ-097 | ADR-003 |
| `event-bus.md` | `emit`/`subscribe`, the 21 event keys, subscriber registration, error isolation | REQ-053, REQ-065, REQ-111, REQ-220 | ADR-005 |
| `background-jobs.md` | scheduler, queue, the seven job kinds, cadence, idempotence | REQ-070, REQ-119, REQ-142, REQ-156, REQ-180 | ADR-005, ADR-016, ADR-018 |
| `caching-and-revalidation.md` | cache tags, `cacheLife` profiles, `revalidateTagged`, staleness budget | REQ-052, REQ-077 | ADR-019 |

## Reading order by task

- **"I'm adding a new mutation."** `data-flow.md` for the write path shape,
  `permission-model.md` for how to gate it, `caching-and-revalidation.md` for which
  tags to revalidate, `event-bus.md` if the mutation has downstream consequences
  (notifications, search, activity, webhooks).
- **"I'm debugging a cross-tenant leak."** `tenant-isolation.md` end to end, then
  `module-map.md`'s section on the layering exceptions — three of the five bypass the
  service layer and are the first place to look when a tenant check goes missing.
- **"I'm adding a background job or changing cadence."** `background-jobs.md`, and
  read `event-bus.md`'s section on `event-registry.ts` first, because two of the seven
  job kinds are triggered from an event rather than the scheduler's cadence table.
- **"A page shows stale data."** `caching-and-revalidation.md`, cross-referenced
  against the specific mutation's entry in `data-flow.md`.

## Terminology used across this section

- **Actor** — the authenticated, org-scoped principal every service function
  receives as its first argument. Never confuse it with `SessionPrincipal`, which is
  not yet scoped to an organization; see `tenant-isolation.md`.
- **Tenant** — synonym for "organization" in this section; every tenant-scoped table
  carries `org_id` per REQ-010.
- **Domain event** — a member of `TaskflowEventMap` (`src/types/event.ts`), published
  with `emit()` and consumed by `subscribe()`. See `event-bus.md`.
  event handlers registered in `src/server/services/event-registry.ts`.
- **Cache tag** — a string produced by `orgTag`, `projectTag` or `issueTag` in
  `src/lib/cache.ts`, invalidated with `revalidateTagged()`.
- **Layering exception** — one of five call sites the corpus knowingly lets bypass
  the service layer, enumerated in full in `module-map.md`'s DES-017 and
  `data-flow.md`'s DES-026. They are documented, not hidden, because pretending they
  do not exist would make this corpus inaccurate.

## What this section deliberately does not cover

Database column types and migration mechanics belong to the data model documents
under `docs/db/` (out of scope for this directory). API request/response shapes
belong to `docs/api/`. UI component composition belongs to `docs/ui/`. This section
stays at the level of "what module talks to what module, and why," which is the
altitude a new engineer needs before any of those more detailed documents make sense.

## Who owns what

`d.okafor` (staff engineer, platform) is the primary reviewer for
`architecture-overview.md`, `module-map.md`, `data-flow.md`, `tenant-isolation.md`
and `permission-model.md` — the five files describing the request/authorization
skeleton every other service builds on. `t.abara` (notifications and jobs) owns
`background-jobs.md` and co-owns `event-bus.md`, since the seven job kinds and the
event catalogue that feeds two of them are the area he maintains day to day.
`m.lindqvist` (tech lead, issues and projects) co-owns `data-flow.md` and
`caching-and-revalidation.md`, because issue and project mutations are the highest-
traffic write paths and therefore the ones most sensitive to a wrong cache tag.
`j.novak` (SRE) co-owns `tenant-isolation.md` and `background-jobs.md` for their
operational failure modes — a tenant-scope leak or a stuck job queue is the kind of
incident that reaches SRE first, regardless of which engineer's service caused it.

Any of the nine files may be edited by any engineer with a change to propose; the
owners listed in each file's front matter are who a pull request should route to for
review, not an exclusive right to edit. When a change touches the boundary between
two files — for instance, a new job kind that also needs a new event key — expect
review from both files' owners, since `background-jobs.md` and `event-bus.md` will
each need an update that stays consistent with the other.

## Status and change history

All nine files in this section carry `status: approved` as of this writing, meaning
the design they describe matches the code as of each file's `last_updated` date. A
file moves to `status: in_review` when a structural change is proposed and its
description has been updated ahead of the code landing — this corpus should never
describe a *planned* architecture as if it were the *current* one without that status
flag, since REQ ids elsewhere in the corpus are written against the code that
actually ships. If you find a design element whose `Code:` line no longer matches
what a grep of the cited file shows, treat that as a documentation bug: file it the
same way you would a code bug, rather than silently trusting the newer reality over
the older prose, since a stale design document is worse than no document — it
actively misleads the next reader.

## A note on accuracy

Every symbol name, numeric constant, event key, and file path cited across these nine
files was checked against the real source at the time of writing — `ROLE_MATRIX`'s 29
rows, the 21 keys of `TaskflowEventMap`, the seven `JobKind` values and their
`CADENCE_MINUTES`, the exact plan-limit numbers in `PLAN_LIMITS`. Where the code
itself is inconsistent — the three-way disagreement over webhook retry ceilings
documented in `background-jobs.md`, or the stray literal cache tag in
`caching-and-revalidation.md` — this section reports the inconsistency rather than
picking one value and presenting it as the only truth, because an engineer debugging
that exact inconsistency is better served by a document that already knows about it.
