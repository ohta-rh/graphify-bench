# コードナビゲーション／インデックス系ツール調査（2026-09-02）

対象：「Claude Codeのようなコーディングエージェントがコードベース探索に使うトークンを削減する」を謳うツール群。
既知の前提：本リポジトリ（graphify-bench）は既に graphify（AST知識グラフ）と MemPalace（埋め込みインデックス）を実際のヘッドレス Claude Code セッションで測定済みで、Sonnet 5 ではコードタスクのトークン削減効果なし（graphify は Haiku 4.5 とドキュメント↔コードタスクで有効）。先行研究 arXiv:2608.13568 は LSP ベース検索が Haiku で −26%、Sonnet では +118% という結果（Opus 4.8, Sonnet 4.6, Haiku 4.5 で測定、5-armアブレーション、tokens-to-successメトリクス）。

---

## 比較表

| tool | mechanism | claim | evidence quality | harness fit | verdict |
|---|---|---|---|---|---|
| **Serena** (oraios/serena) | LSP経由でシンボル単位のfind_symbol/replace_symbol_body等をMCPツールとして公開。40言語以上対応、MIT、star 28.7k | 「最大70%トークン削減」「20の日常タスクで既存ツールとの比較評価」との自称。ただし公開されているのは定量ベンチマーク論文ではなく、エージェントの主観的評価・逸話ベース | anecdotal（README上の"~20 routine coding tasks"評価だが統計手法・生データ非公開）。GitHub issue #944で30GB RAM消費・インデックスクラッシュ報告あり、20K LOC未満では非推奨との評者コメントも | headless OK（MCP設定のみ）、per-run isolation可（プロジェクトごとに`.serena/`キャッシュ、`--project`指定可）。ただしLSPプロセス起動・インデックス構築のオーバーヘッドが大きく、500ファイル規模でも初回インデックス待ちが発生しうる。TypeScript LSP自体は既にClaude Code本体のLSPプラグインと機能重複 | ベンチマーク候補として妥当。ただし「LSPが本体の効果か、Serenaのツール設計（シンボル粒度の要約）が効果か」を切り分ける必要あり。arXiv:2608.13568の素のLSP結果（Sonnet +118%）を覆せるかが焦点 |
| **Claude Code 組み込みLSP / Code Intelligence plugins** | v2.1.50+で公式marketplace（claude-plugins-official）からプラグイン導入。go-to-definition, find-references, call hierarchy等9操作＋編集後の自動diagnostics。TS/JS, Python, Go, Rust, Java等11言語 | 独自の削減率claimは公式ドキュメントに見当たらず（機能紹介のみ、数値なし） | none（公式は効果を定量主張していない） | headless動作は未検証（プラグインがインタラクティブUI前提の可能性）。設定は`claude plugin install`＋言語サーバー導入の2〜3コマンドで軽量。フックとの衝突は報告なし | **最有力候補**。Serenaと同じくLSPが土台だが、追加MCPサーバー不要でトークンオーバーヘッド（MCPツール定義の常時注入）が小さい。「MCPサーバー越しのLSP」と「Claude Code本体組み込みLSP」の比較実験に価値がある |
| **Aider repo-map（RepoMapper移植）** | tree-sitterでシンボル定義/参照グラフを構築し、パーソナライズドPageRankでファイル関連度をランキング。Aider本体機能をpdavis68/RepoMapperがMCPサーバーとして単独移植（STDIO） | Aider公式ブログ（2023）はコード品質・文脈選定の改善を述べるが、トークン削減率の明示的数値なし。RepoMapper自体も削減率claimなし | none（数値claimなし。手法の説明のみ） | 完全ローカル、tree-sitterのみで軽量。500ファイル規模なら数秒でグラフ構築可。MCP経由でheadless OK。フック衝突なし | 三番手候補。定量claimが無い分「測って初めて分かる」タイプ。既存のgraphify（同じくAST+グラフ構造）との差分が小さく、独自の価値仮説（PageRankによる関連ファイル自動選定）を検証する意義はある |
| **Claude Context**（zilliztech） | コードをMerkle木で差分検知しつつ、Milvus/Zilliz Cloudへハイブリッド（BM25+密ベクトル）インデックス。MCPツール：index_codebase, search_code, clear_index, get_indexing_status | 「同等の検索品質で約40%トークン削減」（README、詳細は`/evaluation`ディレクトリ参照と記載） | measured but methodology非開示相当（evaluationディレクトリへの言及はあるが、本文内で検証できず。第三者による再現報告は未確認） | **ハーネス不適合**：既定構成はZilliz Cloud必須（APIキー・ネットワーク依存）。オフライン運用は「完全ローカル可能か」というFAQが立つ程度で非既定。ローカルMilvus自前ホストは可能だが構築コストが高い | 見送り推奨。MemPalace（本ベンチマークで既に測定済みの埋め込みインデックス）と機構的にほぼ同種で、クラウド依存の分だけ再現性・isolationで劣る |
| **Augment Context Engine (MCP)** | 独自のセマンティック検索基盤をMCP化。ローカルモード（Auggieを自PC上でMCPサーバーとして起動）／リモートモード（Augmentホスト型）を選択可 | 「Terminal-Bench 2.0でClaude Codeに対して33%少ないトークンで同等の解決率」「Elasticsearch PR 300件×3プロンプト=900試行のベンチマークで改善」「Claude Code+Opus 4.5で80%性能向上」等、複数の数値claim | **measured on real agent sessions**（Terminal-Bench 2.0、Elasticsearch実PRベース、900試行）としては本調査で最も方法論の実在性が高いが、公式ブログ本文からは「どのモデル・どのbaseline構成か」の詳細と生データが追い切れず、詳細は非公開の可能性（`docs.augmentcode.com`要確認） | headless・ローカルモードならper-run isolation可能（`Auggie` CLI起動）。ただし商用SaaSで無料枠1,000リクエスト/月の制限あり、501ファイル規模の索引を毎run作り直すコスト・課金が発生しうる | 評価は高いが商用クローズドソースで再現性に難あり。無料枠の範囲で1回だけ試す価値はあるが、継続ベンチマークには不向き |
| **codebase-memory-mcp**（DeusData） | AST由来の知識グラフをSQLite等に永続化。「158言語対応、平均リポジトリをミリ秒でインデックス、99%トークン削減」を謳う | claim自体は「120x fewer tokens」「99% fewer tokens」など極端。第三者の批評記事（Agentic Context Research）が「単一の逸話ベース、統制実験ではない、クエリ種別/リポジトリ規模別の分布データなし、動的言語（Python/JS/Ruby）は型解決がヒューリスティックで誤検出未定量化」と明確に指摘 | **synthetic estimate寄りの誇大claim**（第三者批評あり） | ローカル完結・単一バイナリで依存ゼロ、per-run isolation容易。ハーネス適合自体は良好 | 見送り推奨。数値claimの信頼性が低すぎる。graphifyと機構的に酷似しており、コンセプト自体は既に自前実装で検証済み |
| **code-graph-mcp / codegraph**（sdsrss, colbymchenry） | いずれもtree-sitter AST→ローカルSQLiteのコード知識グラフ。codegraphは「中央値でトークン59%減、応答49%高速化、ツール呼び出し70%減」を主張 | 第三者レビュー（andrew.ooo等）はあるが、いずれも独自ベンチマークの生データ・モデル別内訳は限定的。graphifyとほぼ同一アーキテクチャ | anecdotal〜measured（自称のmedian値、方法論詳細は限定的） | 完全ローカル、MCP、headless OK。isolationも容易 | 新規候補というより**graphify自身の直接競合**。ベンチマーク対象というより「graphifyとの設計差分」の比較調査として扱う方が有益 |
| **repomix** | リポジトリ全体を1ファイルに圧縮（tree-sitterベースの--compressオプションで構造のみ抽出）。MCP/CLI両対応 | 「--compressで約70%トークン削減」（公式ドキュメント記載、"experimental"と明記） | synthetic estimate（whole-file読み込みとの比較であり、実エージェントセッションでの効果測定ではない） | 完全ローカル、headless OK、フック不要。ただし機構が「事前に固定サイズの圧縮コンテキストを都度読ませる」型で、MCP的な動的クエリではない＝CLAUDE.md/hookでのコンテキスト注入に近い設計 | 条件設計としては単純（CLAUDE.mdに圧縮出力を注入する型）。ただし「静的な圧縮ファイルを読ませる」だけなので、既存研究の「LSP的な動的検索」枠とは性質が異なり、比較対象としての優先度は中程度 |
| **mcp-gtags-server / gtags-mcp**（GNU Global） | grepの代替として、gtagsの索引済みシンボル検索をMCPで公開 | 削減率の定量claimなし（「scanをlookupに置き換える」という定性説明のみ） | none | 完全ローカル、C系言語で特に強い（TS/JSは弱い）。500 TSファイルのコーパスとは相性がやや悪い | 見送り。本ベンチマークのコーパス（Next.js/TS）に対する適合度が低い |
| **Nx MCP / project graph系** | Nxモノレポのプロジェクト依存グラフをMCP経由で提供 | 独自の削減率claimなし。むしろ公式ブログが「MCPツール定義自体が全メッセージにスキーマを注入し続けるオーバーヘッドがある」と自己言及し、CLI直叩き（skill）の方がMCPより効率的と述べる | none／自己批判的知見のみ | Nx未使用の一般TSプロジェクトには不適合（Nxワークスペース前提） | 対象外。本コーパスがNxモノレポでない限り適用不可 |
| **sourcegraph/cody context** | Sourcegraphのコードインテリジェンス基盤をコンテキスト取得に利用 | 検索した範囲で本調査時点の独立した定量claim・一次情報が確認できず（要追加調査） | none（未検証） | Sourcegraphサーバー依存が濃厚でローカル完結性に疑問 | 優先度低。時間があれば追加調査 |

