# トークン計測手法の調査
## 調査日: 2026-09-02

対象: graphify-bench（Next.js中規模コードベースに対し、graphify知識グラフあり/なしでClaude Codeエージェントのトークン消費を比較するベンチマーク）。ローカル環境: Claude Code 2.1.258。一次情報は `code.claude.com/docs`（一部は `platform.claude.com` にリダイレクト）、および実機の `claude --help` / `claude -p --help` / `~/.claude/projects/*.jsonl` を確認した。

---

## 1. ヘッドレスモード（`claude -p --output-format json`）

`claude -p "<prompt>" --output-format json` は非対話実行の標準手段。`--output-format` は `text`（既定）/ `json`（単一結果オブジェクト）/ `stream-json`（リアルタイムストリーム）の3択（`--print` 使用時のみ有効、`claude --help` / `claude -p --help` で確認済み）。

Web検索経由の二次情報（GitHub Issue #38706 の議論、Introl社ブログ等）によると、`json` 形式の結果オブジェクトは概ね以下のフィールドを含む。**公式ドキュメントの完全なJSONスキーマ例は今回のWebFetchでは取得できなかった**（`code.claude.com/docs/en/cli-reference` は `--output-format` の選択肢のみ記載し、完全なサンプルJSONは掲載されていなかった）ため、下記は二次情報＋実機JSONLの `usage` 構造から妥当性を確認した推定を含む。ベンチマーク実装前に実際に1回 `--output-format json` を走らせてキー名を確定させることを推奨する（後述セクション7）。

推定されるフィールド:
```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 0,
  "duration_api_ms": 0,
  "num_turns": 0,
  "result": "...",
  "session_id": "...",
  "total_cost_usd": 0.0,
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0
  },
  "modelUsage": { "<model-id>": { "...": "..." } },
  "permission_denials": []
}
```
- `total_cost_usd`: そのランのAPI価格換算コスト（入力＋出力＋キャッシュ込み）。単一の要約指標として最も使いやすい。
- `num_turns`: エージェントループの反復回数（read→think→actの1サイクル）。
- `usage.*`: 実機JSONLで確認した `usage` オブジェクトのキー（`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`）と一致する構造と推定される。

**注意**: 実際のキー名・ネスト構造は必ず自分の環境で `claude -p "hello" --output-format json` を1回実行して確認すること（ドキュメントに完全な例がなく、GitHub Issue #38706 では `result` フィールドが空になるバグ報告もある＝バージョン依存の挙動変化に注意）。

---

## 2. 実験制御に関わるCLIフラグ

`claude --help` / `claude -p --help`（ローカル実機、v2.1.258）から直接確認した関連フラグ:

| フラグ | 用途 |
|---|---|
| `--model <model>` | セッションのモデル指定（`opus`/`sonnet`/`fable` などのエイリアス、またはフル名） |
| `--max-turns <n>` | エージェントターン数の上限（printモードのみ）。上限到達でエラー終了 |
| `--allowedTools` / `--disallowedTools` | ツールの許可/拒否リスト。graphify treatment runで `graphify query` を強制したい場合は `--allowedTools` でBash限定＋許可コマンドパターンを絞る、baseline runでは `graphify` コマンドを `--disallowedTools "Bash(graphify *)"` 等で明示的に塞ぐ設計が有効 |
| `--permission-mode <mode>` | `default`/`acceptEdits`/`plan`/`auto`/`dontAsk`/`bypassPermissions`/`manual`。ベンチマークの自動実行には `bypassPermissions` か `acceptEdits` が必須（対話プロンプトで止まらないように） |
| `--append-system-prompt <text>` | デフォルトのシステムプロンプト末尾に追記 |
| `--no-session-persistence` | セッションをディスクに保存しない（再現性のため各ランを独立させたい場合に有効。JSONL transcriptが残らない点に注意＝トークン内訳の後追い検証ができなくなるため、計測目的では**むしろ保存した方がよい**） |
| `--setting-sources <user,project,local>` | 読み込む設定ソースをカンマ区切りで指定。**これが baseline/treatment 分離の鍵**（次項で詳述） |
| `--strict-mcp-config` | `--mcp-config` で指定したMCPサーバのみ使用し、他の設定を無視 |
| `--max-budget-usd <amount>` | printモードでのAPI支出上限。暴走防止に有効 |
| `--session-id <uuid>` | セッションIDを固定指定可能（ラン識別に使える） |
| `-d, --debug [filter]` | デバッグログ（`api,hooks` 等でカテゴリフィルタ可） |

### `--setting-sources` によるbaseline/treatment分離

`claude --help` 記載の説明: 「Comma-separated list of setting sources to load (user, project, local)」。これはユーザーレベル（`~/.claude/settings.json` および `~/.claude/skills/`）・プロジェクトレベル（`.claude/settings.json`）・ローカル（`.claude/settings.local.json`）の3層を選択的に読み込む機能。

