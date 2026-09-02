# Phase 9: MemPalace as a benchmark condition family

計測日 2026-09-02 / MemPalace **3.9.0** / corpus `corpus-v1` (code-45 arms) と
`corpus-v2` (docs-20 arms)。調査ノートは `docs/plan/research-mempalace.md`。

---

## 1. なぜこの条件を足したのか

Phase 2〜8 が比較してきたのは「構造インデックス（graphify の AST グラフ）を
持つエージェント」対「何も持たないエージェント」だった。その比較で graphify に
トークン優位が出なかったとき、残る説明は二つある — **prebuilt index という発想
そのものが効かない**のか、それとも **graphify のインデックスの作り方が効かない**
のか。片方の実装しか測っていない限り、この二つは区別できない。

MemPalace は同じ「事前構築インデックスを検索してから読む」という形をとりながら、
検索の中身が根本的に違う: AST 由来のノード・エッジではなく、**テキストチャンクの
埋め込み + BM25 のハイブリッド意味検索**である。したがって
`mempalace − baseline` と `graphify − baseline` を同じタスク・同じ採点で並べれば、
上の二択に答えが出る。これがこの条件族の唯一の目的であり、「どちらのツールが
優れているか」を判定するためのものではない。

**MemPalace の本来の用途はこれではない。** 本体は Claude Code / ChatGPT の会話履歴を
セッション横断で保存・想起する記憶システムであり、公表されている 96.6% R@5 も
LongMemEval という会話記憶ベンチマークの数字で、コード探索とは無関係の指標である
(`docs/HISTORY.md`)。ここで測っているのは MemPalace の副次的な機能
(`mempalace mine` によるプロジェクトファイル索引) をコード探索に転用した場合の
挙動であって、MemPalace が主張する性能の検証ではない。

---

## 2. 条件設計

`bench/conditions.ts` に 4 アームを登録した。

| condition | corpus | model | overlay | index |
|---|---|---|---|---|
| `mempalace` | v1 | `claude-sonnet-5` | `overlays/mempalace` | `.palaces/palace-v1` |
| `haiku-mempalace` | v1 | `claude-haiku-4-5` | `overlays/mempalace` | `.palaces/palace-v1` |
| `mempalace-v2` | v2 | `claude-sonnet-5` | `overlays/mempalace-v2` | `.palaces/palace-v2` |
| `haiku-mempalace-v2` | v2 | `claude-haiku-4-5` | `overlays/mempalace-v2` | `.palaces/palace-v2` |

### 2.1 CLAUDE.md の nudge

overlay の `CLAUDE.md` は `overlays/baseline/CLAUDE.md` と**バイト単位で同一の
本文**に `## mempalace` セクションを追記しただけのものである（テストで固定）。
セクションは graphify の `## graphify` と同じ形・同じ長さにしてある — 「何が
あるか」の 1 行と、「まず引け・示されたファイルだけ開け」の短い規則リスト。
nudge の強さが違えば測っているのは nudge であってインデックスではなくなる。

**1 行だけ graphify 側に対応物がない規則がある**が、これは追加の優位ではなく
ハンディキャップの除去である。`mempalace_search` が返す `source_path` は
**索引時の絶対パス**であって、エージェントの作業ディレクトリからの相対パスでは
ない。回答フォーマット契約はリポジトリ相対パスを要求するので、この変換規則が
無ければ `locate` タスクに答えること自体が不可能になる。graphify は
`graphify query` が最初からプロジェクト相対パスを返すので同じ行を必要としない。

### 2.2 hook は使わない

MemPalace は Stop / PreCompact / SessionEnd hook を同梱しており、Stop hook は
「N メッセージごとにエージェントの停止をブロックして会話を palace に保存させる」
設計である（`hooks/mempal_save_hook.sh`, `SAVE_INTERVAL=15`）。`claude -p` の
単発実行モデルではこれはターン数とトークンを直接汚染するだけなので採用していない。
そもそもこれらは「会話ログを書き込み続ける」ための hook であって、事前構築した
静的インデックスを読ませるための仕組みではない。

