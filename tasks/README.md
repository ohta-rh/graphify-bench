# tasks/

| Path | Role |
|---|---|
| `tasks.schema.ts` | Zod schema + `parseTaskFile()`. The single source of truth for the task/key shape. |
| `tasks.json` | **The real 15-task set.** 5 categories × 3 tasks, all `placeholder: false`. |
| `tasks-ext.json` | **The second real set: 30 tasks.** 5 categories × 6 tasks, all `placeholder: false`. Ids are `X`-prefixed; combined with `tasks.json` this is a 45-task benchmark, 9 per category. |
| `tasks.example.json` | **Placeholder** file with 2 example tasks aimed at `bench/fixtures/mini-corpus`. Used only to smoke-test the harness. |
| `keys/<id>.json` | Ground truth for `set-f1`: `{ "files": [...], "notes": "..." }`, paths repo-relative to the corpus root. |
| `keys/<id>.md` | Rubric for `llm-judge`. Five numbered elements, each naming the file(s) that evidence it. |
| `bugs/<id>.patch` | Bug injected before a `fix` run. Applied after the overlay, identically in both conditions. |

`bench/tasks.test.ts` validates all of the above on every `pnpm test` run: schema,
category/grader pairing, prompt format reminders, key existence and sortedness,
patch shape, rubric element count, and a set of grader dry-runs against the
committed keys.

## The set

Targets are stated in terms of the corpus's cross-cutting concerns (architecture.md §6).
"Easy?" marks the two tasks deliberately built to be solvable without any indexing tool,
so the report can show where the tool's advantage goes to zero.

| id | category | grader | what it targets | key / spec | easy? |
|---|---|---|---|---|---|
| `LOC1-shortcut-match` | locate | set-f1 | Keyboard-shortcut matching + the `mod`→Meta/Control rule | 1 file | **yes** |
| `LOC2-webhook-plan-cap` | locate | set-f1 | Where a webhook-endpoint quota refusal is decided vs. declared | 2 files | |
| `LOC3-digest-window` | locate | set-f1 | Which orgs are due for a digest, and who inside them is subscribed | 2 files | |
| `REF1-assertcan-callers` | reference | set-f1 | Every caller of the throwing authorization guard `assertCan()` | 14 files | |
| `REF2-would-exceed-limit-callers` | reference | set-f1 | Every caller of `wouldExceedLimit()`, excluding the `getPlanLimits()` crowd | 7 files | |
| `REF3-issue-created-subscribers` | reference | set-f1 | Every `subscribe()` handler for the `issue.created` event | 4 files | |
| `EXP1-issue-create-flow` | explain | llm-judge | Server Action → gates → repository → event bus → 4 subscribers | 5-element rubric | |
| `EXP2-comment-mention-notify` | explain | llm-judge | `@handle` → resolved user → event payload → fan-out → channel choice | 5-element rubric | |
| `EXP3-digest-pipeline` | explain | llm-judge | Cron route → job → digest service → email, incl. 3 "send nothing" paths | 5-element rubric | |
| `IMP1-planlimits-field` | impact | set-f1 | Adding a required field to the `PlanLimits` interface | 3 files | |
| `IMP2-rename-issue-created` | impact | set-f1 | Renaming the `issue.created` event (a plain string, not a symbol) | 10 files | **yes** |
| `IMP3-limited-resource-union` | impact | set-f1 | Adding a member to the `LimitedResource` union | 10 files | |
| `FIX1-issue-tenant-leak` | fix | vitest | Tenant scope leak: org predicate dropped from an issue lookup | `tests/server/tenant-scope.test.ts` | |
| `FIX2-project-quota-off-by-one` | fix | vitest | Plan-limit off-by-one: quota compares the count before the new row | `tests/server/plan-limits.test.ts` | |
| `FIX3-board-shows-archived` | fix | vitest | Soft-delete filter dropped from one query while its siblings keep it | `tests/server/soft-delete.test.ts` | |

## The ext set (`tasks-ext.json`)

