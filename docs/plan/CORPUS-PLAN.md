# CORPUS-PLAN.md — Taskflow 並列生成の割り当て

## 作成日: 2026-09-02
## 出典: `corpus/taskflow/corpus-manifest.json`（404 エントリ）
## 関連: [corpus-spec.md](./corpus-spec.md)（命名規約・Next 16 チェックリスト・スタブの埋め方）

---

## 1. 現在の状態

`corpus/taskflow` には**計画されたファイルがすべて存在する**。契約レイヤ 62 ファイルは実装済み、
残り 342 ファイルは型の付いたスタブ（関数は `throw new Error("stub: <path>")`、コンポーネントは
`return null`、ページは `await params` 済みの空 div、Route Handler は 501、テストは `it.todo`）。

この状態で 4 ゲートすべてが緑:

```
pnpm typecheck   # next typegen && tsc --noEmit   → PASS
pnpm lint        # eslint .                        → PASS
pnpm test        # vitest run                      → PASS (29 passed / 40 todo)
pnpm build       # next build (Turbopack)          → PASS
```

したがって 5 ワーカーは**互いを待たずに**担当ディレクトリを埋められる。各スタブの JSDoc には
責務と「呼ぶべき横断ヘルパー」が書かれており、正確なシグネチャは `corpus-manifest.json` が正。

`find src tests -type f | wc -l` = **407**（`corpus-manifest.json`・`scripts/` を除いた実ソース数。
manifest 404 エントリ + 私が追加した契約コアのテスト 3 本）。

---

## 2. オーナー別サマリ

| オーナー | 担当 | manifest エントリ数 | 状態 |
|---|---|---|---|
| **CONTRACT** | `src/types`, `src/schemas`, `src/server/db/**`, `src/lib` の横断コア, `src/config/{plan-limits,feature-flags}`, `src/proxy.ts`, `src/instrumentation.ts` | **62** | 実装済み・**凍結（編集禁止）** |
| **A** | `src/components/ui/` | **33** | スタブ |
| **B** | `src/components/domain/` + `src/hooks/` | **65** | スタブ |
| **C** | `src/server/services/` + `src/server/repositories/` + `src/server/jobs/` + `src/server/db/{seed,migrate}.ts` | **55** | スタブ |
| **D** | `src/app/**` + `src/actions/**` | **115** | スタブ |
| **E** | `src/lib/`（横断コア以外）+ `src/emails/` + `src/config/`（plan-limits/feature-flags 以外）+ `tests/**` | **74** | スタブ |
| | **合計** | **404** | |

---

## 3. ディレクトリ別内訳

### A — デザインシステム（33）

`src/components/ui/` 33（`button`, `input`, `select`, `combobox`, `dialog`, `drawer`, `popover`,
`tooltip`, `dropdown-menu`, `tabs`, `table`, `pagination`, `toast`/`toaster`, `alert`, `empty-state`,
`skeleton`, `spinner`, `progress`, `form-field`, `tag-input`, `date-picker`, `command-palette` ほか + barrel）。

**制約**: 表示のみ。データ取得・`can()`・`src/server/**` の import はいずれも禁止。

### B — 機能コンポーネントとフック（65）

| ディレクトリ | 数 |
|---|---|
| `src/components/domain/`（issue / board / comment / project / member / billing / notification / activity / nav / search / flags / permission + barrel） | 51 |
| `src/hooks/`（`useOrg`, `usePermission`, `useFeatureFlag`, `usePlanLimits`, `useOptimisticIssues`, `useNotifications`, `useToast`, `useFormAction`, `useIssueFilters`, `usePagination`, `useCommandPalette`, `useKeyboardShortcut`, `useDebouncedValue` + barrel） | 14 |

**制約**: `src/server/**` を import しない。データは props、変更は props で渡された Server Action 経由。

### C — サーバーレイヤ（55）

| ディレクトリ | 数 |
|---|---|
| `src/server/repositories/`（20 + barrel） | 21 |
| `src/server/services/`（20 + barrel） | 21 |
| `src/server/jobs/`（scheduler / queue / types + 7 ジョブ + barrel） | 11 |
| `src/server/db/{migrate,seed}.ts` | 2 |

