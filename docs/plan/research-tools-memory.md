# memory / RAG / context-engine 系ツールのトークン削減効果調査（2026-09-02）

前提: graphify-bench では graphify（AST グラフ）と MemPalace（ChromaDB memory, MCP）を実際の headless Claude Code セッションで固定 Next.js コーパスに対して計測済み。Sonnet 5 ではどちらもコードタスクでトークンを削減せず、MemPalace は reference/impact タスク（「X を参照する全ファイル」の網羅列挙）で top-k 類似検索の限界により精度が低下した。以下はこれと符合する外部証拠を探した結果。

---

## 1. ツール一覧

| ツール | 機構 | Claude Code 統合経路 | ローカル/クラウド | 主張（引用元） | 証拠の質 |
|---|---|---|---|---|---|
| **mem0** | ベクトル memory layer、add/search/get/update/delete の9ツール。session start/compaction/task completion/session end の lifecycle hook で自動記録 | MCP server（hosted HTTP endpoint、または self-host） | 主にクラウド、self-host 版もあり | 具体的なトークン削減率の一次資料は未発見。MCP 一般論として「接続ツール数が多いほどツール定義がターン毎に最大18,000トークンを消費」という副作用の指摘あり（[mindstudio.ai](https://www.mindstudio.ai/blog/claude-code-mcp-server-token-overhead)） | 低（ベンダーブログのみ、定量ベンチマーク一次資料なし） |
| **claude-mem** | Chroma + SQLite にセッションのツール出力を圧縮要約して保存。5 lifecycle hook（SessionStart/UserPromptSubmit/PostToolUse/Stop/SessionEnd）で自動記録・注入 | プラグイン（`npx claude-mem install`）、hook ベース | ローカル（SQLite + Chroma） | 「手動コンテキスト管理比で約10倍のトークン効率」と主張（[Augment Code 記事](https://www.augmentcode.com/learn/claude-mem-65k-stars)、[DataCamp](https://www.datacamp.com/tutorial/claude-mem-guide)） | 低〜中（GitHub star 数は大きいが、10倍主張は第三者ベンチマークなし。会話継続性向上ツールで、コードタスクのトークン計測ではない） |
| **Letta/MemGPT** | OS 風の階層メモリ管理（working/archival memory）、LLM 自身がページング判断 | 独自 SDK、Claude Code 向け MCP は限定的 | 両対応 | 会話継続タスク向けの設計思想。コーディング特化の定量トークン claim は今回未発見 | — |
| **Zep/Graphiti** | 時間認識ナレッジグラフ（temporal knowledge graph）。事実・要約・観察をトークン予算に収めて返す | MCP対応、主にエンタープライズ向け | クラウド中心 | LongMemEval 94.4、LoCoMo 92.5（会話記憶ベンチ）、"1リトリーバルあたり約7,000トークン以内"、精度+18.5%かつレイテンシ-90%（[Zep公式](https://www.getzep.com/product/agent-memory/)、[arXiv:2501.13956](https://arxiv.org/abs/2501.13956)） | 中（査読前arXiv+自社ベンチ。ただし**会話記憶**ベンチであり、コーディングタスクのトークン削減を測ったものではない） |
| **Cognee** | ドキュメント/コードをナレッジグラフ+ベクトルのハイブリッドに変換 | MCP server（Cursor/Claude Code/Cline接続） | 主にセルフホスト | LongMemEval/LoCoMo のスコアを一切公開していない、とのアグリゲータ評（[Mnemoverse](https://mnemoverse.com/docs/library/ai-memory-solutions-2026-q3)） | 低（定量ベンチ不在。アーキテクチャの主張のみ） |
| **Supermemory** | fact extraction、user profile、矛盾解消、選択的忘却を単一APIで提供 | MCP server、Claude Code/OpenCode プラグイン | クラウド | LongMemEval/LoCoMo/ConvoMem で「ベンチマーク首位」を主張するが自己申告で第三者未検証（[Mnemoverse](https://mnemoverse.com/docs/library/ai-memory-solutions-2026-q3)） | 低（自己申告、未検証と明記されている） |
| **Byterover/Cipher** | コーディングエージェント向けの versioned context tree | MCP（Cursor/Claude Code等） | OSS、セルフホスト可 | 定量トークン削減の一次資料は今回未発見 | — |
| **Windsurf/Cascade "context engine"** | 独自インデクシング（詳細非公開） | Windsurf IDE 組み込み（Claude Code非対応） | クラウド | マーケティング文言のみ、定量根拠は今回の調査で確認できず | 低 |
| **Cursor codebase indexing** | embedding ベースのコードベース索引 | Cursor IDE 組み込み | クラウド埋め込み+ローカルコード | 定量トークン削減の一次資料は今回未発見（Cursor自体は「取得を絞る」設計思想の記述はあるが数値なし） | — |
| **Augment Code Context Engine** | リポジトリ全体を継続インデックス、リトリーバルで「探索ターン数削減・逆戻り削減」を狙う | MCP（Claude Code/Cursor/Codex 対応、2026-02公開） | クラウド | Claude Code+Opus 4.5 で+80%、Cursor+Opus 4.5 で+71%、Cursor+Composer-1 で+30%の「性能改善」を主張（[Augment公式](https://www.augmentcode.com/blog/context-engine-mcp-now-live)） | **低**（Augment公式記事自身が明記: 「Augment社外の誰もこの70%超の数値を再現していない」「単一リポジトリでのベンダー自己計測」） |
| **Sourcegraph Cody** | コードグラフ+embedding のハイブリッド検索 | 独自拡張、Claude Code非標準統合 | クラウド/セルフホスト | 今回の調査では定量トークン claim 未発見 | — |
| **Continue.dev indexing** | ローカル embedding index | IDE拡張、Claude Code非対応 | ローカル可 | 同上 | — |
| **GitHub Copilot workspace context** | リポジトリコンテキスト取得（非公開実装） | Copilot専用、Claude Code非対応 | クラウド | 同上 | — |

**総括**: コーディングタスクでのトークン削減を**独立した第三者が再現・検証した**一次資料は、今回の調査範囲では**ゼロ**。すべて (a) ベンダー自己申告、(b) 会話記憶ベンチ（LongMemEval/LoCoMo）への横流し引用、のいずれか。会話記憶ベンチはコーディングタスクの「ファイルXを参照する全箇所を列挙せよ」のような網羅性要求とは評価軸が異なり、非適用（下記2章）。

---

## 2. ベンチマークの状況

### LongMemEval / LoCoMo — 非適用
どちらも**会話記憶**（マルチセッション対話でユーザーの過去発言を正しく想起できるか）を測るベンチで、平均文脈長 約115,000トークンの会話ログが題材（[arXiv:2501.13956](https://arxiv.org/html/2501.13956v1) 経由の記述）。コーディングエージェントの「リポジトリ内のシンボル/参照を正確に取得できるか」という課題とは評価対象がそもそも異なる。Zep/Supermemory/Cognee がこれらのスコアを掲げるのは**マーケティング上の転用**であり、コーディングタスクへの外挿はできない。graphify-bench の知見（MemPalace が reference/impact タスクで失敗）はまさにこのギャップを実証している。

### "Does a Language Server Save Tokens for Coding Agents?"（arXiv:2608.13568, 2026-06-29）
**graphify-bench の問題設定に最も近い一次資料。** Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5 を用い、Python/TypeScript リポジトリで grep（lexical）vs LSP（semantic）を5アーム消し込み比較。
- **シンボル定位タスク**: LSP はむしろ grep より **+6%〜+118%** トークンを多く消費。エージェントは利用可能でも semantic retrieval を避け、grep を選好する傾向。
- **参照探索タスク**: grep利用率0〜6%に対し、LSPは約50%が自発利用。精度は上がるが**トークン削減効果は最弱モデル（Haiku）以外では見られない**。
- **複数ファイル編集（リネーム等）**: 最も顕著な差。grepは完全に解けるが、位置情報のみのLSPは呼び出し箇所を見落とし**75%失敗**。拡張LSPでもコメント/文字列中の参照は拾えず解消しない。
- **結論**: 「semantic retrieval は普遍的にトークン効率的」という広く語られる前提を否定し、タスク種別・モデル能力・字句ノイズで切り替える adaptive router を推奨。
→ これは MCP/index 型の「意味検索が正義」という memory ツール全般への売り文句に対する**直接的な反証エビデンス**。

### SWE-bench 系のコスト・トークン意識ベンチマーク
- **SWE-Effi**: 精度だけでなくトークン・時間・コストで再ランキングし、「token snowball」（トークン雪だるま式膨張）や「expensive failures」（高コストな失敗）を可視化する resource-aware AUC を提案。
- **ContextSniper**（[arXiv:2607.01916](https://arxiv.org/pdf/2607.01916)）: リポジトリレベル修復タスクで平均トークンを1.36M→0.66M（-51.5%）、コスト-36.4%を報告。ただしこれは自前手法の自己報告値であり、汎用memory/RAG製品の評価ではない。
- **SWE-Pruner**: モデル横断で23〜38%のトークン削減、成功率もむしろ改善という報告（自己報告）。
- **Context as a Tool (CAT)**（[arXiv:2512.22087](https://arxiv.org/pdf/2512.22087)）: 圧縮（condensation）でコンテキストを約35kトークンに安定化、ReActは急速にウィンドウを使い切ると対比。
これらはいずれも「独自に設計したコンテキスト管理/剪定手法」の論文内自己評価であり、**市販の memory/RAG 製品（mem0, Zep, Cognee等）を対象にした第三者ベンチマークではない**。

### Terminal-Bench / Aider polyglot / Anthropicコストレポート
今回の検索範囲では、これらが memory/RAG ツール導入の有無でトークン効率を比較した一次資料は見つからなかった（Aiderのコスト表はモデル間比較が主で、外部memoryツールの効果検証ではない）。

---

## 3. 批判的知見（RAGがエージェント型コーディングを悪化させる論拠）

1. **Claude Code 自身がベクトルDB RAGを廃止した**（[Boris Cherny の公開発言をまとめた記事](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/)）。理由:
   - agentic search（grep/ls/read の反復ループ）の方が単純に高性能だった
   - コードは毎日変化するため、embeddingインデックスの陳腐化（staleness）管理コストが高い
   - コードには類似スニペットでなく正確なシンボル参照・呼び出し箇所が必要
   - ローカル探索の方がセキュリティ/プライバシー上有利
   - **ただし記事自身が明記する通り、この主張を裏付ける定量数値（トークン数、レイテンシ）はCherny発言にもこの記事にも存在しない**。GitHub issue（#4556, #20836）でのユーザーの「トークン浪費」苦情が傍証として引用されているのみ。
2. **"Lost in the middle"**（Stanford/Meta研究）: 長文脈の中間に重要情報があると性能が20ポイント以上低下 — RAGで取得したチャンクをコンテキストに大量に詰め込む設計は、この問題を悪化させうる。
3. **インデックス陳腐化（stale index）**: ベクトルインデックスは再埋め込みパスまで更新されず、ファイルシステムを直接読むエージェントには原理的に存在しないラグが生じる（[Ranjan Kumar のブログ](https://ranjankumar.in/rag-engineering-index-staleness-gap)）。
4. **反証（agentic searchが万能ではない）**: 「agentic reasoning は一貫して貧弱な検索を補えない」— 検索カバレッジ不足やインデックス設計の悪さそのものが原因の失敗もある、との留保も存在（[Towards Data Science](https://towardsdatascience.com/agentic-rag-failure-modes-retrieval-thrash-tool-storms-and-context-bloat-and-how-to-spot-them-early/)）。

→ graphify-bench の知見（AST グラフ・ベクトルmemoryともコードタスクでトークン削減せず）は、**業界の主流の実務判断（Claude Code自身の設計転換）および唯一発見できた定量的な学術比較（arXiv:2608.13568）の両方と整合する**。

---

## 4. 推奨: ベンチマーク対象として追加検討する価値のあるツールはあるか

**結論: 現時点でハーネスに追加する価値のある memory/RAG ツールは見当たらない。**

理由:
- 検証済みの独立ベンチマークで「コーディングタスクのトークンを削減した」と示せている製品が**存在しない**。存在するのは (a) ベンダー自己申告（Augment: 社外未再現と自認済み, claude-mem: 10倍主張だが検証なし）、(b) 会話記憶ベンチへの転用（Zep/Supermemory/Cognee）のいずれかで、いずれも graphify-bench が既に検証した「コード参照タスクでの網羅性欠如」問題を回避できているという証拠がない。
- 唯一の学術的な token-to-success 比較研究（arXiv:2608.13568）は、意味検索（LSP、graphify/memoryツール群と機構的に近い）が**トークンを増やす場合が多い**という、graphify-bench の結果を裏付ける結論を出している。
- Claude Code の開発元自身が同じ理由（陳腐化、精度、シンプルさ）でベクトルDB RAGを廃止したという実務判断がある。

**それでも1つ挙げるなら**: mem0（Claude Code公式寄りの統合、hookベースで条件を最小差分で切り替えやすい）が最も「ハーネスに載せやすい」候補ではあるが、これは統合容易性の観点であり、トークン削減効果への期待値ではない。追加検証する場合は、conversational recall（セッションを跨いだ「前回何をしたか」想起）に限定したタスクで評価すべきで、graphify-bench の主眼である単発コーディングタスクのトークン削減という枠組みには乗らない可能性が高いと明記すべき。

**推奨**: 新規ツールの追加ベンチマークより、graphify-bench の既存結果（graphify/MemPalaceがコードタスクでトークン削減せず、MemPalaceは参照網羅性で精度低下）を、業界の実務転換（Claude Code のRAG廃止）と唯一の学術比較（arXiv:2608.13568）と合わせて報告する方が、現時点でのエビデンスとしては強い。

---

## 主要出典
- [Does a Language Server Save Tokens for Coding Agents?](https://arxiv.org/abs/2608.13568)（arXiv:2608.13568, 2026-06-29）
- [Claude Code dropped vector DB-based RAG](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/)
- [claude-mem 65.8K stars記事](https://www.augmentcode.com/learn/claude-mem-65k-stars)
- [Mem0 Claude Code integration](https://mem0.ai/blog/claude-code-memory)
- [Zep Agent Memory 製品ページ](https://www.getzep.com/product/agent-memory/) / [Zep論文 arXiv:2501.13956](https://arxiv.org/abs/2501.13956)
- [Mem0 vs Zep vs Letta vs Cognee vs Supermemory 比較](https://mnemoverse.com/docs/library/ai-memory-solutions-2026-q3)
- [Augment Context Engine MCP公開記事](https://www.augmentcode.com/blog/context-engine-mcp-now-live)（社外未検証と自認）
- [ContextSniper arXiv:2607.01916](https://arxiv.org/pdf/2607.01916)
- [Context as a Tool arXiv:2512.22087](https://arxiv.org/pdf/2512.22087)
- [RAG index staleness](https://ranjankumar.in/rag-engineering-index-staleness-gap)
- [Agentic RAG failure modes](https://towardsdatascience.com/agentic-rag-failure-modes-retrieval-thrash-tool-storms-and-context-bloat-and-how-to-spot-them-early/)
