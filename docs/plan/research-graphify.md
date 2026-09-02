# graphify の仕様・主張の調査
## 調査日: 2026-09-02
---

## 0. 基本情報

| 項目 | 値 |
|---|---|
| PyPI パッケージ名 | `graphifyy`（y が2つ。`graphify` という別パッケージは無関係） |
| CLI コマンド名 | `graphify` |
| ローカルインストール版 | v0.9.50（`uv tool` 経由、`~/.local/bin/graphify`） |
| PyPI 最新版（2026-09-02時点） | v0.9.53（2026-08-30リリース）。0.9.51は08-28、0.9.52は08-29リリースで、ほぼ毎日パッチが出ている |
| ライセンス | Apache-2.0 |
| 主要リポジトリ | GitHub上に `Graphify-Labs/graphify`（公式と思われる）のほか、`safishamsi/graphify`、フォーク多数（`sharkkyyy10/graphify-` 等）が乱立しており、どれが一次ソースか一見して判別しづらい状態。README取得は `Graphify-Labs/graphify` から成功した |

---

## 1. `graphify benchmark` の実体（ソースコード読解）

`benchmark.py`（インストール済みパッケージ内、`graphify/benchmark.py`）を全文読んだ結果、**これは実エージェントセッションの計測ではなく、完全に合成的（synthetic）な静的推定**であることが確認できた。

### 計算方法

1. **コーパストークン数（ナイーブ手法の基準値）**
   - `corpus_words` が渡されなければ `G.number_of_nodes() * 50`（ノード数×50語）という粗い推定で代用する。
   - `corpus_tokens = corpus_words * 100 // 75`（100語≈133トークンという固定換算）。
   - つまり実際のソースファイルの文字数やトークン数を一切読んでいない。ノード数から逆算した架空の値。

2. **クエリ側トークン数**
   - 事前定義された5つの汎用サンプル質問（`"how does authentication work"`, `"what is the main entry point"` など、対象コードベースの内容に一切依存しない固定文言）でグラフに対しBFS（深さ3）を実行。
   - ノードラベルの部分一致でスコアリングし、上位3ノードを起点に近傍を辿った結果のノード/エッジをテキスト化し、`len(text) // 4` で「トークン数」を推定（1トークン=4文字という固定近似）。
   - 5問中、グラフのラベルに一致する語がゼロの質問はスキップされる（実際に自作の3ファイルTS/TSXコーパスでテストしたところ、5問中1問しかヒットしなかった）。

3. **削減率** = `corpus_tokens / avg_query_tokens`

### 限界（実測で確認）

自前で3ファイルのTS/TSX最小コーパス（`api.ts`, `UserCard.tsx`, `App.tsx`）を作り実行したところ：

```
Corpus:          400 words → ~533 tokens (naive)
Graph:           8 nodes, 13 edges
Avg query cost:  ~178 tokens
Reduction:       3.0x fewer tokens per query
```

- 「400 words」は実ファイルの単語数ではなく `8ノード×50` の推定値。
- 5つのサンプル質問のうち一致したのは1問のみ（"what connects the data layer to the api"）。
- **実際にエージェントがどのファイルを読むか、何往復のツール呼び出しが発生するか、システムプロンプトやツール定義のオーバーヘッドは一切含まれない。**

### 結論

`graphify benchmark` の数値（README等で引用される「71.5x」「79x」等の系譜も同根の推定手法によるもの）は、**「グラフを介した回答が生テキストを全部読むより理論上どれだけ小さいか」という下限に近い理想値の見積もりであり、実際のClaude Codeエージェントセッションでのトークン消費削減を測定したものではない。** ベンチマーク設計上、この数値をそのまま「with graphify」条件の効果として引用するのは不適切。実エージェントセッションでの比較が今回のベンチマークの本来の目的であり、`graphify benchmark` はその代替にならない。