**不変条件**: 全リポジトリクエリが `orgId` で絞られていること、ソフトデリート対象は
`@/lib/soft-delete` のヘルパー経由で `archived_at` を扱うこと。認可はサービス層のみ（`assertCan`）。

### D — App Router と Server Actions（115）

| ディレクトリ | 数 |
|---|---|
| `src/app/(dashboard)/**` | 43 |
| `src/app/api/**`（Route Handler 13） | 13 |
| `src/app/(auth)/**` | 10 |
| `src/app/(marketing)/**` | 6 |
| `src/app/` 直下（`layout` / `error` / `global-error` / `not-found`） | 4 |
| `src/actions/**`（ドメイン別 38 + `_lib/with-action.ts` 1） | 39 |

**要注意**: `[orgSlug]/@panel/` は Parallel Route なので `default.tsx` が必須（生成済み）。
`params` / `searchParams` / `cookies()` はすべて `await`。Server Action ファイルは `"use server"` で始め、
async 関数以外をエクスポートしない。

### E — ユーティリティ・メール・設定・テスト（74）

| ディレクトリ | 数 |
|---|---|
| `tests/**`（`it.todo` スタブ） | 42 |
| `src/lib/`（`id`, `date`, `format`, `cn`, `logger`, `errors`, `result`, `hash`, `session`, `actor`, `rate-limit`, `csv`, `mentions`, `markdown`, `url`, `cache`, `validation`, `pagination`） | 18 |
| `src/emails/`（テンプレート 7 + `_components` 2 + `render.ts`） | 10 |
| `src/config/`（`site`, `nav`, `env`, `constants`） | 4 |

`tests/contract/` の 3 本（`permissions.test.ts` / `plan-limits.test.ts` / `slug.test.ts`）は
契約コアの実テストとして**すでに通っている**。E はこれらを消さないこと。

---

## 4. 横断的関心事の配線状況

manifest の `mustUse` フィールドで、各ファイルが「呼ぶべき横断ヘルパー」を宣言している。
実装完了後、これらが実際に呼ばれているかが受け入れ条件になる。

| ヘルパー | 宣言しているファイル数 |
|---|---|
| `can()` | **80** |
| `isEnabled()` | 33 |
| `getPlanLimits()` | 28 |
| `assertOrgScope()` | 20 |
| `assertCan()` | 14 |
| `emit()` | 11 |
| `wouldExceedLimit()` | 7 |
| `consumeRateLimit()` | 7 |
| `subscribe()` | 6 |
| `archivePatch()` / `shouldFilterArchived()` | 各 6 |
| `snapshotFlags()` | 3 |
| `restorePatch()` | 3 |

`can()` が 80 ファイルから参照される設計なので、「この権限ロジックを変更したら影響範囲は？」型の
設問（architecture.md §6 カテゴリ 2・4）が grep 一発では解けない規模になる。

---

## 5. ワーカー起動時の共通指示

各ワーカーに渡すもの:

1. 担当ディレクトリ（上表）と、**担当外は一切編集禁止**という制約
2. `docs/plan/corpus-spec.md`（命名規約・Next 16 チェックリスト・スタブの埋め方・レイヤ境界）
3. `corpus/taskflow/corpus-manifest.json` の**自分の担当エントリのみ**（全文は大きい）
4. 契約レイヤは読み取り専用、`package.json` に依存を足さない
5. 報告前に `pnpm typecheck && pnpm lint && pnpm test` を自分の範囲で通すこと
6. Subagent Contract の paste block（worktree 隔離、`ALLOW_COMMIT` なし）

Director 側は統合後に `pnpm build` を含む 4 ゲートを回し、型エラーが境界に残る場合は
型エラー専任の 1 パスを追加する。

---

## 6. 再生成手順

```bash
cd corpus/taskflow
pnpm exec tsx scripts/build-manifest.ts     # manifest-parts/ から corpus-manifest.json を再生成
pnpm exec tsx scripts/generate-stubs.ts     # 未作成ファイルだけスタブ生成（既存には触れない）
```

`--force` を付けると全スタブを上書きする。**実装済みコードを破棄する**ので、
ワーカー着手後は絶対に使わないこと。
