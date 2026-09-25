# HFX2-seat-accounting validation

Fresh APFS clones of corpus-v1 (`cp -cR`). Patches applied with
`git apply --unsafe-paths --directory=<clone> -p1 <patch>` (clean, no fuzz).
Tests: `pnpm exec vitest run` (full) and `pnpm exec vitest run tests/hidden/<ID>.test.ts`; typecheck `pnpm exec tsc --noEmit`.

## 1-2. pristine + bug.patch (tsc, full visible suite, then hidden installed)

```
== step1 HFX2-seat-accounting @ v-HFX2
  tsc --noEmit: exit=0
  full suite: exit=0 Test Files  73 passed (73) | Tests  617 passed (617)
  hidden: exit=1 Test Files  1 failed (1) | Tests  5 failed | 1 passed (6)
    × drops seat usage as soon as the member is removed 13ms
    × keeps the seat released after the periodic usage recount 5ms
    × lets a workspace downgrade once it has removed enough members 4ms
    × frees the seat of a revoked invitation for a new invite 4ms
    × re-sends an invitation in a full workspace without taking a second seat 4ms
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: removing a member gives the seat back > drops seat usage as soon as the member is removed
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: removing a member gives the seat back > keeps the seat released after the periodic usage recount
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: removing a member gives the seat back > lets a workspace downgrade once it has removed enough members
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > frees the seat of a revoked invitation for a new invite
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > re-sends an invitation in a full workspace without taking a second seat
    AssertionError: expected 4 to be 3 // Object.is equality
    AssertionError: expected 4 to be 2 // Object.is equality
    Error: Cannot move to free: 4 seats exceeds its limit of 3
    Error: Plan starter includes 10 seats and 10 are taken
    Error: Plan starter includes 10 seats and 10 are taken
```

## 3 + 5. + solution.patch (hidden x3, full suite incl. hidden, tsc)

```
== step3 HFX2-seat-accounting @ v-HFX2
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  full suite: exit=0 Test Files  74 passed (74) | Tests  623 passed (623)
  tsc --noEmit: exit=0
```

## 4. Naive partial fixes (pristine + bug.patch + partial fix)

- restore only the `member.removed` usage listener:

```
== naive HFX2-seat-accounting @ n-HFX2-listener-only
  hidden: exit=1 Test Files  1 failed (1) | Tests  3 failed | 3 passed (6)
    × keeps the seat released after the periodic usage recount 12ms
    × frees the seat of a revoked invitation for a new invite 6ms
    × re-sends an invitation in a full workspace without taking a second seat 6ms
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: removing a member gives the seat back > keeps the seat released after the periodic usage recount
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > frees the seat of a revoked invitation for a new invite
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > re-sends an invitation in a full workspace without taking a second seat
    AssertionError: expected 4 to be 2 // Object.is equality
    Error: Plan starter includes 10 seats and 10 are taken
    Error: Plan starter includes 10 seats and 10 are taken
```

- restore the listener and the recount filter, not the invitation count:

```
== naive HFX2-seat-accounting @ n-HFX2-listener-recount
  hidden: exit=1 Test Files  1 failed (1) | Tests  2 failed | 4 passed (6)
    × frees the seat of a revoked invitation for a new invite 17ms
    × re-sends an invitation in a full workspace without taking a second seat 10ms
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > frees the seat of a revoked invitation for a new invite
    FAIL  tests/hidden/HFX2-seat-accounting.test.ts > HFX2: revoking an invitation gives the seat back > re-sends an invitation in a full workspace without taking a second seat
    Error: Plan starter includes 10 seats and 10 are taken
    Error: Plan starter includes 10 seats and 10 are taken
```
