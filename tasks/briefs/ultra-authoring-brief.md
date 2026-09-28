# Brief: author ULTRA-HARD benchmark tasks for graphify-bench

## Why these tasks exist
graphify-bench runs headless `claude -p` agents on a synthetic Next.js/TypeScript SaaS called
Taskflow (multi-tenant project/issue tracker: organizations, members/roles, projects, issues,
comments/mentions, notifications, digests, billing/plan limits, webhooks, search, feature flags).
Two sets already exist and are too easy. The 45-task set sits at a ~84% ceiling for every model.
The 16-task HARD set (tasks/tasks-hard.json, tasks/hard/<ID>/ — read 2–3 of them to calibrate)
was solved 32/32 by Opus 5.5 at EVERY effort level (low..xhigh) and by Sonnet 5 at xhigh.
We now need an ULTRA-HARD set on which even Opus 5.5 at xhigh fails a meaningful share —
target: a strong senior engineer new to the repo needs 1–3 hours per task. Every task is graded
ONLY by a hidden vitest file that the agent never sees. The agent gets up to 120 turns and $8.

## The corpus
- Pristine copy (READ-ONLY, never modify): `$SNAP` (given in your assignment).
- Make your own working copies with APFS clones: `cp -cR "$SNAP" <your scratch dir>/w-<ID>` (fast,
  includes node_modules). Tests: `pnpm exec vitest run` (whole suite ~8 s), typecheck
  `pnpm exec tsc --noEmit`, both run inside the copy.
- Layout: `src/lib` (permissions, tenant, pagination, mentions, csv, rate-limit, feature-flags...),
  `src/server/repositories` (Drizzle over SQLite), `src/server/services` (business rules,
  event bus/registry), `src/server/jobs`, `src/actions/*` (Next server actions), `src/config`
  (plan limits, nav), `src/schemas` (zod), `src/types`.
- Tests: `tests/**` with `tests/helpers/db.ts` (`setupTestDb`, `resetTestDb`, `seedTwoTenants` on
  in-memory SQLite) and `tests/helpers/factories.ts`. Read several existing service tests
  (e.g. `tests/services/*.test.ts`) first and copy their setup idiom exactly.

## What the agent under test sees
The agent gets a fresh copy of the corpus (with your `bug.patch` applied, if any), a CLAUDE.md
saying "edit the files needed, then stop; the change is judged by running the test suite", and
your prompt. It may read everything and run the visible test suite. It then stops; afterwards
the harness copies your hidden test to `tests/hidden/<ID>.test.ts` and runs ONLY that file.
Pass = exit 0.

## What makes a task ULTRA-HARD (required) — and FAIR (equally required)
Ultra-hard (all of these, not some):
- The cause/feature spans **at least 5 files across at least 3 layers** (e.g. lib + repository +
  service + job/event handler + config/schema). The reference solution should be ~80–300 changed
  lines of non-test code.
- The hidden test has **8–15 cases**, most of them edge cases the prompt makes derivable, so a
  solution that gets the main idea right but misses one interaction fails.
- Interactions: the defects/rules must INTERACT — fixing them in isolation, or in the wrong
  place (at a caller instead of the shared helper, or vice versa), produces a state the hidden
  test catches (double counting, ordering, tenant leak, idempotency, retry/replay, soft-delete
  resurrection, time-zone/day boundary, pagination cursor stability, event emitted before/after
  commit, cache invalidation).
- It must be clearly harder than every task in tasks/hard/. Do not reuse any hard-set scenario
  (webhook switch-off, seat accounting, flag overrides, digest recipients, paging ties, project
  archive cascade, event-bus rewire, settings save resets, bulk archive, merge labels, change
  project lead, issue participants, free viewer seats, private project visibility, issue
  unassigned event, archived project freeze) nor the 45-task fix scenarios.
- For fix tasks the prompt describes **symptoms only** (user-visible behaviour), never file,
  function or variable names, and the symptom is several call-hops away from the cause.
- Multi-defect tasks are encouraged: 2–3 injected defects that must ALL be fixed, where fixing
  the obvious one still leaves the hidden test failing. The prompt must state every symptom.
