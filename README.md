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

## 要点

- graphify 自身の `graphify benchmark` は合成推定であり、実エージェントの消費を測っていない。本ベンチは `claude -p --output-format json` と JSONL transcript から実測する。
- 比較は iso-accuracy（正答したランのみ）で行い、削減率と正答率をセットで報告する。
- 被験コードベースは学習データ汚染を避けるためオリジナル生成（Next.js 16.3.4 / TypeScript 5.9.3 / Drizzle + better-sqlite3、約 350 ファイル）。
