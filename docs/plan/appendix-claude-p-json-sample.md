# `claude -p --output-format json` 実測サンプル（Claude Code 2.1.258, 2026-09-02）

コマンド:
```
claude -p "Reply with the single word: pong" --output-format json --model haiku --max-turns 1 --no-session-persistence --setting-sources project
```

抽出すべきキー（実測で存在確認済み）:

| key | 例 | 用途 |
|---|---|---|
| `total_cost_usd` | 0.0172612 | 請求コスト |
| `usage.input_tokens` | 10 | 非キャッシュ入力 |
| `usage.cache_creation_input_tokens` | 7294 | キャッシュ書込 |
| `usage.cache_read_input_tokens` | 13782 | キャッシュ読出 |
| `usage.output_tokens` | 66 | 出力 |
| `usage.output_tokens_details.thinking_tokens` | 59 | 思考 |
| `usage.iterations[]` | per-API-call | ターン毎の内訳 |
| `modelUsage.<model>.{inputTokens,outputTokens,cacheReadInputTokens,cacheCreationInputTokens,costUSD}` | | モデル別集計（サブエージェント含む） |
| `num_turns` | 1 | ターン数 |
| `duration_ms` / `duration_api_ms` | 1377 / 2514 | 実時間 |
| `session_id` | uuid | JSONL transcript 突合キー（`--no-session-persistence` 時は transcript なし） |
| `subagent_stats.spawned` | 0 | サブエージェント起動数 |
| `is_error` / `subtype` / `terminal_reason` | false / success / completed | 成否 |

注意（Director 実測済み。上記はスキーマ推定ではなく実出力）: `--setting-sources project` かつ空ディレクトリでも system prompt + tool 定義で約 21k トークンがキャッシュ側に載る（7294 write + 13782 read）。差分比較ではこの固定コストを引くか、両条件で同一であることを前提に扱う。
