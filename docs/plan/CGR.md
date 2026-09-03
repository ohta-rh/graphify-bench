# Phase 13: code-graph-rag as a benchmark condition family

作成日 2026-09-03 / code-graph-rag **0.0.845** / corpus `corpus-v1` (code-45 arms) と
`corpus-v2` (docs-20 arms)。結果は未計測 — 本ドキュメントはハーネスへの組み込み記録であり、
`## 結果` は TBD。

---

## 1. なぜこの条件を足したのか

Phase 9（`docs/plan/MEMPALACE.md`）は「事前構築インデックスを検索してから読む」という
発想そのものと、graphify の実装のどちらが Sonnet の素の探索に負けているのかを区別する
ために、graphify とは根本的に違う索引方式（埋め込み + BM25 のテキストチャンク）を測った。
答えは「発想側」寄りだった — 索引の作り方を変えても baseline に勝てなかった。

code-graph-rag はここに三つ目の点を足す。graphify と同じ **AST 由来のノード・エッジ**を
持ちながら、置き場所が違う: JSON ファイル + CLI（graphify）ではなく **グラフデータベース
（Memgraph）+ ベクタストア（Qdrant）+ MCP サーバ**である。したがって

- `graphify` と `cgr` を比べれば「AST グラフという発想」対「AST グラフをどう配るか
  （ファイル+CLI vs DB+MCP）」を分離できる。
- `mempalace` と `cgr` を比べれば「構造インデックス」対「意味インデックス」を、
  どちらも MCP 経由という条件を揃えたまま比べられる（graphify との比較では配布方式が
  変数として混ざる）。

3 つのインデックス形状を並べる表:

| 条件 | 索引の実体 | アクセス方法 | 索引方式 |
|---|---|---|---|
| `graphify` | JSON ファイル（コーパスコピー内） | CLI（`graphify query` 等） | AST ノード・エッジ |
| `mempalace` | ChromaDB（run 専用コピー） | MCP（`mempalace_search`） | 埋め込み + BM25 チャンク |
| `cgr` | Memgraph + Qdrant（共有・読み取り専用） | MCP（9 ツール） | AST ノード・エッジ |

---

## 2. スコープの決定: LLM を使うツールは測らない

code-graph-rag の目玉機能は `ask_agent` / `query_code_graph` — 自然言語の質問を
オーケストレータ LLM が Cypher クエリに翻訳し、グラフに問い合わせて自然言語で答える
NL→Cypher パスである。**このアームはこの経路を意図的に測定対象から外している。**

理由:

1. **公平性。** 他のどのアームも外部 LLM 呼び出しを検索の一部として持たない
   （graphify の CLI も mempalace の ChromaDB もローカル計算のみ）。`ask_agent` を
   許すと、そのターン内で二段目の LLM 推論コストが発生し、比較しているのが
   「事前構築インデックス」ではなく「もう一段の LLM 呼び出し」になってしまう。
2. **決定性と再現性。** `ask_agent` の応答はオーケストレータ LLM の出力そのものであり、
   計測をこの LLM の挙動に従属させることになる。起動時バリデーションを通すために
   `ORCHESTRATOR_PROVIDER=ollama` / `ORCHESTRATOR_MODEL=qwen3.5:4b` は設定してあるが
   （ローカルモデルなので API キー不要）、実際にこのツールを呼ぶ経路は
   `--disallowedTools` で塞いである。
3. **測定したいものと合わない。** このベンチが問うているのは「事前構築されたグラフを
   読むことは、素の探索より安いか」であって「グラフを使う LLM オーケストレーションは
   賢いか」ではない。後者は別の実験である。

**結果として、このアームが測るのは code-graph-rag の LLM 抜きのグラフ検索ツールだけ**
— これは MemPalace の `mempalace_search` 一本と同じ位置づけで、mempalace 側の
「本来の用途（会話記憶）ではなく副次機能（プロジェクト索引）を測っている」という
限界表明と対になる。

