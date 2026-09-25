# HFX5-paging-ties — validation

Each step ran on a fresh APFS clone of the pristine corpus (`cp -cR corpus-v1 <clone>`), inside the clone:

```
git apply -p1 bug.patch            # step 1
pnpm exec tsc --noEmit             # step 1
pnpm exec vitest run               # step 1: full visible suite
cp hidden.test.ts tests/hidden/HFX5-paging-ties.test.ts
pnpm exec vitest run tests/hidden/HFX5-paging-ties.test.ts   # step 2: must fail
git apply -p1 solution.patch
pnpm exec vitest run tests/hidden/HFX5-paging-ties.test.ts   # step 3: must pass
pnpm exec vitest run               # step 3: full suite incl. hidden
pnpm exec tsc --noEmit             # step 3
# step 5: hidden test 3x on the solved clone
# step 4: second clone = pristine + bug.patch + naive.patch (+ a third clone for naive2.patch)
```

Naive fixes tried: naive.patch: range becomes `lte` on the sort column (inclusive). naive2.patch: row-value predicate fixed locally in the notification repository only.

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
     × walks the whole notification inbox, once each, in listing order 9ms
     × walks the whole audit log, once each, in listing order 2ms
     × walks the whole issue list, once each, in listing order 4ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ '0000000000000000000000000X', …(3) ] to deeply equal [ '0000000000000000000000000X', …(6) ]
AssertionError: expected [ '00000000000000000000000015', …(2) ] to deeply equal [ '00000000000000000000000015', …(6) ]
AssertionError: expected [ '0000000000000000000000001B', …(1) ] to deeply equal [ '0000000000000000000000001B', …(4) ]
      Tests  3 failed (3)

=== 3. bug + solution + hidden ===
solution apply exit=0
hidden exit=0
      Tests  3 passed (3)
full suite (incl hidden) exit=0
 Test Files  74 passed (74)
      Tests  620 passed (620)
tsc exit=0

=== 5. hidden x3 on solved copy ===
run 1 exit=0
run 2 exit=0
run 3 exit=0

=== 4. naive fix: bug + naive.patch + hidden ===
bug apply exit=0
naive apply exit=0
hidden exit=1
     × walks the whole notification inbox, once each, in listing order 31ms
     × walks the whole audit log, once each, in listing order 8ms
     × walks the whole issue list, once each, in listing order 20ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ '0000000000000000000000000X', …(39) ] to deeply equal [ '0000000000000000000000000X', …(6) ]
AssertionError: expected [ '00000000000000000000000015', …(39) ] to deeply equal [ '00000000000000000000000015', …(6) ]
AssertionError: expected [ '0000000000000000000000001B', …(39) ] to deeply equal [ '0000000000000000000000001B', …(4) ]
      Tests  3 failed (3)

=== 4b. second naive fix ===
naive2 apply exit=0
hidden exit=1
     × walks the whole audit log, once each, in listing order 6ms
     × walks the whole issue list, once each, in listing order 14ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ '00000000000000000000000015', …(2) ] to deeply equal [ '00000000000000000000000015', …(6) ]
AssertionError: expected [ '0000000000000000000000001B', …(1) ] to deeply equal [ '0000000000000000000000001B', …(4) ]
      Tests  2 failed | 1 passed (3)
```
