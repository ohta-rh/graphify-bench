# tasks/

| Path | Role |
|---|---|
| `tasks.schema.ts` | Zod schema + `parseTaskFile()`. The single source of truth for the task/key shape. |
| `tasks.json` | **The real 15-task set.** 5 categories × 3 tasks, all `placeholder: false`. |
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
diff. The four derivation kinds it supports (`callers`, `refs`, `subscribes`,
`literal`) and the per-key inclusion rule are declared in the `SPECS` table at the
top of that file, and the rule is copied into each key's `notes`.

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
- the named spec goes **red** — and only that spec: the full suite drops from
  500 passing to `1 failed | 499 passed`, i.e. the blast radius is exactly one test;
- `tsc --noEmit` still exits 0 on the patched tree, so each bug is a **logic** bug
  the agent has to reason about, not a type error the compiler hands it.

Prompts for `fix` tasks describe the **symptom only** — what a user or an internal
team observed. They never name the file, the function, or the layer.