### 2.3 MCP 経由での接続

CLI の `mempalace search` には `--json` が無く出力が非構造テキストなので、
検索は MCP サーバ `mempalace-mcp` の `mempalace_search` ツール経由に統一した。

```
--mcp-config <run固有のjson> --strict-mcp-config
```

`--strict-mcp-config` は必須である。これが無いと計測ホストに個人的に設定されて
いる MCP サーバ（この環境では Google Calendar 等）まで一緒に載ってしまい、
アームが測定機の私的な設定に依存する。**ただしこれは他アームとの非対称を生む**
— §6 の fixed overhead を参照。

---

## 3. インデックスの構築

`scripts/build-palace.sh v1|v2`（`pnpm palace:build v1`）。git 追跡下の corpus
ファイルだけをスクラッチにステージし、そこを mine する。graph v1 が索引した
ファイル集合と同一である（`node_modules` もビルド出力も含まない）。

```bash
export MEMPALACE_PALACE_PATH=.palaces/palace-v1
mempalace init --yes --auto-mine --no-llm /tmp/mempalace-index/v1/taskflow
```

`--yes` はエンティティ検出の自動承認（無いと非対話環境で `EOFError`）、
`--no-llm` はローカル LLM 呼び出しのスキップ（決定性のため、また Ollama を
要求しないため）。

### 3.1 ビルド実測値

| | v1 | v2 |
|---|---:|---:|
| ステージしたファイル | 496 | 635 |
| mempalace が処理したファイル | 491 | 630 |
| スキップ | 1 | 1 |
| drawers | 2,797 | 6,078 |
| palace サイズ | 30,990,336 B (29.6 MiB) | 60,862,464 B (58.0 MiB) |
| palace 内ファイル数 | 12 | 12 |
| ビルド時間 | 49 s | 97 s |
| content hash (sha256) | `04e947c04ff6ada4606c8cd6ef1efd2bf02dbd13261941a2a5c835925c9c8784` | `f7b12b8bf0be87863f0c0d9a3913feed5f1588694eeaf20b1063ee19377c34f7` |
| index root | `/tmp/mempalace-index/v1/taskflow` | `/tmp/mempalace-index/v2/taskflow` |

room の内訳（v2）: `src` 402 / `documentation` 140 / `testing` 79 / `scripts` 8 /
`configuration` 1。room 名はディレクトリ名ではなく MemPalace が付ける意味的な
ラベルである。

**`.palaces/` は gitignore してある。** 30〜58 MB のバイナリ索引であり、
`build-palace.sh` で再生成できる。この表の content hash が唯一の同一性の記録で、
各 run の `run.meta.json` にも `mcp.source_hash` として焼き込まれる。

### 3.2 index root がなぜ `/tmp/mempalace-index/<gen>/taskflow` なのか

`source_path` が索引時の絶対パスとして palace に焼き込まれ、検索のたびに
エージェントに見える以上、ステージングパスは実験の表面の一部である。

- **中立でなければならない。** 検索結果から「自分は graphify のベンチマークの
  中にいる」と推測できてはならない。`bench/lib/env.ts` が run ディレクトリに
  不透明な uuid 名を与えているのと同じ理由である。
- **安定かつ短くなければならない。** `<root>/taskflow/` を剥がした残りが
  ちょうどリポジトリ相対パスになる必要がある（§2.1）。

### 3.3 `~/.mempalace` への副作用

`mempalace mine` はホームディレクトリ側に `known_entities.json`（検出した
エンティティ名のグローバルレジストリ）、`config.json`、`locks/` を書く。また
chromadb の埋め込みモデル（`all-MiniLM-L6-v2`, ONNX, 約 80 MB）が
`~/.cache/chroma/onnx_models/` にキャッシュされる。

**この副作用は palace 構築の 2 回だけに閉じている。** `bench/run.ts` は
`mempalace mine` を呼ばない（事前構築済みのコピーを配るだけ）ので、計測した
130 run はいずれもこの書き込みを発生させていない。

---

## 4. ハーネス側の変更

### 4.1 `ConditionSpec.mcp`