なお、Graphify-Labs/graphify のREADME取得結果には別途「LOCOMOデータセット(n=300)でのrecall@10・QA精度」というより形式的なベンチマーク（`BENCHMARKS.md`参照、二重ジャッジ方式）への言及もあったが、これは記憶/RAG精度の話でありトークン削減率とは別軸の主張。

---

## 2. TS/TSX の AST 抽出サポート

### パーサ

- `tree-sitter` ベース（37以上の言語文法に対応と公称）。
- TypeScript/TSXは専用の設定を持つ：
  - `.ts` / `.mts` / `.cts` → `tree_sitter_typescript` の `language_typescript`
  - `.tsx` → 同モジュールの `language_tsx`（JSX対応版。**`.tsx`をplain TypeScript文法でパースするとJSX式の中の呼び出しがサイレントに欠落する**という既知の落とし穴があり、ソースコード中に専用コメントで警告されている）
  - `.js` / `.jsx` / `.mjs` / `.cjs` → `tree_sitter_javascript`

### 抽出されるノード/エッジ種別（実測で確認）

3ファイルの最小TSXコーパスで確認できたノード種別：
- ファイルノード（`api.ts`, `UserCard.tsx` など）
- 関数ノード（`fetchUser()`, `formatUser()`, `UserCard()`, `App()` — Reactの関数コンポーネントも通常の関数として抽出される）
- インターフェース/型ノード（`User` インターフェース。`_callable_class: true` フラグ付き）

確認できたエッジ種別：
- `imports`（名前付きimportの個別ターゲットへ）
- `imports_from`（ファイル間の依存関係）
- `calls`（関数呼び出し、EXTRACTED信頼度）
- `contains`（ファイル→内部シンボルの包含関係）

各エッジには `confidence`（EXTRACTED/INFERRED/AMBIGUOUS）、`source_location`（行番号）、`context` が付与される。テスト結果では全エッジが `EXTRACTED`（AST上で確定的に判明した事実）だった。

### 既知の限界（ソースコードのコメントより）

- 動的import（`await import('x')`）はモジュールスコープでは静的AST走査から漏れる既知のバグがあり、正規表現ベースの救済ロジック（`_rescue_js_dynamic_imports`）で後付けパッチされている（issue #2575）。
- Svelte/Astro/Vueは同様にAST走査が全体的に失敗するため正規表現フォールバックに依存。
- JSX属性内の`&`エンティティ等でtree-sitter-typescriptが`has_error`を立てるケースがあり、そうした「実害のない構文エラー」は握りつぶすロジックがある。

### コーパスサイズ閾値（重要：ドキュメントとソースに食い違いあり）

| 情報源 | 閾値 |
|---|---|
| `~/.claude/skills/graphify/SKILL.md`（インストール済みスキル文書） | `total_words > 2,000,000` **OR** `total_files > 500` で警告してサブフォルダ絞り込みを提案 |
| `graphify/detect.py` の実装（実際にこの値でチェック） | `CORPUS_UPPER_THRESHOLD = 500_000` words、`FILE_COUNT_UPPER = 500` files |

**スキル文書は「200万語」と書いているが、実装は「50万語」で警告を出す。** 中間規模Next.jsコードベース（数百ファイル、数十万語）を対象にする場合、この閾値（50万語 or 500ファイル）に触れる可能性が高い。ベンチマーク設計時はこの実装側の閾値を基準にコーパスサイズを見積もるべき。

### 閾値の回避

- 全ファイルがルート直下（サブフォルダなし）の場合は絞り込みを提案せず `--no-cluster`（クラスタリング省略）を提案するのみ。
- 明示的なバイパスフラグは見当たらなかった。`--no-cluster` はクラスタリング（コミュニティ検出・LLM命名）だけをスキップするもので、抽出自体の閾値チェックを無効化するものではない。閾値を超えても実行自体は止まらず「警告して絞り込みを聞く」だけなので、Claude Codeのスキル運用上はエージェントが指示に従って絞り込むかどうかに依存する（＝ベンチマークの再現性に影響する余地がある）。

---

## 3. エージェントによるグラフの消費方法

