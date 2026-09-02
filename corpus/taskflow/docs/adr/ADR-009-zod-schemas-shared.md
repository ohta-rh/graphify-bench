---
title: Share Zod schemas between client forms and Server Actions
id: ADR-009
status: accepted
owners: [platform-team]
last_updated: 2026-01-14
related: [REQ-062, REQ-063, ADR-001, ADR-013, ADR-014]
---

# ADR-009 — Share Zod schemas between client forms and Server Actions

## Status

Accepted, and one of the least-revisited decisions in the corpus: every
input schema for every mutation lives in src/schemas/ and there is no
example anywhere in the codebase of a Server Action defining its own inline
validation instead.

## Context

ADR-001 committed Taskflow to a single TypeScript application with Server
Actions as the primary mutation path, specifically to avoid maintaining a
duplicate validation contract between a client and a server that speak
different languages or live in different repositories. That decision only
pays off if there is a disciplined answer to "where does validation logic
live," and the team wanted to settle it before more than a handful of
Server Actions existed, because retrofitting shared validation onto
already-diverged client and server checks is exactly the kind of cleanup that
never happens once a codebase is large.

The concrete failure mode the team was trying to avoid: a form component
checks that an issue title is non-empty and under some length, using
whatever ad hoc `if` statements a component author reaches for; the Server
Action it submits to does its own, separately written check, using slightly
different rules, because nobody expected `zod` (already a dependency, version
4.5.4 per `package.json`) to be the single source of truth for both. Given
enough features, the two checks drift — the classic symptom being a form
that shows no client-side error but the server rejects, or worse, a form
that blocks a submission the server would have happily accepted.

Beyond form validation, the team also needed closed vocabularies enforced
somewhere: REQ-062 requires issue status to be a closed set of values, REQ-063
the same for priority. A `Record<string, ...>` typed loosely as `string`
anywhere in that pipeline would silently accept an invalid status from a
malformed request, which is a correctness and a security concern — malformed
input reaching a repository query as a raw string is the seed of a class of
bugs Zod is specifically good at eliminating at the boundary.

## Decision

src/schemas/ holds one Zod schema module per domain concern — `issue.ts`,
`project.ts`, `comment.ts`, `member.ts`, `organization.ts`, `webhook.ts`,
`billing.ts`, `activity.ts`, `search.ts`, `session.ts`, `label.ts`,
`invitation.ts`, `attachment.ts`, `feature-flag.ts`, `role.ts`, `export.ts`,
`pagination.ts`, `auth.ts`, `slug.ts`, and the shared primitives in
`common.ts` — plus a barrel export in `index.ts`. These are the single
definition of what a valid input looks like for every mutation and query in
the product, and they are imported, unmodified, from two directions: client
form components (for inline field-level error display, before a submission
even reaches the network) and the Server Actions those forms submit to (for
authoritative, non-optional re-validation).

A Server Action never trusts that client-side validation ran — every action
under src/actions/ parses its input through the corresponding schema again,
server-side, as the very first thing it does, before calling into
src/server/services/. Closed vocabularies like issue status and priority
are expressed as Zod enums matching the domain type unions in
`src/types/issue.ts`, so REQ-062 and REQ-063 are enforced at the one
boundary where external input enters the system, not re-checked ad hoc by
each service method that happens to touch status or priority.

When a schema rejects input, the resulting `ZodError` is not handled
bespoke by each action — `src/lib/errors.ts`'s `toAppError()` recognizes
`ZodError` instances specifically and calls `fieldErrorsFromZod()` to
collapse the error into a `field → messages` map the form components render
directly against the relevant input, giving per-field errors without any
action-specific error-formatting code (this is also where ADR-014's
domain-error-to-error-code mapping picks up `ZodError` as a first-class
citizen of the `validation_failed` code, HTTP 422).

## Consequences

**What this buys the team.** There is exactly one place to look for "what
does a valid create-issue payload look like," and it is unambiguous because
it is the same TypeScript type on both sides of the network — no
hand-maintained interface duplicated between a form's prop types and a
Server Action's parameter types, and no drift possible between what the
client thinks is valid and what the server enforces, because both call
`CreateIssueInput.parse()` (or `.safeParse()`) against literally the same
schema object. Closed vocabularies (REQ-062, REQ-063, and similarly the
plan, role, and feature-flag key unions elsewhere in the corpus) are
enforced once, at the boundary, which means a service method downstream of
that parse can trust its `status: IssueStatus` argument is genuinely one of
the allowed values, with no defensive re-checking needed inside the service
itself. Form-level UX also improved measurably: because the client can run
the same schema's `.safeParse()` before ever hitting the network, invalid
submissions are caught instantly, with the exact same error messages the
server would have produced, rather than a generic "something went wrong"
after a round trip.

**What it costs.** Schemas now carry a dual responsibility — they have to be
both a reasonable UX-facing validation contract (giving useful,
user-readable messages) and a strict security boundary (rejecting anything a
service should never see) — and those two goals occasionally pull in
different directions. A schema that is too permissive for good client UX
(accepting, say, a title that is technically valid but obviously a mistake)
is also too permissive as a server-side guard. The team's resolution has
been to keep schemas strict and push friendlier UX language into the form
components' own error-rendering, rather than loosening the schema itself.
There is also a coupling cost mirroring ADR-001's own trade-off: because the
same schema module is imported into client bundles, a schema that
accidentally imports something server-only (a repository, a database
client) breaks the client build in a way that is not always obvious from the
schema file alone — this is enforced by convention and code review, not by
an automated boundary check, and the team has discussed but not yet built a
lint rule to catch a schema module importing outside src/schemas/ and
src/types/.

## Alternatives considered

**Separate client and server validation, written independently.** This is
the status quo ADR-001 was written specifically to avoid, and the team never
seriously considered it once Server Actions were chosen — it reintroduces the
duplicate-contract problem this whole document exists to solve.

**A schema-first code generation approach** (define validation in a neutral
format — JSON Schema or a custom DSL — and generate both TypeScript types and
runtime validators from it). Rejected as unnecessary ceremony given that Zod
already produces both a runtime validator and a static TypeScript type from
one declaration (`z.infer<typeof schema>`), which is exactly what a
generation step would otherwise be needed to bridge.

**Validate only on the server, skip client-side schema use entirely** and
rely on generic HTML form validation (`required`, `maxLength` attributes) for
UX. Rejected because it throws away the exact benefit ADR-001's
single-codebase decision was meant to unlock — instant, precise,
server-matching validation feedback in the client — for no real savings, since
the schema still has to be written and imported for the server side
regardless.

## References

- REQ-062 (issue status is a closed vocabulary), REQ-063 (issue priority is a
  closed vocabulary)
- ADR-001 (Next.js App Router and Server Actions — the decision this ADR
  makes good on), ADR-013 (Server Actions call schemas first, then services —
  part of the layering this ADR assumes), ADR-014 (`ZodError` mapped to
  `validation_failed` in the domain-error-to-error-code union)
- Code: `src/schemas/index.ts`, `src/schemas/issue.ts`, `src/schemas/common.ts`,
  `src/lib/errors.ts` (`fieldErrorsFromZod`, `toAppError`), `src/types/issue.ts`