Thirty more tasks on the same corpus (`corpus-v1`), built and verified the same
way, so the 45 tasks can be analysed together. No ext task re-uses a first-set
target: different hubs, different events, different types, different flows, and
`bench/tasks.test.ts` enforces it (Jaccard < 0.7 on the derived reference/impact
keys, distinct locate keys, distinct specs, and no patched file shared with
`FIX1–3`).

Two things the first set could not give, added here on purpose:

- **A grep-trivial control in every gradeable category**, not just two overall
  (`XLOC1`, `XREF5`, `XIMP2`), so "where does the tool's advantage go to zero?"
  can be answered per category instead of globally.
- **Explicit multi-hop tasks** (`XLOC4`, `XLOC6`, `XREF6`, `XIMP1`, `XIMP5`),
  where the answer is not reachable by any single lookup. `XREF6` is the
  clearest case: its answer contains none of the files the first hop finds.

| id | category | grader | what it targets | key / spec | easy? |
|---|---|---|---|---|---|
| `XLOC1-retry-throttle` | locate | set-f1 | Where "too many attempts" is decided and the per-action allowances declared | 1 file | **yes** |
| `XLOC2-invite-link-validity` | locate | set-f1 | The three refusals that make an invitation link unusable | 1 file | |
| `XLOC3-issue-number-allocation` | locate | set-f1 | Who computes a new issue's per-project number vs. who forwards it | 1 file | |
| `XLOC4-session-lifetime` | locate | set-f1 | Session TTL declared in one layer, expiry enforced in another | 2 files | |
| `XLOC5-delivery-retry-policy` | locate | set-f1 | Attempt cap and exponential backoff for queued deliveries | 1 file | |
| `XLOC6-menu-entry-visibility` | locate | set-f1 | The role- and plan-aware sidebar entry filter, one hop off the component | 1 file | |
| `XREF1-assertorgscope-callers` | reference | set-f1 | Every caller of the throwing tenant-scope guard `assertOrgScope()` | 22 files | |
| `XREF2-emit-callers` | reference | set-f1 | Every caller of `emit()` — publishers, not subscribers | 13 files | |
| `XREF3-isenabled-callers` | reference | set-f1 | Every caller of `isEnabled()`, the widest hub in the corpus | 35 files | |
| `XREF4-comment-created-subscribers` | reference | set-f1 | Every `subscribe()` handler for `comment.created` | 4 files | |
| `XREF5-rate-limit-importers` | reference | set-f1 | Every importer of the rate-limiter module | 9 files | **yes** |
| `XREF6-member-joined-repositories` | reference | set-f1 | Two hops: `member.joined` subscribers → the repositories they import | 5 files | |
| `XEXP1-webhook-delivery` | explain | llm-judge | Event → per-endpoint filter → queue → cron job → HMAC signature | 5-element rubric | |
| `XEXP2-invitation-lifecycle` | explain | llm-judge | Invite gates (twice) → hashed token → unauthenticated acceptance → `member.joined` | 5-element rubric | |
| `XEXP3-plan-change` | explain | llm-judge | Downgrade guard at zero delta, subscription as authority, plan's reach past billing | 5-element rubric | |
| `XEXP4-signin-to-actor` | explain | llm-judge | Credentials → hashed session → cookie → expiry check → `Actor` on a tenant page | 5-element rubric | |
| `XEXP5-search-index` | explain | llm-judge | Write-time indexing subscribers and the two gates on the query path | 5-element rubric | |
| `XEXP6-overdue-sweep` | explain | llm-judge | Cron → sweep → in-process dedup → `issue.overdue` → per-recipient channels | 5-element rubric | |
| `XIMP1-role-union` | impact | set-f1 | Adding a member `Role` | 16 files | |
| `XIMP2-rename-comment-created` | impact | set-f1 | Renaming the `comment.created` event (a plain string) | 10 files | **yes** |
| `XIMP3-issue-status-union` | impact | set-f1 | Adding a member to the `IssueStatus` union | 17 files | |
| `XIMP4-feature-flag-key-union` | impact | set-f1 | Adding a member to the `FeatureFlagKey` union | 13 files | |
| `XIMP5-plan-id-union` | impact | set-f1 | Adding a member to the `PlanId` union | 15 files | |
| `XIMP6-limit-check-field` | impact | set-f1 | Adding a required field to the `LimitCheck` interface | 8 files | |
| `XFIX1-csv-quote-escape` | fix | vitest | CSV quoting rule lost its double-quote case | `tests/lib/csv.test.ts` | |
| `XFIX2-mention-inside-code` | fix | vitest | Mentions inside code blocks stopped being ignored | `tests/lib/mentions.test.ts` | |
| `XFIX3-last-owner-removable` | fix | vitest | Last-owner invariant asked the wrong question on the removal path | `tests/services/member-service.test.ts` | |
| `XFIX4-advanced-search-inverted` | fix | vitest | Plan gate on field-scoped search syntax inverted | `tests/services/search-service.test.ts` | |
| `XFIX5-self-notification` | fix | vitest | Fan-out no longer skips the actor as a recipient | `tests/services/notification-service.test.ts` | |
| `XFIX6-revoked-invite-accepted` | fix | vitest | Revoked-invitation refusal dropped from acceptance | `tests/services/invitation-service.test.ts` | |