`code.claude.com/docs/en/settings` によれば設定の優先順位は上から: managed settings → CLI (`--settings`) → project local → shared project → user。**スキルの発見はこの設定階層と連動しており、ユーザーレベルの `~/.claude/skills/` はデフォルトで読み込まれる。**

**baseline run（graphifyなし）を「グローバルgraphifyスキルが見えない」状態にする設計**:
- `--setting-sources project,local`（`user` を除外）とすることで、`~/.claude/CLAUDE.md` やユーザーレベルの `~/.claude/skills/graphify/` を読み込ませない。graphify-bench リポジトリ自体の `.claude/` 配下にgraphifyスキルを置かなければ、baseline runからは完全に不可視にできる。
- treatment run（graphifyあり）は、graphifyスキルを **プロジェクトローカルの `.claude/skills/graphify/` に配置**した上で `--setting-sources project,local`（あるいは `user` も含めてよいが、再現性のためproject限定が望ましい）で起動する。
- 補足: `--bare`（Minimal mode）はCLAUDE.md自動探索・フック・プラグイン同期等をまとめてスキップするモードで、baseline runの「素の状態」を作る別の選択肢になり得る。ただしスキルは `--bare` でも `/skill-name` 経由では解決される旨が `claude --help` に明記されているため、baseline側でgraphifyスキルを一切参照させたくない場合は `--bare` 単体ではなく `--setting-sources project` と「project側にgraphifyスキルを置かない」の組み合わせで確実に遮断すること。
- `--restricted` は user/project/local設定ファイルを無視し、Bash/WebFetch等の実行系ツールも `--tools` で明示しない限り除去する強力な分離モード。baseline側でシェル探索すら禁止したい特殊な比較設計であれば検討可（ただし通常の「Read/Grep/Glob探索 vs graphify query」比較では過剰）。
- `CLAUDE_CONFIG_DIR` 環境変数（`~/.claude` の格納先を差し替える）も分離手段として存在するが、`--setting-sources` の方がフラグ一発で完結し、CIでの再現性が高い。

---

## 3. OpenTelemetry / テレメトリー

`code.claude.com/docs/en/monitoring-usage` より（WebFetch取得済み）:

- `CLAUDE_CODE_ENABLE_TELEMETRY=1` で有効化。`OTEL_METRICS_EXPORTER`（otlp/prometheus/console/none）、`OTEL_LOGS_EXPORTER`、`OTEL_EXPORTER_OTLP_PROTOCOL`、`OTEL_EXPORTER_OTLP_ENDPOINT` 等で出力先を制御。
- 主要メトリクス: `claude_code.token.usage`（属性 `type`: input/output/cacheRead/cacheCreation）、`claude_code.cost.usage`、`claude_code.session.count` など。
- **ツール単位の帰属**: メトリクスはリクエスト単位の集計だが、イベント（`claude_code.tool_result`, `claude_code.tool_decision`, `claude_code.api_request`）を使うとツール単位の粒度に近づける。`claude_code.tool_result` イベントは `tool_name`, `tool_use_id`, `duration_ms`, `tool_result_size_bytes` を持つ（`OTEL_LOG_TOOL_DETAILS=1` でさらに `tool_parameters`/`tool_input` の詳細も付与）。ただし**コストはAPIリクエスト単位でしか付与されない**（1リクエストが複数ツール呼び出しを含みうるため、ドキュメントも「Cost is attributed at the API request level ... not per-tool-call」と明記）。
- ベータの分散トレーシング（`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + `OTEL_TRACES_EXPORTER=otlp`）を使うと `claude_code.interaction` → `claude_code.llm_request` / `claude_code.tool` のスパン階層でツール実行時間まで追える。
- 運用コスト: OTelコレクター（Prometheus/Grafana等）の構築が必要で、ベンチマークのためだけに立てるにはオーバーヘッドが大きい。**JSONLトランスクリプト解析の方が単発ベンチマークには軽量**（後述4）。

---

## 4. JSONLセッショントランスクリプト（`~/.claude/projects/<encoded-cwd>/*.jsonl`）

ローカル実機で実際のJSONLを確認した（`~/.claude/projects/-Users-tetsuyaohta-projects-other-x-matome-site/*.jsonl`）。

### 構造
- 1行1メッセージのJSON Lines形式。`type` フィールドで種別分岐: `user`, `assistant`, `system`, `mode`, `summary`, `attachment`, `file-history-snapshot`, `file-history-delta`, `ai-title`, `last-prompt` など。
- 各 `assistant` メッセージの `message.usage` オブジェクトが実際のAPI `usage` を丸ごと格納している。実測フィールド:
```json
"usage": {
  "input_tokens": 2,
  "cache_creation_input_tokens": 72188,
  "cache_read_input_tokens": 20852,
  "output_tokens": 458,
  "server_tool_use": {"web_search_requests": 0, "web_fetch_requests": 0},
  "service_tier": "standard",
  "cache_creation": {"ephemeral_1h_input_tokens": 72188, "ephemeral_5m_input_tokens": 0},
  "inference_geo": "not_available",
  "iterations": [ {...} ],
  "speed": "standard"
}
```
- 便利な副次フィールド: `attributionSkill`（そのメッセージがどのスキル起因か。graphifyスキル使用の識別に直接使える）、`effort`、`version`、`gitBranch`、`requestId`。
- `assistant` の `content` 配列中の `tool_use` ブロック（`name`, `input`）と、対応する `user` メッセージ内の `tool_result`（`content`）で、ツール呼び出しとその結果本文が追跡できる。**`tool_result.content` を `json.dumps` した文字列長で「読み込んだツール結果のバイト数」を概算できる**（実測例: `gh pr diff` の結果が7692文字、ある `Read` ツール結果が63700文字など）。これは「file読み込み vs graphify query」の出力サイズ比較に直接使える簡便な代理指標。ただし文字数≠トークン数なので、正確な比較には次項の `count_tokens` API を使う。

### ccusage
- WebSearchで確認: `ccusage`（npm, https://www.npmjs.com/package/ccusage）はJSONLをローカル解析してAPIキー不要・ネットワーク不要でデイリー/セッション別のトークン・コストレポートを出す最も普及したOSSツール。`npx ccusage@latest` または `bunx ccusage`。
- **限界**: ccusageは人間向けの集計ダッシュボード用途で、ツール単位の帰属や「baseline vs treatment」といった実験デザイン向けの生データエクスポートは主眼ではない。今回のベンチマークでは、ccusageに頼らず自前で対象セッションのJSONLを直接パースするスクリプトを書く方が、再現性・自動化の観点で優れる（後述7）。

---

## 5. `count_tokens` API によるオフライン計測

`platform.claude.com/docs/en/build-with-claude/token-counting`（WebFetch取得済み、`POST /v1/messages/count_tokens`）:

- **無料**（"Token counting is free to use"）。ただしRPM制限あり（Startティア5,000/min、Buildティア10,000/min、Scaleティア20,000/min）。message作成のレート制限とは独立。
- リクエストはMessages API同形式（`system`, `messages`, `tools`, 画像/PDF可）。レスポンスは `{"input_tokens": N}` のみ。
- **キャッシュロジックは使われない**（あくまで見積り。実際の課金・キャッシュ挙動を反映しない）。
- 用途: 「ファイル全体をReadした場合のトークン数」vs「`graphify query` の出力をトークン数」を、実際にAPIを叩かずオフラインで比較する際に使える。ツール結果テキストを `messages: [{role:"user", content: <tool_result_text>}]` に詰めて `count_tokens` を呼べば、そのテキスト片のトークン数を無料で正確に測定できる。
- 注意点: Claude Fable 5.1 / Opus 4.7+ 系のトークナイザは旧モデル比で同一テキストにつき約30%多いトークン数になる（tokenizer変更）。比較実験では**ベンチマーク対象と同一の `model` パラメータ**で `count_tokens` を呼ぶこと。

---

## 6. プロンプトキャッシュの扱い（フェアな比較のために）

WebFetch結果（`platform.claude.com/docs/en/build-with-claude/prompt-caching`、二次情報ベースの要約であることに留意）から確認した価格倍率:

| キャッシュ操作 | ベース入力価格に対する倍率 |
|---|---|
| 5分キャッシュ書き込み | 1.25倍 |
| 1時間キャッシュ書き込み | 2.0倍 |
| キャッシュ読み取り（ヒット） | 0.1倍（Claude Fable 5.1 / Mythos 5.1 は例外で0.025倍） |

usageオブジェクトの内訳:
- `input_tokens`: 直近のキャッシュブレークポイント以降の、キャッシュ非対象トークン
- `cache_creation_input_tokens`: キャッシュへの書き込み合計（`cache_creation.ephemeral_5m_input_tokens` + `ephemeral_1h_input_tokens` の内訳あり）
- `cache_read_input_tokens`: キャッシュからの読み取り

**フェアな比較のための報告方法**:
1. **「非キャッシュ換算トークン数」**（uncached-equivalent）: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` を合算し、「もしキャッシュが一切効かなかったら何トークン相当の入力を処理したか」を示す。graphify query結果とファイル全読みの「情報量としての差」を測るにはこちらが適切（キャッシュヒット率はランごとのタイミング・順序に左右されやすく、ノイズが乗るため）。
2. **「実billed cost」**（`total_cost_usd`、または各usageフィールドに上表の倍率をかけた実額）: 実運用コストとしての比較にはこちらを使う。
3. 両方を並記し、「情報量の差」と「実コストの差」を分離して報告することを推奨。baseline/treatmentで同一プロンプト・同一初期コンテキストを使う限り、キャッシュ書き込み（初回）のコストは両ランでほぼ対称に発生するため、真の差分は主に「探索に要した追加ターン数のcache_creation/read」に現れる。

---

## 7. 推奨: 計測ハーネス設計

### 実行コマンド（1ラン分）
```bash
claude -p "$PROMPT" \
  --output-format json \
  --model claude-sonnet-5 \
  --permission-mode bypassPermissions \
  --setting-sources project,local \
  --max-turns 40 \
  --max-budget-usd 3.00 \
  --append-system-prompt "$(cat harness-system-note.txt)" \
  > "runs/${RUN_ID}.result.json"
```
- baseline run: リポジトリの `.claude/` 配下にgraphifyスキルを置かない状態、`--setting-sources project,local`（userを除外してグローバルgraphifyスキルを不可視化）。
- treatment run: `.claude/skills/graphify/` をプロジェクトに配置した上で同じ `--setting-sources project,local`。
- 両ランとも `--session-id` を明示指定してJSONL transcript側のファイル名を予測可能にしておくと後段の解析が楽になる。

### 収集するJSONフィールド（`--output-format json` の結果 + 対応するJSONL）
| フィールド | 由来 | 用途 |
|---|---|---|
| `total_cost_usd` | result JSON | 実コスト比較のメイン指標 |
| `usage.input_tokens` / `output_tokens` / `cache_creation_input_tokens` / `cache_read_input_tokens` | result JSON | 内訳比較 |
| `num_turns` | result JSON | ターン数（探索の複雑さの代理指標） |
| `duration_ms` / `duration_api_ms` | result JSON | 実行時間 |
| `modelUsage`（モデル別内訳、サブエージェント使用時） | result JSON | サブエージェント込みの帰属 |
| ツール呼び出し回数・種別（`Read`/`Grep`/`Glob`/`Bash(graphify *)` 等の内訳） | JSONL `tool_use` を集計 | 「探索行動そのもの」の差を定量化。graphify導入で `Read`/`Grep` 回数がどれだけ減るかを直接示せる |
| `attributionSkill` | JSONL `assistant` メッセージ | graphifyスキルが実際に発火した回数の検証（treatment runで意図通り使われているかのサニティチェック） |

### 反復回数・統計設計
- 同一プロンプトセットに対しbaseline/treatmentそれぞれ**最低5〜10回**の反復を推奨（LLMの探索経路には非決定性があり、単発比較はノイズに埋もれる）。
- タスクの種類を複数用意する（例: 「特定関数の呼び出し元を全て列挙」「あるコンポーネントの依存関係を説明」「バグ修正のため関連ファイルを特定」）。タスクごとに集計し、タスク横断の平均だけでなく分布（中央値・分散）も報告する。
- `effort` パラメータ（`--effort`）はbaseline/treatment間で固定すること（デフォルトの `high` に揃える）。モデルも完全固定。

### 保存するデータ
- `--output-format json` の生JSON（全件）
- 対応するJSONL transcriptのコピー（`--session-id` 指定によりファイル名が既知になる）
- 実行時のフラグ・環境変数のスナップショット（再現性のため）
- 集計スクリプト（Python/TSで、上表のフィールドをJSONLから抽出しCSV化）

### 実行前の確認事項（ブロッカー）
- `claude -p "hello" --output-format json` を一度だけ実際に実行し、結果JSONの正確なキー名（特に `usage` のネスト形式が本調査の推定と一致するか）を確認すること。本調査ではコスト制約により実プロンプト実行を避けたため未検証。
- graphify CLI（v0.9.50）が `graphify query` 実行時にどのツール経由（Bash実行かカスタムツールか）で呼ばれるかを確認し、`--allowedTools`/`--disallowedTools` の対象名を正確に一致させること。

---

## 参考リンク
- [Manage Claude Code costs](https://code.claude.com/docs/en/costs)
- [Monitoring usage (OpenTelemetry)](https://code.claude.com/docs/en/monitoring-usage)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Token counting API](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [ccusage - npm](https://www.npmjs.com/package/ccusage)
- [ccusage - GitHub](https://github.com/ryoppippi/ccusage)
- [Claude Code CLI: The Definitive Technical Reference (Introl)](https://introl.com/blog/claude-code-cli-comprehensive-guide-2025)
- [GitHub Issue #38706 - result field empty](https://github.com/anthropics/claude-code/issues/38706)