---

## 個別トピック

### 2. 数値claimの整理（測定方法の違いに注意）
- **実エージェントセッションで測定**：Augment Context Engine（Terminal-Bench 2.0 / 実PR 900試行）。本調査中で唯一「実タスク解決を伴うベンチマーク」に近い。ただし詳細な生データ・モデル内訳は非公開部分あり。
- **逸話・少数事例ベース**：Serena（README上の主観評価）、codebase-memory-mcp（第三者批評が「単一逸話」と明言）。
- **whole-file読み込みとの比較（synthetic）**：repomix（--compress 70%）、Claude Context（40%、ただし"detailed methodology"はリポジトリ内evaluationディレクトリ参照でありこの調査では検証未了）。
- **claimなし（定性のみ）**：Claude Code組み込みLSP、Aider repo-map、gtags系、Nx MCP。

### 3. ハーネス適合性まとめ
- ✅ 完全ローカル・headless・per-run isolation良好：Aider repo-map(RepoMapper)、codebase-memory-mcp、code-graph-mcp/codegraph、repomix、gtags-mcp、Claude Code組み込みLSP
- △ ローカル可だが構築コスト・オーバーヘッドあり：Serena（LSPプロセス起動・大規模時のRAM懸念）
- ✗ クラウド依存が既定でoffline運用が困難：Claude Context（Zilliz Cloud既定）、Augment Context Engine remoteモード（ローカルモードなら回避可）