---

## 3. 許可ツールと禁止ツール

`bench/conditions.ts` の `CGR_DISALLOWED_TOOLS`（12 個、フル namespace）が
`--disallowedTools` に渡る。残る 9 個が許可ツールで、CLAUDE.md のナッジは
`semantic_search` / `get_code_snippet` / `find_duplicate_code` / `structural_search`
の 4 つを名指しする。

| ツール | 状態 | 理由 |
|---|---|---|
| `semantic_search` | 許可 | LLM 抜きの意味検索。主たる入口。 |
| `get_code_snippet` | 許可 | 検索結果が指す箇所の取得。 |
| `get_function_source` | 許可 | 関数単位の取得。 |
| `find_duplicate_code` | 許可 | 重複検出。LLM 不要。 |
| `structural_search` | 許可 | ast-grep パターン検索。**ast-grep extra が要る**（§5）。 |
| `list_projects` | 許可 | どのプロジェクトが索引済みか。読み取りのみ。 |
| `flow_verdict` | 許可 | 制御フロー解析。LLM 不要。 |
| `explain_traceback` | 許可 | スタックトレースからのグラフ照会。LLM 不要。 |
| `rank_root_causes` | 許可 | グラフ上のヒューリスティックのみ。 |
| `ask_agent` | **禁止** | NL→Cypher。外部 LLM 呼び出し（§2）。 |
| `query_code_graph` | **禁止** | 同上のもう一つの入口。 |
| `index_repository` | **禁止** | 共有グラフへの書き込み。他の並行 run が同じグラフを読む以上、書き換えを許すと隣の run を壊す。 |
| `update_repository` | **禁止** | 同上。 |
| `reingest` | **禁止** | 同上。 |
| `wipe_database` | **禁止** | 同上（破壊的）。 |
| `delete_project` | **禁止** | 同上（破壊的）。 |
| `surgical_replace_code` | **禁止** | ステージング元ツリーへの書き込み。以降の run が読む索引の元を壊す。 |
| `write_file` | **禁止** | 同上。 |
| `structural_replace` | **禁止** | 同上。 |
| `read_file` | **禁止** | **ステージングコピーを読む**（エージェントの作業ディレクトリではない）。許すと `collect.ts` が `Read` として数えない経路でファイルを読めてしまう — graphify の `read_graph_json` カウンターと同型の counter-productive case。 |
| `list_directory` | **禁止** | 同上。 |

---

## 4. 共有グラフと staging path 設計

MemPalace の palace と違い、code-graph-rag の索引は **run ごとに複製できない**:
Memgraph + Qdrant はプロセスとして動くデータベースであり、ディレクトリではない。
したがって設計は「複製」ではなく「読み取り専用の共有」になる。

- **`TARGET_REPO_PATH`** が `dirname + sha256` でプロジェクト名を導出する仕組みなので、
  MCP サーバに渡す値は索引を構築したときの STAGING パスと**完全に一致**しなければ
  ならない。`bench/conditions.ts` の `cgrMcp(gen)` はこれを
  `/tmp/cgr-index/<gen>/taskflow` に固定する。
- **`QDRANT_URL=http://127.0.0.1:6333`** を明示する。無指定だと code-graph-rag は
  カレントディレクトリ相対の `.qdrant_code_embeddings`（単一プロセスロック）に
  フォールバックし、ビルド時と `claude -p` 実行時で cwd が違うため
  `semantic_search` は「まだ埋め込みが生成されていません」を返す
  （2026-09-03 に実機で確認・修正）。
- **書き込みはビルド時の 2 回（v1, v2）だけに閉じる。** `bench/run.ts` は
  `TARGET_REPO_PATH` を読むだけで、グラフへの書き込みツールは全アームで禁止済み
  （§3）なので、130 本超の run がこの共有グラフに書き込むことはない。
