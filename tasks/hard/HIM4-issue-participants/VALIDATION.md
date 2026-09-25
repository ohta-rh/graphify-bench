# HIM4-issue-participants — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR $SNAP <clone>`); no bug.patch (implement task).

```
# 1  pristine
pnpm exec tsc --noEmit ; pnpm exec vitest run
# 2  pristine + hidden
cp hidden.test.ts <clone>/tests/hidden/<ID>.test.ts ; pnpm exec vitest run tests/hidden/<ID>.test.ts
# 3  pristine + solution.patch (+ hidden)
patch -p1 < solution.patch        # also: git apply --check -p1 solution.patch -> exit 0
pnpm exec tsc --noEmit ; pnpm exec vitest run ; pnpm exec vitest run tests/hidden/<ID>.test.ts
# 4  pristine + naive patch (+ hidden)
# 5  hidden test x3 on the solved clone
```

| step | result |
|---|---|
| 1 pristine | `tsc --noEmit` exit 0; full suite 73 files / **617 passed** |
| 2 pristine + hidden | hidden exit 1 — all 6 fail (`getIssueParticipants is not a function`, `listCommentAuthorIds is not a function`, schema undefined) |
| 3 pristine + solution + hidden | patch applies clean; `tsc --noEmit` exit 0; full suite **617 passed**; hidden **6/6 passed** |
| 4 naive attempt | see below |
| 5 determinism | hidden 6/6 passed on 3 consecutive runs of the solved clone |

Step 4: Naive = author + assignee + distinct comment authors without the deleted-comment filter and without the active-membership filter. Result: tsc 0, hidden **3/6 fail** — deleted-comment author returned, removed member (issue author + commenter) returned, repository returns deleted-comment author.