- Edge cases (tenant isolation, archived/soft-deleted rows, boundary values, role hierarchy,
  ordering/ties, idempotency) that a careless fix misses — but ONLY edge cases the prompt makes
  derivable. The hidden test must never check behaviour the prompt + codebase conventions do not
  determine.
- The visible suite must NOT reveal the defect: after `bug.patch`, the whole visible suite must
  still pass (edit or delete the visible assertions that would catch it IN THE SAME PATCH, and
  keep such edits minimal and natural-looking). Otherwise the agent just runs the tests.
Fair:
- One correct reading. For implement tasks, the prompt names the exact exported function(s),
  module path(s) where they must live, signatures, and every rule the test checks. It may name
  files for implement tasks (the interface must be pinned), but not tell the agent WHERE the
  existing logic to reuse/modify lives.
- The hidden test exercises behaviour through public service/lib functions, never private
  internals, and never asserts on error message wording unless the prompt specifies it (prefer
  asserting on error class / code already used in the codebase, e.g. those in `src/lib/errors.ts`).
- Deterministic: no wall-clock dependence (use fixed dates / fake timers as existing tests do),
  no ordering flakiness.
- A strong senior engineer new to the repo should solve it in 1–3 hours — hard because of breadth,
  interaction and edge cases, never because of ambiguity or trickery.

## Deliverables per task, in YOUR WORKTREE at `tasks/ultra/<ID>/`
- `task.json` — one object:
  `{"id","category","prompt","grader":"vitest","spec":"tests/hidden/<ID>.test.ts",
    "hidden":[{"from":"ultra/<ID>/hidden.test.ts","to":"tests/hidden/<ID>.test.ts"}],
    "patch":"ultra/<ID>/bug.patch" (omit if none),"placeholder":false,"notes":"..."}`
  - category: `"fix"` or `"implement"`.
  - prompt tail, last line exactly:
    fix → `This is a \`fix\` task: edit the code and stop. Do not write a summary and do not emit an ANSWER line.`
    implement → `This is an \`implement\` task: edit the code and stop, as for a \`fix\` task. Do not write a summary and do not emit an ANSWER line.`
  - notes: what was injected / what must be built, why it is hard, and the validation numbers.
- `bug.patch` (fix tasks; optional for implement) — `git diff`-style with `a/` `b/` prefixes,
  relative to the corpus root, applies with `git apply -p1` to a pristine copy.
- `hidden.test.ts` — imports via the `@/` alias and `../helpers/...` exactly as if it lived at
  `tests/hidden/<ID>.test.ts`.
- `solution.patch` — reference fix/implementation, applies on top of bug.patch (or pristine).
- `VALIDATION.md` — the exact commands you ran and their results (below). Short.

## Mandatory validation (all on fresh clones, record results)
1. pristine + bug.patch: `git apply` clean; `tsc --noEmit` exit 0; FULL visible suite passes.
2. pristine + bug.patch + hidden test installed: hidden test FAILS (show which assertions).
3. pristine + bug.patch + solution.patch + hidden test: hidden test PASSES; full suite passes;
   `tsc --noEmit` exit 0.
4. Naive-fix check (do TWO distinct plausible partial attempts, both must fail): apply only the most obvious partial fix (e.g. fix one of the defects, or a
   happy-path-only implementation) and confirm the hidden test still fails. Record what you tried.
5. Run the hidden test 3 times on the solved copy to confirm determinism.
If any step fails, fix the task; a task that does not validate must not be delivered.

## Do not
- Do not modify anything outside `tasks/ultra/<your IDs>/` in your worktree, and never touch
  `$SNAP` or `corpus/taskflow`.
- Do not run `claude` or any benchmark scripts.
- Do not reuse the scenarios of the existing fix tasks (tenant leak on issue list, project quota
  off-by-one, board shows archived, CSV quote escape, mention inside code, last owner removable,
  advanced search inverted, self-notification, revoked invite accepted) — pick different ground.

## Extra notes for this set
- Schema changes are allowed when the task needs them: migrations are hand-written SQL under the
  corpus's drizzle migrations folder (inspect how `runMigrations` discovers them) and the
  reference solution must include one if the feature needs one. Say so in the prompt only if the
  prompt would otherwise be ambiguous.
- Cleanup: delete your clones when finished only if the permission gate allows it; if it refuses,
  leave them and say so — never try to work around the gate, and do not ask the Director to delete
  them for you.
