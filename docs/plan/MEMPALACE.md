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

```
BENCH_RESULTS_DIR=results/mempalace
# block 1: corpus-v1 スナップショット (docs/ を除いた corpus/taskflow)
--tasks tasks/tasks.json,tasks/tasks-ext.json --conditions mempalace,haiku-mempalace       # 90 runs
# block 2: corpus/taskflow (corpus-v2)
--tasks tasks/tasks-docs.json --conditions mempalace-v2,haiku-mempalace-v2                 # 40 runs
```

reps=1、concurrency=3、`claude -p --output-format json`、effort `high`、
`--max-turns 60`、`--max-budget-usd 4`。他の計測セットと同一の設定である。

| | |
|---|---|
| runs | **130 / 130** 成功 |
| harness エラー | **0** |
| MCP 接続失敗 | **0**（130 run すべて `connected: true`, `tool_count: 45`） |
| ブロック1 (code-45 × 2 arms) | 90 runs / 約 36 分 |
| ブロック2 (docs-20 × 2 arms) | 40 runs / 16.6 分 |
| API 実費 | **$36.09** |
| 成果物 | 130 run すべてに `result.json` / `transcript.jsonl` / `metrics.json` / `run.meta.json` / `grade.json` |

### 5.1 corpus-v1 の再現

code-45 のアームは `results/runs` / `results/ext` / `results/structural` の
既存アームと対になるので、**docs/ を含まないコーパス**で走らせる必要がある。
`corpus/taskflow` は現在 corpus-v2（635 追跡ファイル）なので、リポジトリ外に
`docs/` を除いたスナップショット（496 追跡ファイル）を作り `--corpus` で渡した。
docs レイヤを足したコミット群は `src`/`tests` を一切変更していないことを
git で確認済みで、`scripts/freeze-corpus.sh` の tree hash
`4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da`（477 ファイル）
も動いていない。

### 5.2 観測された異常 2 件

- **`mempalace_search` を一度も呼ばなかった run が 2 件**（いずれも
  `haiku-mempalace`、45 中 2）。CLAUDE.md の指示を無視して直接 grep/read した
  もので、実質 baseline である。トークンはアームに算入したままなので、
  アームの効果はその分だけ薄まっている（graphify 側の
  「nudge を無視した run」と同じ扱い）。
- **Haiku が 1 回だけツール名を打ち間違えた**:
  `mcp__mempalace__memplacem_search`（`mempalace` の綴りが転倒）。サーバが
  持たないツールなので呼び出しは失敗している。当初 `tool_count` を
  「広告された ∪ 呼ばれた」で数えていたため 1 run だけ 46 と記録されたので、
  `tool_count` は**広告されたツール数**を意味するよう修正した（`connected` は
  従来どおり両方を見る緩い判定のまま）。

---

## 6. 結果

`results/mempalace/REPORT.md` が全文。9 つの比較の判定は以下のとおり。

### 6.1 アーム別の中央値

| arm | runs | tokens (all) | cost | turns | subagent | `mempalace_search` 呼び出し | fixed overhead | accuracy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `baseline` | 65 | 272,782 | $0.212 | 5 | 33 in 31 runs | – | 10,357 | 80.0% |
| `baseline-nosub` | 45 | 230,081 | $0.134 | 8 | 0 | – | 9,510 | 84.4% |
| `graphify` | 45 | 288,502 | $0.191 | 9 | 0 | – | 10,943 | 77.8% |
| **`mempalace`** | 45 | **456,481** | **$0.360** | 11 | 1 | 241 (中央値 4/run, 45/45 runs) | **11,108** | 80.0% |
| `haiku-baseline` | 65 | 526,174 | $0.131 | 14 | 3 in 2 runs | – | 8,013 | 80.0% |
| `haiku-graphify` | 45 | 327,185 | $0.103 | 10 | 0 | – | 8,438 | 82.2% |
| **`haiku-mempalace`** | 45 | 497,712 | $0.154 | 12 | 2 | 155 (中央値 2/run, 43/45 runs) | 8,627 | 75.6% |
| `graphify-v2` | 20 | 443,863 | $0.283 | 12 | 0 | – | 10,936 | 80.0% |
| **`mempalace-v2`** | 20 | 385,812 | **$0.372** | 11 | 1 | 131 (中央値 6.5/run, 20/20 runs) | 11,124 | **60.0%** |
| `haiku-graphify-v2` | 20 | 440,614 | $0.127 | 12 | 0 | – | 8,430 | 75.0% |
| **`haiku-mempalace-v2`** | 20 | 430,576 | $0.133 | 10 | 0 | 68 (中央値 2.5/run, 20/20 runs) | 8,640 | **55.0%** |

