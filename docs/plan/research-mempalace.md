# MemPalace 調査（graphify-bench 条件設計用）

## 調査日: 2026-09-02
## 調査者: sonnet subagent（研究のみ、リポジトリ非改変）
## 結論: MemPalace は実在する OSS で、本ハーネスに組み込み可能。ただし性質が graphify と根本的に異なる（会話メモリシステムであり、静的コード索引ではない）。条件設計は §8 参照。

---

## 0. 重要な前提の訂正

MemPalace は「コードベース用の知識グラフツール」ではなく、**会話履歴を逐語保存し意味検索で引き出す AI メモリシステム**。プロジェクトファイルも `mine` できるが、主眼は Claude Code / ChatGPT のセッション横断記憶（`~/.claude/projects/*.jsonl` の transcript を継続的に mine し、Stop hook で自動保存し続ける）。graphify のような AST 由来のコード構造グラフではなく、**チャンク化されたテキストの ChromaDB ベクトル検索 + BM25 のハイブリッド**。この違いは条件設計に直結する（§8）。

## 1. Identity

| 項目 | 値 |
|---|---|
| GitHub | https://github.com/MemPalace/mempalace （org: MemPalace, 58,789 stars / 7,545 forks 時点 2026-09-02） |
| License | MIT |
| PyPI | https://pypi.org/project/mempalace/ |
| 最新バージョン | 3.9.0（2026-08-31 リリース） |
| Author | milla-jovovich（PyPI 表示名。人物特定はしていない） |
| Homepage/docs | https://mempalaceofficial.com |
| CLI エントリポイント | `mempalace`（`mempalace.cli:main`）, `mempalace-mcp`（フル MCP, `mempalace.mcp_proxy:main`）, `mempalace-light-mcp`（軽量版） |

**なりすましサイト注意**: README 冒頭に `[!CAUTION]` として「`mempalaceofficial.com` 以外の `.tech`/`.net`/その他 `.com` は偽サイトでマルウェア配布の恐れあり」と明記されている（`docs/HISTORY.md` に経緯）。実際の `WebSearch` でも `mempalace.net`、`mempalace.tech`（"Milla Jovovich's AI Memory System" という奇妙な副題付き）がヒットした。これらは本調査では一切参照していない。README の当該記述自体は正規リポジトリ内の一次情報として確認済み。

**インストール確認**（実施済み、スクラッチ venv）:
```bash
python3 -m venv mempalace-venv
source mempalace-venv/bin/activate
pip install mempalace
mempalace --version   # => MemPalace 3.9.0
```
`uv tool install mempalace` / `pipx install mempalace` も公式推奨（PEP 668 環境向け）。本番ハーネスでは `uv venv` + `uv pip install mempalace` を推奨（既存の graphify 条件と同様に isolated venv 前提にできる）。

## 2. Storage と分離（isolation）

- デフォルト palace パス: `~/.mempalace/palace`（`config.py: DEFAULT_PALACE_PATH`）。
- **環境変数で完全に上書き可能**: `MEMPALACE_PALACE_PATH`（または旧名 `MEMPAL_PALACE_PATH`）。これが本ハーネスの per-run 分離に使う主要フック。
- CLI 全体にも `--palace <path>` グローバルオプションがあり、`mempalace-mcp --palace /path/to/palace` で MCP サーバ起動時にも直接指定可能（後述）。
- **重要な落とし穴（実測で確認）**: `MEMPALACE_PALACE_PATH` を設定して `mempalace init --yes --auto-mine --no-llm <dir>` を実行しても、以下がホームディレクトリ側に副作用として書かれる:
  - `~/.mempalace/known_entities.json` — 検出したエンティティ名（プロジェクト名など）のグローバルレジストリ。中身は名前文字列のみ（今回の例: `{"projects": ["Queue", "Route"]}`）で本文コンテンツは含まない。
  - `~/.mempalace/config.json`, `~/.mempalace/locks/` — mempalace 自体の設定・ロック。
  - 埋め込みモデルのキャッシュ `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/`（79.3 MB, tar.gz でダウンロード）。これは `HF_HOME` を上書きしても影響を受けない（chromadb の ONNX ダウンローダーが `~/.cache/chroma` を直接使うため）。
  - **これらのファイルは実際に本セッションで作成され、`rm -rf ~/.mempalace` は本環境の削除ゲート（critical path 保護）でブロックされた。** ゲートを迂回せず未削除のまま残している。内容はテスト由来の空メタデータのみで機密性はない。