### `graphify query` のデフォルト動作

- BFS（既定）またはDFS（`--dfs`）でグラフを走査。
- `--budget N`：出力を N トークンに制限。**デフォルトは2000トークン**（4文字/トークン換算で文字数カット）。
- 出力はテキスト形式（`NODE ...` / `EDGE ...` の行の羅列）で、`graph.json` を丸ごと読むよりはるかに小さい。
- クエリ語のマッチングは「大文字小文字無視の部分一致＋IDF」のみで、**同義語・言い換え・多言語対応は一切ない**（`references/query.md` に明記）。このためスキル側では、クエリ発行前にグラフの語彙集合を抽出し、質問語を語彙内のトークンに変換する「クエリ拡張」ステップを踏むよう指示している。

### `graphify claude install` がCLAUDE.mdに書き込む内容（`always_on/claude-md.md` を確認）

```
## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
```

同時に `.claude/settings.json` に **PreToolUse フック**が2本登録される（`_claude_pretooluse_hooks`）：
- `Bash|Grep` マッチャー → `graphify hook-guard search`（生のgrep/検索コマンドを横取りしてgraphify queryへの誘導を試みる想定）
- `Read|Glob` マッチャー → `graphify hook-guard read`（`--strict` オプションでセッション最初の生Readをブロックする挙動もある）

これは重要な発見で、**「CLAUDE.mdに書くだけ」ではなく、フックによってエージェントの生Read/Grep行動そのものに介入する仕組み**を持つ。ベンチマークで「with graphify」を検証する際、CLAUDE.md記述のみを条件にするかフックまで含めるかで、エージェント挙動への強制力が大きく変わる。

### MCP サーバー（`--mcp`）が公開するツール（`serve.py` で確認）

`query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs` の10種。stdio/HTTP両対応。

### `graphify reflect` / LESSONS.md

- `graphify-out/memory/` に蓄積された `save-result`（Q&A記録、`--outcome useful|dead_end|corrected` 付き）を集計し、`graphify-out/reflections/LESSONS.md` を決定論的に生成（LLM不使用）。
- 「preferred sources（複数のuseful裏付けあり）」「tentative」「contested」「known dead ends」「corrections」を出力し、**次回セッション開始時にエージェントがこれを読み込む設計**（`references/query.md` に明記：セッション開始時に `graphify reflect --if-stale` を実行してから読む）。
- **これはセッション間で状態を持ち越す仕組みであり、ベンチマークで複数回の試行を独立に比較したい場合は `graphify-out/memory/` と `graphify-out/reflections/` を試行間でリセットしないと、2回目以降の試行が「前回の学習」の恩恵を受けて不公平に有利になる。**

### どの統合モードが「graphifyを使う」代表か

3つの統合レベルが存在し、強制力が異なる：

| モード | 内容 | 強制力 |
|---|---|---|
| ① CLAUDE.md記述のみ | ルールを読んで「自発的に」`graphify query`を使うことを期待 | 弱い。エージェントが無視して直接Read/Grepする可能性あり |
| ② CLAUDE.md + PreToolUse フック（`graphify claude install` のデフォルト） | Bash/Grep/Read/GlobをフックでgraphifyOに誘導 | 中〜強。`--strict`なら生Readを最初の1回ブロック |
| ③ MCP サーバー（`--mcp`） | 専用ツールとしてgraphifyの機能を直接公開 | エージェントのツール選択次第。フックなし |

**推奨：Claude Codeでの実利用を代表させるなら②（`graphify claude install` のデフォルト状態、フック込み）が最も実態に近い。** これが実際にユーザーが `/graphify` スキルをインストールした際の既定状態であり、CLAUDE.md記述だけでは「使われない」リスクが高すぎて比較条件として弱すぎる。

---

## 4. 公表されている主張・ベンチマーク（一次情報の引用）

Web検索で見つかった主張は出典・条件によってばらつきが大きい：

