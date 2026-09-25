# HFX3-flag-overrides validation

Fresh APFS clones of corpus-v1 (`cp -cR`). Patches applied with
`git apply --unsafe-paths --directory=<clone> -p1 <patch>` (clean, no fuzz).
Tests: `pnpm exec vitest run` (full) and `pnpm exec vitest run tests/hidden/<ID>.test.ts`; typecheck `pnpm exec tsc --noEmit`.

## 1-2. pristine + bug.patch (tsc, full visible suite, then hidden installed)

```
== step1 HFX3-flag-overrides @ v-HFX3
  tsc --noEmit: exit=0
  full suite: exit=0 Test Files  73 passed (73) | Tests  616 passed (616)
  hidden: exit=1 Test Files  1 failed (1) | Tests  4 failed | 2 passed (6)
    × turns the feature back off for a plan that does not include it 14ms
    × leaves the workspace's other overrides alone 5ms
    × refuses to switch on a plan-only feature and stores nothing 4ms
    × ignores a plan-only override that is already stored 3ms
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: switching an override off > turns the feature back off for a plan that does not include it
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: switching an override off > leaves the workspace's other overrides alone
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: plan-only features > refuses to switch on a plan-only feature and stores nothing
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: plan-only features > ignores a plan-only override that is already stored
    AssertionError: expected [ 'kanban_board' ] to not include 'kanban_board'
    AssertionError: expected [ 'activity_feed', 'digest_email' ] to deeply equal [ 'activity_feed' ]
    AssertionError: promise resolved "{ …(11) }" instead of rejecting
    AssertionError: expected true to be false // Object.is equality
```

## 3 + 5. + solution.patch (hidden x3, full suite incl. hidden, tsc)

```
== step3 HFX3-flag-overrides @ v-HFX3
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  hidden: exit=0 Test Files  1 passed (1) | Tests  6 passed (6)
  full suite: exit=0 Test Files  74 passed (74) | Tests  622 passed (622)
  tsc --noEmit: exit=0
```

## 4. Naive partial fixes (pristine + bug.patch + partial fix)

- fix only the override set-merge in updateOrg:

```
== naive HFX3-flag-overrides @ n-HFX3-repo-only
  hidden: exit=1 Test Files  1 failed (1) | Tests  2 failed | 4 passed (6)
    × refuses to switch on a plan-only feature and stores nothing 7ms
    × ignores a plan-only override that is already stored 3ms
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: plan-only features > refuses to switch on a plan-only feature and stores nothing
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: plan-only features > ignores a plan-only override that is already stored
    AssertionError: promise resolved "{ …(11) }" instead of rejecting
    AssertionError: expected true to be false // Object.is equality
```

- fix updateOrg and the toggleFlag guard, not isEnabled:

```
== naive HFX3-flag-overrides @ n-HFX3-repo-service
  hidden: exit=1 Test Files  1 failed (1) | Tests  1 failed | 5 passed (6)
    × ignores a plan-only override that is already stored 5ms
    FAIL  tests/hidden/HFX3-flag-overrides.test.ts > HFX3: plan-only features > ignores a plan-only override that is already stored
    AssertionError: expected true to be false // Object.is equality
```
