# graphify-bench 実装計画書

## 作成日: 2026-09-02
## 前提: [architecture.md](./architecture.md) の設計を確定済みとする

---

## 1. 実装フェーズとマイルストーン

| Phase | 内容 | 目安 | 完了条件 |
|---|---|---|---|
| 0 | リポジトリ骨格・ツール固定 | 0.5 日 | `pnpm install` が通り、graphifyy 0.9.53 が固定される |
| 1 | corpus "Taskflow" 生成と凍結 | 1.5〜2 日 | tsc / eslint / vitest / build 全緑、`corpus-v1` タグ、ツリーハッシュ記録 |
| 2 | graphify グラフ構築と overlay 作成、hook 動作確認 | 0.5 日 | `overlays/graphify/graphify-out/graph.json` 凍結、nudge 発火をログで確認 |
| 3 | タスクセット・ground truth・採点器 | 1 日 | 15 タスクの key が揃い、grader の自己テストが通る |
| 4 | ハーネス実装とパイロット | 1 日 | 2 タスク × 2 条件 × 1 反復が end-to-end で走り metrics.json が出る |
| 5 | 本計測・分析・レポート | 1 日（実行は背景） | `results/REPORT.md` に bootstrap CI 付きの表が出る |
| 6 | 任意拡張（strict / Haiku / MCP） | 各 0.5 日 | 同上の形式で追加行 |

実行体制: Director（本セッション）が spec と検証を持ち、実装は sonnet サブエージェントに worktree 隔離で委譲する。corpus 生成の並列ワーカーは互いに素なディレクトリ集合のみ編集する。

---

## 2. Phase 0: リポジトリ骨格

1. ルート `package.json`（`"packageManager": "pnpm@10.28.2"`、`bench:*` スクリプト）、`tsconfig.json`、`.gitignore`（`results/scratch/`, `corpus/taskflow/node_modules`, `corpus/taskflow/.next`, `*.db`）
2. `uv tool install --upgrade graphifyy==0.9.53` を実行し、`docs/plan/VERSIONS.md` に `claude --version` / `graphify` 版 / Node / pnpm を記録
3. ディレクトリ作成: `corpus/ overlays/{baseline,graphify} tasks/keys bench/ results/runs scripts/`
4. README にベンチの目的と実行手順を記述（docs/plan へのリンク）

---

## 3. Phase 1: corpus "Taskflow" 生成と凍結

### 3.1 決定的スキャフォールド（scripts/scaffold-corpus.ts）

- `corpus/taskflow/package.json` を **バージョン固定**で生成:

| 種別 | パッケージ |
|---|---|
| dependencies | next 16.3.4, react 19.2.8, react-dom 19.2.8, drizzle-orm 0.45.2, better-sqlite3 13.0.3, zod 4.5.4, react-hook-form（最新安定を `npm view` で確認して固定）, @react-email/components（同） |
| devDependencies | typescript 5.9.3, @types/react 19.2.18, @types/react-dom 19.2.5, @types/better-sqlite3, @types/node 25 系, tailwindcss 4.3.3, @tailwindcss/postcss 4.3.3, eslint 10.9.1, eslint-config-next 16.3.4, vitest 4.1.11, @testing-library/react 16.3.3, @vitejs/plugin-react, jsdom, drizzle-kit 0.31.10, tsx |

- `tsconfig.json`（strict）, `next.config.ts`（reactCompiler は無効のまま）, `postcss.config.mjs`, `drizzle.config.ts`, `vitest.config.ts`, `proxy.ts`（`middleware.ts` ではない）
- ディレクトリ骨格と各ディレクトリの `README.md`（担当ワーカーへの契約を書く）

### 3.2 契約ファイルの先行確定（Director + sonnet 1 体、直列）

以下を最初に書き、レビュー後に**凍結**する。以降のワーカーは読み取り専用で参照する。