**per-run 分離への含意**: `MEMPALACE_PALACE_PATH`（データ本体）に加えて、`HOME` を per-run の一時ディレクトリに向けるか、少なくとも `mempalace init` のグローバルレジストリ書き込みと埋め込みモデルキャッシュを事前にウォームアップ済みの共有キャッシュとして扱う設計が必要。埋め込みモデルキャッシュ（79 MB）はランごとに再ダウンロードすると遅く非効率なので、**事前に 1 回ウォームアップして `~/.cache/chroma` を全ラン共有**し、`MEMPALACE_PALACE_PATH`（データ本体）と `known_entities.json` のみをラン間で分離するのが現実的（後者は無害な副作用として許容するか、`HOME` を丸ごと隔離する）。

## 3. Ingest（`mempalace mine`）

- 対応形式: プロジェクトファイル（コード・Markdown・テキスト全般、`mempalace mine <dir>`）、会話エクスポート（`--mode convos`: Claude Code/Claude.ai/ChatGPT/Slack）、バイナリ文書（`--mode extract`: PDF/DOCX/PPTX/XLSX/RTF/EPUB、`mempalace[extract]` extra 必須）、登録済みソースアダプタ（`--source NAME`）。
- **非対話実行には `--yes`（エンティティ検出の自動承認）と `--no-llm`（Ollama 等のローカル LLM 呼び出しをスキップ）が必須**。デフォルトの `mempalace init` は対話プロンプトを出し、`--yes` なしだと標準入力が無い環境で `EOFError` で落ちる（実測で確認済み）。`mempalace init --yes --auto-mine --no-llm <dir>` で完全非対話の init+mine が一発で通る。
- チャンク化: ファイル単位で「drawer」に分割（内部チャンクサイズは `miner.py` の `MAX_CHUNKS_PER_FILE`（デフォルト 50,000）でガード。実測のチャンク粒度は 1 ファイルあたり数個〜30個程度、Markdown 設計文書で 20〜30 drawers/file）。
- 埋め込みモデル: デフォルト `all-MiniLM-L6-v2`（ONNX, chromadb 同梱ダウンローダー経由, 約80MB, 初回のみダウンロード）。onboarding では多言語対応の `embeddinggemma-300m`（ONNX, 約300MB）も選択可能（`MEMPALACE_EMBEDDING_MODEL` 環境変数）。
- 実測時間（39ファイル、コード20+Markdown19、Apple Silicon, CoreML backend）: `init --yes --auto-mine --no-llm` 全体で **約24秒**（うち埋め込みモデルダウンロード ~10秒を含む。ダウンロード後の実マイニングは数秒程度）。パレットサイズ: 8.4 MB（39ファイル分、625 drawers）。600ファイル規模（corpus-v2 相当）ではモデルキャッシュ済み前提で概算 **数分程度**、パレットサイズは概算 **100〜150 MB程度**（線形外挿。実測はしていない）。
- 決定性: 埋め込みは決定的（同一モデル・同一入力なら同一ベクトル）だが、ファイル走査順や chunk ID には UUID が使われており（`drawer_id` にランダム性なし、ファイル名ベースのハッシュ接頭辞を確認）、`.mempalace/origin.json` に書かれるコーパス起源判定はヒューリスティック（`--no-llm` なら決定的）。**再現性は高いが、byte-for-byte 同一の palace が毎回できるかは未検証**（ChromaDB の HNSW インデックス構築順序に依存する可能性がある）。

## 4. Recall path（エージェントからの検索経路）

3つの経路がある:

