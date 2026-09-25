# HFX7-rewire-double-delivery — validation

Each step ran on a fresh APFS clone of the pristine corpus (`cp -cR corpus-v1 <clone>`), inside the clone:

```
git apply -p1 bug.patch            # step 1
pnpm exec tsc --noEmit             # step 1
pnpm exec vitest run               # step 1: full visible suite
cp hidden.test.ts tests/hidden/HFX7-rewire-double-delivery.test.ts
pnpm exec vitest run tests/hidden/HFX7-rewire-double-delivery.test.ts   # step 2: must fail
git apply -p1 solution.patch
pnpm exec vitest run tests/hidden/HFX7-rewire-double-delivery.test.ts   # step 3: must pass
pnpm exec vitest run               # step 3: full suite incl. hidden
pnpm exec tsc --noEmit             # step 3
# step 5: hidden test 3x on the solved clone
# step 4: second clone = pristine + bug.patch + naive.patch (+ a third clone for naive2.patch)
```

Naive fixes tried: naive.patch: unregisterEventHandlers() also calls resetEventBus(). naive2.patch: the registry never re-attaches after its first registration.

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
     × detaches exactly the handler whose unsubscribe was called 4ms
     × delivers every reaction once after the handlers were detached and re-attached 10ms
     × stays idempotent when registration is repeated without a detach 6ms
     × records nothing while detached, but in-app notifications still flow 5ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
AssertionError: expected 3 to be 1 // Object.is equality
AssertionError: expected 3 to be 1 // Object.is equality
AssertionError: expected 3 to be +0 // Object.is equality
      Tests  4 failed (4)

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
     × detaches exactly the handler whose unsubscribe was called 3ms
     × delivers every reaction once after the handlers were detached and re-attached 8ms
     × stays idempotent when registration is repeated without a detach 3ms
     × records nothing while detached, but in-app notifications still flow 3ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected +0 to be 1 // Object.is equality
      Tests  4 failed (4)

=== 4b. second naive fix ===
naive2 apply exit=0
hidden exit=1
     × detaches exactly the handler whose unsubscribe was called 6ms
     × delivers every reaction once after the handlers were detached and re-attached 20ms
     × stays idempotent when registration is repeated without a detach 5ms
     × records nothing while detached, but in-app notifications still flow 5ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected 1 to be +0 // Object.is equality
      Tests  4 failed (4)
```