- `src/types/*.ts`（Organization, Project, Issue, Comment, Member, Role, Notification, Plan, ActivityEvent, FeatureFlag …）
- `src/schemas/*.ts`（Zod。型は `z.infer` で types と一致させる）
- `src/server/db/schema/*.ts`（Drizzle、テーブル定義。`org_id` 列と `archived_at` 列の規約）
- `src/lib/permissions.ts` の `can(user, action, resource)` シグネチャ、`src/lib/event-bus.ts` の `emit/subscribe` シグネチャ、`src/config/plan-limits.ts` の `PlanLimits`
- `docs/plan/corpus-spec.md`: ドメイン説明、命名規約、Next 16 禁止事項チェックリスト（同期 `params`/`cookies()` 禁止、`middleware.ts` 禁止、`next lint` 禁止、Parallel Routes には `default.tsx`、`revalidateTag` の第 2 引数）

### 3.3 並列生成（sonnet 5 体、各自 worktree、互いに素）

| ワーカー | 担当 | 目標ファイル数 |
|---|---|---|
| W-A | `src/components/ui/` | 40 |
| W-B | `src/components/domain/`, `src/hooks/` | 60 |
| W-C | `src/server/services/`, `src/server/repositories/`, `src/server/jobs/`, `src/server/db/{client,seed,migrate}.ts` | 50 |
| W-D | `src/app/**`, `src/actions/`, `src/app/api/**` | 110 |
| W-E | `src/lib/`, `src/emails/`, `src/config/`, `tests/**` | 80 |

各ワーカーへの共通指示: 契約ファイルは編集禁止、担当外ディレクトリは編集禁止、横断的関心事（`can()`、event-bus、feature flag、plan limits、soft delete、`orgId` スコープ）を必ず担当領域から呼ぶ、`pnpm exec tsc --noEmit` を自分の範囲で通してから報告。Subagent Contract の paste block を付与、`ALLOW_COMMIT` は付けない。

### 3.4 統合と検証ゲート

```bash
cd corpus/taskflow
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm exec vitest run
pnpm build
```

型エラーは境界に集中するので、統合後に「型エラー専任」の sonnet 1 体を 1 パス回す。全緑になるまで繰り返す。check-runner（haiku）で PASS/FAIL を取り、Director はログを直接読まない。

### 3.5 凍結

```bash
scripts/freeze-corpus.sh   # find src tests -type f | sort | xargs shasum -a 256 | shasum -a 256 → docs/plan/CORPUS.md
git tag corpus-v1
```

`graphify` の `detect` を一度走らせ、`total_files` と `total_words` を CORPUS.md に記録する（500 ファイル / 50 万語未満であることを確認）。

---

## 4. Phase 2: graphify グラフ構築と overlay

1. `corpus/taskflow` のコピーで `graphify update . --no-cluster` → `graphify cluster-only . --no-label --no-viz`（LLM 不要）。コミュニティ名は Director が `/graphify` の Step 5 相当で 1 回だけ付ける（graph の質を実利用と揃える）
2. 生成物のうち `graph.json`, `GRAPH_REPORT.md`, `.graphify_analysis.json`, `.graphify_labels.json`, `manifest.json`, `.graphify_python`, `.graphify_root` を `overlays/graphify/graphify-out/` に置く。**`memory/`, `reflections/`, `graph.html` は置かない**
3. `graphify install --project` を一時ディレクトリで実行し、生成される `CLAUDE.md` セクション・`.claude/settings.json`・`.claude/skills/graphify/` を `overlays/graphify/` に取り込む。hook コマンドは絶対パスなので、`scripts/patch-overlay.ts` で実行環境の `graphify` パスに書き換える
4. `overlays/baseline/CLAUDE.md` は共通指示のみ。`overlays/graphify/CLAUDE.md` は共通指示 + graphify セクション（文言は graphify 既定のまま）
5. **hook 動作確認**（haiku で 1 ラン、$0.1 程度）: 条件 B の overlay 上で「`can` の呼び出し元を挙げて」を投げ、JSONL に nudge 文言が `tool_result` / system 側に現れること、`graphify query` が Bash で実行されたことを確認。`graph.json` の直読みが起きた場合はその頻度を記録

