# corpus-spec.md — Taskflow コーパス仕様

## 作成日: 2026-09-02
## 対象: `corpus/taskflow/`（Next.js 16 App Router、404 ファイル）
## 前提: [research-nextjs-corpus.md](./research-nextjs-corpus.md) §1・§3、[implementation-plan.md](./implementation-plan.md) §3

---

## 1. ドメイン: Taskflow

**マルチテナントのプロジェクト/課題管理 SaaS**。Linear / Jira 型の B2B SaaS を模した架空アプリで、
学習データに存在する既存 OSS ではない。外部サービス依存はゼロで、`pnpm build` はオフライン完結する。

```
Organization ──┬── Member (Owner / Admin / Member / Viewer)
               ├── Subscription (free / starter / growth / enterprise)
               ├── Label
               └── Project ──── Issue ──┬── Comment
                                        └── Attachment
```

横断的関心事（ベンチマーク設問の源泉）:

| # | 関心事 | 実装の単一ソース |
|---|---|---|
| 1 | 権限チェック | `src/lib/permissions.ts` の `can()` / `assertCan()` / `ROLE_MATRIX` |
| 2 | イベントバス | `src/lib/event-bus.ts` の `emit()` / `subscribe()`、型は `src/types/event.ts` の `TaskflowEventMap` |
| 3 | フィーチャーフラグ | `src/lib/feature-flags.ts` の `isEnabled()` / `snapshotFlags()`、定義は `src/config/feature-flags.ts` |
| 4 | Zod スキーマの二重利用 | `src/schemas/*.ts` をクライアントフォームとサーバーアクションで共有 |
| 5 | テナントスコープ | `src/lib/tenant.ts` の `assertOrgScope()`、全リポジトリが `orgId` で絞る |
| 6 | プラン上限 | `src/config/plan-limits.ts` の `PlanLimits` / `getPlanLimits()` / `wouldExceedLimit()` |
| 7 | 楽観的 UI | `src/hooks/use-optimistic-issues.ts` |
| 8 | 監査ログ | `src/server/services/activity-service.ts`（イベントバス購読で全アクションを記録） |
| 9 | 通知ファンアウト | `src/server/services/notification-service.ts` → in-app / email / digest |
| 10 | 検索インデックス | `src/server/services/search-service.ts`（書き込み時に同期） |
| 11 | レート制限 | `src/lib/rate-limit.ts` の `consumeRateLimit()` |
| 12 | ソフトデリート | `src/lib/soft-delete.ts` の `archivePatch()` / `shouldFilterArchived()` |
| 13 | スラッグ生成 | `src/lib/slug.ts` の `slugify()` / `uniqueSlug()` |
| 14 | ロール別ナビ | `src/config/nav.ts` の `visibleNav()` |
| 15 | バックグラウンドジョブ | `src/server/jobs/`（`scheduler.ts` + 7 ジョブ） |

---

## 2. 凍結された契約レイヤ（編集禁止）

以下はすでに実装済みで、**どのワーカーも編集してはならない**。読み取り専用の共有入力として扱う。

- `src/types/*.ts` — ブランド付き ID、ドメイン型、`Actor`、`PermissionAction`/`PermissionResource`、`TaskflowEventMap`、`Result`/`ActionResult`
- `src/schemas/*.ts` — Zod スキーマ 21 本。型は `z.infer` で `src/types` と一致
- `src/server/db/schema/*.ts` — Drizzle テーブル定義（全テナントテーブルに `org_id`、ソフトデリート対象に `archived_at`）
- `src/server/db/client.ts` / `index.ts`
- `src/lib/{permissions,tenant,event-bus,feature-flags,slug,soft-delete}.ts`
- `src/config/{plan-limits,feature-flags}.ts`
- `src/proxy.ts` / `src/instrumentation.ts`

契約を変更する必要が出た場合は自分で直さず、Director にエスカレーションする。境界の型が揺れると
全ワーカーの import が壊れる。

---

## 3. 命名規約

| 対象 | 規約 | 例 |
|---|---|---|
| ファイル名 | kebab-case | `issue-repository.ts`, `kanban-board.tsx` |
| React コンポーネント | PascalCase、ファイル名と対応 | `KanbanBoard` in `kanban-board.tsx` |
| Props 型 | `<Component>Props` | `KanbanBoardProps` |
| フック | `use-*.ts` / `useXxx` | `use-feature-flag.ts` → `useFeatureFlag` |
| Server Action | `<verb><Noun>Action` | `createIssueAction` |
| サービス関数 | 動詞始まり、第 1 引数は `actor: Actor` | `createIssue(actor, input)` |
| リポジトリ関数 | 動詞始まり、第 1 引数は `orgId: OrgId`（またはそれを含む input） | `listIssues(input)` / `findIssueById(orgId, issueId)` |
| Zod スキーマ | `<name>Schema`、派生型は `<Name>Input` | `createIssueSchema` → `CreateIssueInput` |
| DB カラム | snake_case、TS プロパティは camelCase | `archived_at` ↔ `archivedAt` |
| テスト | `tests/<layer>/<subject>.test.ts` | `tests/services/issue-service.test.ts` |

インポートは常に `@/` エイリアス（`@/lib/permissions` など）を使い、`../../` の相対パスは同一ディレクトリ内に限る。