アームの treatment がコーパスコピー内のファイルではなく**プロセス**であるのは
この条件族が初めてなので、overlay 機構では運べない。`McpSpec`
(`{name, command, args, envTemplate, resourceDir}`) を宣言的に持たせた。

### 4.2 run ごとのインデックス複製

`bench/run.ts` の `provisionMcp` が `claude -p` の前に:

1. `resourceDir` の事前構築インデックスを run 専用の一時ディレクトリへ複製し、
2. `${PALACE}` を実パスに展開した MCP 設定 JSON をそこに書き、
3. `--mcp-config <path> --strict-mcp-config` を引数に足し、
4. `MEMPALACE_PALACE_PATH` を MCP サーバの env と `claude` 自身の env の両方に置く。

**複製は正しさの要件であって用心ではない。** ChromaDB は検索を返すだけでも
sqlite ファイルを read-write で開くので、`matrix.ts` が許す並列 3 run が
1 つのディレクトリを共有すると 3 プロセスが同時書き込みすることになる。

複製先はコーパスコピーの**隣**であって中ではない。エージェントがインデックスを
自分のファイルシステムから読めてしまえば、検索せずに生チャンクから答えられて
しまう — `collect.ts` が既に監視している `read_graph_json` の MemPalace 版である。

実測: `cp -c`（APFS clonefile）で **4〜5 ms**。29.6/58.0 MiB を 130 回複製しても
コストは無視できる。

### 4.3 fail-loud

インデックスが無い、あるいはサーバ実行ファイルのパスが古い場合、`provisionMcp`
は例外を投げて run を止める。`claude -p` は MCP サーバが起動しなくても終了
コード 0 で完走するので、これが無いと **`mempalace` アームが黙って高価な
`baseline` の再実行に退化する**。graphify の hook パスに対して
`scripts/patch-overlay.ts` が防いでいるのと同じ失敗モードである。

さらに run 後に transcript を読み直し、`mcp__mempalace__*` ツールが一度も
広告も呼び出しもされていなければ `run.meta.json` に
`mcp.connected = false` と `error` を立てる。接続の証明を spawn の成功では
なく実際の記録に置いている。

### 4.4 `mempalace-mcp` のパス

Python の venv 内エントリポイントなので、どのホストでも正しい絶対パスは存在
しない。`bench/conditions.ts` の `MEMPALACE_MCP_EXE_DEFAULT` に記録し、
`scripts/patch-overlay.ts` が graphify のフックパスと同じ要領で書き換える。
mempalace が入っていないホストでは `--check` を失敗させない（アーム 1 族の
任意依存であり、そこで落とすと他すべてのゲートとして使えなくなる）。実際の
ゲートは使用地点の `provisionMcp` である。

### 4.5 計測項目

- `features.ts`: `mcp_calls`（ツール名別）、`mempalace_calls`、`mcp_result_bytes`。
  graphify のサブコマンド counter は mempalace アームでは構造的にゼロになる
  ので、それを「使われなかった」と読ませないために必要。
- `collect.ts`: `metrics.json` に `mcp_tool_calls` / `mempalace_calls`。
- `report.ts`: MCP アームが 1 つでもある時だけ描画される節。既存の 4 レポートは
  この変更後もバイト単位で同一に再生成される（検証済み）。

### 4.6 ペアリングの修正

`analyze.ts` の `compare()` は**両アームが実際に走らせたタスクの積集合**に
スコープするようにした。MemPalace のレポートは初めて「アームごとにタスク
カバレッジが違う」集計を行う — `baseline` は 65 タスク（code 45 + docs 20）を
走っているが `mempalace` は 45 だけ — ため、修正前は `n_tasks` が和集合の 65 を
名乗りながら CI は積集合の 45 から計算されるという食い違いが出る
（`pairByTask` が対応の無いタスクを落とすため）。既存のレポートはすべて
両アームのカバレッジが一致するケースなので、この修正で出力は動かない。

---

## 5. 実行

<!-- RUN-STATS -->

---

## 6. 結果

<!-- RESULTS -->
