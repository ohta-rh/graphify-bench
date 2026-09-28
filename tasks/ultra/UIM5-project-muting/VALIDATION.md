# Validation — UIM5-project-muting

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by the author's `validate.sh`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/UIM5-project-muting.test.ts`: `pnpm exec vitest run tests/hidden/UIM5-project-muting.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden test included)
4. two naive implementations + hidden: `pnpm exec vitest run tests/hidden/UIM5-project-muting.test.ts`
5. the hidden test 3x on the solved clone.

The patch is git-format (`diff --git a/… b/…`) and was applied with `patch -p1`.
Git could not be run outside the author's worktree in this session.

Naive attempts (step 4):
- A, the obvious call sites only: the mute API and storage, the notify() rule, and projectId passed by the `issue.assigned` and `issue.overdue` subscribers. The `comment.created` subscriber, whose event has no projectId, and the digest were left alone.
- B, every call site, but the existing rules were ignored: muted personal kinds are forced to `["in_app"]` whatever the recipient's preferences say, and the digest drops muted entries after it has applied `DIGEST_MAX_ENTRIES`.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  11 failed (11)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  628 passed (628)
step4 naive A
  tsc exit=0
  hidden exit=1
         × drops comment notifications about a muted project, for that member only
         × delivers a mention from a muted project in-app only
         × leaves a muted project out of the digest until it is unmuted
         × applies the digest cap to what is left after muting
         × does not digest an in-app mention from a muted project
          Tests  5 failed | 6 passed (11)
step4 naive B
  tsc exit=0
  hidden exit=1
         × delivers assignments in-app only, and not at all when the in-app channel is off
         × applies the digest cap to what is left after muting
          Tests  2 failed | 9 passed (11)
step5 determinism
  run1 exit=0   Tests  11 passed (11)
  run2 exit=0   Tests  11 passed (11)
  run3 exit=0   Tests  11 passed (11)
```

Determinism: the digest cases use fixed instants (`vi.setSystemTime` for the writes and an explicit
`now` for the job), and each case has its own tenant and its own digest hour. Mails are filtered by
recipient address, and no assertion depends on generated ids or on ordering within a timestamp tie.