### 6.2 9 つの判定（paired mean diff, 95% bootstrap CI over tasks）

| # | 比較 | tasks | tokens | cost | accuracy |
|---|---|---:|---|---|---|
| 1 | `mempalace` − `baseline` | 45 | **+170,329 [+65,640, +287,807]** | **+$0.1365 [+0.0782, +0.2045]** | 80.0% vs 84.4% |
| 2 | `mempalace` − `graphify` | 45 | **+138,232 [+30,901, +254,588]** | **+$0.1428 [+0.0844, +0.2117]** | 80.0% vs 77.8% |
| 3 | `mempalace` − `baseline-nosub` | 45 | **+245,709 [+157,438, +355,429]** | **+$0.2090 [+0.1524, +0.2698]** | 80.0% vs 84.4% |
| 4 | `haiku-mempalace` − `haiku-baseline` | 45 | 差を検出せず | **+$0.0348 [+0.0098, +0.0624]** | 75.6% vs 80.0% |
| 5 | `haiku-mempalace` − `haiku-graphify` | 45 | **+220,215 [+74,728, +378,332]** | **+$0.0511 [+0.0264, +0.0803]** | 75.6% vs 82.2% |
| 6 | `mempalace-v2` − `baseline` | 20 | 差を検出せず | 差を検出せず | 60.0% vs 70.0% |
| 7 | `mempalace-v2` − `graphify-v2` | 20 | 差を検出せず | **+$0.0857 [+0.0092, +0.1639]** | 60.0% vs 80.0% |
| 8 | `haiku-mempalace-v2` − `haiku-baseline` | 20 | 差を検出せず | 差を検出せず | 55.0% vs 80.0% |
| 9 | `haiku-mempalace-v2` − `haiku-graphify-v2` | 20 | 差を検出せず | 差を検出せず | 55.0% vs 75.0% |

**9 比較のうち、MemPalace が有意に優れた指標は 1 つも無い。** 有意差が出た
6 つはすべて MemPalace 側が高コストで、残り 3 つは差を検出できなかった。

### 6.3 §1 の問いへの答え

Phase 2〜8 の null result は「prebuilt index という発想が効かない」のか
「graphify の作り方が効かない」のか、という問いだった。

**答えは前者寄りである。** 埋め込み + BM25 という全く別の索引方式でも、
Sonnet のコードタスクでは baseline より **+170k トークン / +$0.14** 悪化し、
graphify よりもさらに悪い（比較 2）。索引の作り方を変えても効かなかった以上、
このベンチが測っている範囲では「事前構築インデックスを検索してから読む」という
形そのものが、Claude Code の素の探索に勝てていない。

**理由は subagent と検索の粒度の二つに分かれる。**

1. **baseline は Explore subagent に委譲する。** 65 run 中 31 run で
   subagent を使う一方、`mempalace` は 45 run 中 1 run しか使わなかった
   （graphify は 255 run 中 0）。ツールを与えられたエージェントは自分で
   検索してしまい、並列探索を捨てる。より公平な `baseline-nosub` に対しても
   MemPalace は **+246k / +$0.21** 悪い（比較 3）ので、これは委譲だけでは
   説明しきれない。
2. **意味検索の 1 ヒットが小さすぎる。** `mempalace_search` は 4,004,248 バイト
   （`mempalace` アーム 241 呼び出し）を返しており、1 呼び出しあたり約 16.6 KB。
   チャンクは断片なので、エージェントは結局そのファイルを `Read` で開き直す。
   検索コストが読み込みコストに**上乗せ**され、置き換えにならない。

### 6.4 doc↔code タスクでは精度が落ちる

corpus-v2 の 20 タスクで `mempalace-v2` の accuracy は **60.0%**、
`haiku-mempalace-v2` は **55.0%** で、graphify-v2 (80.0% / 75.0%) と
baseline (70.0% / 80.0%) の双方を下回る。トークンとコストで差が出ない一方、
**精度だけがはっきり悪い**のがこのセットの特徴である。

内訳（`successes/graded · 平均スコア`）:

| arm | discrepancy | reference | impact | locate | explain |
|---|---|---|---|---|---|
| `graphify-v2` | **4/4 · 0.938** | 3/4 · 0.917 | 1/4 · 0.602 | 4/4 · 1.000 | 4/4 · 0.900 |
| `baseline` (docs) | 2/4 · 0.681 | 12/13 · 0.959 | 5/13 · 0.789 | 12/13 · 0.962 | 13/13 · 0.954 |
| `mempalace-v2` | 2/4 · 0.588 | **2/4 · 0.783** | **0/4 · 0.536** | 4/4 · 1.000 | 4/4 · 0.950 |
| `haiku-mempalace-v2` | 2/4 · 0.575 | **1/4 · 0.430** | 1/4 · 0.589 | 3/4 · 0.917 | 4/4 · 0.850 |

