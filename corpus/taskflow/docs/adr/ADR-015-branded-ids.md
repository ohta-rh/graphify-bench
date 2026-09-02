---
title: Branded string ids instead of bare strings
id: ADR-015
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2026-02-26
related: [REQ-010, ADR-002, ADR-006, ADR-008]
---

# ADR-015 — Branded string ids instead of bare strings

## Status

Accepted since project inception in spirit, formally written up in late
February 2026 once a near-miss made the platform team realize the pattern
had never been documented, only followed by convention and imitation.

## Context

Taskflow has fourteen distinct entity kinds that need an identifier —
users, organizations, projects, issues, comments, members, notifications,
activity rows, invitations, labels, attachments, subscriptions, sessions,
and webhooks — and every one of them is, at runtime, a ULID string with
identical shape: same length, same character set, no structural difference
between an `IssueId` and a `ProjectId` a debugger could point at. That
uniformity is exactly what makes bare `string` typing dangerous: a function
signature like `moveIssue(issueId: string, projectId: string)` compiles
fine, and typechecks fine, if a caller accidentally swaps the two arguments,
because both are just strings.

The near-miss that prompted writing this ADR down explicitly happened during
the ADR-008 pagination work in January 2026: a draft of
`issue-repository.ts`'s cursor-building code passed a project's id where an
issue's id was expected, in a function that (before branding was applied to
that specific code path) took two bare `string` parameters. TypeScript had
nothing to say about it; the bug was caught by a repository test asserting
the wrong issue came back, not by the type system, which is precisely the
kind of catch the team wanted the compiler to make for them going forward,
not the test suite.

## Decision

`src/types/common.ts` declares a `Branded<T, B>` utility type — `T & {
readonly [brand]: B }`, where `brand` is a `declare const brand: unique
symbol` that exists only at the type level and has no runtime
representation — and every entity id is declared as a distinct branded
string: `UserId`, `OrgId`, `ProjectId`, `IssueId`, `CommentId`, `MemberId`,
`NotificationId`, `ActivityId`, `InvitationId`, `LabelId`, `AttachmentId`,
`SubscriptionId`, `SessionId`, `WebhookId`. `AnyId` is the union of all
fourteen, used sparingly, only by genuinely generic id-handling code (a
shared UI component rendering "copy id" for any entity, say) that has no
business caring which specific kind of id it is holding. The module's own
documentation states the intent directly: "so that an `IssueId` can never be
silently passed where a `ProjectId` is expected."

Because the brand is compile-time-only — the module's comment is explicit
that "ids are ULID strings at runtime; the brand exists only at the type
level" — there is no runtime cost: no wrapper object, no class instance, no
serialization step to unwrap before a database write. A function that needs
to accept "any branded id, but only the right kind" simply types its
parameter as `IssueId` rather than `string`, and the compiler enforces that
every call site passes something that was itself typed (or explicitly
asserted) as an `IssueId` — in practice, that means an id read off a `.id`
field of an already-typed row, or a route-segment string explicitly
validated and branded at the boundary (typically inside the Zod schema layer
from ADR-009, where a schema for a route parameter parses a raw string and
casts it to the branded type after confirming it is well-formed).

This composes directly with two other decisions: ADR-006's `assertOrgScope`
takes an `OrgId`, not a bare string, so a repository or service accidentally
passing a `ProjectId` where an org id was meant is a compile error, not a
runtime tenant-scope bug waiting to happen; and ADR-008's cursor values,
built from a row's branded id as part of the tie-breaking sort key, inherit
the same protection — a cursor accidentally built from the wrong id type on
one list and consumed by a different list's `keysetPredicate` would be
caught at the type boundary rather than surfacing as a subtly wrong page of
results.

## Consequences