---

## 5. Phase 3: タスクセットと採点器

### 5.1 タスク定義（tasks/tasks.json）

```json
{
  "id": "T2-callers-of-can",
  "category": "reference",
  "prompt": "…最後に ANSWER: 行に該当ファイルパスをカンマ区切りで列挙せよ。",
  "grader": "set-f1",
  "key": "keys/T2-callers-of-can.json",
  "success_threshold": 0.9
}
```

### 5.2 ground truth の作成

- カテゴリ 1・2・4: `ts-morph` を使った `scripts/derive-keys.ts` で参照集合を機械的に抽出し、Director が目視で確定する。graphify の出力を key 作成に使わない（循環を避ける）
- カテゴリ 3: ルーブリック（必須要素 5 点、各 0/1）を `keys/<id>.md` に書く。judge は haiku、条件名・ツール名を伏せた blind 評価。全 18 ランのうち 20% を人手で再確認
- カテゴリ 5: `tasks/bugs/<id>.patch`（バグ注入）と対応する失敗 spec。ラン前に patch 適用、ラン後に `pnpm vitest run <spec>` で判定

### 5.3 grader の自己テスト

`bench/grade.test.ts` に、正解を貼った回答 / 部分回答 / 無関係回答でスコアが期待通りになることを確認するテストを置く。

---

## 6. Phase 4: ハーネス実装とパイロット

### 6.1 新規ファイル

| パス | 概要 |
|---|---|
| `bench/run.ts` | 1 ラン。コピー → overlay → patch 適用 → `claude -p` → 収集 → テスト → 後片付け。失敗しても result を書く |
| `bench/matrix.ts` | (task, condition, rep) の列挙とシャッフル、再開（既存 run-id をスキップ） |
| `bench/collect.ts` | result JSON + JSONL → `metrics.json`（architecture.md §5 のフィールド） |
| `bench/grade.ts` | `set-f1` / `vitest` / `llm-judge` の 3 方式 |
| `bench/analyze.ts` | タスク単位ペア差分、bootstrap（B=2000, 95% CI）、中央値/IQR、T2S、iso-accuracy 集計 |
| `bench/report.ts` | `results/summary.csv`, `results/REPORT.md`（カテゴリ別表 + 全体表 + 失敗ラン一覧） |
| `bench/lib/claude-p.ts` | `claude -p` 起動と JSON パース、encoded cwd から JSONL を探す |
| `bench/lib/copy.ts` | `cp -c -R`（APFS）/ `--reflink=auto` / rsync フォールバック |
| `scripts/scaffold-corpus.ts`, `scripts/freeze-corpus.sh`, `scripts/derive-keys.ts`, `scripts/patch-overlay.ts` | Phase 1〜3 の補助 |

### 6.2 `claude -p` の起動フラグ（固定）

```bash
claude -p "$PROMPT" \
  --output-format json \
  --model "$BENCH_MODEL" --effort high \
  --setting-sources project \
  --permission-mode bypassPermissions \
  --max-turns 60 --max-budget-usd "$BENCH_MAX_BUDGET_USD" \
  --session-id "$RUN_UUID"
```

`--no-session-persistence` は付けない（JSONL が必要）。ランごとの一時ディレクトリを cwd にすると transcript は `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl` に出るので、収集後に `results/runs/<run-id>/transcript.jsonl` へコピーし、元は削除する。

### 6.3 パイロット

タスク 2 件（カテゴリ 2 と 5）× 条件 A/B × 1 反復 = 4 ラン。確認事項:

- metrics.json の全フィールドが埋まる
- 条件 B で `attributionSkill` または `Bash(graphify query …)` が観測される
- 条件 A で graphify 関連の文字列が一切現れない（遮断の確認）
- grader が動く
- 1 ランの所要時間とコストから本計測の見積もりを更新する

---

## 7. Phase 5: 本計測・分析・レポート