崩れているのは `reference`（ある識別子を参照している全ファイルの列挙）と
`impact`（変更の影響範囲）で、`locate`（1 ファイルを特定）は 4/4 で無傷である。
**これは意味検索の設計そのものの帰結である**: 「この概念に最も似た上位 k 件」を
返す仕組みは、「この記号を参照する全件」という**網羅性の質問**に構造的に
答えられない。graphify のグラフは辺を辿って全件を列挙できる。
`discrepancy` は両者とも 2/4 で、graphify-v2 の 4/4 に届かない。

### 6.5 fixed overhead — 45 個のツール定義

`mempalace` アームの first-turn `cache_creation` 中央値は **11,108**
（`graphify` 10,943 / `baseline` 10,357 / `baseline-nosub` 9,510）。
Haiku 側は 8,627 対 8,438（graphify）/ 8,013（baseline）。
MCP サーバのツール定義は 45 個・約 32 KB の JSON で、生スキーマなら 8k トークン
規模になるはずだが、**実際の増分は baseline 比で +750 トークン程度**にとどまる。

理由は Claude Code が MCP ツールを **deferred（名前だけ提示し、スキーマは
`ToolSearch` で取りに行かせる）** として扱っているためで、実際 130 run すべてで
エージェントは `ToolSearch` を 1〜2 回呼んでから `mempalace_search` に到達して
いる。**45 ツールという数はトークン面ではほぼ無害だった** — ただし
`ToolSearch` の往復が 1 ターン増える形で turn 数に乗る。

**非対称の注記**: mempalace アームだけが `--strict-mcp-config` で走るので、
計測ホストの個人的な MCP サーバ（Google Calendar 等）を積んでいない。他アームは
それらを deferred な名前として積んでいる。fixed overhead の比較はこの差を
含んだ上での数字である。

### 6.6 速度（副次的・concurrency 3 のノイズ込み）

per-call レイテンシは並列実行のノイズに比較的強く、ここが最も読める。

| | `mempalace_search` | `graphify query` 等 (`Bash(graphify)`) | `Read` |
|---|---:|---:|---:|
| `mempalace` | **43 ms** (36–63) | – | 6 ms (4–8) |
| `graphify` | – | **294 ms** (282–307) | **64 ms** (59–70) |
| `baseline` | – | – | 6 ms (5–9) |

二つ読み取れる。

- **`mempalace_search` は `graphify query` の約 7 倍速い**（43 ms 対 294 ms）。
  ChromaDB のローカル検索は graphify の CLI 起動より軽い。
- **graphify の PreToolUse フックは全 `Read` に約 55 ms を課している**
  （64 ms 対 baseline / mempalace の 6 ms）。これは graphify overlay の副作用で
  あって MemPalace とは無関係だが、この節を作って初めて見えた。

ただし **`mempalace_search` が `Read` の 7 倍遅い**（43 ms 対 6 ms）ことも同時に
真であり、§6.3 の結論と整合する: 検索が読み込みを置き換えないなら、
検索は純粋な追加コストである。

インデックス構築コスト（1 回だけ払う）: graphify v1 **4.6 秒**、
graphify v2 は同等の AST パス + 約 **35 分**の LLM 抽出、
MemPalace v1 **49 秒** / v2 **97 秒**（API コスト 0）。

### 6.7 この結果が言っていないこと

- **MemPalace の本来の用途を測っていない。** これは会話記憶システムであり、
  ここではプロジェクトファイル索引という副次機能をコード探索に転用している。
  公表値 96.6% R@5 は LongMemEval の会話記憶タスクの数字で、無関係である。
- **セッション横断の記憶ループを測っていない。** 各 run は新しいコーパスコピー
  上の新しいセッションなので、`mempalace_diary_*` や継続的な mine といった
  MemPalace の中核機能は一度も動いていない。45 ツールのうち実際に呼ばれたのは
  `mempalace_search` **1 つだけ**である。graphify 側の `save-result` / `reflect`
  が測れていないのと全く同じ限界である。
- **N=1 反復。** タスク×条件あたり 1 回なので、個々のタスクの差は run ノイズで
  ありうる。CI はタスク間のばらつきのみを反映する。
