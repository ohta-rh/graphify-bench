# Brief: author the BROWNFIELD benchmark tasks for graphify-bench

## Why this set exists
The hidden-test sets so far give the agent a clean problem: a precise spec (ultra), or precise
symptoms over a codebase that is internally consistent (extreme, apex). Real work is messier:
the ticket leaves rules out, the documentation disagrees with itself, and the code carries
duplicated, drifted logic and misleading names. BROWNFIELD is six tasks — three `fix`, three
`implement` — where **every task combines all three**:

1. **Incomplete spec.** The prompt leaves out at least two rules the hidden test checks.
2. **Contradictory documentation.** The repository holds documents that disagree on at least one
   rule the hidden test checks.
3. **Technical debt.** The relevant logic exists in more than one drifted copy, behind misleading
   names or comments, next to dead or legacy paths.

What it measures is judgment under mess: finding the missing rules in the repository, deciding
which source is authoritative, and changing every live copy of a rule instead of the first one
found. Target: a strong senior engineer new to the repo needs 2–5 hours per task. The agent under
test gets up to 160 turns and $12.

Difficulty is set by design, never by measuring a model. Do not run `claude` or any benchmark
script, and do not tune a task toward or away from any model.

## The corpus and what the agent sees
Same as the APEX brief (`tasks/briefs/apex-authoring-brief.md`, sections "The corpus" and "What
the agent under test sees") — read it first, and read two extreme tasks and their notes to
calibrate. The pristine corpus has **no `docs/` directory**; your `bug.patch` creates every
document a task needs.

## Fairness is the hard part — required design
A messy task is only a benchmark if a careful engineer reaches exactly one answer.

- **Every omitted rule is determined by evidence in the repository**: existing behaviour of a
  sibling feature, an existing visible test, a schema constraint, an error class convention, or
  the authoritative document. In `notes`, write the evidence chain for each omitted rule
  (rule → where it is determined → why no other reading fits).
- **Documents carry a discoverable precedence rule.** The patch adds `docs/README.md` (or extends
  it — one shared file across all six tasks is fine; keep it identical) stating how documents rank,
  for example: ADRs in `docs/adr/` supersede product notes in `docs/product/`; a later ADR
  supersedes an earlier one only where it says so; code comments and `TODO`s are not
  authoritative; the code's current behaviour is authoritative where no document speaks. Each
  conflict in a task is resolved by that rule alone. Never resolve a conflict by a hidden
  preference.
- **The prompt never contradicts the authoritative source.** It may be terse, may omit rules, and
  may point at a document that a newer one supersedes ("as the billing notes describe") — but
  where it states a rule, that rule is true.
- **Technical debt is real debt, not a puzzle.** Drifted copies, a legacy entry point kept "for
  compatibility", a function whose name says the opposite of what it now does, a stale comment.
  The hidden test exercises every live entry point, so changing one copy fails; dead code that no
  entry point reaches is not tested.
- All the APEX fairness rules apply: public functions only, no assertions on unspecified wording,
  the hidden test imports only `@/…` and the pristine `tests/helpers/db.ts` / `factories.ts`, it
  needs nothing from the agent but source changes, the clock is pinned, the visible suite stays
  green with `bug.patch` applied.

## Shape of each task (all required)
- Reference solution: at least 8 files across at least 3 layers.
- Hidden test: 15–25 cases.
- At least three traps, one from each class, each a natural near-complete solution that fails one
  or two hidden cases:
  1. *Followed the wrong document* — implements the superseded or non-authoritative version.
  2. *Fixed one copy* — changes the copy the symptom points at and leaves another live copy
     (another action, job, export, API route, legacy entry point) on the old rule.
  3. *Filled a gap by guessing* — supplies an omitted rule from general convention instead of
     from the repository's evidence.
- Fix tasks: symptoms as user/support reports, no file/function names. Implement tasks: a product
  ticket that names only the new exports the hidden test calls (path, name, signature).
- New ground: no scenario or close variant of the 45-task fix tasks, `tasks/hard`, `tasks/ultra`,
  `tasks/extreme` or `tasks/apex`.

## Deliverables per task, in your worktree at `tasks/brownfield/<ID>/`
IDs: `BFX1-…`, `BFX2-…`, `BFX3-…` (fix) and `BIM1-…`, `BIM2-…`, `BIM3-…` (implement), each with a
short kebab-case slug. Same files and `task.json` shape as APEX, with `brownfield/<ID>/` paths;
every task has a `bug.patch` (it carries the documents and the debt). `notes` must include the
evidence chain for each omitted rule, each document conflict and the precedence line that
resolves it, each live copy of each debt-carrying rule, and each trap with the case that catches it.

## Mandatory validation (fresh clones; record every result)
1. pristine + bug.patch: `git apply` clean; `tsc --noEmit` exit 0; full visible suite passes.
2. + hidden test: it fails; list the failing cases.
3. pristine + bug.patch + solution.patch + hidden: hidden passes; full suite passes; `tsc` exit 0.
4. One partial attempt per trap class (three or more), each failing the hidden test; record which
   cases catch it.
5. Hidden test 3× and full suite 2× on the solved clone — green every time.
6. Fairness read-through: re-read the prompt, the documents and the precedence rule as if you had
   never seen the solution, and confirm each hidden case is forced by them. Record it in
   VALIDATION.md in one line per omitted rule and per conflict.
A task that does not validate is fixed or replaced, never delivered.

## Do not
- Modify anything outside `tasks/brownfield/<your IDs>/` in your worktree; touch `$SNAP` or
  `corpus/taskflow`.
- Run `claude` or any benchmark script.
