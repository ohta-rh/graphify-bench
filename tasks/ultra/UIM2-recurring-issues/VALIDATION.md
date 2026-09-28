# UIM2-recurring-issues — validation

All runs on fresh APFS clones of `corpus-v1` (`cp -cR "$SNAP" <clone>`), vitest 4.1.11, 2026-09-28.
No `bug.patch` (implement task). `solution.patch` was produced with `git diff --no-index` (a/ b/ prefixes)
and applied with `patch -p1 -d <clone> -i solution.patch` (the agent sandbox blocks `git -C <scratch clone>`).
The hidden test fakes only `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`) and passes explicit instants to the job.

| Step | Command (in the clone) | Result |
|---|---|---|
| 1 pristine | `pnpm exec tsc --noEmit` / `pnpm exec vitest run` | exit 0 / 73 files, 617 passed |
| 2 pristine + hidden | `pnpm exec vitest run tests/hidden/UIM2-recurring-issues.test.ts` | exit 1 — `Failed to resolve import "@/server/jobs/recurring-issue-job"` (all 14 cases fail) |
| 3 + solution | `patch -p1 …` / `tsc --noEmit` / `vitest run` | apply clean / exit 0 / 74 files, 631 passed (617 + 14 hidden) |
| 4a naive: happy path | calendar days in UTC, creator loss never pauses, occurrence consumed even when creation fails | 3/14 fail (time-zone boundary, creator demoted/removed, quota retry) |
| 4b naive: one interaction missed | everything right except the occurrence is consumed when the issue quota refuses the issue | 1/14 fail ("leaves the rule to retry when the project's issue quota refuses the issue") |
| 5 determinism | hidden test run 3× on the solved clone | 14/14, 14/14, 14/14 |
