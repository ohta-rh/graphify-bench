# Brief: author the APEX benchmark tasks for graphify-bench

## Why this set exists
graphify-bench runs headless `claude -p` agents on Taskflow, a synthetic Next.js/TypeScript SaaS
(multi-tenant project/issue tracker: organizations, members/roles, projects, issues, comments,
mentions, notifications, digests, billing/plan limits, webhooks, search, feature flags, audit
activity). Four hidden-test sets already exist. The newest, the 12-task EXTREME set
(`tasks/extreme/<ID>/`, `tasks/tasks-extreme.json`), gives symptom-only prompts with one trap
per task — and Sonnet 5.5 solved it about as often as Opus 5.5 (87/96 vs 90/96 over four
efforts). The one extreme task that clearly separated them was `EFX2-audit-trail` (Opus 6/6,
Sonnet 5.5 1/6 at low–high): a near-complete fix still lost rows when more than a page of
entries shared a timestamp. Read EFX2 and two other extreme tasks (task.json notes,
hidden.test.ts, solution.patch, VALIDATION.md) before you design anything.

APEX is six tasks — three `fix`, three `implement` — that are clearly harder than every extreme
task, in the specific way EFX2 was: the main idea is easy to reach, and correctness depends on
reasoning through invariants that only break at scale, at a boundary, under a particular
ordering, or on a second path the symptom does not mention. Target: a strong senior engineer
new to the repo needs 3–6 hours per task. The agent under test gets up to 160 turns and $12.

Difficulty is set by design, never by measuring a model. Do not run `claude` or any benchmark
script, and do not tune a task toward or away from any model.

## The corpus
- Pristine copy (READ-ONLY, never modify): `$SNAP` (given in your assignment). It has no `docs/`.
- Work in APFS clones under your scratch directory: `cp -cR "$SNAP" <scratch>/w-<ID>` (fast,
  includes node_modules). Inside a clone: `pnpm exec vitest run` (whole suite ~8 s),
  `pnpm exec tsc --noEmit`.
- Layout: `src/lib`, `src/server/repositories` (Drizzle over SQLite), `src/server/services`,
  `src/server/jobs`, `src/actions/*`, `src/app/api`, `src/config`, `src/schemas`, `src/types`.
  Tests: `tests/**`, with `tests/helpers/db.ts` (`setupTestDb`, `resetTestDb`, `seedTwoTenants`)
  and `tests/helpers/factories.ts`. Copy the setup idiom of existing service tests exactly.

## What the agent under test sees
A fresh copy of the corpus with your `bug.patch` applied (if any), a CLAUDE.md saying "edit the
files needed, then stop; the change is judged by running the test suite", and your prompt plus
the anti-cheating rules (added by `scripts/build-task-set.py`). It may read everything and run
the visible suite. After it stops, the harness copies your hidden test to
`tests/hidden/<ID>.test.ts` and runs only that file. Pass = exit 0.

## What makes a task APEX (all required)
- **Breadth.** The reference solution touches at least 12 files across at least 4 layers
  (e.g. lib + repository + service + job/event handler + action/API + schema/migration), about
  300–600 changed lines of non-test code.
- **Hidden cases.** 20–30 cases, each derivable from the prompt plus the codebase's conventions.
- **Three traps or more.** A trap is a natural, near-complete solution that fails exactly one or
  two hidden cases. At least one trap per task belongs to each of these classes:
  1. *Invariant at scale, boundary or ordering* — correct for small inputs, wrong beyond a page,
     a batch, a limit, a tie, a window edge, a retry or replay, or an interleaving of two
     operations (the EFX2 class).
  2. *Right fix, wrong place* — fixing at the symptom's call site leaves a second entry point
     (another action, a job, an event handler, an export) still wrong; the fix belongs in a
     shared layer and its callers must change too.
  3. *Second cause* — one reported symptom has two independent causes; removing the obvious one
     still leaves the symptom on some inputs.
- **Discovery (fix tasks).** Symptoms only, as user/support reports; never file, function,
  table or variable names. Each symptom is at least three call-hops from its cause. Several
  injected defects interact, plus latent defects in the pristine code that the symptoms
  describe.