| 主張 | 出典 | 条件 |
|---|---|---|
| "71.5x fewer tokens per query" | 複数のブログ・フォーク（`lucasrosati/claude-code-memory-setup` 等）で繰り返し引用 | 52ファイルのコーパスと記載。手法は上記1章の合成推定と同一系統と推測される |
| "79× token reduction" | stevescargall.com のブログ記事 | 496Kトークンのコーパス。「Zero Vector Database Overhead」も同時主張 |
| "7.3x on a Real Python codebase" | exchangepedia.com（フェッチは403で本文取得不可、タイトルから "Honest Benchmark" を標榜） | 実コードベースでの検証を謳うブログ。本文未確認 |
| "60% reduction (~120,000 tokens saved per complex query)" | 別のブログ記事 | 条件不明 |
| README（Graphify-Labs/graphify）: "Code is parsed locally with tree-sitter AST: deterministic, no LLM, nothing leaves your machine" | 公式README | コード抽出はLLM不要、という主張（1章・5章のとおり実測でも確認済み） |
| README: LOCOMOデータセット(n=300)で "recall@10: 0.497"、"QA accuracy: 45.3%" | 公式README、`BENCHMARKS.md`参照とのこと | 「同一ハーネス・同一モデル・同一予算で全システムを走らせ、二重ジャッジ(Cohen's kappa 0.81)で採点」と記載。ただしこれは記憶/RAG精度の主張であり、トークン削減率とは別軸 |

**注意**：71.5x・79x・7.3xのいずれも、独立した第三者ブログの引用であり、本家リポジトリの実験ログや生データへの直接リンクは今回の調査では確認できなかった（exchangepedia記事の本文はアクセス拒否）。数値の幅（3x〜79x）自体が、1章で確認した合成推定手法の性質（コーパスサイズが大きいほど・グラフのラベルとクエリ語の一致が良いほど比率が跳ね上がる）と整合的である。

---

## 5. ビルドコストと出力ファイル

### コードのみのコーパスならLLM不要

- `graphify extract <path> --code-only` はAPIキー無しで完全ローカル実行される（SKILL.md本文でも「code is extracted structurally (AST) with no LLM and no key at all」と明記、実測でも確認）。
- 実測：3ファイル（TS 1本+TSX 2本）のAST抽出は約0.3秒（起動オーバーヘッド込みで1.4秒）。中規模（数百ファイル）でも大部分は数十秒〜数分オーダーと推測されるが、正確な数百ファイル規模での実測は今回未実施（スコープ外の指示のため実プロジェクトでは検証していない）。

### `graphify-out/` の中身とサイズ（3ファイル・8ノード・13エッジの最小コーパスで実測）

| ファイル | サイズ | 内容 |
|---|---|---|
| `graph.json` | 6.9KB（クラスタリング後） | NetworkX node-link形式。ノード/エッジの生データ。**ノード数に比例して肥大化するため、中規模コードベースでは容易に数百KB〜MB級になりうる** |
| `GRAPH_REPORT.md` | 1.5KB | コミュニティ単位の人間可読レポート |
| `graph.html` | 20KB | インタラクティブなD3可視化（依存ライブラリ込みで単一ファイルにバンドルされていると見られ、ノードが増えると比例して増大） |
| `.graphify_analysis.json` | 2.1KB | コミュニティ検出の中間データ |
| `manifest.json` | 620B | 増分更新用のファイルハッシュ台帳 |

**懸念点（ベンチマーク設計上の重要な落とし穴）**：`graph.json` はグラフ全体の生データであり、ノード数に比例して大きくなる。フック（②）やスキル指示が効かず、エージェントが「とりあえず `graph.json` をReadしよう」と考えてしまうと、`graphify query` を使うより**むしろ大量のトークンを消費する**逆効果になりうる。中規模Next.jsコードベース（数百TSXファイル）では `graph.json` が数百KB〜数MBに達する可能性があり、これを誤って読ませないことがベンチマークの公平性に直結する。

---

## 6. バージョン・変更履歴

- ローカルインストール：v0.9.50
- PyPI最新（2026-09-02時点）：v0.9.53（2026-08-30リリース）。0.9.51（08-28）、0.9.52（08-29）と、ほぼ1日1リリースの高頻度更新が続いている。
- 詳細な変更点（0.9.50→0.9.53の差分）はPyPI/GitHub検索では個別のリリースノート本文までは確認できなかった。ただしソースコード中のコメント（issue番号 #2575, #2584, #2212, #1392, #2106, #2528, #1986 等の多数の参照）から、**バグ修正が非常に高頻度に行われているアクティブ開発中のツールである**ことが読み取れる。特にTS/JSの動的import欠落（#2575）やグラフサイズ上限チェック（#2212）など、ベンチマークの再現性に影響しうる修正が最近も入っている。
- **推奨：ベンチマーク実行前に `uv tool install --upgrade graphifyy` で最新版に更新すべき**（現在ローカルはv0.9.50で3パッチ分古い）。

---

## 7. 推奨・結論

### ベンチマークで「with graphify」条件として採用すべきモード

**`graphify claude install` のデフォルト状態（CLAUDE.md記述 + PreToolUse フック）を「with graphify」の主条件とすることを推奨する。** 理由：
1. これが実際のユーザーが `/graphify` スキルを導入した際に得られる既定の統合状態であり、最も代表性が高い。
2. CLAUDE.md記述のみ（フックなし）は強制力が弱く、エージェントが指示を無視するリスクがあり、効果を過小評価しうる。
3. MCPサーバーモードは代替の統合経路として面白いが、Claude Codeでの主流な使い方（`/graphify`スキル経由）とは別物であり、必要なら追加条件として別途比較するのが良い。

### 制御すべき落とし穴（試行間の公平性のために）

1. **`graphify-out/memory/` と `graphify-out/reflections/LESSONS.md` は試行間でリセットする。** さもないと2回目以降の試行が前回の学習内容（preferred sources等）で有利になり、「graphifyの効果」ではなく「学習の蓄積効果」を測ってしまう。
2. **`graph.json` を直接Readさせない工夫が必要。** サイズが大きい場合、これを誤読させると逆にトークンを浪費する。フックの `hook-guard read` が効いているか、テスト実行で必ず確認する。
3. **`graphify benchmark` の出力（○○x reduction）をそのまま成果指標として使わない。** 1章で示した通り完全に合成推定であり、実エージェントセッションでの計測（実際のツール呼び出しのトークン使用量）とは別物。ベンチマークの成果指標は実セッションのトークンカウント（API使用量ログ）から独自に算出すべき。
4. **コーパスサイズは実装側の閾値（50万語 / 500ファイル）を基準に設計する。** SKILL.mdの記載（200万語）を信じて大きすぎるコーパスを用意すると、実装側の警告分岐に途中で捕まりベンチマークのフローが崩れる。
5. **バージョンを最新（v0.9.53以降）に上げてから固定する。** バグ修正頻度が高く、TS/JS抽出の既知バグ（動的import欠落など）が影響しうる。
6. **`.tsx` と `.ts` の文法混在を確認する。** `.tsx`をplain TypeScript文法で誤パースするとJSX内の呼び出しが欠落するという既知の罠があるため、コーパスに `.tsx` ファイルが正しく認識されているか（`_TSX_CONFIG` が適用されているか）を小規模テストで事前確認しておくとよい（今回の3ファイルテストでは正常に動作した）。
7. **クエリ語彙の一致率に注意。** `graphify query` は同義語展開をしないため、ベンチマークで使う質問セットはグラフのノードラベル（関数名・コンポーネント名など）に現れる語を意識して作らないと、素の `graphify query` がヒットせず不当に不利な結果になる（スキル側は「語彙抽出→クエリ拡張」の追加ステップを要求しており、この工程のトークンコストもベンチマークに算入すべき）。

---

## 参考リンク

- [graphifyy · PyPI](https://pypi.org/project/graphifyy/)
- [GitHub - Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)
- [GitHub - sharkkyyy10/graphify- (フォーク)](https://github.com/sharkkyyy10/graphify-)
- [GitHub - gyc567/graphify-llm-wiki (フォーク)](https://github.com/gyc567/graphify-llm-wiki)
- [GitHub - lucasrosati/claude-code-memory-setup ("71.5x"主張の引用元の一つ)](https://github.com/lucasrosati/claude-code-memory-setup)
- [Graph Your Codebase with Graphify: 79× Token Reduction and Zero Vector Database Overhead](https://stevescargall.com/blog/2026/05/graphify--memmachine-79-token-reduction-zero-vector-database/)
- [Graphify Honest Benchmark: 7.3x on a Real Python Codebase | Exchangepedia](https://exchangepedia.com/articles/graphify-honest-benchmark-real-codebase.html)（本文はWebFetchで403、タイトルとURLのみ確認）
- [Stop Letting Your AI Grep: Building Codebase Context with Graphify | Medium](https://medium.com/@brysongracias/stop-letting-your-ai-grep-building-codebase-context-with-graphify-d4db8afcb3cc)
- [Graphify Quick Start | Reduce Token Usage in Coding Agents](https://rajeevpentyala.com/2026/06/28/graphify-quick-start-reduce-token-usage-in-coding-agents/)
- [How to Save Tokens in Claude Code Using Graphify](https://www.aieatingtheworld.com/guides/how-to-save-tokens-claude-code-graphify)
- [Graphify Tested: A Knowledge Graph Index for Claude Code | Engr Mejba Ahmed](https://www.mejba.me/blog/graphify-knowledge-graph-codebase-claude-code)
- [DeepWiki: CLI Reference | safishamsi/graphify](https://deepwiki.com/safishamsi/graphify/4.1-cli-reference)
- [Cut Your Claude Token Consumption By 70x - DEV Community](https://dev.to/lorenzojkrl/cut-your-claude-token-consumption-by-70x-3kh2)
- ローカル一次情報：`~/.claude/skills/graphify/SKILL.md`、`~/.claude/skills/graphify/references/*.md`、`graphify` パッケージ内 `benchmark.py` / `extract.py` / `detect.py` / `install.py` / `serve.py` / `reflect.py`（インストール先: `~/.local/share/uv/tools/graphifyy/lib/python3.14/site-packages/graphify/`）

---

## 補記（Director による一次検証、2026-09-02）

上記 3 章の hook の挙動を `graphify/cli.py` の `_run_hook_guard` と `graphify/install.py` の `_claude_pretooluse_hooks` を直接読んで確認した。

| 項目 | 確認結果 |
|---|---|
| デフォルトの hook | **nudge のみ**。`Bash|Grep` で grep/rg/find 系、`Read|Glob` でソース拡張子の in-project ファイルを対象にしたとき、追加コンテキストとして「graphify query を使え」という文言を返す。ブロックはしない。fail-open |
| `--strict` | `Read` ツールに限り、セッション最初の 1 回だけ `permissionDecision: deny` で生 Read を拒否し `graphify query` に誘導。2 回目以降は nudge に降格 |
| `graphify-out/` 配下の Read | guard の対象外（`under_out` で早期 return）。**`graph.json` の直読みは止められない** |
| stale 判定 | 対象ファイルの mtime が graph.json より新しい、または `graphify-out/needs_update` があると nudge が弱まる。エージェントがコードを編集するタスクでは編集後の Read は nudge されない |
| プロジェクト単位インストール | `graphify install --project [--strict]` が `.claude/skills/graphify/SKILL.md`、`CLAUDE.md` の graphify セクション、`.claude/settings.json` の PreToolUse hook をプロジェクト配下に書く。`--setting-sources project` と組み合わせれば条件の切替がプロジェクト内で完結する |
| 追加サブコマンド | `affected "X"`（逆方向トラバーサル、影響範囲分析向け）、`god-nodes`、`update <path>`（AST のみ、LLM 不要）、`cluster-only --no-label`（LLM 命名スキップ）が存在する |
