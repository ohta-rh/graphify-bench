---
title: Test documentation index
id: TEST-INDEX
status: approved
owners: [platform-team, h.iqbal]
last_updated: 2026-08-14
related: [REQ-011, DES-013, ADR-002, ADR-004]
---

## What lives under docs/test/

This directory documents the automated test suite in tests/, run with Vitest from
`corpus/taskflow`. It does not document CI configuration or deployment gates — those belong
under docs/ops/ — and it does not restate the requirements or the design decisions the
tests exist to protect; it links out to docs/requirements/ and docs/design/ instead of
duplicating them.

Five files, each with a narrow job:

- **`test-strategy.md`** — the shape of the pyramid as it actually exists in this repo, the
  gates a change has to clear, and what is deliberately left untested.
- **`unit-and-lib-tests.md`** — tests/lib/, tests/schemas/ and tests/config/: the pure
  functions and Zod schemas that carry no database and no Actor.
- **`service-and-repository-tests.md`** — tests/services/, tests/repositories/,
  tests/server/, tests/jobs/ and tests/emails/: everything that runs against the
  in-process SQLite database, including permission and tenancy assertions.
- **`component-and-ui-tests.md`** — tests/components/, tests/ui/ and tests/helpers/:
  the small slice of rendering coverage plus the shared fixtures every other suite imports.
- **`traceability-req-to-test.md`** — a row for every requirement in the catalogue
  (docs/requirements/), mapped to the test file that exercises it, honest about the
  requirements that have no dedicated test.

## Headline numbers

As of the last verified run against the frozen corpus:

| metric | value |
|---|---|
| test files | 73 |
| tests | 617 |
| skipped | 0 |
| todo | 0 |
| test runner | Vitest, from `corpus/taskflow` |

By directory, file counts under tests/: `lib` 22, `components` 13, `server` 10,
`services` 10, `schemas` 6, `ui` 4, `contract` 3, `repositories` 3, `config` 2, `helpers` 2,
`jobs` 2, `emails` 1. tests/server/_support/ holds fixtures rather than test files, and
tests/helpers/ and `tests/setup.ts` are infrastructure, not assertions about a feature —
they are described in `component-and-ui-tests.md` because that is where their nearest
consumers, the component suites, are covered.

These counts are the ones a reader should trust over any number quoted elsewhere in this
corpus that predates a change to tests/; `test-strategy.md` explains why the suite is
organized this way rather than, say, one file per source module.

## Running the gates

Every gate below runs from `corpus/taskflow` and is defined in `package.json`. `pnpm test`
is the one this directory is about; the other three are mentioned here because a green
`pnpm test` next to a red `pnpm typecheck` or `pnpm lint` is not a green build, and
`test-strategy.md`'s gate table explains what each one is actually checking for.

```bash
pnpm typecheck   # tsc --noEmit — catches a schema/type drift no test happens to hit
pnpm lint        # eslint — catches import-direction and hook-rule violations
pnpm test        # vitest run — the 617 cases documented in this directory
pnpm build       # next build — catches anything only the production bundler sees
```

Run `pnpm test -- tests/lib` (or any subdirectory) to scope a run while iterating; the full
suite is fast enough — no test in it makes a real network call or waits on a real clock
tick, per `test-strategy.md` — that scoping is a convenience, not a necessity born of slow
tests.

## Reading order for a newcomer

Someone picking up this codebase for the first time gets the most out of the suite by
reading in this order: `tests/helpers/factories.ts` and `tests/helpers/db.ts` first (the
shared building blocks), then `tests/lib/permissions.matrix.test.ts` (the sharpest example
of the exhaustive-sweep style this suite favors over hand-picked cases), then
`tests/server/_support/fixtures.ts` and one service suite such as
`tests/services/issue-service.test.ts`. `unit-and-lib-tests.md` and
`service-and-repository-tests.md` walk through exactly that material in more depth.

## Ownership

`h.iqbal` (QA lead) owns this directory's accuracy against the running suite; the engineer
who owns a given source area (see the roster in docs/requirements/ front matter) owns
keeping that area's tests passing. `d.okafor` reviews changes to tests/helpers/ and
tests/server/_support/ specifically, because a change there ripples into every suite that
imports it — see `tests/helpers/db.ts` and `tests/helpers/factories.ts`, discussed in
`component-and-ui-tests.md`, and `tests/server/_support/fixtures.ts`, discussed in
`service-and-repository-tests.md`.

## Known gaps, in one place

`traceability-req-to-test.md` closes with a full gap analysis; the short version, so a
reader does not have to open that file to get the shape of it: the End-to-end layer does not
exist in this repo at all (no Playwright, no route-handler integration tests against a live
Next.js server), Server Actions in src/actions/ have no direct test coverage of their own
— they are exercised only indirectly, through the service functions they call — and several
billing and webhook requirements (the invoice-generation and delivery-attempt-visibility
areas in particular) are implemented but have no test that pins their behavior. None of
these are silent: `traceability-req-to-test.md` marks each affected requirement `none` or
`indirect` rather than `direct`, and proposes what a next pass should add.

## Isolation and speed

Nothing in tests/ shares mutable state across files by design, which is what lets the full
617-test run finish in the seconds range rather than minutes. The database-backed suites
each get their own isolation boundary: files that import `tests/server/_support/fixtures.ts`
call `useTemporaryDatabase()` in `beforeAll`, which creates a fresh temp directory with
`mkdtempSync` and points `process.env.TASKFLOW_DB_PATH` at a brand-new SQLite file — no two
test files ever share a database file, so Vitest can run files in parallel worker processes
without one file's `INSERT` racing another's `DELETE`. The files that instead import
`tests/helpers/db.ts` use an in-memory `:memory:` database scoped to the Node process
running that file, with the same non-sharing guarantee for a different reason: an in-memory
database simply does not exist outside the process that created it. Either way, a test
author does not need to reason about ordering or about another file's leftover rows — the
one thing to get right is calling `resetTestDb()` or re-seeding within a single file's own
`beforeEach` when that file's own cases must not see each other's rows, which is a
within-file concern, not a cross-file one.

