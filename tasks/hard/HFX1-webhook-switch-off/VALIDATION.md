# HFX1-webhook-switch-off validation

Fresh APFS clones of corpus-v1 (`cp -cR`). Patches applied with
`git apply --unsafe-paths --directory=<clone> -p1 <patch>` (clean, no fuzz).
Tests: `pnpm exec vitest run` (full) and `pnpm exec vitest run tests/hidden/<ID>.test.ts`; typecheck `pnpm exec tsc --noEmit`.

## 1-2. pristine + bug.patch (tsc, full visible suite, then hidden installed)

```
== step1 HFX1-webhook-switch-off @ v-HFX1
  tsc --noEmit: exit=0
  full suite: exit=0 Test Files  73 passed (73) | Tests  617 passed (617)
  hidden: exit=1 Test Files  1 failed (1) | Tests  3 failed | 1 passed (4)
    × persists the switch in both directions 16ms
    × queues no new events for a switched-off endpoint 13ms
    × fails, rather than delivers, deliveries queued before the switch 10ms
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > persists the switch in both directions
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > queues no new events for a switched-off endpoint
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > fails, rather than delivers, deliveries queued before the switch
    AssertionError: expected true to be false // Object.is equality
    AssertionError: expected [ { …(11) } ] to have a length of +0 but got 1
    AssertionError: expected 'delivered' to be 'failed' // Object.is equality
```

## 3 + 5. + solution.patch (hidden x3, full suite incl. hidden, tsc)

```
== step3 HFX1-webhook-switch-off @ v-HFX1
  hidden: exit=0 Test Files  1 passed (1) | Tests  4 passed (4)
  hidden: exit=0 Test Files  1 passed (1) | Tests  4 passed (4)
  hidden: exit=0 Test Files  1 passed (1) | Tests  4 passed (4)
  full suite: exit=0 Test Files  74 passed (74) | Tests  621 passed (621)
  tsc --noEmit: exit=0
```

## 4. Naive partial fixes (pristine + bug.patch + partial fix)

- fix only the repository `enabled` persistence bug:

```
== naive HFX1-webhook-switch-off @ n-HFX1-repo-only
  hidden: exit=1 Test Files  1 failed (1) | Tests  2 failed | 2 passed (4)
    × fails, rather than delivers, deliveries queued before the switch 14ms
    × keeps switched-off endpoints counted against the plan allowance 28ms
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > fails, rather than delivers, deliveries queued before the switch
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > keeps switched-off endpoints counted against the plan allowance
    AssertionError: expected 'delivered' to be 'failed' // Object.is equality
    AssertionError: promise resolved "{ …(8) }" instead of rejecting
```

- fix the repository bug and the delivery-job guard, not the quota count:

```
== naive HFX1-webhook-switch-off @ n-HFX1-repo-job
  hidden: exit=1 Test Files  1 failed (1) | Tests  1 failed | 3 passed (4)
    × keeps switched-off endpoints counted against the plan allowance 13ms
    FAIL  tests/hidden/HFX1-webhook-switch-off.test.ts > HFX1: switching a webhook endpoint off > keeps switched-off endpoints counted against the plan allowance
    AssertionError: promise resolved "{ …(8) }" instead of rejecting
```