- **`resourceDir` は索引そのものではなくマニフェスト。** `provisionMcp` の
  クローン＋ハッシュ機構は変更せずに再利用するため、`McpSpec.resourceDir` は
  `.cgr/index-<gen>/` を指す。実体は `manifest.json` 1 ファイル（生成 gen、
  プロジェクト名、staging root、ファイル数、staged tree のハッシュ、
  `cgr stats` の出力、ビルド秒数）で、これは**コミットする**（gitignore しない）
  — palace と違って数十 MB のバイナリではなく、マニフェストは「どのビルドを
  測ったか」の記録そのものだから。

---

## 5. インストールと既知の落とし穴

```bash
uv tool install --python 3.12 --with "mcp<2" \
  "code-graph-rag[treesitter-full,semantic,ast-grep]"
```

- **`mcp<2` は必須。** code-graph-rag 0.0.845 は `mcp>=1.28.1` を宣言するだけで
  上限を切っていない。`mcp` 2.x 系は `Server.list_tools` を削除しており、
  ピン留めせずに入れると MCP サーバが起動直後に
  `'Server' object has no attribute 'list_tools'` でクラッシュする
  （2026-09-03 に実機で確認）。
- **`ast-grep` extra が要る。** `structural_search` は ast-grep バインディングに
  依存しており、`[treesitter-full,semantic]` だけのインストールでは動かない。
- **Markdown は見出しセクション単位。** `docs/` 以下のファイルは `Section` ノードとして
  索引される（コードのような関数・クラス単位ではない）ので、`cgr-v2` /
  `haiku-cgr-v2` が doc↔code タスクをどこまで解けるかは、この粒度の粗さの影響を
  受ける可能性がある。
- **起動時バリデーションはローカルプロバイダを免除する。** `ORCHESTRATOR_PROVIDER` /
  `CYPHER_PROVIDER` に `ollama` を指定すれば API キーなしで起動できるが、実際に
  それらを使う `ask_agent` / `query_code_graph` は禁止済みなので、この設定は
  「起動を通すためだけ」の値である。

---

## 6. 比較対象

`bench/conditions.ts` に 4 アームを登録した。

| condition | corpus | model | overlay | index |
|---|---|---|---|---|
| `cgr` | v1 | `claude-sonnet-5` | `overlays/cgr` | 共有グラフ (`taskflow-v1`) |
| `haiku-cgr` | v1 | `claude-haiku-4-5` | `overlays/cgr` | 共有グラフ (`taskflow-v1`) |
| `cgr-v2` | v2 | `claude-sonnet-5` | `overlays/cgr-v2` | 共有グラフ (`taskflow-v2`) |
| `haiku-cgr-v2` | v2 | `claude-haiku-4-5` | `overlays/cgr-v2` | 共有グラフ (`taskflow-v2`) |

`bench:report:cgr` (`package.json`) は 13 通りの比較を行う: `baseline` /
`graphify(-v2)` / `mempalace(-v2)` / `baseline-nosub` の各系列に対して sonnet 側 4 本、
haiku 側 4 本、あわせて計 13。graphify と mempalace の両方を参照アームに含めているのは、
§1 の三点比較（AST グラフの発想 vs 配布方式、構造 vs 意味）を同じレポート内で読めるように
するためである。

---

## 7. 限界

- **NL→Cypher パスは測っていない（§2）。** これは code-graph-rag の売りの機能であり、
  この結果を「code-graph-rag は使えない/使える」の判定に読み替えてはならない。
- **Markdown はセクション単位。** ファイル単位でも関数単位でもない粒度で索引される
  ことが、v2 系アームの精度にどう影響するかは §5 の未知数として残る。
- **N=1 反復の予定。** 他の Phase と同じ計測プロトコル（reps=1, concurrency=3,
  `--max-turns 60`, `--max-budget-usd 4`）を踏襲する想定。

---

## 結果

TBD — 計測は未実施。