### Why those three ext tasks are the easy ones

`XLOC1` names a behaviour whose module filename contains the search word, and
the allowance table and the verdict are in that same file — no hop. `XREF5`
asks for importers of a module, which is exactly what a scan for the module
specifier returns. `XIMP2` asks for occurrences of a string literal; it is the
direct replicate of `IMP2` on a different event, so the combined analysis has
two independent measurements of the same zero-advantage control.

### Why those two are the easy ones

`LOC1` names a behaviour that lives in one uniquely-named module whose filename
contains the search word — `grep -ril shortcut src` answers it. `IMP2` asks for the
occurrences of a string literal, which is by construction exactly what a text scan
returns. Neither has a hop a graph index can shortcut, so a condition difference on
these two would be noise, not signal.

## Ground truth

Categories 2 and 4 (`reference`, `impact`) are derived **mechanically** by
`scripts/derive-keys.ts` — ts-morph over `corpus/taskflow/tsconfig.json`, using the
compiler's own symbol table. graphify output is never used to build a key; that would
make the comparison circular.

```bash
pnpm keys:derive          # refresh the derived keys and print a diff
pnpm keys:derive -- --check   # diff only; non-zero exit on drift
```

Re-running it after the corpus is frozen must reproduce the committed keys with no
diff. The six derivation kinds it supports (`callers`, `refs`, `subscribes`,
`literal`, and — added for the ext set — `importers` and the two-hop `hop`) and the
per-key inclusion rule are declared in the `SPECS` table at the top of that file,
and the rule is copied into each key's `notes`. `--check` covers every key in both
task files.

**Universal exclusion rule: `tests/**` is never part of a key.** The tasks ask where
application behaviour lives; a spec that merely exercises a symbol is not that place.
`.next/**` and `.d.ts` files are excluded for the same reason.

`locate` keys are **hand-authored** — deciding where a behaviour lives is a judgement,
not a reference set — and each one's `notes` records the near-miss files it
deliberately excludes and why.

## Bug patches

Each `bugs/<id>.patch` is a `git diff`-style unified diff with `a/` and `b/` prefixes,
applied by `bench/run.ts` in the run directory with
`git apply --unsafe-paths --directory . -p1`, falling back to `patch -p1`.

Every patch was verified against a scratch copy of the corpus with dependencies
installed:

- applies cleanly via `git apply` (the primary path in `bench/run.ts`);
- the named spec goes **red** — and only that spec: the blast radius is exactly
  one test (`FIX1–3`: `1 failed | 499 passed` in the run directory;
  `XFIX1–6`, measured on a full scratch copy: `1 failed | 616 passed` against a
  `617 passed` baseline);
- `tsc --noEmit` still exits 0 on the patched tree, so each bug is a **logic** bug
  the agent has to reason about, not a type error the compiler hands it.

Prompts for `fix` tasks describe the **symptom only** — what a user or an internal
team observed. They never name the file, the function, or the layer.