---

## 4. Next.js 16 チェックリスト（違反はビルド失敗またはランタイム不具合）

LLM の訓練データは Next 13/14 が大半なので、以下は**書く前に毎回確認する**。

- [ ] `params` / `searchParams` は **Promise**。`const { orgSlug } = await params;` と await する
- [ ] `cookies()` / `headers()` / `draftMode()` も **async**。`await cookies()` と書く
- [ ] `middleware.ts` は存在しない。リクエスト層のフックは **`src/proxy.ts`**、エクスポート名も `proxy`
- [ ] Parallel Route のスロット（`@panel` など）には **`default.tsx` が必須**。無いとビルドが落ちる
- [ ] `revalidateTag(tag)` は不可。**第 2 引数に cacheLife プロファイル**を渡す（`@/lib/cache` の `revalidateTagged()` を使う）
- [ ] `next lint` は削除済み。lint は **`pnpm lint`（= `eslint .`）**
- [ ] React Compiler は opt-in。`next.config.ts` に `reactCompiler` を足さない
- [ ] webpack 固有設定を書かない（既定バンドラは Turbopack）
- [ ] `next/legacy/image`・AMP・`serverRuntimeConfig`/`publicRuntimeConfig` は削除済み
- [ ] Route Group `(marketing)` と `(dashboard)` が同じパスに解決する `page.tsx` を両方持たない
- [ ] Server Action ファイルの先頭は `"use server"`、**エクスポートは async 関数のみ**（型の再エクスポートは不可）
- [ ] `useState` / `useEffect` / イベントハンドラを使うファイルは先頭に `"use client"`

TypeScript は **5.9.3 に固定**。`latest`（7.0.2）は `@typescript-eslint` の peer 範囲 `>=4.8.4 <6.1.0` から外れるため使わない。

---

## 5. スタブの埋め方（ワーカー向けルール）

生成済みスタブは「関数は `throw new Error("stub: <path>")`、コンポーネントは `return null`、
ページは `await params` して空 div、Route Handler は 501、テストは `it.todo`」という形で入っている。
各ファイル冒頭の JSDoc に **担当オーナー・責務・呼ぶべき横断ヘルパー**が書かれている。

### やってよいこと

- スタブの**本体**を実装する
- 自分の担当ディレクトリ内に**プライベートなヘルパーファイル**を足す（manifest に無いファイルを増やしてよい）
- ファイル内に非公開のローカル関数・定数・型を足す
- Props 型のフィールドを**増やす**（既存フィールドの削除・型変更は不可）

### やってはいけないこと

- **エクスポートされたシグネチャを変える**（名前・引数の型・戻り値の型）。`corpus-manifest.json` が正
- **担当外のディレクトリを編集する**（契約レイヤを含む）
- **依存パッケージを足す**。`package.json` は凍結。必要なものは全部入っている
- **横断的関心事を再実装する**。`can()` を書き直す、`archived_at IS NULL` を手書きする、
  プラン上限の数値をハードコードする、`role === "admin"` で分岐する — いずれも差し戻し対象。
  必ず `@/lib/permissions`・`@/lib/soft-delete`・`@/config/plan-limits`・`@/lib/tenant` から import する
- `any` を使う（eslint でエラー）
- 契約レイヤのファイルを「ついでに」直す

### レイヤ境界

```
app/ + actions/  →  server/services/  →  server/repositories/  →  server/db/
components/      →  components/ui/ + hooks/ + types/ + schemas/
```

- **コンポーネントは `src/server/**` を import しない**。データは Server Component から props で渡すか、
  Server Action を props で受け取る
- **リポジトリは `can()` を呼ばない**（認可はサービス層の責務）。ただし `orgId` フィルタは必須
- **サービスは `cookies()` を触らない**（`Actor` は引数で受け取る）
- **ジョブはリクエストライフサイクル外**。`Actor` を自前で組み立てる

### 完了条件

自分の担当範囲を実装したら、報告前に必ず:

```bash
cd corpus/taskflow
pnpm typecheck      # next typegen && tsc --noEmit
pnpm lint
pnpm test
```

`pnpm build` は Director が統合時にまとめて回す。

---

## 6. 検証ゲート（統合時）

```bash
cd corpus/taskflow
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

いずれかが赤なら後続をスキップして修正ループへ。型エラーは並列生成の性質上、境界（インターフェース不一致）に
集中するので、最終段階で型エラー専任の 1 パスを通すのが効率的。

全緑になったら `find src tests -type f | sort | xargs shasum -a 256 | shasum -a 256` でツリーハッシュを
`docs/plan/CORPUS.md` に記録し、`git tag corpus-v1` で凍結する。

---

## 7. スタブ再生成

manifest を書き換えたら:

```bash
cd corpus/taskflow
pnpm exec tsx scripts/build-manifest.ts     # scripts/manifest-parts/ → corpus-manifest.json
pnpm exec tsx scripts/generate-stubs.ts     # 存在しないファイルだけ生成（既存は触らない）
pnpm exec tsx scripts/generate-stubs.ts --force   # 全スタブを上書き（実装済みも消えるので注意）
```

`--force` は**実装内容を破棄する**ので、スタブ段階でしか使わないこと。
