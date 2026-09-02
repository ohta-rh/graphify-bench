# Next.js コーパス設計の調査
## 調査日: 2026-09-02
---

## 1. 依存パッケージのバージョンと相互互換性

`npm view` (npm registry, read-only) で2026-09-02時点の最新版を直接確認した一次情報。

| パッケージ | latest (確認値) | 推奨ピン留め | 備考 |
|---|---|---|---|
| next | 16.3.4 | `16.3.4` | 安定版最新。`engines.node: >=20.9.0` |
| react / react-dom | 19.2.8 | `19.2.8` | Next.js 16の`peerDependencies`は`^18.2.0 \|\| 19.0.0-rc... \|\| ^19.0.0` → 19.2.8は適合を`npm view next@16.3.4 peerDependencies`で確認済み |
| typescript | **latest = 7.0.2** | **`5.9.3`（5.x系最新）を強く推奨** | 下記の重大な非互換あり |
| @types/react / @types/react-dom | 19.2.18 / 19.2.5 | 同上 | React 19.2系に対応 |
| @typescript-eslint/eslint-plugin | 8.69.0 | 同上 | `peerDependencies.typescript: ">=4.8.4 <6.1.0"` — **TypeScript 7系を明示的に除外** |
| tailwindcss | 4.3.3 | `4.3.3` | v4系、`@tailwindcss/postcss`同時ピン |
| eslint | 10.9.1 | `10.9.1` | `eslint-config-next@16.3.4`は`eslint: ">=9.0.0"`要求 |
| eslint-config-next | 16.3.4 | `16.3.4` | Next本体とメジャー同期させる |
| vitest | 4.1.11 | `4.1.11` | peer: `vite ^6\|^7\|^8`, `@types/node >=24.0.0`系OK |
| @testing-library/react | 16.3.3 | `16.3.3` | React 19対応版 |
| playwright / @playwright/test | 1.62.1 | `1.62.1` | ブラウザバイナリDLが必要＝オフライン制約対象（後述） |
| zod | 4.5.4 | `4.5.4` | サーバーアクション・フォーム両対応のスキーマ層に使用 |
| drizzle-orm | 0.45.2 | `0.45.2` | 後述の理由でPrisma/lucia等より優先推奨 |
| better-sqlite3 | 13.0.3 | `13.0.3` | `engines.node: >=22` → Node 25.5.0は満たす |
| drizzle-kit | 0.31.10 | `0.31.10` | マイグレーションCLI |
| next-auth | 4.24.15 (v5系は`@auth/core 0.41.3`) | 使わない方針を推奨 | オフラインcredentials providerのみなら自作の軽量認証で十分、依存を減らす |
| prisma / @prisma/client | **latest = 8.0.0-rc.12 (RCタグ)** / stable = 7.10.0 | 使うなら`7.10.0`を明示指定 | `pnpm add prisma`を無指定で打つとRCが入る落とし穴を確認済み |

### 重大な非互換：TypeScript 7.0.2は使えない
`typescript`の`latest`はv7.0.2（Microsoftのネイティブ移植・大型メジャー）だが、`@typescript-eslint/eslint-plugin@8.69.0`のpeerDependenciesは`typescript: ">=4.8.4 <6.1.0"`で**v7系を明確に除外**している。ESLint連携が壊れるため、本コーパスでは**TypeScript 5.9.3（5.x最新安定版）に固定**する。「最新を使う」という直感的判断がそのまま罠になる典型例であり、生成spec内で明示的にバージョンを指定しないとLLMサブエージェントが`latest`を選んで壊す可能性が高い。

