# Brief: author HARD benchmark tasks for graphify-bench

## Why these tasks exist
graphify-bench runs headless `claude -p` agents on a synthetic Next.js/TypeScript SaaS called
Taskflow (multi-tenant project/issue tracker: organizations, members/roles, projects, issues,
comments/mentions, notifications, digests, billing/plan limits, webhooks, search, feature flags).
The existing 45-task set is too easy: Haiku 4.5 already scores 80%, Sonnet 5 84%, and it cannot
separate Opus 5.5 from Sonnet 5. We need a HARD set where a strong model should measurably beat
a weaker one. Every task is graded ONLY by a hidden vitest file that the agent never sees.

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

## What makes a task HARD (required) — and FAIR (equally required)
Hard:
- The cause/feature spans **at least 3 files across at least 2 layers** (e.g. lib + service +
  repository, or config + service + action).
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
- A strong senior engineer new to the repo should solve it in 15–40 minutes.

## Deliverables per task, in YOUR WORKTREE at `tasks/hard/<ID>/`
- `task.json` — one object:
  `{"id","category","prompt","grader":"vitest","spec":"tests/hidden/<ID>.test.ts",
    "hidden":[{"from":"hard/<ID>/hidden.test.ts","to":"tests/hidden/<ID>.test.ts"}],
    "patch":"hard/<ID>/bug.patch" (omit if none),"placeholder":false,"notes":"..."}`
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
4. Naive-fix check: apply only the most obvious partial fix (e.g. fix one of the defects, or a
   happy-path-only implementation) and confirm the hidden test still fails. Record what you tried.
5. Run the hidden test 3 times on the solved copy to confirm determinism.
If any step fails, fix the task; a task that does not validate must not be delivered.

## Do not
- Do not modify anything outside `tasks/hard/<your IDs>/` in your worktree, and never touch
  `$SNAP` or `corpus/taskflow`.
- Do not run `claude` or any benchmark scripts.
- Do not reuse the scenarios of the existing fix tasks (tenant leak on issue list, project quota
  off-by-one, board shows archived, CSV quote escape, mention inside code, last owner removable,
  advanced search inverted, self-notification, revoked invite accepted) — pick different ground.