- **Implement tasks.** A product spec. Name only the new exports (path, name, signature) the
  hidden test calls, and every rule it checks; never say where existing logic to reuse lives.
- **New ground.** Do not reuse any scenario of the existing sets — the 45-task fix tasks, all of
  `tasks/hard`, `tasks/ultra` and `tasks/extreme` (read their task.json files) — or a close
  variant of one.

## Fair (equally required)
- One correct reading. If two reasonable engineers could implement the prompt differently and
  only one passes, rewrite the prompt.
- The hidden test exercises behaviour through public service/lib/action functions, never private
  internals, and never asserts on message wording the prompt does not fix; prefer the error
  classes in `src/lib/errors.ts`.
- **The hidden test needs nothing from the agent but source changes.** It may import only `@/…`
  source modules and `tests/helpers/db.ts` / `tests/helpers/factories.ts` as they exist in the
  pristine corpus. It must not import visible test doubles or support modules, and it must not
  need a new export from any test file (an extreme task failed for every model because its hidden
  test imported a visible test double that lacked an export).
- Deterministic: pin the clock (`vi.useFakeTimers()` + `vi.setSystemTime(...)`) in every case
  that touches time; no ordering flakiness; no network.
- The visible suite must not reveal the defects: with `bug.patch` applied, the full visible suite
  passes. Edit or delete visible assertions that would catch a defect in the same patch, minimally
  and naturally.

## Deliverables per task, in your worktree at `tasks/apex/<ID>/`
IDs: `AFX1-…`, `AFX2-…`, `AFX3-…` (fix) and `AIM1-…`, `AIM2-…`, `AIM3-…` (implement), each with
a short kebab-case slug.
- `task.json` — `{"id","category","prompt","grader":"vitest","spec":"tests/hidden/<ID>.test.ts",
  "hidden":[{"from":"apex/<ID>/hidden.test.ts","to":"tests/hidden/<ID>.test.ts"}],
  "patch":"apex/<ID>/bug.patch" (omit if none),"placeholder":false,"notes":"..."}`.
  The prompt's last line is exactly:
  fix → `This is a \`fix\` task: edit the code and stop. Do not write a summary and do not emit an ANSWER line.`
  implement → `This is an \`implement\` task: edit the code and stop, as for a \`fix\` task. Do not write a summary and do not emit an ANSWER line.`
  `notes`: what was injected or must be built, each trap and which hidden case catches it, and
  the validation numbers — in the style of the extreme notes.
- `bug.patch` (fix tasks; optional for implement) — `git diff` style with `a/` `b/` prefixes,
  relative to the corpus root, applies with `git apply -p1` to a pristine copy.
- `hidden.test.ts` — imports as if it lived at `tests/hidden/<ID>.test.ts`.
- `solution.patch` — the reference, applies on top of `bug.patch` (or the pristine corpus).
- `VALIDATION.md` — the commands you ran and their results. Short.

## Mandatory validation (fresh clones; record every result)
1. pristine + bug.patch: `git apply` clean; `tsc --noEmit` exit 0; full visible suite passes.
2. + hidden test: it fails; list the failing cases.
3. pristine + bug.patch + solution.patch + hidden: hidden passes; full suite passes; `tsc` exit 0.
4. One partial attempt per trap (at least three), each a natural near-complete solution; each
   fails the hidden test, and you record which cases catch it. Also a "revert only the injected
   defects" attempt for fix tasks.
5. Hidden test 3× and full suite 2× on the solved clone — all green every time.
A task that does not validate is fixed or replaced, never delivered.

## Do not
- Modify anything outside `tasks/apex/<your IDs>/` in your worktree; touch `$SNAP` or
  `corpus/taskflow`.
- Run `claude` or any benchmark script.

## Notes
- Schema changes are allowed: migrations are hand-written SQL in the corpus's drizzle migrations
  folder (inspect how `runMigrations` discovers them); include one in the reference solution when
  the feature needs it.
- Work one task at a time and finish its validation before starting the next.