### (a) MCP サーバ（推奨・本ハーネスに最適）
```bash
mempalace mcp
# => claude mcp add mempalace -- mempalace-mcp
#    または: mempalace-mcp --palace /path/to/palace
```
- `mempalace-mcp --palace <path>` で **プロジェクトローカルな `--mcp-config` JSON に直接組み込み可能**。`claude -p --mcp-config <file> --strict-mcp-config` と完全に相性が良い（実測で stdio JSON-RPC ハンドシェイクを行い動作確認済み、後述 §7）。
- ツール数: **45個**（`mempalace_search`, `mempalace_mine`, `mempalace_kg_query` などナレッジグラフ系、`mempalace_diary_*`、`mempalace_task_*` などタスク委譲系まで多岐）。検索用途で主に使うのは `mempalace_search`（引数: `query`, `wing`, `room`, `results` 等）。
- `mempalace-light-mcp`（`mempalace.mcp_light_server:main`）という軽量版も別エントリポイントとして存在（ツール数調査は未実施。トークン節約用途と推測されるが未検証）。

### (b) CLI 直接呼び出し
```bash
mempalace search "webhook retry policy" [--wing W] [--room R] [--results N]
```
- `--json` フラグは存在しない（`--help` に記載なし、実行するとエラー）。**出力はテキストのみ**。5件のデフォルト結果で **94行 / 4,951 バイト**（今回のサンプル実測）。MCP 経由の `mempalace_search` ツール呼び出しは JSON を返す（同じクエリで 7,470 バイトのレスポンス、5件）。CLI 出力の方がやや簡潔だが、いずれにせよ検索結果自体を CLAUDE.md に埋め込むような静的コスト構造ではなく、**エージェントが都度クエリして得るオンデマンド costを払う**設計。

### (c) Hook 注入（今回は非採用を推奨）
- `hooks/mempal_save_hook.sh` は Claude Code の **Stop hook** で、N メッセージごとに **エージェントの stop をブロックし**、"会話を palace に保存せよ" という reason を返してエージェントに追加ターンを強制する設計（`SAVE_INTERVAL=15` デフォルト）。
- `hooks/mempal_precompact_hook.sh`（PreCompact hook）、`hooks/mempal_session_end_hook.sh`（SessionEnd）も存在。いずれも「会話ログを継続的に palace へ書き込む」ためのもので、**静的な pre-built palace を読ませるための仕組みではない**。
- `mempalace init` 自体は `.claude/settings.json` を自動改変しない（README・CLI ヘルプいずれにも該当記載なし。「Agent-guided setup」＝`npx skills add MemPalace/mempalace` 経由でスキルをインストールし、**エージェントに**インストール作業をさせる設計。この `npx skills add` は未検証・未実行 — 出所不明の npm パッケージを実行することになるため本調査ではスキップした）。
- **本ハーネスでは Stop/PreCompact hook は採用しない**（`claude -p` の 1 タスク・単発実行モデルと相性が悪く、ターン数・トークン消費を汚染する。既存の graphify 条件も hook は "nudge" 程度に留めている設計思想と一致）。

## 5. AAAK インデックス

- `mempalace_get_aaak_spec` という MCP ツールが存在する（tools/list で確認）。AAAK は「約30倍圧縮の可逆フォーマットで、デコーダなしに任意の LLM がネイティブに読める」という触れ込み（WebSearch 要約より。一次ソースでの詳細スペック確認は未実施）。
- **AAAK はエージェントが直接読むファイルではなく、`mempalace_diary_write`/`mempalace_diary_read` 系ツール経由で使う圧縮日記フォーマットと推測される**（`mempalace/dialect.py` というモジュールが存在し、AAAK 方言のエンコード/デコードを担うと見られるが、コード内容までは読んでいない）。検索結果自体（`mempalace_search`）は AAAK ではなく生テキスト（drawer の text フィールド）を返す。
- 600ファイル規模でのサイズは未計測。§3 のパレットサイズ推定（100〜150 MB）はベクトルインデックス込みの数字で、AAAK 日記とは別物。

## 6. 公表されている claims（一次ソース引用）

`docs/HISTORY.md`（GitHub リポジトリ内、2026-04-14 付エントリ）より:

