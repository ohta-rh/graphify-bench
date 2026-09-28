# Validation — EIM2-issue-import

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git cannot be run outside the author's worktree in this session, so
the patch was produced with `diff -u` rewritten into git format (`diff --git a/… b/…`, `--- a/…`,
`+++ b/…`, `new file mode 100644` + `--- /dev/null` for new files) and applied with `patch -p1`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM2-issue-import.test.ts`: `pnpm exec vitest run tests/hidden`
3. pristine + `patch -p1 --dry-run -i solution.patch` + `patch -p1 -i solution.patch` + hidden:
   `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations (solution clone minus the part named below) + hidden:
   `pnpm exec tsc --noEmit` (all three typecheck) ; `pnpm exec vitest run tests/hidden`
5. the hidden test three times on the solved clone.

Naive attempts (step 4):
- A, the obvious implementation: `importIssues` resolves labels and assignees and then calls
  `createIssue` once per row — per-issue events, no replay ledger, no batch quota, no rate allowance.
- B, careful: repository inserts, the replay ledger, the batch quota and rate allowance, and a single
  `issues.imported` event — but nothing subscribes to that event, so search, the usage meter and the
  audit log never hear about the batch.
- C, near-complete, falls into the trap: everything, but labels are resolved against a snapshot
  taken once per import that is not updated when a label is created (and a row's names are not
  de-duplicated) — the second row naming a new label inserts it again and trips the unique index.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  18 failed (18)      (TypeError: importIssues is not a function, …)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  635 passed (635)
step4 naive A
  tsc exit=0
  hidden exit=1
         × publishes exactly one issues.imported event and no issue.created
         × records one audit entry for the import, about the project, and none per issue
         × creates no webhook deliveries for an import
         × replays the same key without creating anything, whatever the rows say
         × applies the per-project issue quota to the whole batch and creates nothing when it does not fit
         × refuses an import the workspace's rate allowance cannot cover, creating nothing and burning no key
          Tests  6 failed | 12 passed (18)
step4 naive B
  tsc exit=0
  hidden exit=1
         × makes imported issues searchable right away
         × raises the issues-used meter by the batch size, in step with a full recount
         × records one audit entry for the import, about the project, and none per issue
          Tests  3 failed | 15 passed (18)
step4 naive C
  tsc exit=0
  hidden exit=1
         × links existing labels by exact name and creates missing ones once
          Tests  1 failed | 17 passed (18)
step5 determinism
  run1 exit=0   Tests  18 passed (18)
  run2 exit=0   Tests  18 passed (18)
  run3 exit=0   Tests  18 passed (18)
```

Determinism: no wall-clock dependence (due dates are fixed literals); every case has its own tenant;
the rate-limit double is reset after each case; label ids are compared as sorted sets; the event
handlers are attached once per file through `registerEventHandlers()` and detached at the end.
