# HFX8-settings-save-resets — validation

Each step ran on a fresh APFS clone of the pristine corpus (`cp -cR corpus-v1 <clone>`), inside the clone:

```
git apply -p1 bug.patch            # step 1
pnpm exec tsc --noEmit             # step 1
pnpm exec vitest run               # step 1: full visible suite
cp hidden.test.ts tests/hidden/HFX8-settings-save-resets.test.ts
pnpm exec vitest run tests/hidden/HFX8-settings-save-resets.test.ts   # step 2: must fail
git apply -p1 solution.patch
pnpm exec vitest run tests/hidden/HFX8-settings-save-resets.test.ts   # step 3: must pass
pnpm exec vitest run               # step 3: full suite incl. hidden
pnpm exec tsc --noEmit             # step 3
# step 5: hidden test 3x on the solved clone
# step 4: second clone = pristine + bug.patch + naive.patch (+ a third clone for naive2.patch)
```

Naive fixes tried: naive.patch: keep the full-schema parse but re-apply the stored flag overrides when none were sent. naive2.patch: parse with `organizationSettingsSchema.partial()` (zod 4 still fills defaults).

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
     × keeps admin-enabled flags and the digest hour when another setting is saved 16ms
     × still applies values that are sent on purpose, including 0, false and [] 4ms
     × never touches another workspace's settings 5ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 7 to be 18 // Object.is equality
AssertionError: expected 7 to be +0 // Object.is equality
AssertionError: expected [] to deeply equal [ 'digest_email' ]
      Tests  3 failed | 1 passed (4)

=== 3. bug + solution + hidden ===
solution apply exit=0
hidden exit=0
      Tests  4 passed (4)
full suite (incl hidden) exit=0
 Test Files  74 passed (74)
      Tests  621 passed (621)
tsc exit=0

=== 5. hidden x3 on solved copy ===
run 1 exit=0
run 2 exit=0
run 3 exit=0

=== 4. naive fix: bug + naive.patch + hidden ===
bug apply exit=0
naive apply exit=0
hidden exit=1
     × keeps admin-enabled flags and the digest hour when another setting is saved 30ms
     × still applies values that are sent on purpose, including 0, false and [] 12ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 7 to be 18 // Object.is equality
AssertionError: expected 7 to be +0 // Object.is equality
      Tests  2 failed | 2 passed (4)

=== 4b. second naive fix ===
naive2 apply exit=0
hidden exit=1
     × keeps admin-enabled flags and the digest hour when another setting is saved 27ms
     × still applies values that are sent on purpose, including 0, false and [] 6ms
     × never touches another workspace's settings 13ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 7 to be 18 // Object.is equality
AssertionError: expected 7 to be +0 // Object.is equality
AssertionError: expected [] to deeply equal [ 'digest_email' ]
      Tests  3 failed | 1 passed (4)
```