> "A community audit identified a category error in the public benchmark tables on README.md and mempalaceofficial.com: MemPalace's retrieval recall numbers (R@5, R@10) were listed in the same columns as competitors' end-to-end QA accuracy numbers. [...] The headline number on all surfaces is now **96.6% R@5 on LongMemEval in raw mode**, independently reproduced on Linux x86_64 against the tagged v3.3.0 release on 2026-04-14."
> — https://github.com/MemPalace/mempalace/blob/develop/docs/HISTORY.md

同エントリで撤回された claim も記録されている: 「+34% palace boost」（撤回済み）、「Haiku rerank で 100%」（見出しからは撤回、方法論文書には残存— "teaching to the test" と自己批判）。**この自己訂正の透明性は、少なくとも README/HISTORY レベルでは信頼できる公開姿勢を示している**（が、96.6% という数字自体は LongMemEval という会話メモリベンチマークの数字であり、本ベンチが測るコードベース探索タスクとは無関係な指標である点に注意）。

README トップの一文: "Local-first AI memory. Verbatim storage, pluggable backend, 96.6% R@5 raw on LongMemEval — zero API calls."

トークン削減系の claim は README/HISTORY からは見当たらなかった（MemPalace はトークン削減ではなく「記憶の永続化」を主眼にしており、graphify のような「探索コスト削減」の claim とは訴求点が異なる）。

## 7. Hands-on 検証結果

サンプル: `corpus/taskflow/docs/` から Markdown 19ファイル（`service-webhook.md`, `background-jobs.md`, `traceability.md` 含む）、`corpus/taskflow/src/` から TypeScript 20ファイルをコピーし、`$SCRATCHPAD/mempalace-sample/{docs,code}/` に配置。`~/.mempalace` および corpus 本体は変更していない（前掲の副作用書き込みを除く）。

```bash
export MEMPALACE_PALACE_PATH="$SCRATCHPAD/mempalace-palace"
mempalace init --yes --auto-mine --no-llm "$SCRATCHPAD/mempalace-sample"
```
結果: 39ファイル処理、625 drawers、パレット 8.4 MB。

検索テスト（CLI）:
```bash
mempalace search "webhook retry policy"
```
上位結果は `service-webhook.md`（DES-WEBHOOK 設計文書）、`webhook-delivery-job.ts` を参照する `background-jobs.md`（DES-064）、`traceability.md`（REQ-155〜157 のトレーサビリティ表）を正しく上位に返した — **意味検索としての精度は高い**（cosine_sim 0.60〜0.63 の妥当な範囲）。

MCP テスト（stdio JSON-RPC、Python テストクライアントで `initialize` → `tools/list` → `tools/call mempalace_search` を実施）:
```bash
mempalace-mcp --palace "$SCRATCHPAD/mempalace-palace"
```
- `tools/list` で **45ツール**を確認（§4 に列挙）。
- `mempalace_search` 呼び出しで CLI と同等の上位結果を JSON で取得（レスポンス長 7,470 バイト、5件）。

## 8. 推奨: 本ハーネスへの条件設計

### 8.1 overlay 構成

```
overlays/mempalace/
├── CLAUDE.md              既存の baseline CLAUDE.md + 「関連情報は mempalace_search で
│                            先に検索してから探索せよ」という短いセクションを追記
│                            （graphify overlay の CLAUDE.md セクションと対称的な位置づけ）
└── .mcp-config/mempalace.json   claude -p --mcp-config で渡す MCP 設定ファイル
```

`.mcp-config/mempalace.json` の中身（イメージ）:
```json
{
  "mcpServers": {
    "mempalace": {
      "command": "/absolute/path/to/mempalace-venv/bin/mempalace-mcp",
      "args": ["--palace", "/absolute/path/to/<run-tmpdir>/palace"]
    }
  }
}
```
`--palace` の値は run.ts が per-run tmpdir を生成するたびに書き換える（既存の graphify-out コピー機構と同じ発想で、run 開始時にテンプレート JSON の `{{PALACE_PATH}}` を実パスに置換する）。

