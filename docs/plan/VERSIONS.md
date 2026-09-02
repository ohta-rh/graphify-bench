# 計測環境バージョン記録

Phase 0 で固定した環境。`results/REPORT.md` の環境欄はここを引用する。

記録日: 2026-09-02（ホスト: macOS 26.2, arm64）

| ツール | バージョン | 取得コマンド |
|---|---|---|
| Claude Code | 2.1.258 (Claude Code) | `claude --version` |
| graphifyy | v0.9.53 | `uv tool list` |
| graphify 実行パス | `/Users/tetsuyaohta/.local/bin/graphify` | `which graphify` |
| Node | v25.5.0 | `node --version` |
| pnpm | 10.28.2 | `pnpm --version` |

## ハーネス依存（ルート package.json、完全固定）

| パッケージ | バージョン |
|---|---|
| typescript | 5.9.3 |
| tsx | 4.23.13 |
| @types/node | 25.9.5 |
| vitest | 4.1.11 |
| ts-morph | 28.0.0 |
| zod | 4.5.4 |
| @anthropic-ai/sdk | 0.123.0 |

注: `npm view typescript version` は 7.0.2 を返すが、corpus 側の
@typescript-eslint peer 制約に合わせて **5.9.3 に固定**する（architecture.md §3）。
`@types/node` も latest は 26.x だが Node 25.5.0 に合わせて 25.x に固定する。

## ベンチマーク設定（ユーザー決定）

| 項目 | 値 |
|---|---|
| モデル | `claude-sonnet-5` |
| effort | `high` |
| 規模 | 15 タスク × 2 条件 × 1 反復 = 30 ラン |