**What this buys the team.** The exact class of bug that prompted this ADR —
one entity's id passed where a different entity's id was expected — is now a
compile error at every call site the team has gotten around to branding
consistently, rather than a runtime bug a test suite has to be lucky enough
to catch. Because the brand carries no runtime cost, there was no
performance argument against applying it everywhere; the fourteen id types
cost nothing beyond the one-time cost of writing fourteen type aliases and
the ongoing (small) cost of casting a raw string to a branded type at every
genuine boundary (a route parameter, a form submission, a freshly-generated
ULID). Function signatures across the service and repository layers became
meaningfully more self-documenting as a side effect — `findMember(orgId:
OrgId, userId: UserId)` tells a reader, unambiguously, what each parameter
means, where `findMember(orgId: string, userId: string)` would require
reading the parameter names and trusting they were not swapped.

**What it costs.** Every boundary where a raw string enters the system — a
Next.js dynamic route segment, a form field, a freshly minted ULID from
whatever id-generation utility the write path uses — needs an explicit cast
or a validating parse to become a branded type, and that boundary has to be
disciplined: a lazy `as IssueId` cast on unvalidated input defeats the whole
point, since the brand is erased at runtime and cannot itself validate
anything, only propagate an assumption the caller made. The team's
convention is that this cast should happen exactly once, as close to the
actual boundary as possible (inside the Zod schema for a route parameter, or
immediately after a repository row read, typed to return branded ids
directly rather than requiring every caller to cast), and a `grep`-able
convention, not a compiler-enforced one, is what keeps that discipline from
eroding — nothing stops a new contributor from writing `as IssueId` on an
arbitrary string deep inside application code, and code review is the actual
enforcement mechanism here, same as the "no hand-written role check" rule
from ADR-003. `AnyId`'s existence is itself a small, deliberately-limited
escape hatch — any code reaching for it should be genuinely id-kind-agnostic,
not using it as a shortcut to avoid picking the right specific branded type,
and the platform team treats a new `AnyId` usage in review the way it treats
a new `src/lib/permissions.ts` exception.

## Alternatives considered

**Bare `string` ids everywhere, with careful naming conventions**
(`issueId`, `projectId` as parameter names) as the only defense against
mix-ups. This is what the codebase had before this ADR was written down, and
it is exactly what produced the January near-miss — naming conventions are
not checked by the compiler and depend entirely on every future contributor
reading and respecting them.

**A runtime-wrapped id class** (`class IssueId { constructor(private value:
string) {} }`), giving both compile-time and runtime distinctness. Rejected
as unnecessary overhead: the team's actual failure mode was compile-time
confusion between two syntactically identical strings, which a type-level
brand solves completely, without the serialization, equality-comparison
(`===` no longer works out of the box), and Drizzle-schema-compatibility
complications a wrapper class would introduce at every database read and
write.

**Numeric auto-increment ids instead of ULIDs**, which would make a
same-shape mix-up between an `IssueId` and a `ProjectId` structurally
impossible without branding at all, since sequential integers from different
tables would (usually) have visibly different magnitudes in practice.
Rejected independently of the branding question — ULIDs were chosen for
being sortable-by-creation-time and safely generatable without a database
round trip, properties the team wanted regardless, and branding was the
correct fix for the mix-up risk they otherwise introduce.

## References

- REQ-010 (every tenant-scoped row carries `org_id` — `OrgId` is the branded
  type `assertOrgScope` takes)
- ADR-002 (Drizzle schema and repository return types use branded ids
  directly), ADR-006 (`assertOrgScope(actor, orgId: OrgId)` — the guard this
  ADR's branding makes impossible to misuse by argument order), ADR-008
  (cursor values built from branded ids as part of the keyset tie-breaker)
- Code: `src/types/common.ts` (`Branded`, `UserId`, `OrgId`, `ProjectId`,
  `IssueId`, `CommentId`, `MemberId`, `NotificationId`, `ActivityId`,
  `InvitationId`, `LabelId`, `AttachmentId`, `SubscriptionId`, `SessionId`,
  `WebhookId`, `AnyId`), `src/lib/tenant.ts`, `src/server/repositories/issue-repository.ts`
