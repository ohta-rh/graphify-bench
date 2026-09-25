# HIM3-change-project-lead — validation

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
| 2 pristine + hidden | hidden exit 1 — all 9 fail (`ROLE_MATRIX["project:change_lead"]` undefined, `changeProjectLead is not a function`, schema undefined) |
| 3 pristine + solution + hidden | patch applies clean; `tsc --noEmit` exit 0; full suite **617 passed**; hidden **9/9 passed** |
| 4 naive attempt | see below |
| 5 determinism | hidden 9/9 passed on 3 consecutive runs of the solved clone |

Step 4: Naive = add the action to the union and role table only (no ownership escalation), service checks `project:change_lead` + archived and writes the lead without validating the candidate. Result: tsc 0, hidden **4/9 fail** — current lead (member) refused, viewer accepted as lead, other-org user / removed member accepted as lead, `can()` false for the lead.