`extraClaudeArgs: ["--mcp-config", "<生成したjsonのパス>", "--strict-mcp-config"]` を `ConditionSpec` に追加する。

### 8.2 per-run 分離手順

1. corpus 世代（v1/v2）ごとに **1回だけ** palace を事前構築し、`overlays/mempalace/` または別の非 git 管理領域（4.6MB の graphify graph.json と同様、8〜150MB規模なので git 管理は避け `.gitignore` 対象にするか外部ストレージ参照にする）に保存する。
2. run 開始時、事前構築 palace ディレクトリを run 専用の tmpdir に **コピー**（ChromaDB の SQLite は他プロセスと共有すると書き込み競合するため、コピーは必須。読み取り専用マウントでは `chroma.sqlite3` への軽微な書き込み — アクセス時刻等 — が失敗する可能性があるため、コピーが安全）。
3. `mempalace-mcp --palace <run-tmpdir>/palace` を起動する MCP 設定 JSON を run ごとに生成。
4. **埋め込みモデルキャッシュ（`~/.cache/chroma/onnx_models/`）はラン間で共有してよい**（読み取り専用、コンテンツを含まない）。ハーネス実行前に一度だけウォームアップしておく。
5. **`~/.mempalace/known_entities.json` への書き込みは mine 時のみ発生する。pre-built palace をコピーするだけの通常run では mine を実行しないため、この副作用は事前構築の1回だけに限定できる**（run.ts 側では mine を呼ばない設計にする）。

### 8.3 想定される落とし穴

- **`mempalace init` は対話プロンプトが必須**（`--yes` を付け忘れると `claude -p` 経由の非対話環境で `EOFError` になる — ただしこれは事前構築時のみの懸念で、run.ts 自体が `mempalace init` を呼ぶ設計にはしない）。
- **ChromaDB のロックファイル**: 同一 palace ディレクトリを複数プロセスが同時に開くと競合しうる（3反復を並列実行する場合、run ごとに確実に別ディレクトリへコピーする必要がある — matrix.ts の既存の並列実行前提と整合させる）。
- **MCP ツールが45個**という多さは、`--strict-mcp-config` でもツール一覧がエージェントのシステムプロンプト相当の文脈に載る（tool definition のトークンコストが graphify skill 1個 + hook よりも大きい可能性がある）。ベンチ上は「baseline との比較」がフェアになるよう、ツール定義自体のトークンコストも計測対象に含めるべき（既存の `bench/run.ts` の収集項目に照らして、これは通常 API 側でシステムプロンプトに算入されるはずなので追加対応は不要と見られるが、report.ts 側で mempalace 条件のみツール数が多い点を注記した方がよい）。
- **CLI 検索に `--json` がない**ため、CLAUDE.md 上で「`mempalace search` を CLI から叩け」という指示は避け、MCP の `mempalace_search` を使わせる方が出力が構造化されて安定する。
- **図らずも `~/.mempalace` に副作用を残す**（今回の調査で実際に発生し、削除ゲートで未削除のまま残存）。本番運用では、CI/計測マシンの `HOME` をコンテナ的に隔離する（Docker 実行、または `HOME=<isolated-dir>` で `claude -p` 子プロセスごと起動する）ことを強く推奨。
- **決定性が graphify ほど保証されていない**（chunk ID・HNSW構築順序未検証）。事前構築した palace を全runで使い回す設計（§8.2手順1-2）であれば、この非決定性は「構築時に一度だけ」に閉じ込められるので実運用上の問題にはならない。

---

## 参考: 一次ソースリンク一覧

- リポジトリ: https://github.com/MemPalace/mempalace
- README: https://github.com/MemPalace/mempalace/blob/develop/README.md
- HISTORY（claims の訂正記録）: https://github.com/MemPalace/mempalace/blob/develop/docs/HISTORY.md
- PyPI: https://pypi.org/project/mempalace/
- 設定モジュール: https://github.com/MemPalace/mempalace/blob/develop/mempalace/config.py
- CLI: https://github.com/MemPalace/mempalace/blob/develop/mempalace/cli.py
- Hooks: https://github.com/MemPalace/mempalace/tree/develop/hooks
