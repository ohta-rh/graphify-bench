# HIM2-merge-labels — validation

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
| 2 pristine + hidden | hidden exit 1 — all 6 fail (`mergeLabels is not a function`, schema undefined) |
| 3 pristine + solution + hidden | patch applies clean; `tsc --noEmit` exit 0; full suite **617 passed**; hidden **6/6 passed** |
| 4 naive attempt | see below |
| 5 determinism | hidden 6/6 passed on 3 consecutive runs of the solved clone |

Step 4: Naive = `UPDATE issue_labels SET label_id = target WHERE label_id = source`, delete source, permission `project:update` (the create/update-label permission), no existence check. Result: tsc 0, hidden **3/6 fail** — `SqliteError: UNIQUE constraint failed: issue_labels.issue_id, issue_labels.label_id` for an issue carrying both, member not refused, foreign target id accepted and the source links wiped.