## What a passing local run does and does not prove

A green `pnpm test` on a laptop and a green `pnpm test` in CI are the same command against
the same lockfile-pinned dependency versions, so there is no meaningful CI-only failure mode
in this suite today — no flaky test relies on real time, real network, or a shared external
resource (see the "what is deliberately not tested" list in `test-strategy.md`). That
symmetry is a design choice, not an accident: a suite whose local and CI results can diverge
either hides a real bug behind "works on my machine" or wastes engineering time chasing
environment ghosts, and this suite is built specifically to avoid both. What a green run
does not prove is covered exhaustively in `traceability-req-to-test.md` — a requirement
marked `none` there passes trivially because nothing exercises it, not because its behavior
is confirmed correct.

## Extending the suite

An engineer adding a new service function, repository query, or schema field should add its
test in the file already covering that module — `tests/services/issue-service.test.ts` for a
new `issue-service` export, not a new file — unless the addition is large enough to justify
a new area entirely (a new top-level domain concept gets its own service, repository and
schema test files, mirroring the existing one-file-per-module convention documented in
`unit-and-lib-tests.md` and `service-and-repository-tests.md`). New fixtures belong in
`tests/helpers/factories.ts` if they are plain objects with no database dependency, or in
`tests/server/_support/fixtures.ts` if they require a seeded database row — never duplicated
into a third location, since `component-and-ui-tests.md` and
`service-and-repository-tests.md` both explain why those two fixture layers are kept
deliberately separate rather than merged.

## Directory map, at a glance

For a reader who wants the full inventory without opening any of the four sibling files:

| directory | files | documented in |
|---|---|---|
| tests/lib/ | 22 | `unit-and-lib-tests.md` |
| tests/components/ | 13 | `component-and-ui-tests.md` |
| tests/server/ | 10 | `service-and-repository-tests.md` |
| tests/services/ | 10 | `service-and-repository-tests.md` |
| tests/schemas/ | 6 | `unit-and-lib-tests.md` |
| tests/ui/ | 4 | `component-and-ui-tests.md` |
| tests/contract/ | 3 | `test-strategy.md` (own section), cited throughout |
| tests/repositories/ | 3 | `service-and-repository-tests.md` |
| tests/config/ | 2 | `unit-and-lib-tests.md` |
| tests/helpers/ | 2 | `component-and-ui-tests.md` |
| tests/jobs/ | 2 | `service-and-repository-tests.md` |
| tests/emails/ | 1 | `service-and-repository-tests.md` |

`tests/setup.ts` is a thirteenth, uncounted entry — Vitest's global setup file, wiring
`jest-dom` matchers into `expect` for the handful of files that render a component. It has
no `describe`/`it` blocks of its own and is not counted among the 73 test files above,
matching the way Vitest itself treats a `setupFiles` entry as configuration rather than a
suite.

## Who to ask

A question about why a given behavior is or is not tested should go to the file's owner
first, then to `h.iqbal` if the file's own comments and this documentation do not answer it.
Ownership by area, following the roster in the requirements corpus: `d.okafor` for
tests/lib/, tests/config/, tests/helpers/ and tests/server/_support/; `m.lindqvist`
for issue and project coverage across tests/services/, tests/repositories/ and the
relevant slices of tests/server/; `r.saito` for billing, plan-limit and subscription
coverage; `t.abara` for tests/jobs/ and tests/emails/; `k.ferreira` for
`tests/services/search-service.test.ts` and the webhook gap noted above; `s.duarte` for
tests/components/ and tests/ui/. This mirrors the "engineer, area" column in the team
roster rather than introducing a separate ownership scheme just for tests, on the theory
that the person who owns a module's correctness also owns proving it.

## How this documentation stays honest

Every claim in the four sibling files was checked against the running suite rather than
against memory of what the suite was expected to contain: file paths were confirmed to
exist, function names were confirmed against actual exports, and behavior descriptions were
written from reading the assertions themselves rather than from a file's one-line header
comment alone (though those comments, where present, are accurate summaries and are quoted
directly in several places across `unit-and-lib-tests.md`, `service-and-repository-tests.md`
and `component-and-ui-tests.md`). The 617/73/0/0 numbers in the headline table above are the
single most likely thing to drift as the suite grows — a future engineer adding a
`webhook-service.test.ts` to close the gap `traceability-req-to-test.md` names should update
this file's headline table, the directory map's file count for tests/services/, and the
relevant `none` rows in the traceability matrix in the same change, rather than letting this
directory quietly fall out of sync with the code it describes. Treat any number in this
directory that disagrees with an actual `pnpm test` run as this documentation being wrong,
not the test run.

The four sibling files were written in the order a reader would naturally want them: the
strategy first, so the shape and boundaries of the whole suite are established before any
individual file is described; the three coverage files next, grouped by database dependency
rather than by directory alphabetization, since that grouping is the one that actually
explains why a given test lives where it does; and the traceability matrix last, because it
presumes familiarity with the file names the first three establish. A reader in a hurry can
skip straight to whichever of the three coverage files matches the area of the codebase they
are touching, using the directory map above as the index, and can treat the traceability
matrix as a lookup table rather than something read start to finish.
