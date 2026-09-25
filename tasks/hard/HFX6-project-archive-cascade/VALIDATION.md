# HFX6-project-archive-cascade — validation

Each step ran on a fresh APFS clone of the pristine corpus (`cp -cR corpus-v1 <clone>`), inside the clone:

```
git apply -p1 bug.patch            # step 1
pnpm exec tsc --noEmit             # step 1
pnpm exec vitest run               # step 1: full visible suite
cp hidden.test.ts tests/hidden/HFX6-project-archive-cascade.test.ts
pnpm exec vitest run tests/hidden/HFX6-project-archive-cascade.test.ts   # step 2: must fail
git apply -p1 solution.patch
pnpm exec vitest run tests/hidden/HFX6-project-archive-cascade.test.ts   # step 3: must pass
pnpm exec vitest run               # step 3: full suite incl. hidden
pnpm exec tsc --noEmit             # step 3
# step 5: hidden test 3x on the solved clone
# step 4: second clone = pristine + bug.patch + naive.patch (+ a third clone for naive2.patch)
```

Naive fixes tried: naive.patch: project service counts live issues before the (still buggy) cascade and reports that count. naive2.patch: usage listener recomputes usage on project.archived instead of applying the delta.

The hidden test also passes on the untouched pristine corpus (the solution patch restores it).

## Output

```
=== 1. pristine + bug.patch: git apply ===
git apply exit=0

=== 1. tsc --noEmit ===
tsc exit=0

=== 1. full visible suite ===
vitest exit=0
 Test Files  73 passed (73)
      Tests  617 passed (617)

=== 2. bug + hidden test ===
hidden exit=1
     × touches only the live issues and keeps every counter honest 37ms
     × reports zero when every issue was already archived 12ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 5 to be 3 // Object.is equality
AssertionError: expected 1 to be +0 // Object.is equality
      Tests  2 failed (2)

=== 3. bug + solution + hidden ===
solution apply exit=0
hidden exit=0
      Tests  2 passed (2)
full suite (incl hidden) exit=0
 Test Files  74 passed (74)
      Tests  619 passed (619)
tsc exit=0

=== 5. hidden x3 on solved copy ===
run 1 exit=0
run 2 exit=0
run 3 exit=0

=== 4. naive fix: bug + naive.patch + hidden ===
bug apply exit=0
naive apply exit=0
hidden exit=1
     × touches only the live issues and keeps every counter honest 21ms
     × reports zero when every issue was already archived 6ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected '2026-03-15T16:30:00.000Z' to be '2026-02-01T10:00:00.000Z' // Object.is equality
AssertionError: expected '2026-03-15T16:30:00.000Z' to be '2026-02-01T10:00:00.000Z' // Object.is equality
      Tests  2 failed (2)

=== 4b. second naive fix ===
naive2 apply exit=0
hidden exit=1
     × touches only the live issues and keeps every counter honest 18ms
     × reports zero when every issue was already archived 6ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 5 to be 3 // Object.is equality
AssertionError: expected 1 to be +0 // Object.is equality
      Tests  2 failed (2)
```