### 4. 独立評価・批評
- Serena：GitHub issue #944（30GB RAM消費でフリーズ）、issue #529（インデックスクラッシュ）。andrew.ooo のレビューは「20K LOC以上、クロスファイルリファクタが必要な場面で有効、小規模/グリーンフィールドでは不要」という条件付き推奨。
- codebase-memory-mcp：Agentic Context Research による批評記事が、99%/120x claimを「単一逸話・統制実験でない・動的言語での誤検出が未定量化」と具体的に指弾。
- Claude Code組み込みLSP・Aider repo-map：批判的な独立評価は本調査では見つからず（機能紹介記事が中心）。
- arXiv:2608.13568（本ベンチマークの先行研究）：LSPは弱いモデル（Haiku）にのみ有効、Sonnet/Opusでは逆効果になりうるという構造そのものが、今回調べた大半のLSP/グラフ系ツールにも当てはまる可能性が高い。

### 5. 推奨ランキング（次に測定すべき候補 Top 3）

1. **Claude Code 組み込みLSP / Code Intelligence plugins**（評価：claimなしだが一次情報の透明性は最高、MCPサーバー分のツール定義オーバーヘッドが無い分Serenaより有利、公式機能なので今後標準化する可能性が高く測定価値が高い）
2. **Serena**（LSPをMCP越しに使う場合との比較対象として#1との差分実験に好適。ただしRAM/インデックス時間の実測コストを事前に確認すること）
3. **Aider repo-map（RepoMapper移植）**（定量claimがない＝バイアスのない測定ができる、tree-sitterのみで軽量、graphifyと近い機構だがPageRankによる自動関連ファイル選定という独自仮説を検証できる）

次点：Augment Context Engine（ローカルモード、無料枠内で1回のみ）、repomix（静的圧縮注入という別カテゴリの比較として）。
codebase-memory-mcp・code-graph-mcp・codegraph・Claude Contextは、根拠不足または機構重複／クラウド依存のため今回は見送り推奨。

#### #1（Claude Code組み込みLSP）の具体的な条件設計案
- **セットアップ**：`claude plugin marketplace add claude-plugins-official`（既定で導入済みの場合は不要）→ `claude plugin install typescript-lsp`（対象コーパスがNext.js/TSのため）→ 言語サーバー本体（`typescript-language-server`）をnpm経由でローカル導入。
- **CLAUDE.md**：既存のgraphify/MemPalace条件と同一のタスク指示文をベースに、「シンボル定義・参照箇所の特定にはgrepより先にgo-to-definition/find-references系ツールを使うこと」という一文のみ追加し、他は素のCLAUDE.mdと揃える（比較の独立変数をLSP有無だけに絞る）。
- **MCPツール**：本体組み込みのためMCP設定不要（`.mcp.json`は空、または未設置）。プラグインが公開する9操作（definition/references/implementation/call hierarchy等）をそのまま使わせる。
- **isolation**：`--mcp-config`は使わないため、コンテナ/worktreeごとにプラグインと言語サーバーの事前インストールをDockerイメージ側に焼き込み、run間の索引状態リセットが不要な設計にする（LSPは基本ステートレスに近い）。
- **測定軸**：既存のgraphify/MemPalace実験と同じタスクセット・モデル（Sonnet 5, Haiku 4.5）で、条件を「なし／組み込みLSPあり／Serena（MCP版LSP）あり」の3群にして、arXiv:2608.13568の「Sonnetで逆効果」という結果が組み込み版でも再現するかを検証する。
