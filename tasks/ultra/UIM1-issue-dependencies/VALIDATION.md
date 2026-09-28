# UIM1-issue-dependencies — validation

All runs on fresh APFS clones of `corpus-v1` (`cp -cR "$SNAP" <clone>`), vitest 4.1.11, 2026-09-28.
No `bug.patch` (implement task). `solution.patch` was produced with `git diff --no-index` (a/ b/ prefixes)
and applied with `patch -p1 -d <clone> -i solution.patch` (the agent sandbox blocks `git -C <scratch clone>`).

| Step | Command (in the clone) | Result |
|---|---|---|
| 1 pristine | `pnpm exec tsc --noEmit` / `pnpm exec vitest run` | exit 0 / 73 files, 617 passed |
| 2 pristine + hidden | `pnpm exec vitest run tests/hidden/UIM1-issue-dependencies.test.ts` | exit 1 — `Failed to resolve import "@/server/services/issue-dependency-service"` (all 13 cases fail) |
| 3 + solution | `patch -p1 …` / `tsc --noEmit` / `vitest run` | apply clean / exit 0 / 74 files, 630 passed (617 + 13 hidden) |
| 4a naive: happy path | plain insert (no self/archive/cycle/duplicate guard), notify on any transition into done/canceled, no archive reaction | 5/13 fail (duplicate link, cycles, archived link, closed→closed re-notify, archive unblock) |
| 4b naive: one interaction missed | everything right except archiving an already-closed blocker notifies again | 1/13 fail ("treats archiving an open blocker as closing it, but not an already-closed one") |
| 5 determinism | hidden test run 3× on the solved clone | 13/13, 13/13, 13/13 |