### Next.js 16の破壊的変更（LLM生成コードが間違えやすい点）
一次情報（[Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)、[Next.js 16 Blog](https://nextjs.org/blog/next-16)）に基づく。

1. **App Routerがデフォルト**、Pages Routerは引き続きサポートされるが本コーパスではApp Routerのみ採用。
2. **非同期リクエストAPIが完全必須**：`cookies()` / `headers()` / `draftMode()` / `params` / `searchParams`は同期アクセス不可、すべて`await`必須（Next 15での互換レイヤーはNext 16で完全撤去）。LLMは訓練データの大半がNext 13/14相当のため、同期アクセスのコードを書きがちで最頻出のバグ源になる。
3. **Turbopackが`next dev`/`next build`のデフォルト**。webpack固有設定を書かせない。
4. **React Compilerは安定化したがデフォルト無効**（`next.config.ts`で`reactCompiler: true`の明示的opt-inが必要）。本コーパスではopt-inさせない方が生成の予測可能性が上がる。
5. **`middleware.ts`は`proxy.ts`に名称変更**（エクスポート関数名も`middleware`→`proxy`、実行ランタイムもNode.js runtime）。旧名で生成されるとNext 16では動作しない。
6. **Parallel Routesは`default.js`必須**（無いとビルド失敗）。
7. `revalidateTag()`は第2引数（cacheLifeプロファイル）が必要。
8. `next/legacy/image`・AMP・`next lint`コマンド・`serverRuntimeConfig`/`publicRuntimeConfig`は削除済み。
9. Node.js最小要件は`>=20.9.0`（今回の実行環境Node 25.5.0は余裕でクリア）。TypeScript最小要件は`>=5.1.0`（5.9.3はクリア）。

これらはすべてコーパス生成spec本文に明記し、各LLMサブエージェントへの指示に「Next.js 15以前の書き方をしない」チェックリストとして渡すべき。

---

## 2. 参考：実在Next.jsアプリの規模

GitHub API (`git/trees?recursive=1`)を直接叩いて`.ts`/`.tsx`ファイル数を実測（一次情報、2026-09-02時点のdefaultブランチ）。

| リポジトリ | 対象ディレクトリ | .ts/.tsx実測ファイル数 | 参考適性 |
|---|---|---|---|
| vercel/commerce | リポジトリ全体 | 65 | 小さすぎる（最小構成のストアフロントテンプレート） |
| calcom/cal.com | `apps/web`（モノレポ内Next.jsアプリのみ） | 985 | やや大きいが「成熟したプロダクト」の参考値として有用 |
| dubinc/dub | `apps/web`（モノレポ内Next.jsアプリのみ） | 3,546 | 大規模（エンタープライズ機能・パートナー基盤込み）、上限の参考 |
| formbricks/formbricks | `apps/web`（モノレポ内Next.jsアプリのみ） | 2,887 | 大規模、同上 |
| documenso/documenso | `apps/*` | — | **Next.jsではなくRemixへ移行済み**（`apps/remix`が主力、539ファイル）。参考対象から除外 |

**結論**：実在の成熟したNext.js SaaSは、単一アプリだけでも1,000〜3,500ファイル規模に達する（vercel/commerceのような最小テンプレートを除く）。したがって目標の**300〜400ファイル**は「立ち上げ初期〜中規模」段階のSaaSに相当する現実的なサイズであり、過小ではない。むしろcal.comの985ファイルの1/3程度なので、機能ドメインを絞り込んだサブセット相当と捉えるのが妥当。

LOC/word数の参考：一般的なTypeScript/TSXコードは1ファイルあたり中央値50〜150行程度（UIコンポーネント・薄いサービス層を含む場合）。350ファイル×平均130行 ≈ **45,000〜50,000 LOC**、graphifyの`total_words`（識別子・トークンを空白区切りで概算）はLOCの4〜6倍程度になる傾向があるため、**概算20万〜30万words**を想定値とする（実測ではなく経験則からの見積り、コーパス完成後に`graphify`実行結果で校正すること）。

---

## 3. ドメイン・アーキテクチャ提案

### コンセプト：「Taskflow」— マルチテナントのプロジェクト/課題管理SaaS
Linear/Jira型のB2B SaaSを模した**オリジナル**（学習データに存在する有名OSSではない）架空アプリ。外部サービス依存なしで`pnpm build`until完結する。

- マルチテナント（Organization → Project → Issue → Comment）
- 権限（Owner/Admin/Member/Viewer のRBAC）
- 通知（アプリ内通知 + メールテンプレート下書き、実送信はしないスタブ）
- 課金（プラン・シート数上限のロジックのみ、Stripe等の外部決済は接続しない）
- サーバーアクション中心（App Router Server Actions）＋Zodスキーマの単一ソース化
- SQLiteのローカルDB（Drizzle + better-sqlite3、詳細は4節）

### ディレクトリ構成と目標ファイル数（合計 ≈348、テスト込みで≈395）

| ディレクトリ | 内容 | 目標ファイル数 |
|---|---|---|
| `src/app/(marketing)/` | ランディング、料金、changelog等の静的寄りページ | 8 |
| `src/app/(auth)/` | login/register/reset-password + それぞれのpage/action | 10 |
| `src/app/(dashboard)/[orgSlug]/...` | projects/issues/settings/members/billing/notificationsの各route（page/layout/loading/error/default） | 60 |
| `src/app/api/` | Route Handlers（webhook受信スタブ、CSVエクスポート、cron風エンドポイント） | 15 |
| `src/actions/` | ドメイン別Server Actions（projects/issues/comments/members/billing/notifications/auth） | 25 |
| `src/server/services/` | ビジネスロジック層（IssueService, PermissionService, NotificationService, BillingService, SearchService, ActivityService, EventBus等） | 20 |
| `src/server/repositories/` | エンティティ別データアクセス層（Drizzleラップ） | 18 |
| `src/server/db/` | schema定義（ドメイン別分割）、マイグレーション設定、シードスクリプト、クライアント | 15 |
| `src/server/jobs/` | インプロセス疑似バックグラウンドジョブ（ダイジェストメール、期限超過チェック、webhook配送） | 8 |
| `src/lib/` | 汎用ユーティリティ（date, slugify, permissions matrix, feature-flags, rate-limit, logger, event-bus client） | 20 |
| `src/schemas/` | エンティティ別Zodスキーマ（クライアント/サーバー共有） | 20 |
| `src/hooks/` | Reactカスタムフック（useOrg, usePermission, useOptimisticIssues, useFeatureFlag等） | 15 |
| `src/components/ui/` | デザインシステム基本部品（shadcn風：button/input/dialog/table/toast/command-palette等） | 40 |
| `src/components/domain/` | 機能コンポーネント（IssueCard, KanbanBoard, CommentThread, NotificationBell, BillingPlanCard等） | 45 |
| `src/emails/` | react-emailテンプレート（招待/ダイジェスト/メンション/請求書） | 8 |
| `src/config/` | サイト設定、ナビ設定、フィーチャーフラグ定義、プラン上限定義 | 6 |
| `src/types/` | 共有型定義（**最初に書く契約ファイル**） | 10 |
| ルート直下 | `proxy.ts`, `instrumentation.ts`, 各種config | 3 |
| **小計（非テスト）** | | **≈348** |
| `tests/` (Vitest) | services/repositories/lib/schemas単体テスト＋一部コンポーネントテスト | ≈45 |
| **合計** | | **≈393**（graphifyの500ファイル警告に対し余裕あり） |

### 良いベンチマーク設問を生む「横断的関心事」候補（15）

1. **権限チェック関数`can(user, action, resource)`** — actions/services/route handlers/UIコンポーネントの20箇所以上から呼ばれる（「この権限ロジックを変更したら影響範囲は？」型の設問）
2. **イベントバス**（emit/subscribe）— IssueService, NotificationService, ActivityService, webhook配送jobを疎結合に連携
3. **フィーチャーフラグ**（例：カンバンボード表示、AI要約スタブ）がサーバーとUIの両方でチェックされる
4. **Zodスキーマの二重利用** — クライアント側react-hook-form検証とサーバーアクション入力検証で同一スキーマを共有
5. **マルチテナントスコープ漏れ** — 全リポジトリクエリが`orgId`でフィルタされているべき、という不変条件（意図的にバグ注入しやすいクラス）
6. **プラン上限の一元管理** — シート数・プロジェクト数上限が`PlanLimits`設定を経由して複数箇所から参照される
7. **楽観的UI更新**（`useOptimisticIssues`）とサーバーアクション結果の整合
8. **アクティビティフィード/監査ログ** — アプリ内の多数のアクションから書き込まれる
9. **通知のファンアウト** — 1イベントがアプリ内通知＋メールテンプレート選択＋ダイジェストバッチ処理に分岐
10. **検索/インデックス層** — issue/comment作成・更新時の同期維持
11. **レート制限ミドルウェア** — 招待スパム・コメントスパム対策として特定Server Actionsに適用
12. **ソフトデリート**（`archived_at`）パターンがissues/projects/commentsリポジトリ全体で一貫適用
13. **スラッグ生成・一意性検証** — org/projectスラッグ生成の共有ユーティリティが作成時と検証時の両方で使われる
14. **ロールベースのナビゲーション** — サイドバー項目がロール/権限で条件分岐表示
15. **バックグラウンドジョブのシミュレーション** — インプロセスキューによるダイジェストメール・期限超過チェックがリクエストライフサイクルから分離されている

これらは「Xを変更したら他に何を直す必要があるか」「Yはどこから呼ばれているか」という、grepだけでは追いにくい設問の源泉になる。

---

## 4. オフライン制約：DB層の選定

`pnpm install`/`pnpm build`をネットワークなしで完走させる必要がある。3案を一次情報で比較。

| 選択肢 | オフライン安全性 | Node 25対応 | リスク |
|---|---|---|---|
| **Prisma + SQLite** | 中 | 可 | `latest`タグが`8.0.0-rc.12`（RC）を指すため誤って不安定版が入る罠あり。stable`7.10.0`を明示ピン留めすれば動作するが、`prisma generate`のエンジン取得挙動をCI環境で事前検証する追加コストがある |
| **Drizzle + better-sqlite3** | 高 | **確認済み対応** | v13.0.0以降N-API（node-addon-api）移行済み（[GitHub Release](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0)）＝ABI安定でNode 25含む複数バージョンに対しプリビルドバイナリがそのまま動作。`package.json`の`engines.node: ">=22"`もNode 25.5.0で満たす。主要プラットフォーム向けプリビルド欠如時のみソースビルドにフォールバック |
| **Drizzle + libsql (WASM)** | 最高 | 対応 | ネイティブコンパイル皆無で最も安全だが、better-sqlite3比でわずかに性能劣る。プリビルド欠如の心配自体が不要 |

### 推奨
**Drizzle ORM + better-sqlite3を第一候補**とする。N-API化により実質的にlibsqlと同等の安全性を持ちながら、API・エコシステムの実績（LLM訓練データ内での認知度）が高くコード生成の質が安定しやすい。CI環境で万一プリビルドが取得できない場合の保険として**libsqlへのフォールバック**をREADMEに明記しておく。Prismaは`latest`タグのRC罠があり、stableピン留めの運用コストに見合うメリットが今回の用途（ベンチマーク用の閉じたアプリ）では薄いため不採用。

Playwrightはブラウザバイナリのダウンロードが必要なため、**e2eテストはコーパスの必須要件から外し、Vitest単体テストのみを検証対象とする**（`pnpm build`のオフライン完結を優先）。

---

## 5. 再現可能な生成戦略

### 方針：デシリアライズ可能なハイブリッド生成（決定的スキャフォールド＋LLM並列生成）

1. **決定的スキャフォールド生成スクリプト**（Nodeスクリプト）を先に実行し、以下を確定させる：
   - `package.json`（バージョンを本レポート1節の値に**明示ピン留め**）、`tsconfig.json`、`next.config.ts`、Tailwind設定、Drizzle設定・`drizzle-kit`コマンド
   - ディレクトリスケルトンと空/プレースホルダーファイル一式（最終的な目標ファイル数を先に固定できる）
   - これにより「構文的に壊れたpackage.jsonをLLMが生成する」リスクをゼロにする

2. **共有契約ファイルを最初に1パスで確定**：`src/types/*.ts`、`src/schemas/*.ts`、`src/server/db/schema.ts`。これらを凍結し、以降のすべての並列サブエージェントへ**読み取り専用コンテキスト**として渡す。ここが揺れると全ファイルでimport不整合が起きるため、最重要の同期ポイント。

3. **ディレクトリ単位で互いに素なファイル集合を割り当てて並列サブエージェントに生成させる**（例）：
   - Agent A: `components/ui/`
   - Agent B: `components/domain/`
   - Agent C: `server/services/` + `server/repositories/` + `server/jobs/`
   - Agent D: `app/` 配下のroute群 + `actions/`
   - Agent E: `lib/` + `hooks/` + `emails/` + `tests/`

   各エージェントは契約ファイル（型・スキーマ）のみを共有入力とし、担当外ディレクトリを一切編集しない（本セッションのサブエージェント隔離原則と同型）。

4. **統合後の検証**（この順で実行、いずれか失敗で後続をスキップし修正ループへ）：
   ```
   pnpm install --frozen-lockfile   # ロックファイル固定でオフライン再現性を担保
   pnpm exec tsc --noEmit
   pnpm eslint .
   pnpm vitest run
   pnpm build                       # Turbopackデフォルト
   ```
   型エラーは並列生成の性質上、境界（インターフェース不一致）に集中しやすいため、最終段階で**型エラー専任の修正パス（1エージェント）**を通すのが効率的。

5. **凍結（コーパスの固定）**：
   - 検証が全緑になった時点で`git add <明示パス>` → コミット → `git tag corpus-v1`
   - 再現性チェックサムとして`find src -type f | sort | xargs sha256sum | sha256sum`のようなツリーハッシュを`CORPUS.md`に記録し、以降のベンチマーク実行はすべて`git checkout corpus-v1`から開始してハッシュ一致を確認する運用にする

### スキャフォールドスクリプト vs 純粋LLM生成のトレードオフ
- **純LLM生成のみ**：ドメインの自然さ・「面白い設問」の材料は豊富になるが、350ファイル規模では設定ファイルの構文ミスやバージョン不整合（1節のTypeScript 7罠など）が積み重なりやすい。
- **スキャフォールドのみ**：構造は保証されるがビジネスロジックが機械的でベンチマーク上の質問が退屈になる（「非自明な設問」という要件を満たしにくい）。
- **推奨：ハイブリッド**。骨格・設定・契約ファイルは決定的スクリプトで固定し、ドメインロジック・UI・横断的関心事の実装はLLM並列生成に委ねる。これが再現性と設問の質を両立させる。

---

## 6. 推奨・結論（サマリ）

- **バージョン**：Next.js `16.3.4` / React `19.2.8` / **TypeScript `5.9.3`（`latest`のv7.0.2は@typescript-eslintと非互換のため不採用）** / Tailwind `4.3.3` / Vitest `4.1.11` / Drizzle ORM `0.45.2` + better-sqlite3 `13.0.3` / Zod `4.5.4`。next-auth/Prismaは不採用（複雑性・オフラインリスクに見合わない）。
- **規模**：実在アプリ（cal.com 985ファイル、dub.co 3,546ファイル、formbricks 2,887ファイル、いずれも一次情報で実測）と比較し、**目標350ファイル（テスト込み≈395）**はgraphifyの500件警告に対し安全マージンを持つ現実的な中規模サイズ。documensoはNext.jsから離脱済みのため参考対象から除外。
- **ドメイン**：マルチテナントのプロジェクト/課題管理SaaS「Taskflow」。App Router + Server Actions + Drizzle + Zod共有スキーマ + 権限/イベントバス/フィーチャーフラグ等15の横断的関心事で非自明な設問を作れる設計。
- **DB**：Drizzle + better-sqlite3（N-API確認済みでNode 25対応、オフライン安全）を第一候補、libsqlをフォールバックとして明記。
- **生成戦略**：決定的スキャフォールド（設定・骨格・契約ファイル）＋ディレクトリ単位で互いに素な並列LLM生成のハイブリッド。`tsc --noEmit` / `eslint` / `vitest run` / `pnpm build`を統合後に実行し、全緑でgitタグ＋ツリーハッシュにより凍結する。

---

## 参考リンク
- [Next.js 16 Blog Release Post](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16.3 Release Announcement](https://nextjs.org/blog/next-16-3)
- [better-sqlite3 Release v13.0.0 (N-API移行)](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0)
- [Node-API | Node.js Documentation](https://nodejs.org/api/n-api.html)
- [Prisma Blog: Rust-Free ORM (2025-11)](https://www.prisma.io/blog/try-the-new-rust-free-version-of-prisma-orm-early-access)
- [vercel/commerce (GitHub)](https://github.com/vercel/commerce)
- [calcom/cal.com (GitHub)](https://github.com/calcom/cal.com)
- [dubinc/dub (GitHub)](https://github.com/dubinc/dub)
- [formbricks/formbricks (GitHub)](https://github.com/formbricks/formbricks)
- [documenso/documenso (GitHub)](https://github.com/documenso/documenso)
