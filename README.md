# graphify-bench

Claude Code エージェントが中規模 Next.js コードベースで作業するとき、[graphify](https://github.com/Graphify-Labs/graphify)（AST 由来の知識グラフ）の有無でトークン消費がどう変わるかを、実セッションの計測値で比較するベンチマーク。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/plan/architecture.md](docs/plan/architecture.md) | 設計書（比較条件、メトリクス、タスク設計、リスク） |
| [docs/plan/implementation-plan.md](docs/plan/implementation-plan.md) | 実施計画（Phase 0〜6、ファイル一覧、検証ゲート） |
| [docs/plan/research-token-measurement.md](docs/plan/research-token-measurement.md) | `claude -p` / JSONL / OTel / count_tokens によるトークン計測手法の調査 |
| [docs/plan/research-graphify.md](docs/plan/research-graphify.md) | graphify の仕様（`benchmark` の実体、hook の挙動、TS/TSX 抽出）の調査 |
| [docs/plan/research-experiment-design.md](docs/plan/research-experiment-design.md) | 先行研究（arXiv:2608.13568 等）、タスク分類、統計、コスト試算 |
| [docs/plan/research-nextjs-corpus.md](docs/plan/research-nextjs-corpus.md) | 被験 Next.js アプリ "Taskflow" のバージョン固定と構成 |
| [docs/plan/appendix-claude-p-json-sample.md](docs/plan/appendix-claude-p-json-sample.md) | `claude -p --output-format json` の実出力スキーマ |
| [docs/plan/VERSIONS.md](docs/plan/VERSIONS.md) | 計測環境のバージョン固定記録 |

## ベンチマークの実行

### 準備

```bash
pnpm install                                              # ハーネスの依存
(cd corpus/taskflow && pnpm install --frozen-lockfile)    # 被験コードベース（Phase 1 以降）
pnpm exec tsx scripts/patch-overlay.ts                    # hook の graphify 絶対パスを実行機に合わせる
```

### 実行

```bash
pnpm bench:pilot                     # 反復 1 回。--only でタスクを絞れる
nohup pnpm bench:full > results/full.log 2>&1 &   # 本計測は必ず背景実行
pnpm bench:collect                   # result.json + transcript.jsonl → metrics.json
pnpm bench:grade                     # → grade.json
pnpm bench:analyze                   # ペア差分・bootstrap CI → results/analysis.json
pnpm bench:report                    # → results/summary.csv, results/REPORT.md
pnpm test && pnpm typecheck          # ハーネス自身の検証
```

`bench:pilot` / `bench:full` は 1 ラン完了ごとに `results/runs/<run-id>/` を書き、
`metrics.json` があるランは次回スキップする（中断しても再開できる）。
`--` の後ろのフラグはそのまま `bench/matrix.ts` に渡る。

| フラグ | 既定 | 説明 |
|---|---|---|
| `--tasks <file>` | `tasks/tasks.json` | タスク定義ファイル |
| `--corpus <dir>` | `corpus/taskflow` | 複製元の被験コードベース |
| `--conditions <a,b>` | `baseline,graphify` | 実行する条件 |
| `--reps <n>` | `BENCH_REPS`（pilot は 1） | 反復数 |
| `--only <id,...>` | 全件 | タスクを絞る |
| `--seed <s>` | `graphify-bench-v1` | 実行順シャッフルの seed |
| `--concurrency <n>` | 1（最大 3） | 並列ラン数 |
| `--dry-run` / `--force` | off | 実行計画の表示 / 完了済みランの再実行 |
| `--allow-placeholder` | off | `placeholder: true` のタスクの実行を許可 |

### 環境変数

| 変数 | 既定 | 説明 |
|---|---|---|
| `BENCH_MODEL` | `claude-sonnet-5` | 実行モデル |
| `BENCH_EFFORT` | `high` | effort（両条件で固定すること） |
| `BENCH_MAX_BUDGET_USD` | `4` | 1 ランの支出上限 |
| `BENCH_MAX_TURNS` | `60` | ターン上限 |
| `BENCH_SCRATCH` | OS の一時ディレクトリ配下 | ランごとの複製先。リポジトリ外に置く（`--setting-sources project` が本リポジトリの `.claude/` を拾わないため） |
| `BENCH_RESULTS_DIR` | `results/` | 成果物の出力先。**動作確認ランは必ずここを別ディレクトリに向ける**（`analyze.ts` は `runs/` 配下を全件集計するため、捨てランが本計測に混ざる） |
| `BENCH_REPS` | `3` | 反復数 |
| `BENCH_KEEP_WORKDIR` | 未設定 | `1` でラン用ディレクトリを消さない（デバッグ用） |
| `GRAPHIFY_HOOK_STRICT` | 未設定 | 条件 C のとき `1` |
| `ANTHROPIC_API_KEY` | 未設定 | `count_tokens` 補助計測のみ。`claude -p` は既存ログインを使う |

## 要点

- graphify 自身の `graphify benchmark` は合成推定であり、実エージェントの消費を測っていない。本ベンチは `claude -p --output-format json` と JSONL transcript から実測する。
- 比較は iso-accuracy（正答したランのみ）で行い、削減率と正答率をセットで報告する。
- 被験コードベースは学習データ汚染を避けるためオリジナル生成（Next.js 16.3.4 / TypeScript 5.9.3 / Drizzle + better-sqlite3、約 350 ファイル）。