1. `nohup pnpm bench:full > results/full.log 2>&1 &` で 90 ラン。1 ラン完了ごとに `results/runs/<run-id>/` を書き、中断後は `matrix.ts` が未完了分だけ再開する
2. 進捗確認は bash-digest（haiku）にログを要約させる。Director は生ログを読まない
3. `pnpm bench:analyze && pnpm bench:report`
4. `results/REPORT.md` の必須内容:
   - 環境（Claude Code 版、モデル、effort、graphifyy 版、corpus ツリーハッシュ、日付）
   - 全体表: 条件 × {uncached_equivalent 中央値/IQR, total_cost_usd 中央値, num_turns, Read/Grep/graphify 呼び出し回数, 正答率, T2S}
   - カテゴリ別ペア差分と 95% CI（CI が 0 をまたぐ場合はそう書く）
   - 逆効果の事例（graph.json 直読み、nudge 無視）の件数
   - 限界（N、1 corpus、1 モデル）
5. 生データ（`results/runs/**`）をコミット。transcript は個人情報を含まないことを確認してからコミットする

---

## 8. 必要なパッケージ（ルート、ハーネス用）

| 種別 | パッケージ |
|---|---|
| devDependencies | typescript 5.9.3, tsx, @types/node, vitest 4.1.11, ts-morph（key 抽出）, zod（tasks.json 検証） |

外部 API は `claude` CLI と、任意で `@anthropic-ai/sdk`（count_tokens 補助のみ）。

---

## 9. 環境変数

| 変数 | 既定 | 説明 |
|---|---|---|
| `BENCH_MODEL` | `claude-sonnet-5` | 実行モデル |
| `BENCH_EFFORT` | `high` | effort |
| `BENCH_MAX_BUDGET_USD` | `4` | 1 ランの上限 |
| `BENCH_MAX_TURNS` | `60` | ターン上限 |
| `BENCH_SCRATCH` | scratchpad 配下 | ランごとのコピー先 |
| `BENCH_REPS` | `3` | 反復数 |
| `GRAPHIFY_HOOK_STRICT` | 未設定 | 条件 C のみ `1` |
| `ANTHROPIC_API_KEY` | 未設定 | count_tokens 補助のみ |

---

## 10. テスト方針

| 対象 | 方法 |
|---|---|
| corpus | tsc / eslint / vitest / build の全緑を凍結条件にする |
| grader | `bench/grade.test.ts`（固定入力でのスコア） |
| collect | 実測 result JSON と小さな JSONL フィクスチャからのフィールド抽出テスト |
| analyze | 既知の小データで bootstrap CI の再現性（seed 固定） |
| run（E2E） | パイロット 4 ラン |

---

## 11. 技術的リスクと回避策

| リスク | 回避策 |
|---|---|
| 並列生成ワーカー間の import 不整合 | 契約ファイル先行凍結 + 型エラー専任パス |
| ワーカーが TS 7 / Prisma / `middleware.ts` を選ぶ | corpus-spec.md の禁止事項チェックリストを全ワーカーの prompt に同梱 |
| 条件 B で `graph.json` 直読み | 検出フラグ + 発生率を報告。防止策を入れる場合は別条件として記録 |
| `claude -p` が permission で止まる | `bypassPermissions`。それでも `permission_denials` を記録 |
| APFS 以外でコピーが遅い | `--reflink=auto` / rsync フォールバック。node_modules は pnpm store のハードリンクなので容量は小さい |
| 90 ランの所要時間（1 ラン 2〜5 分 → 3〜8 時間） | 背景実行 + 再開可能。並列 2〜3 ランまで（レート制限に注意） |
| bug patch の適用が条件間で差を生む | patch 適用は overlay の後、`claude -p` の前に両条件同じ手順で行う |

---

## 参照ドキュメント

- [architecture.md](./architecture.md)
- [research-token-measurement.md](./research-token-measurement.md)
- [research-graphify.md](./research-graphify.md)
- [research-experiment-design.md](./research-experiment-design.md)
- [research-nextjs-corpus.md](./research-nextjs-corpus.md)
- [appendix-claude-p-json-sample.md](./appendix-claude-p-json-sample.md)
